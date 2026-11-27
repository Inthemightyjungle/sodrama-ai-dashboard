/*
  The dashboard's link to Firebase: signing in, and reading and writing the
  list of people and the page's content. account.js draws the screens.

  Signing in uses Google's Firebase library, copied into assets/vendor/firebase
  (nothing is fetched from another server). The database is read through its
  plain web address instead of the much larger Firestore library: every request
  carries the signed-in person's pass, and firestore.rules decides what it may
  read or change.

  The deploy job writes assets/js/firebase-config.js; without it this module
  fails with the code "not-set-up".
*/
import { initializeApp } from '../vendor/firebase/firebase-app.js';
import {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, connectAuthEmulator,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, reload, getIdToken,
} from '../vendor/firebase/firebase-auth.js';

const config = await import('./firebase-config.js').then((m) => m.default, () => null);
if (!config || !config.apiKey || !config.projectId) throw problem('not-set-up');

const app = initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId });
// Remember who is signed in on this device (the browser's own storage for this site), and nothing else.
const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
auth.languageCode = 'en';
if (config.emulator) connectAuthEmulator(auth, config.emulator.auth, { disableWarnings: true });

const ROOT = 'projects/' + config.projectId + '/databases/(default)/documents';
const API = (config.emulator ? config.emulator.firestore : 'https://firestore.googleapis.com') + '/v1/';
const CONTENT = ['news', 'newsThumbs', 'apps', 'tools', 'toolIcons', 'links'];

/** The dashboard's own address, where links in emails bring people back to. */
export const home = new URL('./', document.baseURI).href;

function problem(code, detail) {
  const err = new Error(detail || code);
  err.code = code;
  return err;
}

function person(user) {
  return user ? { email: (user.email || '').toLowerCase(), verified: !!user.emailVerified } : null;
}

function me() {
  return auth.currentUser ? (auth.currentUser.email || '').toLowerCase() : '';
}

/* ---------- signing in ---------- */

/** Calls back with { email, verified } whenever someone signs in or out, and with null when no one is. */
export function watch(callback) {
  return onAuthStateChanged(auth, (user) => callback(person(user)));
}

export async function signIn(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

/** First visit: makes the sign-in and emails a link to confirm the address. */
export async function setPassword(email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendLink(user);
}

export async function resendLink() {
  if (auth.currentUser) await sendLink(auth.currentUser);
}

async function sendLink(user) {
  try {
    await sendEmailVerification(user, { url: home });
  } catch (err) {
    // An address the project does not list as its own: send the plain link instead.
    if (!/unauthorized-continue-uri|invalid-continue-uri|unauthorized-domain/.test(err.code || '')) throw err;
    await sendEmailVerification(user);
  }
}

/** After the person has opened the link in the email: asks again whether the address is confirmed. */
export async function recheck() {
  const user = auth.currentUser;
  if (!user) return null;
  await reload(user);
  if (user.emailVerified) await getIdToken(user, true);   // a fresh pass that says so
  return person(user);
}

export async function sendReset(email) {
  try {
    await sendPasswordResetEmail(auth, email, { url: home });
  } catch (err) {
    if (!/unauthorized-continue-uri|invalid-continue-uri|unauthorized-domain/.test(err.code || '')) throw err;
    await sendPasswordResetEmail(auth, email);
  }
}

export function leave() {
  return signOut(auth);
}

/* ---------- the database ---------- */

async function call(method, path, body, again) {
  const user = auth.currentUser;
  if (!user) throw problem('signed-out');
  let response;
  try {
    const token = await getIdToken(user, !!again);
    response = await fetch(API + path, {
      method,
      headers: body ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : { Authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  } catch (err) {
    throw problem(err && /network/.test(err.code || '') ? 'offline' : (err && err.code) || 'offline');
  }
  if (response.status === 404) return null;
  // A pass from before the email address was confirmed: get a new one and ask once more.
  if ((response.status === 401 || response.status === 403) && !again) return call(method, path, body, true);
  if (!response.ok) {
    let detail = '';
    try { detail = ((await response.json()).error || {}).message || ''; } catch (err) { /* no details */ }
    throw problem(response.status === 403 ? 'denied' : response.status === 409 ? 'exists' : 'failed', detail);
  }
  return response.json();
}

function decode(fields) {
  const out = {};
  Object.keys(fields || {}).forEach((key) => { out[key] = value(fields[key]); });
  return out;
}

function value(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('mapValue' in v) return decode(v.mapValue.fields);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(value);
  return null;
}

const text = (s) => ({ stringValue: s });
const stamp = (field) => ({ fieldPath: field, setToServerValue: 'REQUEST_TIME' });
const docName = (collection, id) => ROOT + '/' + collection + '/' + id;
const docPath = (collection, id) => ROOT + '/' + collection + '/' + encodeURIComponent(id);

function commit(write) {
  return call('POST', ROOT + ':commit', { writes: [write] });
}

/** The signed-in person's record in the list, or null if they are not on it. */
export async function myRecord() {
  const doc = await call('GET', docPath('people', me()));
  return doc ? decode(doc.fields) : null;
}

/** Everything the page shows: news, thumbnails, apps, approved tools, tool icons and links. */
export async function content() {
  const doc = await call('GET', docPath('content', 'site'));
  if (!doc) throw problem('no-content');
  const fields = decode(doc.fields);
  const out = { published: fields.published || '' };
  CONTENT.forEach((key) => {
    try { out[key] = JSON.parse(fields[key] || 'null'); } catch (err) { out[key] = null; }
  });
  return out;
}

/** Notes when the signed-in person last opened the dashboard, for the People page. */
export function markSeen() {
  return commit({
    update: { name: docName('people', me()), fields: {} },
    updateMask: { fieldPaths: [] },
    currentDocument: { exists: true },
    updateTransforms: [stamp('seen')],
  });
}

/* ---------- People (admins only; the rules refuse everyone else) ---------- */

export async function people() {
  const list = [];
  let page = '';
  do {
    const result = await call('GET', ROOT + '/people?pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : ''));
    ((result && result.documents) || []).forEach((doc) => list.push(decode(doc.fields)));
    page = result && result.nextPageToken;
  } while (page);
  return list;
}

export function addPerson(email, role) {
  return commit({
    update: { name: docName('people', email), fields: { email: text(email), role: text(role), addedBy: text(me()) } },
    currentDocument: { exists: false },
    updateTransforms: [stamp('added')],
  });
}

export function setRole(email, role) {
  return commit({
    update: { name: docName('people', email), fields: { role: text(role), changedBy: text(me()) } },
    updateMask: { fieldPaths: ['role', 'changedBy'] },
    currentDocument: { exists: true },
    updateTransforms: [stamp('changed')],
  });
}

export function removePerson(email) {
  return commit({ delete: docName('people', email), currentDocument: { exists: true } });
}
