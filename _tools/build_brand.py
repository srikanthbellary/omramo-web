#!/usr/bin/env python3
"""Build the icon set from the app's icon, and render the OG image.

Usage: python3 _tools/build_brand.py <app-icon-1024.png> [base-url]
       app icon: <app-repo>/docs/brand/app-icon-1024.png (round 4, full square; iOS masks
       the corners itself, so the site uses it as is)
Serve the site first (for the OG image):  python3 -m http.server 8765
Writes assets/img/icon-192.png, assets/img/icon-512.png, apple-touch-icon.png, favicon.ico,
and assets/img/og.png (from _tools/compose/og.html).
"""
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
ICON = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8765"

icon = Image.open(ICON).convert("RGB")
for size, path in ((512, "assets/img/icon-512.png"), (192, "assets/img/icon-192.png"), (180, "apple-touch-icon.png")):
    icon.resize((size, size), Image.LANCZOS).save(os.path.join(ROOT, path), optimize=True)
icon.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("icons written")

og = os.path.join(ROOT, "assets", "img", "og.png")
subprocess.run(
    ["google-chrome", "--headless=new", "--no-sandbox", "--hide-scrollbars", "--disable-gpu",
     "--force-device-scale-factor=1", "--virtual-time-budget=4000", "--window-size=1200,630",
     f"--screenshot={og}", f"{BASE}/_tools/compose/og.html"],
    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
Image.open(og).convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(og, optimize=True)
print("og.png", os.path.getsize(og) // 1024, "KB")
