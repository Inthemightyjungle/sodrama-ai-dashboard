#!/usr/bin/env python3
"""Renders the still pictures of the 3D stage (assets/img/posters/).

The site shows these where the 3D stage cannot run, and uses three of them as
cover art. Re-run this after changing assets/js/stage3d.js.

Needs:  pip install playwright pillow   and a Chrome or Chromium binary.
Run from the repository root while a local server is serving it:
    python3 -m http.server 8765 &
    python3 tools/make_posters.py [path-to-chrome] [--only name,name]
"""
import asyncio
import io
import sys
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'img' / 'posters'
LAB = 'http://127.0.0.1:8765/tools/stage-lab.html'
ARGS = sys.argv[1:]
ONLY = None
if '--only' in ARGS:
    i = ARGS.index('--only')
    ONLY = set(ARGS[i + 1].split(','))
    del ARGS[i:i + 2]
CHROME = ARGS[0] if ARGS else None
# name, bay, width, height, extra framing
SHOTS = [
    ('bay-0', 0, 1200, 1200, 'up=-0.05'),
    ('bay-1', 1, 1200, 1200, 'up=-0.05'),
    ('bay-2', 2, 1200, 1200, 'up=-0.05'),
    ('bay-3', 3, 1200, 1200, 'up=-0.05'),
    ('bay-4', 4, 1200, 1200, 'up=-0.05'),
    ('cover-declare', 1, 960, 600, 'fill=0.92&up=0.03'),
    ('news-update', 4, 960, 600, 'fill=0.94&up=0.0'),
    ('news-caution', 2, 960, 600, 'fill=0.92&up=0.03'),
]


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=CHROME,
            args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        )
        for name, bay, width, height, framing in SHOTS:
            if ONLY and name not in ONLY:
                continue
            context = await browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2)
            page = await context.new_page()
            await page.goto(f'{LAB}?bay={bay}&t=6&poster=1&{framing}', wait_until='load')
            await page.wait_for_function('window.ready === true', timeout=120000)
            await page.wait_for_timeout(500)
            shot = Image.open(io.BytesIO(await page.screenshot())).convert('RGB')
            shot.resize((width, height), Image.LANCZOS).save(OUT / f'{name}.webp', 'WEBP', quality=84, method=6)
            print(f'{name}.webp  {(OUT / f"{name}.webp").stat().st_size // 1000} KB')
            await context.close()
        await browser.close()


asyncio.run(main())
