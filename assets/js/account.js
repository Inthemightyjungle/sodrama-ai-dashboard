/*
  Signing in, the account menu and the People page.

  Until someone is signed in, has confirmed their email address and is on the
  list, the page shows only the sign-in screen and holds no content at all.
  Then the content is read from the database and handed to site.js, which
  fills in the four pages (window.SD_DATA and the "sd-data" event).

  The Firebase side is in backend.js. Rules about who may read or change what
  are in firestore.rules: this file only decides what to show.
*/

const root = document.documentElement;
const $ = (selector, scope) => (scope || document).querySelector(selector);
const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

const gate = $('[data-gate]');
const OFFLINE = 'This device is not connected to the internet. Connect, then try again.';
const DAY = 24 * 3600 * 1000;

let backend = null;      // backend.js, once loaded
let who = null;          // { email, verified } of the person signed in on this device
let record = null;       // their record in the list: { email, role, owner, seen, … }
let opened = false;      // the page has been filled in
let typedEmail = '';     // carried from one sign-in form to the next

/* ---------- messages ---------- */

function say(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match. If this is your first time, choose “First time here?” below.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Type your email address, like name@sodrama.com.';
    case 'auth/missing-password':
      return 'Type your password.';
    case 'auth/email-already-in-use':
      return 'This email already has a password. Sign in instead, or choose “Forgot your password?”.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Choose a longer password: at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes, then try again.';
    case 'auth/user-disabled':
      return 'This sign-in has been switched off. Ask the dashboard owner.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Signing in with an email address is not switched on yet. Ask the dashboard owner.';
    case 'auth/network-request-failed':
    case 'offline':
      return OFFLINE;
    case 'not-set-up':
      return 'Sign-in is not set up yet. The dashboard owner needs to finish setting it up.';
    case 'no-content':
      return 'The dashboard has nothing to show yet. Try again in a few minutes.';
    case 'denied':
      return 'Your sign-in could not be checked. Sign out, sign in again, and try once more.';
    default:
      return 'Something went wrong. Try again in a moment.';
  }
}

/* ---------- the sign-in screen ---------- */

const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Shows one panel of the sign-in screen. "moved" is false when the page itself chose it, as it
// opened: then the keyboard only jumps to the first box on a computer, so a phone's keyboard does
// not cover the screen before the person has seen it.
function panel(name, moved) {
  let shown = null;
  $$('[data-panel]', gate).forEach((p) => {
    const on = p.getAttribute('data-panel') === name;
    p.hidden = !on;
    if (on) shown = p;
  });
  if (!shown) return;
  $$('[data-email]', shown).forEach((el) => { el.textContent = (who && who.email) || typedEmail; });
  $$('input[name="email"]', shown).forEach((input) => { if (!input.value) input.value = typedEmail; });
  $$('input[name="password"]', shown).forEach((input) => { input.value = ''; input.type = 'password'; });
  $$('[data-peek]', shown).forEach((button) => { button.setAttribute('aria-pressed', 'false'); $('.sr-only', button).textContent = 'Show password'; });
  quiet(shown);
  // Move the keyboard (and a screen reader) to what is new.
  if (name === 'wait' || (moved === false && !finePointer)) return;
  const empty = $$('input', shown).find((input) => !input.value);
  (empty || $('.gate-title', shown)).focus({ preventScroll: true });
}

function quiet(scope) {
  $$('[data-error], [data-note]', scope).forEach((el) => { el.hidden = true; el.textContent = ''; });
}

function complain(scope, message) {
  const el = $('[data-error]', scope);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function note(scope, message) {
  const el = $('[data-note]', scope);
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function trouble(message) {
  $('[data-trouble]', gate).textContent = message;
  panel('trouble');
}

// While a request is out, its button says so and cannot be pressed twice.
async function busy(button, label, work) {
  const before = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await work(); } finally { button.disabled = false; button.textContent = before; }
}

function wireGate() {
  $$('[data-go]', gate).forEach((button) => {
    button.addEventListener('click', () => {
      const form = button.closest('[data-panel]');
      const email = form && $('input[name="email"]', form);
      if (email && email.value.trim()) typedEmail = email.value.trim();
      panel(button.getAttribute('data-go'));
    });
  });

  $$('[data-peek]', gate).forEach((button) => {
    button.addEventListener('click', () => {
      const input = $('input', button.parentNode);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      $('.sr-only', button).textContent = show ? 'Hide password' : 'Show password';
    });
  });

  $$('form[data-panel]', gate).forEach((form) => {
    form.addEventListener('input', () => quiet(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!backend) return;
      quiet(form);
      const name = form.getAttribute('data-panel');
      const email = (form.elements.email.value || '').trim().toLowerCase();
      const password = form.elements.password ? form.elements.password.value : '';
      const button = $('button[type="submit"]', form);
      typedEmail = email;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { complain(form, say('auth/invalid-email')); form.elements.email.focus(); return; }
      if (form.elements.password && !password) { complain(form, say('auth/missing-password')); form.elements.password.focus(); return; }
      if (name === 'setup' && password.length < 8) { complain(form, say('auth/weak-password')); form.elements.password.focus(); return; }

      const work = {
        signin: () => busy(button, 'Signing in…', () => backend.signIn(email, password)),
        setup: () => busy(button, 'Setting your password…', () => backend.setPassword(email, password)),
        reset: () => busy(button, 'Sending…', () => backend.sendReset(email)).then(() => panel('reset-sent')),
      }[name];
      work().catch((err) => {
        // A reset link for an address that cannot sign in is not an error worth showing:
        // the screen says the same either way, so it does not reveal who is on the list.
        if (name === 'reset' && err.code === 'auth/user-not-found') { panel('reset-sent'); return; }
        complain(form, say(err.code));
      });
    });
  });

  $$('[data-do]', gate).forEach((button) => {
    button.addEventListener('click', () => {
      const scope = button.closest('[data-panel]');
      quiet(scope);
      const act = button.getAttribute('data-do');
      if (act === 'leave') { signOutNow(); return; }
      if (act === 'retry') { if (who && who.verified) openDashboard(); else location.reload(); return; }
      if (act === 'resend') {
        busy(button, 'Sending…', () => backend.resendLink())
          .then(() => note(scope, 'Sent. Look in your junk folder too.'), (err) => complain(scope, say(err.code)));
        return;
      }
      if (act === 'recheck') {
        busy(button, 'Checking…', () => backend.recheck()).then((person) => {
          if (person && person.verified) { who = person; openDashboard(); }
          else complain(scope, 'Not confirmed yet. Open the link in the email we sent, then try again.');
        }, (err) => complain(scope, say(err.code)));
      }
    });
  });
}

/* ---------- from signed in to the dashboard ---------- */

function onPerson(person) {
  if (opened) {
    // Signed out in another window: start again from the sign-in screen.
    if (!person || person.email !== who.email) location.reload();
    return;
  }
  who = person;
  if (!person) { panel('signin', false); return; }
  typedEmail = person.email;
  if (!person.verified) { panel('verify', false); return; }
  openDashboard();
}

async function openDashboard() {
  panel('wait');
  try {
    record = await backend.myRecord();
    if (!record) { panel('not-listed'); return; }
    const data = await backend.content();
    fill(data);
  } catch (err) {
    trouble(say(navigator.onLine === false ? 'offline' : err.code));
  }
}

function fill(data) {
  opened = true;
  window.SD_DATA = data;
  document.dispatchEvent(new Event('sd-data'));
  root.removeAttribute('data-locked');
  setupAccount();
  // Note the visit for the People page, at most once every few hours.
  const seen = record.seen ? Date.parse(record.seen) : 0;
  if (!(seen > Date.now() - DAY / 4)) backend.markSeen().catch(() => {});
}

async function signOutNow() {
  try { if (backend) await backend.leave(); } catch (err) { /* reload anyway */ }
  location.reload();
}

/* ---------- the account menu ---------- */

function setupAccount() {
  const box = $('[data-account]');
  const button = $('[data-account-btn]');
  const menu = $('[data-account-menu]');
  box.hidden = false;
  $('[data-account-initial]').textContent = (who.email.charAt(0) || '?').toUpperCase();
  $('[data-account-email]').textContent = who.email;
  $('[data-account-role]').textContent = record.owner ? 'Owner' : record.role === 'admin' ? 'Admin' : 'Staff';

  const toggle = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => toggle(menu.hidden));
  document.addEventListener('click', (e) => { if (!menu.hidden && !box.contains(e.target)) toggle(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { toggle(false); button.focus(); }
  });
  $('[data-sign-out]').addEventListener('click', signOutNow);

  if (record.role === 'admin') {
    const open = $('[data-open-people]');
    open.hidden = false;
    open.addEventListener('click', () => { toggle(false); location.hash = 'people'; });
    setupPeople();
  }
}

/* ---------- People (admins only) ---------- */

const page = {};
let everyone = [];
let loaded = false;
let confirming = '';    // the email whose "Remove" is waiting for a yes

function setupPeople() {
  const view = $('#people');
  Object.assign(page, {
    title: $('[data-people-title]', view),
    add: $('[data-people-add]', view),
    list: $('[data-people-list]', view),
    count: $('[data-people-count]', view),
    status: $('[data-people-status]', view),
    filter: $('[data-people-filter]', view),
    invite: $('[data-invite]', view),
  });

  page.add.addEventListener('submit', (e) => {
    e.preventDefault();
    quiet(page.add);
    const email = page.add.elements.email.value.trim().toLowerCase();
    const role = page.add.elements.role.value === 'admin' ? 'admin' : 'staff';
    const button = $('button[type="submit"]', page.add);
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
      complain(page.add, 'Type a full email address, like name@sodrama.com.');
      page.add.elements.email.focus();
      return;
    }
    if (everyone.some((p) => p.email === email)) {
      complain(page.add, email + ' is already on the list.');
      return;
    }
    busy(button, 'Adding…', () => backend.addPerson(email, role)).then(() => {
      page.add.reset();
      showInvite(email);
      return refresh();
    }, (err) => complain(page.add, err.code === 'offline' ? OFFLINE : 'Could not add ' + email + '. ' + (err.code === 'denied' ? 'Only admins can change the list.' : 'Try again in a moment.')));
  });

  page.add.addEventListener('input', () => quiet(page.add));
  page.filter.addEventListener('input', draw);
  page.list.addEventListener('click', onListClick);

  $('[data-invite-copy]', page.invite).addEventListener('click', () => {
    const done = $('[data-invite-done]', page.invite);
    const message = $('[data-invite-text]', page.invite).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(message) : Promise.reject(new Error('no clipboard')))
      .then(() => { done.textContent = 'Copied.'; }, () => { done.textContent = 'Select the message and copy it.'; });
  });

  window.SD_ADD_VIEW('people', () => {
    if (!loaded) refresh();
    setTimeout(() => page.title.focus({ preventScroll: true }), 0);
  });
}

function inviteText(email) {
  return 'You can now open the So Drama! AI Solutions Dashboard.\n\n' +
    '1. Go to ' + backend.home + '\n' +
    '2. Choose “First time here? Set your password”, and use this email address: ' + email + '\n' +
    '3. Open the link we email you, then come back and sign in.';
}

function showInvite(email) {
  const text = inviteText(email);
  $('[data-invite-email]', page.invite).textContent = email;
  $('[data-invite-text]', page.invite).textContent = text;
  $('[data-invite-done]', page.invite).textContent = '';
  $('[data-invite-mail]', page.invite).href = 'mailto:' + encodeURIComponent(email) +
    '?subject=' + encodeURIComponent('Your access to the AI Solutions Dashboard') + '&body=' + encodeURIComponent(text);
  page.invite.hidden = false;
}

async function refresh() {
  page.status.textContent = loaded ? '' : 'Loading the list…';
  try {
    everyone = await backend.people();
    loaded = true;
    page.status.textContent = '';
    draw();
  } catch (err) {
    page.status.textContent = err.code === 'offline' ? OFFLINE : 'The list did not load. ' + (err.code === 'denied' ? 'Only admins can see it.' : 'Try again in a moment.');
  }
}

function day(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString('en-SG', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
}

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg>';
const BIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M10 4h4M6.5 7l1 12.5h9l1-12.5M10 10.5v6M14 10.5v6"></path></svg>';

function sortKey(p) {
  return (p.owner ? '0' : p.role === 'admin' ? '1' : '2') + p.email;
}

function draw() {
  const term = page.filter.value.trim().toLowerCase();
  const shown = everyone.filter((p) => !term || p.email.indexOf(term) !== -1).sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
  const admins = everyone.filter((p) => p.role === 'admin').length;
  page.count.textContent = everyone.length + (everyone.length === 1 ? ' person' : ' people') + ' on the list, ' + admins + (admins === 1 ? ' admin' : ' admins');

  page.list.innerHTML = shown.map((p) => {
    const self = p.email === who.email;
    const locked = self || p.owner;
    const flags = (self ? '<span class="person-flag">You</span>' : '') + (p.owner ? '<span class="person-flag is-owner">Owner</span>' : '');
    const seen = p.seen ? 'Last opened ' + day(p.seen) : 'Has not signed in yet';
    const why = p.owner ? 'The owner is always an admin.' : self ? 'You cannot change your own role.' : '';
    const actions = confirming === p.email
      ? '<p class="person-confirm">Remove them from the list?</p>' +
        '<button class="btn person-btn is-danger" type="button" data-remove-yes>Remove</button>' +
        '<button class="btn person-btn" type="button" data-remove-no>Keep</button>'
      : (p.seen ? '<button class="btn person-btn" type="button" data-reset>' + MAIL + 'Send a password link</button>' : '') +
        (locked ? '' : '<button class="btn person-btn" type="button" data-remove>' + BIN + 'Remove</button>');
    return '<li class="person' + (confirming === p.email ? ' is-confirming' : '') + '" data-person="' + esc(p.email) + '">' +
      '<span class="person-badge" aria-hidden="true">' + esc(p.email.charAt(0).toUpperCase()) + '</span>' +
      '<div class="person-who"><p class="person-email">' + esc(p.email) + flags + '</p><p class="person-seen">' + esc(seen) + '</p></div>' +
      '<div class="person-role"><button class="switch" type="button" role="switch" aria-checked="' + (p.role === 'admin') + '"' +
        (locked ? ' disabled title="' + esc(why) + '"' : '') + ' data-role aria-label="Admin: ' + esc(p.email) + '">' +
        '<span class="switch-track" aria-hidden="true"><span class="switch-knob"></span></span><span class="switch-label" aria-hidden="true">Admin</span></button></div>' +
      '<div class="person-actions">' + actions + '</div>' +
      '<p class="person-msg" role="status"></p>' +
    '</li>';
  }).join('') || '<li class="person-none">' + (term ? 'No one on the list matches “' + esc(term) + '”.' : 'No one is on the list yet.') + '</li>';
}

function onListClick(e) {
  const button = e.target.closest('button');
  const row = e.target.closest('[data-person]');
  if (!button || !row || button.disabled) return;
  const email = row.getAttribute('data-person');
  const p = everyone.find((x) => x.email === email);
  const msg = $('.person-msg', row);
  if (!p) return;

  if (button.hasAttribute('data-role')) {
    const role = p.role === 'admin' ? 'staff' : 'admin';
    button.disabled = true;
    button.setAttribute('aria-checked', String(role === 'admin'));
    backend.setRole(email, role).then(() => {
      p.role = role;
      draw();
      announce(email + (role === 'admin' ? ' is now an admin.' : ' is now staff.'));
    }, (err) => {
      button.disabled = false;
      button.setAttribute('aria-checked', String(p.role === 'admin'));
      msg.textContent = err.code === 'offline' ? OFFLINE : 'Could not change the role. Try again in a moment.';
    });
    return;
  }
  if (button.hasAttribute('data-reset')) {
    busy(button, 'Sending…', () => backend.sendReset(email)).then(() => {
      msg.textContent = 'Sent a link to choose a new password.';
    }, (err) => { msg.textContent = say(err.code); });
    return;
  }
  if (button.hasAttribute('data-remove')) { confirming = email; draw(); focusIn(email, '[data-remove-no]'); return; }
  if (button.hasAttribute('data-remove-no')) { confirming = ''; draw(); focusIn(email, '[data-remove]'); return; }
  if (button.hasAttribute('data-remove-yes')) {
    busy(button, 'Removing…', () => backend.removePerson(email)).then(() => {
      confirming = '';
      everyone = everyone.filter((x) => x.email !== email);
      draw();
      announce(email + ' was removed from the list.');
      page.filter.focus({ preventScroll: true });
    }, (err) => { msg.textContent = err.code === 'offline' ? OFFLINE : 'Could not remove them. Try again in a moment.'; });
  }
}

function focusIn(email, selector) {
  const row = $$('[data-person]', page.list).find((el) => el.getAttribute('data-person') === email);
  const target = row && $(selector, row);
  if (target) target.focus();
}

function announce(message) {
  page.status.textContent = message;
}

/* ---------- start ---------- */

wireGate();
try {
  backend = await import('./backend.js');
  backend.watch(onPerson);
} catch (err) {
  trouble(say(err && err.code === 'not-set-up' ? 'not-set-up' : navigator.onLine === false ? 'offline' : ''));
  $$('[data-panel="trouble"] [data-do="leave"]', gate).forEach((b) => { b.hidden = true; });
}
