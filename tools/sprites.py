"""Cut the AI-generated kitten art out of its (fake checkerboard / white) background.

Usage: python3 tools/sprites.py SRC_DIR    (or --trim to re-trim the existing assets)
Expects SRC_DIR/{sleep,fight2,fight4,fight8,boom,jump}.jpg and writes assets/<name>.webp.
Background = light, unsaturated pixels connected to the image border. The art's dark outline
stops the flood fill, so light-grey fur and clouds inside it are kept.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

NAMES = ['sleep', 'fight2', 'fight4', 'fight8', 'boom', 'jump']
MAX_SIDE = 320
OUTLINE = np.array([43, 29, 22], dtype=np.float32)  # #2b1d16


def cut(path):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    light = rgb.min(axis=2) > 190
    grey = (rgb.max(axis=2) - rgb.min(axis=2)) < 22
    cand = light & grey
    bg = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1) if cand[y, x])
    q.extend((y, x) for x in range(w) for y in (0, h - 1) if cand[y, x])
    for y, x in q:
        bg[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    alpha = np.where(bg, 0, 255).astype(np.float32)
    out = rgb.astype(np.float32)
    # Anti-aliased rim: pixels touching the background fade by how light they are.
    near = np.zeros_like(bg)
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            near |= np.roll(np.roll(bg, dy, 0), dx, 1)
    rim = near & ~bg
    lum = rgb.mean(axis=2)
    a = np.clip((235 - lum) / (235 - 60), 0, 1)
    alpha[rim] = np.minimum(alpha[rim], a[rim] * 255)
    out[rim] = OUTLINE

    img = Image.fromarray(np.dstack([out, alpha]).clip(0, 255).astype(np.uint8), 'RGBA')
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    return trim(img)


def trim(img):
    """Drop near-invisible haze, then crop to the art so CSS can centre it by its box."""
    a = img.getchannel('A').point(lambda v: 0 if v < 24 else v)
    img.putalpha(a)
    return img.crop(a.getbbox())


if __name__ == '__main__':
    if sys.argv[1] == '--trim':
        for f in sorted((Path(__file__).resolve().parent.parent / 'assets').glob('*.webp')):
            img = trim(Image.open(f).convert('RGBA'))
            img.save(f, 'WEBP', quality=88, method=6)
            print(f.stem, img.size)
        sys.exit()
    src = Path(sys.argv[1])
    dst = Path(__file__).resolve().parent.parent / 'assets'
    dst.mkdir(exist_ok=True)
    for n in NAMES:
        img = cut(src / f'{n}.jpg')
        img.save(dst / f'{n}.webp', 'WEBP', quality=88, method=6)
        print(n, img.size, (dst / f'{n}.webp').stat().st_size, 'bytes')
