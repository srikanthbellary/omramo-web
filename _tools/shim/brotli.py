"""Tiny stand-in for the `brotli` Python module, used only by _tools/build_fonts.py.

fontTools needs brotli to write WOFF2. The build box has no brotli wheel but
does have Node, whose zlib ships Brotli. If the real `brotli` package is
installed, delete this shim directory from PYTHONPATH and nothing changes.
"""
import os
import subprocess
import tempfile

MODE_GENERIC, MODE_TEXT, MODE_FONT = 0, 1, 2
__version__ = "node-shim"

_JS = r"""
const z=require('zlib'),fs=require('fs');
const [, op, src, dst, mode]=process.argv;
const buf=fs.readFileSync(src);
fs.writeFileSync(dst, op==='c'
  ? z.brotliCompressSync(buf,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11,[z.constants.BROTLI_PARAM_MODE]:+mode,[z.constants.BROTLI_PARAM_SIZE_HINT]:buf.length}})
  : z.brotliDecompressSync(buf));
"""


def _run(op, data, mode=0):
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, "in"), os.path.join(d, "out")
        with open(src, "wb") as f:
            f.write(data)
        subprocess.run(["node", "-e", _JS, op, src, dst, str(mode)], check=True)
        with open(dst, "rb") as f:
            return f.read()


def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0):
    return _run("c", bytes(data), mode)


def decompress(data):
    return _run("d", bytes(data))
