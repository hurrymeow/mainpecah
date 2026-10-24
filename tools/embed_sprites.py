"""Embed assets/*.webp into index.html as data URIs (keeps the game a single file).

Usage: python3 tools/embed_sprites.py   (run after tools/sprites.py)
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAMES = ['sleep', 'fight2', 'fight4', 'fight8', 'boom', 'jump']

entries = ''.join(
    f"\n    {n}: 'data:image/webp;base64,{base64.b64encode((ROOT / 'assets' / f'{n}.webp').read_bytes()).decode()}',"
    for n in NAMES)
html = (ROOT / 'index.html').read_text()
html, count = re.subn(r"/\* SPRITES:BEGIN \*/.*?\};/\* SPRITES:END \*/",
                      lambda _: f"/* SPRITES:BEGIN */{entries}\n  }};/* SPRITES:END */", html, flags=re.S)
assert count == 1, 'sprite markers not found'
(ROOT / 'index.html').write_text(html)
print(f'embedded {len(NAMES)} sprites, index.html is {len(html) // 1024} KB')
