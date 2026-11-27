#!/usr/bin/env python3
"""Checks that the content security policy in index.html still allows its inline script.

The policy names the one inline script in <head> by its SHA-256 fingerprint. Any
change to that script changes the fingerprint, and the browser would refuse to
run it. Run this after editing the script; with --fix it writes the new value.
"""
import base64
import hashlib
import re
import sys
from pathlib import Path

PAGE = Path(__file__).resolve().parent.parent / 'index.html'


def main():
    text = PAGE.read_text(encoding='utf-8')
    scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', text, re.S)
    wanted = ["'sha256-" + base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode() + "'" for s in scripts]
    policy = re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', text)
    if not policy:
        sys.exit('index.html has no Content-Security-Policy meta tag')
    have = re.findall(r"'sha256-[A-Za-z0-9+/=]+'", policy.group(1))
    if sorted(have) == sorted(wanted):
        print(f'check_csp ok: {len(wanted)} inline script(s) allowed')
        return
    if '--fix' in sys.argv:
        new = re.sub(r"\s*'sha256-[A-Za-z0-9+/=]+'", '', policy.group(1))
        new = new.replace("script-src 'self'", "script-src 'self' " + ' '.join(wanted), 1)
        PAGE.write_text(text.replace(policy.group(1), new), encoding='utf-8')
        print('check_csp fixed: the policy now allows the current inline script')
        return
    sys.exit('The inline script changed: run python3 tools/check_csp.py --fix')


if __name__ == '__main__':
    main()
