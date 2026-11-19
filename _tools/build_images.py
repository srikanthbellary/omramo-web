#!/usr/bin/env python3
"""Turn real app screenshots (iOS Simulator captures) into responsive site images.

Usage: python3 _tools/build_images.py <screens-r5-dir> <sim-shots-dir>
       screens-r5-dir: the round-5 captures (r5-*.png)
       sim-shots-dir:  the round-4 captures (r4-*.png)

Every shot the site uses is listed in SHOTS below. For each one this writes
assets/img/shots/<name>-<width>.avif and .webp at the listed widths, plus one
<name>.png fallback (palette PNG), and prints the intrinsic size to put in the <img> tag.

Notes on the captures:
- Every r5 iPad capture is a landscape screen that XCUITest saved rotated by 90 degrees
  (whatever its -landscape / -portrait suffix says). They are turned upright here.
- The unfolded iPhone capture (2868x1320) has the fold as a dark band at x = 1416..1451;
  the site draws its own hinge, so the two panes are written separately (-l / -r).
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
R5, R4 = sys.argv[1], sys.argv[2]
OUT = os.path.join(HERE, "..", "assets", "img", "shots")

PAD = [480, 800, 1200, 1600]    # iPad, landscape (2752x2064)
PHONE = [320, 480, 720, 960]    # iPhone, portrait (1320x2868)
PANE = [400, 700, 1000, 1400]   # one pane of the unfolded iPhone (1416x1320)

# name: (source, widths, pane)   pane = None | "l" | "r"
SHOTS = {
    # hero: the unfolded iPhone, and the same page folded
    "duo-monkey-l": (f"{R4}/r4-iphone-reader-monkey-unfolded.png", PANE, "l"),
    "duo-monkey-r": (f"{R4}/r4-iphone-reader-monkey-unfolded.png", PANE, "r"),
    "phone-monkey": (f"{R4}/r4-iphone-reader-monkey-folded.png", PHONE, None),
    # three levels, three regions (round 5)
    "pad-sailor": (f"{R5}/r5-ipad-reader-sailor-portrait.png", PAD, None),
    "pad-sadko": (f"{R5}/r5-ipad-reader-sadko-portrait.png", PAD, None),
    "pad-zal": (f"{R5}/r5-ipad-reader-zal-portrait.png", PAD, None),
    # the library with the whole catalog
    "pad-library": (f"{R5}/r5-ipad-library-landscape.png", PAD, None),
    # a landmark card
    "pad-pyramid": (f"{R5}/r5-ipad-landmark-pyramid-landscape.png", PAD, None),
    # tap to see: the same page closed and open (round 4; the two captures line up exactly)
    "pad-monkey": (f"{R4}/r4-ipad-reader-monkey-landscape.png", PAD, None),
    "pad-monkey-tap": (f"{R4}/r4-ipad-tap-to-see-landscape.png", PAD, None),
    # more tap-to-see cards (round 5)
    "pad-kayak": (f"{R5}/r5-ipad-tap-to-see-kayak-landscape.png", PAD[:3], None),
    "pad-gusli": (f"{R5}/r5-ipad-tap-to-see-gusli-landscape.png", PAD[:3], None),
    "pad-balafon": (f"{R5}/r5-ipad-tap-to-see-balafon-landscape.png", PAD[:3], None),
    # character card, folded card, story finished
    "pad-simurgh": (f"{R5}/r5-ipad-character-simurgh-landscape.png", PAD, None),
    "phone-tap-folded": (f"{R4}/r4-iphone-tap-to-see-folded.png", PHONE, None),
    "phone-finished": (f"{R5}/r5-iphone-finished-snow-house-portrait.png", PHONE, None),
    # the splash with the new tagline
    "pad-splash": (f"{R5}/r5-ipad-splash-landscape.png", PAD, None),
}
FALLBACK_W = {"pad": 800, "phone": 480, "duo": 700}
HINGE = (1416, 1452)


def load(src, pane):
    im = Image.open(src).convert("RGB")
    if os.path.basename(src).startswith("r5-ipad-") and im.width < im.height:
        im = im.transpose(Image.Transpose.ROTATE_90)
    if pane == "l":
        im = im.crop((0, 0, HINGE[0], im.height))
    elif pane == "r":
        im = im.crop((HINGE[1], 0, im.width, im.height))
    return im


os.makedirs(OUT, exist_ok=True)
total = 0
for name, (src, widths, pane) in SHOTS.items():
    im = load(src, pane)
    for w in widths:
        small = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
        for ext, opts in (("avif", {"quality": 58, "speed": 4}), ("webp", {"quality": 76, "method": 6})):
            dst = os.path.join(OUT, f"{name}-{w}.{ext}")
            small.save(dst, ext.upper(), **opts)
            total += os.path.getsize(dst)
    fw = FALLBACK_W[name.split("-")[0]]
    fb = im.resize((fw, round(fw * im.height / im.width)), Image.LANCZOS)
    dst = os.path.join(OUT, f"{name}.png")
    # the fallback only reaches browsers without WebP: a 256-colour palette keeps it light
    fb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(dst, "PNG", optimize=True)
    total += os.path.getsize(dst)
    print(f"{name:18} {im.width}x{im.height}  fallback {fb.width}x{fb.height}")
print(f"total {total / 1e6:.1f} MB")
