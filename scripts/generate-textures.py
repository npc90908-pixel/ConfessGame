#!/usr/bin/env python3
"""
Generate every texture the game needs:

  public/particles/*.webp   soft alpha sprites (glow, star, spark, firefly,
                            cloud, ring, petal, leaf, heart)
  public/textures/*.webp    tileable noise, paper, water normal map, caustics
  public/memories/*.webp    five painterly placeholder "photos" (replace with
                            your own pictures — same filenames, any size)
  public/images/og.jpg      social preview card

    pip install numpy pillow
    python3 scripts/generate-textures.py
"""

from __future__ import annotations

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")


def save(img: Image.Image, rel: str, **kw):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, **kw)
    print(f"{rel:36s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) // 1024} KB")


def grid(size):
    y, x = np.mgrid[0:size, 0:size].astype(np.float64)
    x = (x + 0.5) / size * 2 - 1
    y = (y + 0.5) / size * 2 - 1
    return x, y


def to_rgba(alpha: np.ndarray, rgb=(255, 255, 255)):
    a = np.clip(alpha, 0, 1)
    h, w = a.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0] = rgb[0]
    out[..., 1] = rgb[1]
    out[..., 2] = rgb[2]
    out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


# --------------------------------------------------------------------------- #
#  Value noise helpers (tileable)
# --------------------------------------------------------------------------- #


def tileable_noise(size, cells, rng, octaves=5, persistence=0.5):
    out = np.zeros((size, size))
    amp = 1.0
    total = 0.0
    for o in range(octaves):
        c = cells * 2**o
        if c > size:
            break
        g = rng.random((c, c))
        # bilinear upsample with wrap
        gy, gx = np.mgrid[0:size, 0:size].astype(np.float64)
        fx = gx / size * c
        fy = gy / size * c
        x0 = np.floor(fx).astype(int) % c
        y0 = np.floor(fy).astype(int) % c
        x1 = (x0 + 1) % c
        y1 = (y0 + 1) % c
        tx = fx - np.floor(fx)
        ty = fy - np.floor(fy)
        tx = tx * tx * (3 - 2 * tx)
        ty = ty * ty * (3 - 2 * ty)
        v = (g[y0, x0] * (1 - tx) + g[y0, x1] * tx) * (1 - ty) + (g[y1, x0] * (1 - tx) + g[y1, x1] * tx) * ty
        out += v * amp
        total += amp
        amp *= persistence
    return out / total


# --------------------------------------------------------------------------- #
#  Particle sprites
# --------------------------------------------------------------------------- #


def sprite_glow(size=128):
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-(r**2) * 4.5) * 0.9 + np.exp(-(r**2) * 20) * 0.5
    return to_rgba(a)


def sprite_star(size=128):
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    core = np.exp(-(r**2) * 30)
    rays = np.exp(-np.abs(x) * 14) * np.exp(-np.abs(y) * 1.5) + np.exp(-np.abs(y) * 14) * np.exp(-np.abs(x) * 1.5)
    diag = (np.exp(-np.abs(x - y) * 18) + np.exp(-np.abs(x + y) * 18)) * np.exp(-r * 3) * 0.35
    a = np.clip(core * 1.2 + rays * 0.8 * np.exp(-r * 1.2) + diag, 0, 1)
    return to_rgba(a)


def sprite_spark(size=64):
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-(r**2) * 12) + np.exp(-np.abs(x) * 20) * np.exp(-(y**2) * 6) * 0.6
    return to_rgba(np.clip(a, 0, 1))


def sprite_firefly(size=96):
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-(r**2) * 7) * 0.9 + np.exp(-(r**2) * 60) * 0.6
    img = to_rgba(a, (255, 244, 200))
    return img


def sprite_cloud(size=256, seed=11):
    rng = np.random.default_rng(seed)
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    n = tileable_noise(size, 4, rng, octaves=5)
    n = (n - n.min()) / (n.max() - n.min())
    mask = np.clip(1.25 - r * 1.25, 0, 1) ** 1.3
    a = np.clip((n * 1.6 - 0.25) * mask, 0, 1) * 0.9
    img = to_rgba(a)
    return img.filter(ImageFilter.GaussianBlur(3))


def sprite_ring(size=128):
    x, y = grid(size)
    r = np.sqrt(x * x + y * y)
    a = np.exp(-((r - 0.72) ** 2) * 120) * 0.9 + np.exp(-((r - 0.72) ** 2) * 18) * 0.3
    return to_rgba(np.clip(a, 0, 1))


def sprite_petal(size=96):
    x, y = grid(size)
    # teardrop petal
    py = (y + 0.15) / 0.85
    px = x / (0.45 * (1 - 0.35 * py))
    shape = (px * px + py * py) < 1
    a = shape.astype(float)
    img = to_rgba(a, (255, 224, 236))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    # a bit of shading
    arr = np.array(img).astype(np.float64)
    shade = 1 - np.clip(np.abs(x) * 0.5 + (y + 1) * 0.12, 0, 0.4)
    arr[..., :3] *= shade[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def sprite_leaf(size=96):
    x, y = grid(size)
    px = x / 0.42
    py = y / 0.9
    shape = (np.abs(px) ** 1.6 + np.abs(py) ** 1.6) < 1
    vein = (np.abs(x) < 0.02) & (np.abs(y) < 0.8)
    a = shape.astype(float)
    img = to_rgba(a, (178, 228, 170))
    arr = np.array(img).astype(np.float64)
    arr[..., :3][vein] *= 0.75
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    return img.filter(ImageFilter.GaussianBlur(1.0))


def sprite_heart(size=128):
    x, y = grid(size)
    X = x * 1.3
    Y = -y * 1.3 + 0.1
    f = (X * X + Y * Y - 1) ** 3 - X * X * Y**3
    a = (f < 0).astype(float)
    img = to_rgba(a, (255, 150, 190))
    img = img.filter(ImageFilter.GaussianBlur(1.3))
    glow = to_rgba(np.exp(-(x * x + y * y) * 3) * 0.35, (255, 170, 200))
    return Image.alpha_composite(glow, img)


# --------------------------------------------------------------------------- #
#  Textures
# --------------------------------------------------------------------------- #


def tex_noise(size=256, seed=5):
    rng = np.random.default_rng(seed)
    r = tileable_noise(size, 4, rng, 6)
    g = tileable_noise(size, 8, rng, 5)
    b = tileable_noise(size, 16, rng, 4)
    a = rng.random((size, size))
    arr = np.stack([r, g, b, a], axis=-1)
    arr = (arr - arr.min((0, 1))) / (arr.max((0, 1)) - arr.min((0, 1)))
    return Image.fromarray((arr * 255).astype(np.uint8), "RGBA")


def tex_paper(size=512, seed=9):
    rng = np.random.default_rng(seed)
    base = tileable_noise(size, 6, rng, 6, 0.55)
    fibers = tileable_noise(size, 64, rng, 2, 0.5)
    v = 0.86 + (base - 0.5) * 0.12 + (fibers - 0.5) * 0.08
    rgb = np.stack([v * 255, v * 247, v * 232], axis=-1)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def tex_water_normal(size=512, seed=21):
    rng = np.random.default_rng(seed)
    h = tileable_noise(size, 6, rng, 6, 0.55) * 1.0 + tileable_noise(size, 24, rng, 3, 0.5) * 0.4
    dx = np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)
    dy = np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)
    strength = 6.0
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(h)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx / length, ny / length, nz / length], axis=-1)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8), "RGB")


def tex_caustics(size=512, seed=33):
    rng = np.random.default_rng(seed)
    a = tileable_noise(size, 8, rng, 3, 0.5)
    b = tileable_noise(size, 8, rng, 3, 0.5)
    c = 1 - np.abs(a - b) * 4
    c = np.clip(c, 0, 1) ** 3
    d = tileable_noise(size, 16, rng, 2, 0.5)
    v = np.clip(c * 0.8 + (1 - np.abs(d - 0.5) * 5).clip(0, 1) ** 4 * 0.5, 0, 1)
    return Image.fromarray((v * 255).astype(np.uint8), "L").convert("RGB")


# --------------------------------------------------------------------------- #
#  Memory placeholders — painterly gradient cards with a motif each
# --------------------------------------------------------------------------- #

MEMORY_CARDS = [
    ("memory-01", ("#2b1a4e", "#ff8fb8"), "cafe"),
    ("memory-02", ("#0f2f4a", "#8fd3ff"), "rain"),
    ("memory-03", ("#3a1f3a", "#f3d08a"), "sunset"),
    ("memory-04", ("#1a2b3a", "#b9a7ff"), "stars"),
    ("memory-05", ("#2a1a2a", "#ffd6e7"), "hearts"),
]


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def gradient(size, c0, c1, angle=0.6):
    w, h = size
    x, y = np.meshgrid(np.linspace(0, 1, w), np.linspace(0, 1, h))
    t = np.clip(x * math.cos(angle) + y * math.sin(angle), 0, 1)
    c0 = np.array(hex_rgb(c0), dtype=float)
    c1 = np.array(hex_rgb(c1), dtype=float)
    arr = c0[None, None, :] * (1 - t[..., None]) + c1[None, None, :] * t[..., None]
    return arr


def memory_card(name, colors, motif, seed, size=(960, 720)):
    rng = np.random.default_rng(seed)
    w, h = size
    arr = gradient(size, colors[0], colors[1])
    # soft bokeh blobs
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    bokeh = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(bokeh)
    for _ in range(26):
        r = int(rng.uniform(18, 90))
        cx = int(rng.uniform(-r, w + r))
        cy = int(rng.uniform(-r, h + r))
        col = hex_rgb(colors[1])
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(col[0], col[1], col[2], int(rng.uniform(20, 70))))
    bokeh = bokeh.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, bokeh)

    motif_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(motif_layer)
    accent = hex_rgb(colors[1])
    white = (255, 255, 255)
    if motif == "cafe":
        # two cups on a table
        d.rectangle([0, int(h * 0.68), w, h], fill=(60, 35, 50, 170))
        for cx in (int(w * 0.38), int(w * 0.6)):
            d.rounded_rectangle([cx - 70, int(h * 0.5), cx + 70, int(h * 0.68)], radius=22, fill=white + (230,))
            d.ellipse([cx - 60, int(h * 0.47), cx + 60, int(h * 0.55)], fill=(120, 70, 50, 255))
            d.arc([cx + 60, int(h * 0.53), cx + 110, int(h * 0.64)], 270, 90, fill=white + (230,), width=10)
            for k in range(3):
                sx = cx - 25 + k * 25
                d.line([(sx, int(h * 0.44)), (sx + 8, int(h * 0.36))], fill=(255, 255, 255, 110), width=6)
    elif motif == "rain":
        for _ in range(140):
            x0 = rng.uniform(0, w)
            y0 = rng.uniform(0, h)
            ln = rng.uniform(20, 60)
            d.line([(x0, y0), (x0 - 6, y0 + ln)], fill=(255, 255, 255, int(rng.uniform(40, 120))), width=2)
        # umbrella
        cx, cy = int(w * 0.5), int(h * 0.52)
        d.pieslice([cx - 170, cy - 170, cx + 170, cy + 170], 180, 360, fill=accent + (235,))
        d.line([(cx, cy), (cx, cy + 180)], fill=(60, 40, 60, 255), width=8)
        d.arc([cx - 30, cy + 150, cx + 30, cy + 210], 0, 180, fill=(60, 40, 60, 255), width=8)
    elif motif == "sunset":
        cx, cy = int(w * 0.5), int(h * 0.58)
        for r, al in ((260, 40), (200, 70), (150, 120), (110, 255)):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 210, 150, al))
        d.rectangle([0, cy + 10, w, h], fill=(40, 20, 50, 200))
        # two silhouettes
        for sx in (cx - 60, cx + 40):
            d.ellipse([sx - 18, cy - 90, sx + 18, cy - 54], fill=(20, 10, 25, 255))
            d.rounded_rectangle([sx - 28, cy - 56, sx + 28, cy + 30], radius=20, fill=(20, 10, 25, 255))
    elif motif == "stars":
        for _ in range(220):
            x0 = rng.uniform(0, w)
            y0 = rng.uniform(0, h * 0.75)
            r = rng.uniform(1, 3.5)
            d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=(255, 255, 255, int(rng.uniform(90, 255))))
        pts = [(w * 0.3, h * 0.3), (w * 0.42, h * 0.22), (w * 0.55, h * 0.3), (w * 0.62, h * 0.45), (w * 0.5, h * 0.55), (w * 0.36, h * 0.48)]
        d.line(pts + [pts[0]], fill=accent + (200,), width=3)
        for p in pts:
            d.ellipse([p[0] - 7, p[1] - 7, p[0] + 7, p[1] + 7], fill=white + (255,))
        d.polygon([(0, h), (w * 0.25, h * 0.72), (w * 0.45, h * 0.85), (w * 0.7, h * 0.66), (w, h * 0.8), (w, h)], fill=(15, 10, 30, 255))
    elif motif == "hearts":
        for _ in range(40):
            cx = rng.uniform(0, w)
            cy = rng.uniform(0, h)
            s = rng.uniform(10, 46)
            al = int(rng.uniform(40, 160))
            heart_poly(d, cx, cy, s, (255, 255, 255, al))
        heart_poly(d, w * 0.5, h * 0.5, 170, accent + (240,))
        heart_poly(d, w * 0.5, h * 0.5, 120, (255, 255, 255, 230))

    img = Image.alpha_composite(img, motif_layer)
    # vignette + film grain
    x, y = np.meshgrid(np.linspace(-1, 1, w), np.linspace(-1, 1, h))
    vig = np.clip(1 - (x * x + y * y) * 0.35, 0, 1)
    arr = np.array(img).astype(np.float64)
    arr[..., :3] *= vig[..., None]
    arr[..., :3] += rng.normal(0, 4, (h, w, 1))
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").convert("RGB")
    return img


def heart_poly(d: ImageDraw.ImageDraw, cx, cy, s, fill):
    pts = []
    for i in range(60):
        t = i / 60 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * s / 17, cy - y * s / 17))
    d.polygon(pts, fill=fill)


def og_card(size=(1200, 630)):
    w, h = size
    arr = gradient(size, "#120b2e", "#3a1f5a", 0.9)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = np.random.default_rng(3)
    for _ in range(260):
        x0 = rng.uniform(0, w)
        y0 = rng.uniform(0, h)
        r = rng.uniform(0.8, 3)
        d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=(255, 255, 255, int(rng.uniform(60, 220))))
    heart_poly(d, w * 0.78, h * 0.5, 150, (255, 111, 163, 230))
    heart_poly(d, w * 0.78, h * 0.5, 100, (255, 214, 231, 240))
    img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(0.6)))
    d = ImageDraw.Draw(img)
    try:
        font_big = ImageFont.truetype(os.path.join(ROOT, "fonts", "cormorant-garamond-600.woff2"), 84)
    except Exception:
        font_big = ImageFont.load_default()
    try:
        font_small = ImageFont.truetype(os.path.join(ROOT, "fonts", "inter-400.woff2"), 30)
    except Exception:
        font_small = ImageFont.load_default()
    d.text((80, 200), "A Journey to Your Heart", font=font_big, fill=(255, 240, 248))
    d.text((84, 310), "Sebuah petualangan kecil, dari aku untukmu.", font=font_small, fill=(220, 200, 235))
    return img.convert("RGB")


def key_visual(size=(896, 1120)):
    """Portrait key art used by the no-WebGL fallback page."""
    w, h = size
    arr = gradient(size, "#0b0820", "#4a2a6a", 1.2)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = np.random.default_rng(8)
    for _ in range(320):
        x0 = rng.uniform(0, w)
        y0 = rng.uniform(0, h * 0.8)
        r = rng.uniform(0.8, 3)
        d.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=(255, 255, 255, int(rng.uniform(60, 220))))
    # floating island silhouette
    cx, cy = w * 0.5, h * 0.62
    d.ellipse([cx - 260, cy - 60, cx + 260, cy + 60], fill=(70, 120, 90, 255))
    d.polygon([(cx - 240, cy + 10), (cx + 240, cy + 10), (cx + 60, cy + 320), (cx - 40, cy + 360)], fill=(40, 28, 60, 255))
    # crystal tree
    d.rectangle([cx - 14, cy - 220, cx + 14, cy - 20], fill=(60, 40, 70, 255))
    for r, al in ((150, 60), (110, 120), (80, 220)):
        d.ellipse([cx - r, cy - 300 - r * 0.6, cx + r, cy - 300 + r * 0.6], fill=(255, 160, 200, al))
    heart_poly(d, cx, cy - 300, 60, (255, 240, 248, 255))
    layer = layer.filter(ImageFilter.GaussianBlur(0.8))
    img = Image.alpha_composite(img, layer)
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([cx - 300, cy - 600, cx + 300, cy], fill=(255, 150, 200, 70))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(80)))
    return img.convert("RGB")


# --------------------------------------------------------------------------- #


def main():
    save(sprite_glow(), "particles/glow.webp", lossless=True)
    save(sprite_star(), "particles/star.webp", lossless=True)
    save(sprite_spark(), "particles/spark.webp", lossless=True)
    save(sprite_firefly(), "particles/firefly.webp", lossless=True)
    save(sprite_cloud(), "particles/cloud.webp", quality=90)
    save(sprite_ring(), "particles/ring.webp", lossless=True)
    save(sprite_petal(), "particles/petal.webp", lossless=True)
    save(sprite_leaf(), "particles/leaf.webp", lossless=True)
    save(sprite_heart(), "particles/heart.webp", lossless=True)

    save(tex_noise(), "textures/noise.webp", lossless=True)
    save(tex_paper(), "textures/paper.webp", quality=88)
    save(tex_water_normal(), "textures/water-normal.webp", quality=92)
    save(tex_caustics(), "textures/caustics.webp", quality=88)

    for i, (name, colors, motif) in enumerate(MEMORY_CARDS):
        save(memory_card(name, colors, motif, 100 + i), f"memories/{name}.webp", quality=84)

    save(og_card(), "images/og.jpg", quality=88)
    save(key_visual(), "images/key-visual.webp", quality=84)


if __name__ == "__main__":
    main()
