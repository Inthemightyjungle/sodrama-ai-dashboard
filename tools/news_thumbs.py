#!/usr/bin/env python3
"""Copies each story's own preview image into the site.

For every story in assets/data/news.js this finds the picture the publisher
set as the story's link preview (its og:image), saves a small JPEG in
assets/img/news/ and records it in assets/data/news-thumbs.js. The page only
ever shows these local copies, so thumbnails never depend on another site.

Run:  python3 tools/news_thumbs.py        (needs Pillow: pip install pillow)
GitHub runs it automatically, see .github/workflows/news-thumbs.yml.
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
from check_news import NEWS, ROOT, load_news  # noqa: E402

MANIFEST = ROOT / 'assets' / 'data' / 'news-thumbs.js'
OUT = ROOT / 'assets' / 'img' / 'news'
PREFIX = 'window.SD_NEWS_THUMBS = '
AGENT = ('Mozilla/5.0 (compatible; SoDramaLinkPreview/1.0; '
         '+https://github.com/Inthemightyjungle/sodrama-ai-dashboard)')
MAX_W, MAX_H = 960, 720
TARGET_BYTES = 120_000
MATTE = (21, 17, 27)
META_KEYS = ('og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image', 'twitter:image:src')


def fetch(url, limit, accept):
    request = urllib.request.Request(url, headers={
        'User-Agent': AGENT,
        'Accept': accept,
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate',
    })
    with urllib.request.urlopen(request, timeout=25) as response:
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


def find_preview_image(page_url):
    body, final_url, _ = fetch(page_url, 4_000_000, 'text/html,application/xhtml+xml')
    text = body.decode('utf-8', errors='replace')
    found = {}
    for tag in re.findall(r'<meta\b[^>]*>', text, flags=re.I):
        attrs = {k.lower(): v for k, _, v in re.findall(r'([\w:-]+)\s*=\s*(["\'])(.*?)\2', tag, flags=re.S)}
        key = (attrs.get('property') or attrs.get('name') or '').lower()
        if key in META_KEYS and attrs.get('content') and key not in found:
            found[key] = html.unescape(attrs['content'].strip())
    for key in META_KEYS:
        if key in found:
            return urllib.parse.urljoin(final_url, found[key])
    raise ValueError('the page has no preview image')


def make_thumb(image_url):
    from PIL import Image, ImageOps

    body, _, content_type = fetch(image_url, 15_000_000, 'image/avif,image/webp,image/*;q=0.9,*/*;q=0.5')
    if 'svg' in content_type.lower():
        raise ValueError('the preview image is an SVG')
    image = Image.open(io.BytesIO(body))
    image.seek(0)
    image = ImageOps.exif_transpose(image)
    if image.mode in ('RGBA', 'LA', 'PA') or (image.mode == 'P' and 'transparency' in image.info):
        image = image.convert('RGBA')
        matte = Image.new('RGB', image.size, MATTE)
        matte.paste(image, mask=image.getchannel('A'))
        image = matte
    else:
        image = image.convert('RGB')
    if image.width < 320 or image.height < 180:
        raise ValueError(f'the preview image is too small ({image.width}x{image.height})')
    image.thumbnail((MAX_W, MAX_H), Image.LANCZOS)
    quality = 82
    while True:
        out = io.BytesIO()
        image.save(out, 'JPEG', quality=quality, optimize=True, progressive=True)
        if out.tell() <= TARGET_BYTES or quality <= 58:
            return out.getvalue(), image.width, image.height
        quality -= 6


def load_manifest():
    try:
        text = MANIFEST.read_text(encoding='utf-8').strip()
        return json.loads(text[len(PREFIX):-1])
    except (OSError, ValueError):
        return {}


def main():
    try:
        data = load_news()
    except (OSError, ValueError) as err:
        print(f'news.js cannot be read: {err}')
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    old = load_manifest()
    new = {'_for': hashlib.sha256(NEWS.read_bytes()).hexdigest()[:16]}
    keep = set()

    for story in data['stories']:
        sid, page = story['id'], story['url']
        wanted = story.get('image') or ''
        if story.get('thumb') == 'none':
            new[sid] = {'src': None, 'note': 'thumbnail switched off for this story'}
            print(f'  off    {sid}')
            continue
        target = OUT / f'{sid}.jpg'
        before = old.get(sid) or {}
        if before.get('src') and before.get('page') == page and before.get('wanted', '') == wanted and target.exists():
            new[sid] = before
            keep.add(target.name)
            print(f'  kept   {sid}')
            continue
        try:
            image_url = wanted or find_preview_image(page)
            jpeg, width, height = make_thumb(image_url)
            target.write_bytes(jpeg)
            new[sid] = {
                'src': f'assets/img/news/{target.name}',
                'w': width, 'h': height,
                'v': hashlib.sha1(jpeg).hexdigest()[:8],
                'page': page, 'wanted': wanted, 'image': image_url,
            }
            keep.add(target.name)
            print(f'  saved  {sid}  {width}x{height}  {len(jpeg) // 1000} KB  <- {image_url}')
        except Exception as err:  # one bad story must not stop the others
            reason = f'{type(err).__name__}: {err}'
            if isinstance(err, urllib.error.HTTPError):
                reason = f'the site answered {err.code} {err.reason}'
            new[sid] = {'src': None, 'error': reason[:200], 'page': page, 'wanted': wanted}
            print(f'  FAILED {sid}  {reason}')

    for stale in OUT.glob('*.jpg'):
        if stale.name not in keep:
            stale.unlink()
            print(f'  removed {stale.name}')

    text = PREFIX + json.dumps(new, indent=2, ensure_ascii=False) + ';\n'
    if not MANIFEST.exists() or MANIFEST.read_text(encoding='utf-8') != text:
        MANIFEST.write_text(text, encoding='utf-8')
    saved = sum(1 for k, v in new.items() if k != '_for' and v.get('src'))
    print(f'{saved} of {len(data["stories"])} stories have a thumbnail')
    return 0


if __name__ == '__main__':
    sys.exit(main())
