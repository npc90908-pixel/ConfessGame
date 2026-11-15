"""Software preview renderer for scene layouts (no GPU, no browser).

Painter's-algorithm rasteriser built on numpy + Pillow. It is not meant to
match the WebGL look — it exists so layouts built from Kenney kits can be
sanity-checked (scale, alignment, overlaps, composition) in a headless box.

    python scripts/preview/render.py scene.json out.png [--size 1280x720]
        [--cam x,y,z] [--target x,y,z] [--fov 55] [--light x,y,z]
    python scripts/preview/render.py --glb path/to/model.glb out.png     (model sheet)

Scene JSON:
    {
      "background": "#07051a", "ambient": 0.35, "light": [0.4, 0.8, 0.3],
      "fog": {"color": "#140f2e", "near": 40, "far": 160},
      "models": [{"glb": "public/models/castle/wall.glb", "matrices": [[16 column-major floats], ...]}],
      "boxes": [{"center": [x,y,z], "size": [w,h,d], "rotationY": 0, "color": "#888"}],
      "cylinders": [{"center": [x,y,z], "radius": 1, "height": 2, "color": "#888", "segments": 12}],
      "spheres": [{"center": [x,y,z], "radius": 1, "color": "#f0f"}],
      "heightfield": {"minX": -60, "maxX": 60, "minZ": -60, "maxZ": 60, "heights": [[...], ...], "color": "#2f4a3e",
                      "colorFn": optional ignored},
      "geometries": {"<id>": {"positions": [flat xyz...], "indices": [...] | null}},
      "meshes": [{"geometry": "<id>", "matrices": [[16 column-major floats], ...], "color": "#888", "double": false}],
      "markers": [{"position": [x,y,z], "label": "gate", "color": "#ff0"}]
    }

The `geometries`/`meshes` form is what `tests/tools/export-scene.test.tsx` writes
for a mounted environment, so whole maps can be previewed headlessly.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from glb import load_glb  # noqa: E402


def hex_to_rgb(value: str) -> np.ndarray:
    value = value.lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    return np.array([int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)])


def look_at(eye: np.ndarray, target: np.ndarray, up=np.array([0.0, 1.0, 0.0])) -> np.ndarray:
    f = target - eye
    f = f / np.linalg.norm(f)
    s = np.cross(f, up)
    if np.linalg.norm(s) < 1e-6:
        s = np.cross(f, np.array([0.0, 0.0, 1.0]))
    s = s / np.linalg.norm(s)
    u = np.cross(s, f)
    view = np.eye(4)
    view[0, :3] = s
    view[1, :3] = u
    view[2, :3] = -f
    view[:3, 3] = -view[:3, :3] @ eye
    return view


class SceneBuilder:
    def __init__(self) -> None:
        self.tris: list[np.ndarray] = []
        self.cols: list[np.ndarray] = []
        self.double: list[np.ndarray] = []

    def add(self, tris: np.ndarray, cols: np.ndarray, double: np.ndarray | bool = False) -> None:
        if len(tris) == 0:
            return
        self.tris.append(tris)
        self.cols.append(cols)
        if isinstance(double, bool):
            self.double.append(np.full(len(tris), double))
        else:
            self.double.append(double)

    def add_model(self, path: str, matrices: list[list[float]]) -> None:
        model = load_glb(path)
        if len(model.positions) == 0:
            return
        flat = model.positions.reshape(-1, 3)
        homo = np.concatenate([flat, np.ones((len(flat), 1))], axis=1)
        for m in matrices:
            mat = np.array(m, dtype=np.float64).reshape(4, 4).T  # column-major → row-major
            world = (homo @ mat.T)[:, :3].reshape(-1, 3, 3)
            self.add(world, model.colors, model.double_sided)

    def add_mesh(self, geometry: dict, matrices: list[list[float]], color: str, double: bool) -> None:
        flat = np.array(geometry["positions"], dtype=np.float64).reshape(-1, 3)
        if len(flat) == 0:
            return
        idx = geometry.get("indices")
        order = np.array(idx, dtype=np.int64) if idx else np.arange(len(flat))
        order = order[: len(order) - len(order) % 3]
        homo = np.concatenate([flat, np.ones((len(flat), 1))], axis=1)
        base = hex_to_rgb(color)
        vcols = geometry.get("colors")
        if vcols:
            vc = np.array(vcols, dtype=np.float64).reshape(-1, 3)
            # average the three corner colours per triangle, modulated by the material colour
            tri_cols = vc[order].reshape(-1, 3, 3).mean(axis=1) * np.array(base)
        else:
            tri_cols = None
        for m in matrices:
            mat = np.array(m, dtype=np.float64).reshape(4, 4).T
            world = (homo @ mat.T)[:, :3]
            tris = world[order].reshape(-1, 3, 3)
            self.add(tris, tri_cols.copy() if tri_cols is not None else np.tile(base, (len(tris), 1)), double)

    def add_box(self, center, size, rotation_y, color) -> None:
        w, h, d = [v / 2 for v in size]
        corners = np.array([[x, y, z] for x in (-w, w) for y in (-h, h) for z in (-d, d)])
        c, s = math.cos(rotation_y), math.sin(rotation_y)
        rot = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
        pts = corners @ rot.T + np.array(center)
        # 12 triangles, outward winding (CCW seen from outside)
        faces = [
            (0, 1, 3, 2),  # -x
            (4, 6, 7, 5),  # +x
            (0, 4, 5, 1),  # -y
            (2, 3, 7, 6),  # +y
            (0, 2, 6, 4),  # -z
            (1, 5, 7, 3),  # +z
        ]
        tris = []
        for a, b, cc, dd in faces:
            tris.append([pts[a], pts[b], pts[cc]])
            tris.append([pts[a], pts[cc], pts[dd]])
        tris = np.array(tris)
        self.add(tris, np.tile(hex_to_rgb(color), (len(tris), 1)), True)

    def add_cylinder(self, center, radius, height, color, segments=14, radius_bottom=None) -> None:
        rb = radius if radius_bottom is None else radius_bottom
        cx, cy, cz = center
        top = [np.array([cx + math.cos(a) * radius, cy + height, cz + math.sin(a) * radius]) for a in np.linspace(0, 2 * math.pi, segments, endpoint=False)]
        bot = [np.array([cx + math.cos(a) * rb, cy, cz + math.sin(a) * rb]) for a in np.linspace(0, 2 * math.pi, segments, endpoint=False)]
        tris = []
        for i in range(segments):
            j = (i + 1) % segments
            tris.append([bot[i], top[i], top[j]])
            tris.append([bot[i], top[j], bot[j]])
        ct = np.array([cx, cy + height, cz])
        for i in range(segments):
            j = (i + 1) % segments
            tris.append([ct, top[j], top[i]])
        tris = np.array(tris)
        self.add(tris, np.tile(hex_to_rgb(color), (len(tris), 1)), True)

    def add_sphere(self, center, radius, color, segments=12) -> None:
        tris = []
        for i in range(segments):
            t0 = math.pi * i / segments
            t1 = math.pi * (i + 1) / segments
            for j in range(segments * 2):
                p0 = 2 * math.pi * j / (segments * 2)
                p1 = 2 * math.pi * (j + 1) / (segments * 2)

                def pt(t, p):
                    return np.array(center) + radius * np.array([math.sin(t) * math.cos(p), math.cos(t), math.sin(t) * math.sin(p)])

                tris.append([pt(t0, p0), pt(t1, p0), pt(t1, p1)])
                tris.append([pt(t0, p0), pt(t1, p1), pt(t0, p1)])
        tris = np.array(tris)
        self.add(tris, np.tile(hex_to_rgb(color), (len(tris), 1)), True)

    def add_heightfield(self, spec: dict) -> None:
        heights = np.array(spec["heights"], dtype=np.float64)
        rows, cols = heights.shape
        xs = np.linspace(spec["minX"], spec["maxX"], cols)
        zs = np.linspace(spec["minZ"], spec["maxZ"], rows)
        base = hex_to_rgb(spec.get("color", "#3f6a4a"))
        colors = spec.get("colors")  # optional per-cell hex colours
        tris = []
        cols_out = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                p00 = np.array([xs[j], heights[i, j], zs[i]])
                p10 = np.array([xs[j + 1], heights[i, j + 1], zs[i]])
                p01 = np.array([xs[j], heights[i + 1, j], zs[i + 1]])
                p11 = np.array([xs[j + 1], heights[i + 1, j + 1], zs[i + 1]])
                tris.append([p00, p01, p11])
                tris.append([p00, p11, p10])
                c = hex_to_rgb(colors[i][j]) if colors else base
                cols_out.append(c)
                cols_out.append(c)
        self.add(np.array(tris), np.array(cols_out), True)


def render(scene: dict, size: tuple[int, int], cam: np.ndarray, target: np.ndarray, fov: float, out_path: str) -> None:
    width, height = size
    builder = SceneBuilder()
    for m in scene.get("models", []):
        builder.add_model(m["glb"], m["matrices"])
    for b in scene.get("boxes", []):
        builder.add_box(b["center"], b["size"], b.get("rotationY", 0.0), b.get("color", "#888888"))
    for c in scene.get("cylinders", []):
        builder.add_cylinder(c["center"], c["radius"], c["height"], c.get("color", "#888888"), c.get("segments", 14), c.get("radiusBottom"))
    for s in scene.get("spheres", []):
        builder.add_sphere(s["center"], s["radius"], s.get("color", "#ff00ff"))
    if "heightfield" in scene:
        builder.add_heightfield(scene["heightfield"])
    geometries = scene.get("geometries", {})
    for m in scene.get("meshes", []):
        geo = geometries.get(m["geometry"])
        if geo:
            builder.add_mesh(geo, m["matrices"], m.get("color", "#888888"), bool(m.get("double", False)))

    bg = hex_to_rgb(scene.get("background", "#101018"))
    img = Image.new("RGB", (width, height), tuple(int(v * 255) for v in bg))
    draw = ImageDraw.Draw(img)

    if builder.tris:
        tris = np.concatenate(builder.tris)
        cols = np.concatenate(builder.cols)
        double = np.concatenate(builder.double)

        view = look_at(cam, target)
        aspect = width / height
        f = 1.0 / math.tan(math.radians(fov) / 2)
        near = 0.3

        flat = tris.reshape(-1, 3)
        homo = np.concatenate([flat, np.ones((len(flat), 1))], axis=1)
        cam_space = (homo @ view.T)[:, :3].reshape(-1, 3, 3)
        depth = -cam_space[:, :, 2]  # positive in front
        visible = (depth > near).all(axis=1)

        # lighting (world-space normals)
        e1 = tris[:, 1] - tris[:, 0]
        e2 = tris[:, 2] - tris[:, 0]
        normals = np.cross(e1, e2)
        lens = np.linalg.norm(normals, axis=1)
        ok = lens > 1e-9
        normals[ok] /= lens[ok][:, None]
        light = np.array(scene.get("light", [0.4, 0.8, 0.3]), dtype=np.float64)
        light /= np.linalg.norm(light)
        # back-face culling for single-sided triangles (camera-space winding)
        cs = cam_space
        cn = np.cross(cs[:, 1] - cs[:, 0], cs[:, 2] - cs[:, 0])
        facing = (cn * -cs[:, 0]).sum(axis=1) > 0  # normal points toward the eye
        normals = np.where(facing[:, None], normals, -normals)
        keep = visible & (facing | double)

        ambient = scene.get("ambient", 0.35)
        lambert = np.clip((normals * light).sum(axis=1), 0, 1)
        sky = np.clip(normals[:, 1] * 0.5 + 0.5, 0, 1)
        shade = ambient * (0.6 + 0.4 * sky) + (1 - ambient) * lambert
        shaded = np.clip(cols * shade[:, None], 0, 1)

        fog = scene.get("fog")
        mean_depth = depth.mean(axis=1)
        if fog:
            fog_col = hex_to_rgb(fog["color"])
            t = np.clip((mean_depth - fog["near"]) / max(1e-6, fog["far"] - fog["near"]), 0, 1)[:, None]
            shaded = shaded * (1 - t) + fog_col * t

        # project
        x = cs[:, :, 0] / depth * f / aspect
        y = cs[:, :, 1] / depth * f
        sx = (x * 0.5 + 0.5) * width
        sy = (1 - (y * 0.5 + 0.5)) * height
        order = np.argsort(-mean_depth)
        order = order[keep[order]]
        on_screen = ((sx > -width) & (sx < 2 * width) & (sy > -height) & (sy < 2 * height)).any(axis=1)
        order = order[on_screen[order]]
        rgb = (shaded * 255).astype(np.uint8)
        for i in order:
            pts = [(float(sx[i, k]), float(sy[i, k])) for k in range(3)]
            draw.polygon(pts, fill=tuple(int(v) for v in rgb[i]))

    # markers
    view = look_at(cam, target)
    f = 1.0 / math.tan(math.radians(fov) / 2)
    aspect = width / height
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except OSError:
        font = ImageFont.load_default()
    for m in scene.get("markers", []):
        p = np.array(m["position"] + [1.0]) @ view.T
        d = -p[2]
        if d <= 0.3:
            continue
        px = (p[0] / d * f / aspect * 0.5 + 0.5) * width
        py = (1 - (p[1] / d * f * 0.5 + 0.5)) * height
        col = m.get("color", "#ffff00")
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], outline=col, width=2)
        draw.text((px + 6, py - 7), m.get("label", ""), fill=col, font=font)

    img.save(out_path)
    print(f"wrote {out_path} ({len(builder.tris) and sum(len(t) for t in builder.tris)} triangles)")


def model_sheet(path: str, out_path: str, size: tuple[int, int]) -> None:
    model = load_glb(path)
    lo, hi = model.bounds
    center = (lo + hi) / 2
    extent = float(np.max(hi - lo)) or 1.0
    cam = center + np.array([1.2, 0.9, 1.6]) * extent * 1.25
    scene = {"background": "#2a2f3a", "ambient": 0.4, "light": [0.5, 0.8, 0.4], "models": [{"glb": path, "matrices": [list(np.eye(4).T.reshape(-1))]}]}
    render(scene, size, cam, center, 40, out_path)
    print(f"bounds min={np.round(lo, 2).tolist()} max={np.round(hi, 2).tolist()} size={np.round(hi - lo, 2).tolist()} tris={len(model.positions)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene", nargs="?")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--glb")
    ap.add_argument("--size", default="1280x720")
    ap.add_argument("--cam", default="0,12,40")
    ap.add_argument("--target", default="0,2,0")
    ap.add_argument("--fov", type=float, default=55)
    args = ap.parse_args()
    w, h = (int(v) for v in args.size.split("x"))
    if args.glb:
        model_sheet(args.glb, args.out or args.scene or "model.png", (w, h))
        return
    with open(args.scene) as fh:
        scene = json.load(fh)
    cam = np.array([float(v) for v in args.cam.split(",")])
    target = np.array([float(v) for v in args.target.split(",")])
    render(scene, (w, h), cam, target, args.fov, args.out)


if __name__ == "__main__":
    main()
