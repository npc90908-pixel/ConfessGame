"""Minimal GLB reader: triangles + flat colours, no GPU required.

Reads the JSON + BIN chunks of a binary glTF, walks the node hierarchy and
returns world-space triangles with one RGB colour per triangle. Colours come
from (in order) vertex colours, the base-colour texture sampled at the UV
centroid (Kenney kits use a palette atlas, so one sample per face is exact),
and the material's baseColorFactor. Supports KHR_texture_transform.
"""
from __future__ import annotations

import json
import math
import os
import struct
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
from PIL import Image

COMPONENT = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
SIZE = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


@dataclass
class Model:
    positions: np.ndarray  # (T, 3, 3) world-space triangle corners (model space of the GLB root)
    colors: np.ndarray  # (T, 3) 0..1
    double_sided: np.ndarray  # (T,) bool
    bounds: tuple[np.ndarray, np.ndarray]


def _read_accessor(gltf: dict, bin_chunk: bytes, index: int) -> np.ndarray:
    acc = gltf["accessors"][index]
    view = gltf["bufferViews"][acc["bufferView"]]
    fmt, csize = COMPONENT[acc["componentType"]]
    n = SIZE[acc["type"]]
    count = acc["count"]
    offset = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride", csize * n)
    dtype = np.dtype(fmt)
    if stride == csize * n:
        arr = np.frombuffer(bin_chunk, dtype=dtype, count=count * n, offset=offset).reshape(count, n)
    else:
        raw = np.frombuffer(bin_chunk, dtype=np.uint8, count=stride * (count - 1) + csize * n, offset=offset)
        arr = np.stack([np.frombuffer(raw[i * stride : i * stride + csize * n].tobytes(), dtype=dtype) for i in range(count)])
    if acc.get("normalized"):
        arr = arr.astype(np.float64) / np.iinfo(dtype).max
    return arr.astype(np.float64)


def _node_matrix(node: dict) -> np.ndarray:
    if "matrix" in node:
        return np.array(node["matrix"], dtype=np.float64).reshape(4, 4).T
    t = node.get("translation", [0, 0, 0])
    r = node.get("rotation", [0, 0, 0, 1])
    s = node.get("scale", [1, 1, 1])
    x, y, z, w = r
    rot = np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
        ]
    )
    m = np.eye(4)
    m[:3, :3] = rot * np.array(s)[None, :]
    m[:3, 3] = t
    return m


@lru_cache(maxsize=64)
def _load_image(path: str) -> np.ndarray | None:
    if not os.path.exists(path):
        return None
    img = Image.open(path).convert("RGB")
    return np.asarray(img, dtype=np.float64) / 255.0


def _sample(img: np.ndarray, uv: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    u = np.mod(uv[:, 0], 1.0)
    v = np.mod(uv[:, 1], 1.0)
    xi = np.clip((u * w).astype(int), 0, w - 1)
    yi = np.clip((v * h).astype(int), 0, h - 1)
    return img[yi, xi]


def _apply_texture_transform(uv: np.ndarray, tex_info: dict) -> np.ndarray:
    ext = tex_info.get("extensions", {}).get("KHR_texture_transform")
    if not ext:
        return uv
    offset = np.array(ext.get("offset", [0, 0]))
    scale = np.array(ext.get("scale", [1, 1]))
    rotation = ext.get("rotation", 0.0)
    c, s = math.cos(rotation), math.sin(rotation)
    rot = np.array([[c, s], [-s, c]])
    return (uv * scale) @ rot.T + offset


@lru_cache(maxsize=512)
def load_glb(path: str) -> Model:
    with open(path, "rb") as f:
        data = f.read()
    magic, _version, _length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, f"not a GLB: {path}"
    offset = 12
    gltf = None
    bin_chunk = b""
    while offset < len(data):
        clen, ctype = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8 : offset + 8 + clen]
        if ctype == 0x4E4F534A:
            gltf = json.loads(chunk.decode("utf8"))
        elif ctype == 0x004E4942:
            bin_chunk = chunk
        offset += 8 + clen
    assert gltf is not None
    base_dir = os.path.dirname(path)

    tris: list[np.ndarray] = []
    cols: list[np.ndarray] = []
    sides: list[np.ndarray] = []

    def visit(node_index: int, parent: np.ndarray) -> None:
        node = gltf["nodes"][node_index]
        world = parent @ _node_matrix(node)
        if "mesh" in node:
            mesh = gltf["meshes"][node["mesh"]]
            for prim in mesh["primitives"]:
                if prim.get("mode", 4) != 4:
                    continue
                pos = _read_accessor(gltf, bin_chunk, prim["attributes"]["POSITION"])
                if "indices" in prim:
                    idx = _read_accessor(gltf, bin_chunk, prim["indices"]).astype(np.int64).reshape(-1)
                else:
                    idx = np.arange(len(pos))
                idx = idx[: len(idx) - len(idx) % 3].reshape(-1, 3)
                homo = np.concatenate([pos, np.ones((len(pos), 1))], axis=1) @ world.T
                wpos = homo[:, :3]
                # colour per vertex
                vcol = np.ones((len(pos), 3))
                mat = gltf.get("materials", [{}])[prim["material"]] if "material" in prim else {}
                pbr = mat.get("pbrMetallicRoughness", {})
                factor = np.array(pbr.get("baseColorFactor", [1, 1, 1, 1])[:3])
                if "COLOR_0" in prim["attributes"]:
                    vcol = _read_accessor(gltf, bin_chunk, prim["attributes"]["COLOR_0"])[:, :3]
                tex_info = pbr.get("baseColorTexture")
                if tex_info is not None and "TEXCOORD_0" in prim["attributes"]:
                    tex = gltf["textures"][tex_info["index"]]
                    image = gltf["images"][tex["source"]]
                    img = _load_image(os.path.join(base_dir, image["uri"])) if "uri" in image else None
                    if img is not None:
                        uv = _read_accessor(gltf, bin_chunk, prim["attributes"]["TEXCOORD_0"])
                        uv = _apply_texture_transform(uv, tex_info)
                        vcol = vcol * _sample(img, uv)
                face_col = vcol[idx].mean(axis=1) * factor[None, :]
                tris.append(wpos[idx])
                cols.append(face_col)
                sides.append(np.full(len(idx), bool(mat.get("doubleSided", False))))
        for child in node.get("children", []):
            visit(child, world)

    scene = gltf["scenes"][gltf.get("scene", 0)]
    for root in scene["nodes"]:
        visit(root, np.eye(4))

    if tris:
        positions = np.concatenate(tris)
        colors = np.clip(np.concatenate(cols), 0, 1)
        double = np.concatenate(sides)
    else:
        positions = np.zeros((0, 3, 3))
        colors = np.zeros((0, 3))
        double = np.zeros((0,), dtype=bool)
    flat = positions.reshape(-1, 3)
    bounds = (flat.min(axis=0), flat.max(axis=0)) if len(flat) else (np.zeros(3), np.zeros(3))
    return Model(positions, colors, double, bounds)
