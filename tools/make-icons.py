"""Cut the app icons from tools/icon-source.jpg (Kaboom Kitten sticker on a grey tile).

Run: python3 tools/make-icons.py  (needs Pillow)
any: the grey rounded tile, transparent corners. apple-touch: full-bleed tile (iOS rounds it).
maskable: art shrunk into the 80% safe zone on a full-bleed grey gradient.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "icons"
src = Image.open(ROOT / "icon-source.jpg").convert("RGB")
TILE = (25, 25, 1001, 1001)   # grey rounded tile inside the white margin
INSET = 32                    # clears the tile's rounded corners for full-bleed crops
RADIUS = 105


def lanczos(im, s):
    return im.resize((s, s), Image.LANCZOS)


def any_icon(s):
    tile = src.crop(TILE).convert("RGBA")
    mask = Image.new("L", tile.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, tile.width - 1, tile.height - 1), RADIUS, fill=255)
    tile.putalpha(mask)
    return lanczos(tile, s)


def full_bleed(s):
    t = TILE[0] + INSET, TILE[1] + INSET, TILE[2] - INSET, TILE[3] - INSET
    return lanczos(src.crop(t), s)


def maskable(s):
    # the tile's grey runs light at the top to flat 108 below; read it down a clean column
    stops = [(y, src.getpixel((45, y))[0]) for y in range(140, 701, 40)]
    bg = Image.new("RGB", (s, s))
    d = ImageDraw.Draw(bg)
    for y in range(s):
        sy = TILE[1] + INSET + (TILE[3] - TILE[1] - 2 * INSET) * y / (s - 1)
        v = stops[0][1] if sy <= stops[0][0] else stops[-1][1]
        for (y0, v0), (y1, v1) in zip(stops, stops[1:]):
            if y0 <= sy <= y1:
                v = v0 + (v1 - v0) * (sy - y0) / (y1 - y0)
        d.line([(0, y), (s, y)], fill=(round(v),) * 3)
    art = full_bleed(round(s * 0.8))
    bg.paste(art, ((s - art.width) // 2,) * 2)
    return bg


any_icon(192).save(OUT / "icon-192.png")
any_icon(512).save(OUT / "icon-512.png")
full_bleed(180).save(OUT / "apple-touch-icon.png")
maskable(512).save(OUT / "icon-maskable-512.png")
