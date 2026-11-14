#!/usr/bin/env python3
"""Render the OG image and the icon set from the HTML compositions in _tools/compose/.

Usage: python3 _tools/build_brand.py [base-url]
Serve the site first:  python3 -m http.server 8765
Writes assets/img/og.png, assets/img/icon-192.png, assets/img/icon-512.png,
apple-touch-icon.png and favicon.ico.
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"


def render(page, w, h, out):
    subprocess.run(
        ["google-chrome", "--headless=new", "--no-sandbox", "--hide-scrollbars", "--disable-gpu",
         "--force-device-scale-factor=1", "--timeout=4000", f"--window-size={w},{h}",
         f"--screenshot={out}", f"{BASE}/_tools/compose/{page}"],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


og = os.path.join(ROOT, "assets", "img", "og.png")
render("og.html", 1200, 630, og)
Image.open(og).convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(og, optimize=True)
print("og.png", os.path.getsize(og) // 1024, "KB")

with tempfile.TemporaryDirectory() as tmp:
    raw = os.path.join(tmp, "icon.png")
    render("icon.html", 512, 512, raw)
    icon = Image.open(raw).convert("RGB")
    icon.save(os.path.join(ROOT, "assets", "img", "icon-512.png"), optimize=True)
    icon.resize((192, 192), Image.LANCZOS).save(os.path.join(ROOT, "assets", "img", "icon-192.png"), optimize=True)
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, "apple-touch-icon.png"), optimize=True)
    icon.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
print("icons written")
