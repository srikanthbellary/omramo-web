#!/usr/bin/env python3
"""Full-page screenshots with headless Chrome, for visual checks.

Usage: python3 _tools/shots.py <out-dir> [base-url]
Serve the site first:  python3 -m http.server 8765
Pages are captured with ?static=1 (no scroll-driven motion, tabs unfolded into
stacked sections) in a very tall window, then trimmed to the content height.
"""
import os
import subprocess
import sys

from PIL import Image

OUT = sys.argv[1]
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8765"
PAGES = [("home", "/"), ("privacy", "/privacy/"), ("terms", "/terms/"), ("404", "/404.html")]
WIDTHS = [1440, 390]
TALL = 30000

os.makedirs(OUT, exist_ok=True)
for name, path in PAGES:
    for w in WIDTHS:
        out = os.path.join(OUT, f"{name}-{w}.png")
        subprocess.run(
            ["google-chrome", "--headless=new", "--no-sandbox", "--hide-scrollbars", "--disable-gpu",
             "--force-prefers-reduced-motion", "--virtual-time-budget=8000",
             f"--window-size={w},{TALL}", f"--screenshot={out}", f"{BASE}{path}?static=1"],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        im = Image.open(out).convert("RGB")
        px = im.load()
        base = px[2, im.height - 1]
        y = im.height - 1
        while y > 0 and all(px[x, y] == base for x in range(0, im.width, 16)):
            y -= 1
        im.crop((0, 0, im.width, min(im.height, y + 2))).save(out, optimize=True)
        print(out, im.width, y + 2)
