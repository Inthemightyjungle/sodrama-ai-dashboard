#!/usr/bin/env python3
"""Checks assets/data/news.js before it is published.

Run:  python3 tools/check_news.py
Exit code 0 means the file is fine. Anything else prints what to fix.
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEWS = ROOT / 'assets' / 'data' / 'news.js'
PREFIX = 'window.SD_NEWS = '

REQUIRED = ('id', 'kind', 'category', 'title', 'summary', 'source', 'url', 'date')
LIMITS = {'category': 26, 'title': 90, 'summary': 230, 'source': 40, 'credit': 90}


def load_news(path=NEWS):
    """Returns the news data. The file is strict JSON wrapped in one assignment."""
    text = path.read_text(encoding='utf-8').strip()
    if not text.startswith(PREFIX) or not text.endswith(';'):
        raise ValueError(f'{path.name} must start with "{PREFIX}" and end with ";"')
    return json.loads(text[len(PREFIX):-1])


def check(data):
    problems = []
    stories = data.get('stories')
    if not isinstance(stories, list):
        return ['"stories" must be a list']
    if not 4 <= len(stories) <= 6:
        problems.append(f'expected 4 to 6 stories (5 is the norm), found {len(stories)}')

    try:
        updated = dt.datetime.fromisoformat(data.get('updated', ''))
        if updated.tzinfo is None:
            problems.append('"updated" needs a UTC offset, e.g. 2026-11-16T07:00:00+08:00')
    except ValueError:
        updated = None
        problems.append('"updated" must be an ISO date-time, e.g. 2026-11-16T07:00:00+08:00')

    seen_ids, seen_urls = set(), set()
    cautions = 0
    for i, s in enumerate(stories, 1):
        where = f'story {i}'
        if not isinstance(s, dict):
            problems.append(f'{where}: must be an object')
            continue
        where = f'story {i} ({s.get("id", "no id")})'
        for key in REQUIRED:
            if not isinstance(s.get(key), str) or not s[key].strip():
                problems.append(f'{where}: "{key}" is missing')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', s.get('id', '')) or len(s.get('id', '')) > 60:
            problems.append(f'{where}: "id" must be lowercase words joined by hyphens, 60 characters at most')
        if s.get('id') in seen_ids:
            problems.append(f'{where}: "id" is used twice')
        seen_ids.add(s.get('id'))
        if s.get('url') in seen_urls:
            problems.append(f'{where}: "url" is used twice')
        seen_urls.add(s.get('url'))
        if s.get('kind') not in ('update', 'caution'):
            problems.append(f'{where}: "kind" must be "update" or "caution"')
        cautions += s.get('kind') == 'caution'
        for key in ('url', 'image'):
            if s.get(key) and not str(s[key]).startswith('https://'):
                problems.append(f'{where}: "{key}" must be an https:// link')
        if s.get('thumb', 'auto') not in ('auto', 'none'):
            problems.append(f'{where}: "thumb" must be "auto" or "none"')
        for key, limit in LIMITS.items():
            if len(str(s.get(key, ''))) > limit:
                problems.append(f'{where}: "{key}" is {len(s[key])} characters, the limit is {limit}')
        try:
            day = dt.date.fromisoformat(s.get('date', ''))
            if updated and day > updated.date() + dt.timedelta(days=1):
                problems.append(f'{where}: "date" is in the future')
        except ValueError:
            problems.append(f'{where}: "date" must look like 2026-11-16')
    if not cautions:
        problems.append('at least one story must have "kind": "caution"')
    return problems


def main():
    try:
        data = load_news()
    except (OSError, ValueError) as err:
        print(f'news.js cannot be read: {err}')
        return 2
    problems = check(data)
    if problems:
        print('news.js needs fixing:')
        for p in problems:
            print(f'  - {p}')
        return 1
    kinds = [s['kind'] for s in data['stories']]
    print(f'news.js is fine: {len(kinds)} stories, {kinds.count("caution")} word(s) of caution, updated {data["updated"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
