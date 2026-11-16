#!/usr/bin/env python3
"""Makes the app icons in assets/img/app/ and assets/img/apple-touch-icon.png.

The 3D part (curtains, stage, bulbs and the gold "AI Dashboard" letters) is
drawn by tools/icon-lab.html. The So Drama logo is then laid on top from
assets/img/logo-white.png, unchanged.

Needs:  pip install playwright pillow fonttools   and a Chrome or Chromium binary.
Run from anywhere:
    python3 tools/make_icon.py [path-to-chrome] [--preview out.png]
"""
import base64
import functools
import http.server
import io
import sys
import threading
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFilter
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'assets' / 'img' / 'app'
TEXT = 'AI Dashboard'
FONT = ROOT / 'assets' / 'fonts' / 'archivo-var.woff'
ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']

# Where things sit, as a share of the icon's width.
LOGO_WIDTH = 0.5
LOGO_CENTRE_Y = 0.3
LOOK = {'textWidth': 3.5, 'textZ': 1.8, 'depth': 0.36, 'eyeY': 3.4, 'eyeZ': 12, 'lookY': 0.9, 'fov': 30, 'tilt': -0.06}


class Outline(BasePen):
    """Records a letter as M, L, Q and C steps that three.js can follow."""

    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.ops = []

    def _moveTo(self, p):
        self.ops.append(['M', *p])

    def _lineTo(self, p):
        self.ops.append(['L', *p])

    def _qCurveToOne(self, p1, p2):
        self.ops.append(['Q', *p1, *p2])

    def _curveToOne(self, p1, p2, p3):
        self.ops.append(['C', *p1, *p2, *p3])


def letter_outlines():
    font = instancer.instantiateVariableFont(TTFont(str(FONT)), {'wght': 800, 'wdth': 100})
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet()
    letters, x = [], 0
    for ch in TEXT:
        name = cmap[ord(ch)]
        pen = Outline(glyph_set)
        glyph_set[name].draw(pen)
        if pen.ops:
            letters.append({'x': x, 'ops': pen.ops})
        x += font['hmtx'][name][0]
    return {'unitsPerEm': font['head'].unitsPerEm, 'letters': letters}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def render_scene(chrome):
    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=chrome, args=ARGS) if chrome else p.chromium.launch(args=ARGS)
            page = browser.new_page(viewport={'width': 600, 'height': 600})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_port}/tools/icon-lab.html')
            page.wait_for_function('window.ready === true', timeout=60000)
            data = page.evaluate('([g, look]) => window.renderIcon(g, look)', [letter_outlines(), LOOK])
            browser.close()
            if errors:
                raise SystemExit('icon-lab.html failed: ' + '; '.join(errors))
    finally:
        server.shutdown()
    return Image.open(io.BytesIO(base64.b64decode(data.split(',', 1)[1]))).convert('RGBA')


def compose(scene):
    S = scene.width
    art = scene.copy()
    # Darken the top a little so the white logo stands out against the curtain.
    shade = Image.new('L', (S, S), 0)
    d = ImageDraw.Draw(shade)
    for y in range(int(S * 0.5)):
        d.line([(0, y), (S, y)], fill=int(120 * (1 - y / (S * 0.5)) ** 1.6))
    art = Image.alpha_composite(art, Image.merge('RGBA', (*[Image.new('L', (S, S), v) for v in (12, 10, 16)], shade)))
    # The logo, exactly as it is.
    logo = Image.open(ROOT / 'assets' / 'img' / 'logo-white.png').convert('RGBA')
    w = int(S * LOGO_WIDTH)
    h = round(logo.height * w / logo.width)
    art.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((S - w) // 2, round(S * LOGO_CENTRE_Y - h / 2)))
    return art


def save(art, preview=None):
    S = art.width
    APP.mkdir(parents=True, exist_ok=True)
    small = lambda img, size: img.resize((size, size), Image.LANCZOS)
    # Full-bleed: Android crops these into its own shape, and iPhones round the corners themselves.
    small(art, 512).save(APP / 'icon-maskable-512.png', optimize=True)
    small(art, 192).save(APP / 'icon-maskable-192.png', optimize=True)
    small(art.convert('RGB'), 180).save(ROOT / 'assets' / 'img' / 'apple-touch-icon.png', optimize=True)
    # A rounded tile, for computers and launchers that show the icon as it is.
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=255)
    tile = art.copy()
    tile.putalpha(mask)
    small(tile, 512).save(APP / 'icon-512.png', optimize=True)
    small(tile, 192).save(APP / 'icon-192.png', optimize=True)
    if preview:
        sheet = Image.new('RGBA', (1240, 560), (60, 60, 60, 255))
        sheet.alpha_composite(small(tile, 512), (20, 24))
        circle = Image.new('L', (512, 512), 0)
        ImageDraw.Draw(circle).ellipse((0, 0, 511, 511), fill=255)
        c = small(art, 512)
        c.putalpha(circle)
        ImageDraw.Draw(c).ellipse((51, 51, 461, 461), outline=(0, 255, 255, 110), width=2)   # the part Android always keeps
        sheet.alpha_composite(c, (560, 24))
        y = 20
        for size in (128, 96, 64, 48):
            sheet.alpha_composite(small(tile, size), (1100 + (128 - size) // 2, y))
            y += size + 14
        sheet.save(preview)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    scene = render_scene(args[0] if args else None)
    save(compose(scene), preview)
    print('wrote', ', '.join(p.name for p in sorted(APP.glob('*.png'))), 'and apple-touch-icon.png')
