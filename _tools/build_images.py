#!/usr/bin/env python3
"""Cut the locked app screenshots into per-pane, responsive derivatives.

Usage: python3 _tools/build_images.py <design-dir>
       (design dir = repo/docs/design, holding the 12 PNGs)

Each unfolded screenshot is 2676x2160: two 1296px panes either side of an 84px
hinge band. The site draws its own hinge, so each pane is exported on its own
as <name>-l / <name>-r. The folded screenshot is a single pane (<name>-f).
Output: assets/img/screens/<name>-<pane>-<width>.webp (+ one .jpg fallback).
"""
import glob
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
OUT = os.path.join(HERE, "..", "assets", "img", "screens")
PANE_W, PANE_H, HINGE = 1296, 2160, 84
WIDTHS = [360, 540, 800, 1080]
JPG_WIDTH = 540

os.makedirs(OUT, exist_ok=True)
total = 0
for path in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    name = os.path.splitext(os.path.basename(path))[0]
    im = Image.open(path).convert("RGB")
    if im.width == PANE_W:
        panes = {"f": im}
    else:
        panes = {
            "l": im.crop((0, 0, PANE_W, PANE_H)),
            "r": im.crop((PANE_W + HINGE, 0, 2 * PANE_W + HINGE, PANE_H)),
        }
    for key, pane in panes.items():
        for w in WIDTHS:
            h = round(w * PANE_H / PANE_W)
            small = pane.resize((w, h), Image.LANCZOS)
            dst = os.path.join(OUT, f"{name}-{key}-{w}.webp")
            small.save(dst, "WEBP", quality=74, method=6)
            total += os.path.getsize(dst)
            if w == JPG_WIDTH:
                dst = os.path.join(OUT, f"{name}-{key}-{w}.jpg")
                small.save(dst, "JPEG", quality=78, optimize=True, progressive=True)
                total += os.path.getsize(dst)
    print(name, list(panes))
print(f"total {total / 1e6:.1f} MB")
