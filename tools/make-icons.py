"""Draw the Mono Dark app icons: one square tile cut corner to corner.

Run: python3 tools/make-icons.py  (needs Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG = "#0a0a0a"       # Mono Dark --bg
LEFT = "#ededed"     # Mono Dark --text
RIGHT = "#a1a1a1"    # Mono Dark --text-2
SS = 4               # supersampling factor
OUT = Path(__file__).resolve().parent.parent / "icons"


def draw(size, scale):
    s = size * SS
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    # A 312 square tile on a 512 grid, centred on 256.
    k = s / 512 * scale
    o = s / 2 - 256 * k

    def p(*xy):
        return [o + v * k for v in xy]

    # The cut runs corner to corner; each half moves 16 out along the cut's normal.
    d.polygon(p(100, 100, 380, 100, 100, 380), fill=LEFT)
    d.polygon(p(412, 132, 412, 412, 132, 412), fill=RIGHT)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
draw(192, 1.0).save(OUT / "icon-192.png", optimize=True)
draw(512, 1.0).save(OUT / "icon-512.png", optimize=True)
draw(180, 1.0).save(OUT / "apple-touch-icon.png", optimize=True)
# Maskable icons must keep artwork inside the central 80% circle.
draw(512, 0.78).save(OUT / "icon-maskable-512.png", optimize=True)
