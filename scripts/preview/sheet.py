"""Contact sheet of GLB models (for choosing kit pieces without a GPU).

    python scripts/preview/sheet.py out.png model1.glb model2.glb ... [--cell 220] [--cols 6]
"""
from __future__ import annotations

import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from glb import load_glb  # noqa: E402
from render import render  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("models", nargs="+")
    ap.add_argument("--cell", type=int, default=220)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--angle", default="1.2,0.9,1.6")
    args = ap.parse_args()
    cell = args.cell
    cols = args.cols
    rows = (len(args.models) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 18)), (36, 40, 52))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
    direction = np.array([float(v) for v in args.angle.split(",")])
    for i, path in enumerate(args.models):
        model = load_glb(path)
        lo, hi = model.bounds
        center = (lo + hi) / 2
        extent = float(np.max(hi - lo)) or 1.0
        cam = center + direction * extent * 1.25
        tmp = f"/tmp/_sheet_{i}.png"
        scene = {"background": "#2a2f3a", "ambient": 0.4, "light": [0.5, 0.8, 0.4], "models": [{"glb": path, "matrices": [list(np.eye(4).T.reshape(-1))]}]}
        render(scene, (cell, cell), cam, center, 40, tmp)
        img = Image.open(tmp)
        x = (i % cols) * cell
        y = (i // cols) * (cell + 18)
        sheet.paste(img, (x, y))
        size = hi - lo
        label = f"{os.path.basename(path)[:-4]}  {size[0]:.2f}x{size[1]:.2f}x{size[2]:.2f}"
        draw.text((x + 4, y + cell + 2), label, fill=(230, 230, 240), font=font)
        os.remove(tmp)
    sheet.save(args.out)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
