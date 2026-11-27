"""Signs in to the dashboard in a real browser against the Firebase emulators.

Uses the real Firebase sign-in library, the real REST calls in backend.js and
the real firestore.rules. Run by .github/workflows/test-signin.yml, inside
`firebase emulators:exec`, after tools/publish_content.mjs has filled the
emulator and written the emulator settings to _site_test/.
"""
import functools
import http.server
import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = 'demo-dashboard'
AUTH = 'http://' + os.environ.get('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099')
STORE = 'http://' + os.environ.get('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080')
DOCS = f'{STORE}/v1/projects/{PROJECT}/databases/(default)/documents'
PORT = 8765
BASE = f'http://localhost:{PORT}/'
OWNER, STAFF, NEWBIE, STRANGER = 'owner@sodrama.test', 'staff@sodrama.test', 'newbie@sodrama.test', 'stranger@example.test'

results = []


def check(name, ok, extra=''):
    results.append((name, bool(ok)))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{extra}]' if extra not in ('', None) else ''), flush=True)


def call(method, url, body=None, owner=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'Content-Type': 'application/json'})
    if owner:
        req.add_header('Authorization', 'Bearer owner')   # the emulators' way of skipping the rules
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read() or b'{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


def make_user(email, password, verified=True):
    status, out = call('POST', f'{AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
                       {'email': email, 'password': password, 'returnSecureToken': True})
    assert status == 200, out
    if verified:
        status, out2 = call('POST', f'{AUTH}/identitytoolkit.googleapis.com/v1/projects/{PROJECT}/accounts:update',
                            {'localId': out['localId'], 'emailVerified': True}, owner=True)
        assert status == 200, out2


def person(email):
    status, out = call('GET', f'{DOCS}/people/{urllib.parse.quote(email, safe="")}', owner=True)
    if status != 200:
        return None
    return {k: list(v.values())[0] for k, v in out.get('fields', {}).items()}


def put_person(email, role):
    fields = {'email': {'stringValue': email}, 'role': {'stringValue': role}, 'addedBy': {'stringValue': OWNER}}
    status, out = call('PATCH', f'{DOCS}/people/{urllib.parse.quote(email, safe="")}', {'fields': fields}, owner=True)
    assert status == 200, out


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    handler.log_message = lambda *a: None
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()


def main():
    config = open(os.path.join(ROOT, '_site_test/assets/js/firebase-config.js'), encoding='utf-8').read()
    check('owner seeded by the deploy script', (person(OWNER) or {}).get('owner') is True, person(OWNER))
    make_user(OWNER, 'owner-pass-1')
    make_user(STAFF, 'staff-pass-1')
    make_user(STRANGER, 'stranger-pass-1')
    put_person(STAFF, 'staff')
    put_person(NEWBIE, 'staff')
    serve()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        logs = []

        def context():
            # The page's security policy only allows Google's real addresses, not the emulators on this machine.
            ctx = browser.new_context(bypass_csp=True, viewport={'width': 1280, 'height': 860})
            ctx.route('**/assets/js/firebase-config.js', lambda r: r.fulfill(status=200, headers={'Content-Type': 'text/javascript'}, body=config))
            return ctx

        def page(ctx):
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)))
            pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
            return pg

        def poll(pg, expr, ms=10000):
            end = time.time() + ms / 1000
            while time.time() < end:
                try:
                    if pg.evaluate(expr):
                        return True
                except Exception:
                    pass
                pg.wait_for_timeout(150)
            return False

        def panel_is(pg, name, ms=10000):
            return poll(pg, "(() => { const p = [...document.querySelectorAll('[data-panel]')].find(p => !p.hidden); return p && p.dataset.panel === %s; })()" % json.dumps(name), ms)

        def unlocked(pg, ms=12000):
            return poll(pg, "!document.documentElement.hasAttribute('data-locked')", ms)

        def sign_in(pg, email, password):
            pg.goto(BASE)
            panel_is(pg, 'signin')
            pg.fill('[data-panel=signin] input[name=email]', email)
            pg.fill('[data-panel=signin] input[name=password]', password)
            pg.click('[data-panel=signin] button[type=submit]')

        # Staff: in, sees everything, visit noted.
        ctx = context(); pg = page(ctx)
        sign_in(pg, STAFF, 'staff-pass-1')
        check('staff opens the dashboard', unlocked(pg), pg.evaluate("document.querySelector('[data-trouble]').textContent"))
        pg.evaluate("location.hash = 'news'"); pg.wait_for_timeout(500)
        check('five stories', pg.evaluate("document.querySelectorAll('.story').length") == 5)
        check('approved tools listed', pg.evaluate("document.querySelectorAll('.tool').length") >= 10)
        check('form link filled', pg.evaluate("document.querySelector('[data-link=declare]').href").startswith('https://'))
        poll(pg, 'false', 1500)
        check('visit noted on the list', 'seen' in (person(STAFF) or {}), person(STAFF))
        check('staff sees no People', pg.evaluate("document.querySelector('[data-open-people]').hidden"))
        ctx.close()

        # Owner: People page against the real rules.
        ctx = context(); pg = page(ctx)
        sign_in(pg, OWNER, 'owner-pass-1')
        check('owner opens the dashboard', unlocked(pg))
        pg.evaluate("location.hash = 'people'")
        check('People lists everyone', poll(pg, "document.querySelectorAll('[data-person]').length === 3"), pg.evaluate("document.querySelectorAll('[data-person]').length"))
        check('owner switch locked', pg.evaluate(f"document.querySelector('[data-person=\"{OWNER}\"] [data-role]').disabled"))
        pg.fill('[data-people-add] input[name=email]', 'fresh@sodrama.test')
        pg.click('[data-people-add] button[type=submit]')
        check('add someone', poll(pg, "!document.querySelector('[data-invite]').hidden") and person('fresh@sodrama.test') is not None,
              pg.text_content('[data-people-add] [data-error]'))
        rec = person('fresh@sodrama.test') or {}
        check('added with the time and who added them', rec.get('addedBy') == OWNER and rec.get('added') and rec.get('role') == 'staff', rec)
        pg.click(f'[data-person="{STAFF}"] [data-role]')
        check('make staff an admin', poll(pg, f"document.querySelector('[data-person=\"{STAFF}\"] [data-role]').getAttribute('aria-checked') === 'true' && !document.querySelector('[data-person=\"{STAFF}\"] [data-role]').disabled") and (person(STAFF) or {}).get('role') == 'admin', person(STAFF))
        check('change recorded', (person(STAFF) or {}).get('changedBy') == OWNER)
        pg.click(f'[data-person="{STAFF}"] [data-role]')
        check('and back to staff', poll(pg, f"document.querySelector('[data-person=\"{STAFF}\"] [data-role]').getAttribute('aria-checked') === 'false' && !document.querySelector('[data-person=\"{STAFF}\"] [data-role]').disabled") and (person(STAFF) or {}).get('role') == 'staff')
        pg.click('[data-person="fresh@sodrama.test"] [data-remove]')
        pg.click('[data-person="fresh@sodrama.test"] [data-remove-yes]')
        check('remove someone', poll(pg, "!document.querySelector('[data-person=\"fresh@sodrama.test\"]')") and person('fresh@sodrama.test') is None)
        pg.click(f'[data-person="{STAFF}"] [data-reset]')
        check('send a password link', poll(pg, f"/Sent/.test(document.querySelector('[data-person=\"{STAFF}\"] .person-msg').textContent)"),
              pg.text_content(f'[data-person="{STAFF}"] .person-msg'))
        ctx.close()

        # First time: set a password, confirm the address, get in.
        ctx = context(); pg = page(ctx)
        pg.goto(BASE); panel_is(pg, 'signin')
        pg.click('[data-panel=signin] [data-go=setup]')
        pg.fill('[data-panel=setup] input[name=email]', NEWBIE)
        pg.fill('[data-panel=setup] input[name=password]', 'curtain-call-42')
        pg.click('[data-panel=setup] button[type=submit]')
        check('asks to confirm the email', panel_is(pg, 'verify'), pg.text_content('[data-panel=setup] [data-error]'))
        status, codes = call('GET', f'{AUTH}/emulator/v1/projects/{PROJECT}/oobCodes')
        code = next((c for c in codes.get('oobCodes', []) if c['email'] == NEWBIE and c['requestType'] == 'VERIFY_EMAIL'), None)
        check('confirmation email sent', code is not None)
        pg.click('[data-panel=verify] [data-do=recheck]')
        check('not yet confirmed says so', poll(pg, "!document.querySelector('[data-panel=verify] [data-error]').hidden"))
        status, out = call('POST', f'{AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key', {'oobCode': code['oobCode']})
        check('link opened', status == 200, out)
        pg.click('[data-panel=verify] [data-do=recheck]')
        check('then the dashboard opens', unlocked(pg), pg.evaluate("document.querySelector('[data-trouble]').textContent"))
        ctx.close()

        # Signed in but not on the list.
        ctx = context(); pg = page(ctx)
        sign_in(pg, STRANGER, 'stranger-pass-1')
        check('stranger is told they are not on the list', panel_is(pg, 'not-listed'))
        check('stranger sees nothing', pg.evaluate("document.querySelectorAll('.story').length") == 0)
        ctx.close()

        errors = [m for m in logs if 'pageerror' in m or ('error' in m and 'Failed to load resource' not in m)]
        check('no script errors', not errors, errors[:5])
        browser.close()

    passed = sum(ok for _, ok in results)
    print(f'\n{passed} of {len(results)} passed')
    sys.exit(0 if passed == len(results) else 1)


if __name__ == '__main__':
    main()
