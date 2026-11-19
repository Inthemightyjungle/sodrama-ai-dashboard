#!/usr/bin/env python3
"""Copies each approved tool's own icon into the site.

For every tool in assets/data/tools.js this looks at the tool's website for
the icon the site gives itself (the home-screen icon, the icons in its web
app manifest, or its favicon), takes the largest one, saves a 128 px PNG in
assets/img/tools/ and records it in assets/data/tool-icons.js. The page only
ever shows these local copies, so icons never depend on another site.

A tool with "icon" set uses that picture instead. A tool with no "site" and
no "icon" gets its initials on the page.

Run:  python3 tools/tool_icons.py        (needs Pillow: pip install pillow)
GitHub runs it automatically, see .github/workflows/tool-icons.yml.
"""
import hashlib
import html
import io
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_tools import ROOT, TOOLS, load_tools, problems_in  # noqa: E402

MANIFEST = ROOT / 'assets' / 'data' / 'tool-icons.js'
OUT = ROOT / 'assets' / 'img' / 'tools'
PREFIX = 'window.SD_TOOL_ICONS = '
# Some sites only answer browsers, so this asks the way a browser does.
AGENT = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
SIZE = 128
SMALLEST = 48          # anything smaller looks blurred at the size the page shows it


def fetch(url, limit, accept):
    request = urllib.request.Request(url, headers={
        'User-Agent': AGENT,
        'Accept': accept,
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate',
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError(f'more than {limit // 1_000_000} MB')
        encoding = (response.headers.get('Content-Encoding') or '').lower()
        if encoding == 'gzip':
            body = zlib.decompress(body, 16 + zlib.MAX_WBITS)
        elif encoding == 'deflate':
            try:
                body = zlib.decompress(body)
            except zlib.error:
                body = zlib.decompress(body, -zlib.MAX_WBITS)
        return body, response.geturl(), response.headers.get('Content-Type', '')


def attrs_of(tag):
    return {k.lower(): html.unescape(v) for k, _, v in re.findall(r'([\w:-]+)\s*=\s*(["\'])(.*?)\2', tag, flags=re.S)}


def largest(sizes):
    best = 0
    for part in (sizes or '').lower().split():
        if part == 'any':
            best = max(best, 512)
        m = re.fullmatch(r'(\d+)x(\d+)', part)
        if m:
            best = max(best, min(int(m.group(1)), int(m.group(2))))
    return best


def candidates(site):
    """Icon addresses the site names, best first: [(score, url, how)]."""
    found = []
    base = site
    try:
        body, base, _ = fetch(site, 4_000_000, 'text/html,application/xhtml+xml')
        text = body.decode('utf-8', errors='replace')
        for tag in re.findall(r'<link\b[^>]*>', text, flags=re.I):
            a = attrs_of(tag)
            rel = a.get('rel', '').lower().split()
            href = a.get('href', '').strip()
            if not href or 'mask-icon' in rel:
                continue
            url = urllib.parse.urljoin(base, href)
            size = largest(a.get('sizes'))
            if 'apple-touch-icon' in rel or 'apple-touch-icon-precomposed' in rel:
                found.append((300 + min(size or 180, 256), url, 'home-screen icon'))
            elif 'icon' in rel:
                found.append((100 + min(size, 256), url, f'site icon {a.get("sizes", "")}'.strip()))
            elif 'manifest' in rel:
                try:
                    mbody, murl, _ = fetch(url, 1_000_000, 'application/manifest+json,application/json')
                    for icon in json.loads(mbody.decode('utf-8', errors='replace')).get('icons', []):
                        if not icon.get('src'):
                            continue
                        purpose = str(icon.get('purpose', 'any'))
                        if 'monochrome' in purpose:
                            continue
                        score = 200 + min(largest(icon.get('sizes')), 256) - (40 if 'maskable' in purpose and 'any' not in purpose else 0)
                        found.append((score, urllib.parse.urljoin(murl, icon['src']), 'app icon'))
                except Exception:  # a broken manifest only costs those icons
                    pass
    except Exception as err:
        found.append((-1, None, f'home page: {err}'))
    origin = '{0.scheme}://{0.netloc}/'.format(urllib.parse.urlsplit(base))
    found.append((150, urllib.parse.urljoin(origin, 'apple-touch-icon.png'), 'home-screen icon'))
    found.append((50, urllib.parse.urljoin(origin, 'favicon.ico'), 'favicon'))
    domain = urllib.parse.urlsplit(base).netloc
    found.append((10, f'https://www.google.com/s2/favicons?domain={domain}&sz=256', 'favicon, through Google'))
    seen, ordered = set(), []
    for score, url, how in sorted(found, key=lambda c: -c[0]):
        if url and url not in seen:
            seen.add(url)
            ordered.append((score, url, how))
    return ordered


def open_image(body, content_type, url):
    from PIL import Image

    if 'svg' in content_type.lower() or url.lower().split('?')[0].endswith('.svg'):
        try:
            import cairosvg
        except ImportError as err:
            raise ValueError('the icon is an SVG and cairosvg is not installed') from err
        body = cairosvg.svg2png(bytestring=body, output_width=SIZE * 2, output_height=SIZE * 2)
    image = Image.open(io.BytesIO(body))
    if getattr(image, 'format', '') == 'ICO':
        sizes = sorted(image.info.get('sizes') or [image.size], key=lambda s: s[0] * s[1])
        image.size = sizes[-1]
    image.load()
    return image.convert('RGBA')


def make_icon(image):
    from PIL import Image

    alpha = image.getchannel('A')
    box = alpha.getbbox()
    if not box:
        raise ValueError('the icon is empty')
    colours = image.getcolors(1_000_000)
    if colours is not None and len(colours) < 2:
        raise ValueError('the icon is a single colour')
    side = max(image.size)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    square.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
    square = square.resize((SIZE, SIZE), Image.LANCZOS)
    # A light mark on a see-through background vanishes on the white tile, so the page
    # puts those on a dark tile instead.
    rgb, a = square.convert('RGB'), square.getchannel('A')
    total = shade = 0
    for (r, g, b), weight in zip(rgb.getdata(), a.getdata()):
        if weight:
            total += weight
            shade += weight * (0.2126 * r + 0.7152 * g + 0.0722 * b)
    clear = sum(1 for w in a.getdata() if w < 16) / (SIZE * SIZE)
    light = bool(total) and shade / total > 225 and clear > 0.2
    out = io.BytesIO()
    square.save(out, 'PNG', optimize=True)
    return out.getvalue(), light


def best_icon(tool):
    errors = []
    if tool.get('icon'):
        options = [(999, tool['icon'], 'chosen picture')]
    else:
        options = candidates(tool['site'])
    fallback = None
    for score, url, how in options:
        if score < 0:
            errors.append(how)
            continue
        try:
            body, final, content_type = fetch(url, 5_000_000, 'image/png,image/webp,image/svg+xml,image/x-icon,image/*;q=0.8,*/*;q=0.5')
            if 'html' in content_type.lower():
                raise ValueError('a web page, not a picture')
            image = open_image(body, content_type, final)
            small = min(image.size)
            if small < 32:
                raise ValueError(f'too small ({image.width}x{image.height})')
            png, light = make_icon(image)
            found = (png, light, url, how, image.size)
            if small >= SMALLEST or tool.get('icon'):
                return found, errors
            fallback = fallback or found
        except Exception as err:
            reason = f'the site answered {err.code}' if isinstance(err, urllib.error.HTTPError) else f'{type(err).__name__}: {err}'
            errors.append(f'{how}: {reason}'[:160])
    return fallback, errors


def load_manifest():
    try:
        text = MANIFEST.read_text(encoding='utf-8').strip()
        return json.loads(text[len(PREFIX):-1])
    except (OSError, ValueError):
        return {}


def main():
    try:
        data = load_tools()
    except (OSError, ValueError) as err:
        print(f'tools.js cannot be read: {err}')
        return 2
    problems = problems_in(data)
    if problems:
        print('\n'.join(problems))
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    old = load_manifest()
    new = {'_for': hashlib.sha256(TOOLS.read_bytes()).hexdigest()[:16]}
    keep = set()

    for tool in data['tools']:
        tid, site, wanted = tool['id'], tool.get('site', ''), tool.get('icon', '')
        target = OUT / f'{tid}.png'
        if not site and not wanted:
            new[tid] = {'src': None, 'note': 'no website given, so the page shows initials'}
            print(f'  none   {tid}')
            continue
        before = old.get(tid) or {}
        if before.get('src') and before.get('site') == site and before.get('wanted', '') == wanted and target.exists():
            new[tid] = before
            keep.add(target.name)
            print(f'  kept   {tid}')
            continue
        found, errors = best_icon(tool)
        if found:
            png, light, url, how, size = found
            target.write_bytes(png)
            new[tid] = {
                'src': f'assets/img/tools/{target.name}',
                'v': hashlib.sha1(png).hexdigest()[:8],
                'light': light,
                'from': url, 'how': how, 'was': f'{size[0]}x{size[1]}',
                'site': site, 'wanted': wanted,
            }
            keep.add(target.name)
            print(f'  saved  {tid}  {size[0]}x{size[1]}  {how}{"  (light)" if light else ""}  <- {url}')
        else:
            new[tid] = {'src': None, 'error': ('; '.join(errors) or 'no icon found')[:300], 'site': site, 'wanted': wanted}
            print(f'  FAILED {tid}  {new[tid]["error"]}')

    for stale in OUT.glob('*.png'):
        if stale.name not in keep:
            stale.unlink()
            print(f'  removed {stale.name}')

    text = PREFIX + json.dumps(new, indent=2, ensure_ascii=False) + ';\n'
    if not MANIFEST.exists() or MANIFEST.read_text(encoding='utf-8') != text:
        MANIFEST.write_text(text, encoding='utf-8')
    saved = sum(1 for k, v in new.items() if k != '_for' and v.get('src'))
    print(f'{saved} of {len(data["tools"])} tools have an icon')
    return 0


if __name__ == '__main__':
    sys.exit(main())
