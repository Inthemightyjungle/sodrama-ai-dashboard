#!/usr/bin/env python3
"""Checks assets/data/apps.js: strict JSON inside window.SD_APPS = …; with the fields the site and the Chrome extension need."""
import json
import re
import sys
from pathlib import Path

path = Path(__file__).resolve().parent.parent / 'assets' / 'data' / 'apps.js'
text = path.read_text(encoding='utf-8')
match = re.search(r'window\.SD_APPS\s*=\s*(\[.*\])\s*;\s*$', text, re.S)
problems = []
if not match:
    sys.exit('apps.js: could not find window.SD_APPS = [ … ];')
try:
    apps = json.loads(match.group(1))
except json.JSONDecodeError as err:
    sys.exit(f'apps.js is not strict JSON: {err}')
for i, app in enumerate(apps, 1):
    for field in ('name', 'category', 'meta', 'description', 'action', 'url', 'cover'):
        if not app.get(field):
            problems.append(f'app {i} ({app.get("name", "?")}): missing {field}')
    if not str(app.get('url', '')).startswith('https://'):
        problems.append(f'app {i}: url must start with https://')
    cover = app.get('cover') or {}
    if cover.get('type') not in ('image', 'layers'):
        problems.append(f'app {i}: cover type must be "image" or "layers"')
if problems:
    sys.exit('\n'.join(problems))
print(f'apps.js ok: {len(apps)} apps')
