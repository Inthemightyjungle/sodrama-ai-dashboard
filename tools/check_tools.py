#!/usr/bin/env python3
"""Checks assets/data/tools.js: strict JSON inside window.SD_TOOLS = …; with the fields the site needs."""
import datetime
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / 'assets' / 'data' / 'tools.js'
USES = ('company', 'personal', 'both')


def load_tools():
    text = TOOLS.read_text(encoding='utf-8')
    match = re.search(r'window\.SD_TOOLS\s*=\s*(\{.*\})\s*;\s*$', text, re.S)
    if not match:
        raise ValueError('could not find window.SD_TOOLS = { … };')
    return json.loads(match.group(1))


def problems_in(data):
    problems = []
    try:
        datetime.date.fromisoformat(str(data.get('checked', '')))
    except ValueError:
        problems.append('"checked" must be a date like 2026-11-20')
    groups = data.get('groups')
    if not isinstance(groups, list) or not groups:
        return problems + ['"groups" must be a list with at least one group']
    group_ids = set()
    for g in groups:
        if not str(g.get('id', '')).strip() or not str(g.get('name', '')).strip():
            problems.append('every group needs an "id" and a "name"')
        group_ids.add(g.get('id'))
    tools = data.get('tools')
    if not isinstance(tools, list) or not tools:
        return problems + ['"tools" must be a list with at least one tool']
    seen = set()
    for i, tool in enumerate(tools, 1):
        label = f'tool {i} ({tool.get("name", "?")})'
        for field in ('id', 'name', 'for', 'group', 'use'):
            if not str(tool.get(field, '')).strip():
                problems.append(f'{label}: missing "{field}"')
        tid = str(tool.get('id', ''))
        if tid and not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', tid):
            problems.append(f'{label}: "id" must be lowercase words joined by hyphens')
        if tid in seen:
            problems.append(f'{label}: "id" {tid} is used twice')
        seen.add(tid)
        if tool.get('use') not in USES:
            problems.append(f'{label}: "use" must be "company", "personal" or "both"')
        if tool.get('group') not in group_ids:
            problems.append(f'{label}: "group" must be one of {", ".join(sorted(str(g) for g in group_ids))}')
        if re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', json.dumps(tool)):
            problems.append(f'{label}: contains an email address; this file is public')
        for field in ('site', 'icon'):
            if field in tool and not str(tool[field]).startswith('https://'):
                problems.append(f'{label}: "{field}" must start with https://')
        if len(str(tool.get('name', ''))) > 40:
            problems.append(f'{label}: "name" is longer than 40 characters')
        if len(str(tool.get('for', ''))) > 70:
            problems.append(f'{label}: "for" is longer than 70 characters')
        unknown = set(tool) - {'id', 'name', 'by', 'for', 'group', 'use', 'site', 'icon'}
        if unknown:
            problems.append(f'{label}: unknown field(s) {", ".join(sorted(unknown))}')
    return problems


def main():
    try:
        data = load_tools()
    except (OSError, ValueError) as err:
        sys.exit(f'tools.js: {err}')
    problems = problems_in(data)
    if problems:
        sys.exit('\n'.join(problems))
    tools = data['tools']
    count = {u: sum(1 for t in tools if t['use'] == u) for u in USES}
    print(f'tools.js ok: {len(tools)} tools in {len(data["groups"])} groups '
          f'({count["company"]} company, {count["personal"]} personal, {count["both"]} both)')


if __name__ == '__main__':
    main()
