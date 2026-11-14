#!/usr/bin/env python3
"""Subset the three OFL families to the characters the site uses and write WOFF2.

Usage: python3 _tools/build_fonts.py <fonts-source-dir>
       (source dir = repo/docs/design/source/fonts)
Writes to assets/fonts/. Variable axes are kept but narrowed to the ranges the
CSS actually uses, which is what keeps the files small.
"""
import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
try:
    import brotli  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "shim"))

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC = sys.argv[1]
OUT = os.path.join(HERE, "..", "assets", "fonts")

# Basic Latin, Latin-1 letters, and the punctuation/symbols used in the copy.
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x0101, 0x012B, 0x014D, 0x016B, 0x1E35, 0x0331, 0x02BC]
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2032, 0x2033]
    + [0x2190, 0x2191, 0x2192, 0x2193, 0x2197, 0x2212, 0x00D7, 0x2713]
)

JOBS = [
    # file, output, axis limits (None = keep full range)
    ("BricolageGrotesque.ttf", "bricolage-grotesque.woff2", {"wght": (500, 800), "wdth": 92, "opsz": (14, 96)}),
    ("AtkinsonHyperlegibleNext.ttf", "atkinson-hyperlegible-next.woff2", {"wght": (400, 700)}),
    ("Inter.ttf", "inter.woff2", {"wght": (400, 700), "opsz": 14}),
]

os.makedirs(OUT, exist_ok=True)
for src, dst, limits in JOBS:
    font = TTFont(os.path.join(SRC, src))
    font = instancer.instantiateVariableFont(font, limits)
    # Round-trip through bytes: subsetting a freshly instanced font trips on lazy tables.
    buf = io.BytesIO()
    font.save(buf)
    buf.seek(0)
    font = TTFont(buf, lazy=False)
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "case", "ss01"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    opts.notdef_outline = True
    opts.flavor = "woff2"
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font.flavor = "woff2"
    path = os.path.join(OUT, dst)
    font.save(path)
    missing = [hex(u) for u in UNICODES if u not in font.getBestCmap()]
    print(f"{dst}: {os.path.getsize(path) / 1024:.1f} KB; missing {missing}")

for lic in ("OFL-bricolagegrotesque.txt", "OFL-atkinsonhyperlegiblenext.txt", "OFL-inter.txt"):
    shutil.copy(os.path.join(SRC, lic), os.path.join(OUT, lic))
