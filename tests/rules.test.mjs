/*
  Checks firestore.rules against the Firestore emulator: who can read the
  content, see the list, and change it. Run by .github/workflows/test-signin.yml.
*/
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

const OWNER = 'owner@sodrama.test';
const ADMIN = 'admin@sodrama.test';
const STAFF = 'staff@sodrama.test';
const OUTSIDER = 'outsider@example.test';

let env;

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-dashboard',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

after(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'content/site'), { news: '{}', published: serverTimestamp() });
    await setDoc(doc(db, 'people', OWNER), { email: OWNER, role: 'admin', owner: true, added: serverTimestamp(), addedBy: 'setup' });
    await setDoc(doc(db, 'people', ADMIN), { email: ADMIN, role: 'admin', added: serverTimestamp(), addedBy: OWNER });
    await setDoc(doc(db, 'people', STAFF), { email: STAFF, role: 'staff', added: serverTimestamp(), addedBy: OWNER });
  });
});

const as = (email, verified = true) => env.authenticatedContext('uid-' + email, { email, email_verified: verified }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();

test('content: only signed-in, confirmed people on the list can read it', async () => {
  await assertFails(getDoc(doc(nobody(), 'content/site')));
  await assertFails(getDoc(doc(as(STAFF, false), 'content/site')));
  await assertFails(getDoc(doc(as(OUTSIDER), 'content/site')));
  await assertSucceeds(getDoc(doc(as(STAFF), 'content/site')));
  await assertSucceeds(getDoc(doc(as(OWNER), 'content/site')));
});

test('content: no one on the website can change it', async () => {
  await assertFails(setDoc(doc(as(OWNER), 'content/site'), { news: 'x' }));
  await assertFails(updateDoc(doc(as(ADMIN), 'content/site'), { news: 'x' }));
  await assertFails(deleteDoc(doc(as(ADMIN), 'content/site')));
});

test('people: you may check your own record, even when you are not on the list', async () => {
  await assertSucceeds(getDoc(doc(as(STAFF), 'people', STAFF)));
  await assertSucceeds(getDoc(doc(as(OUTSIDER), 'people', OUTSIDER)));
  await assertFails(getDoc(doc(as(STAFF, false), 'people', STAFF)));
  await assertFails(getDoc(doc(nobody(), 'people', STAFF)));
});

test('people: an address with capitals in the sign-in still matches its record', async () => {
  await assertSucceeds(getDoc(doc(as('Staff@SoDrama.test'), 'people', STAFF)));
  await assertSucceeds(getDoc(doc(as('Staff@SoDrama.test'), 'content/site')));
});

test('people: only admins can see others or the whole list', async () => {
  await assertFails(getDoc(doc(as(STAFF), 'people', ADMIN)));
  await assertFails(getDocs(collection(as(STAFF), 'people')));
  await assertFails(getDocs(collection(as(OUTSIDER), 'people')));
  await assertSucceeds(getDoc(doc(as(ADMIN), 'people', STAFF)));
  await assertSucceeds(getDocs(collection(as(ADMIN), 'people')));
});

test('people: admins can add someone, in the right shape', async () => {
  const db = as(ADMIN);
  const good = (email, extra = {}) => ({ email, role: 'staff', added: serverTimestamp(), addedBy: ADMIN, ...extra });
  await assertSucceeds(setDoc(doc(db, 'people', 'new@sodrama.test'), good('new@sodrama.test')));
  await assertSucceeds(setDoc(doc(db, 'people', 'boss@sodrama.test'), good('boss@sodrama.test', { role: 'admin' })));
  await assertFails(setDoc(doc(db, 'people', 'a@sodrama.test'), good('a@sodrama.test', { role: 'owner' })));
  await assertFails(setDoc(doc(db, 'people', 'b@sodrama.test'), good('b@sodrama.test', { owner: true })));
  await assertFails(setDoc(doc(db, 'people', 'c@sodrama.test'), good('c@sodrama.test', { addedBy: OWNER })));
  await assertFails(setDoc(doc(db, 'people', 'd@sodrama.test'), good('d@sodrama.test', { added: Timestamp.fromDate(new Date('2020-01-01')) })));
  await assertFails(setDoc(doc(db, 'people', 'e@sodrama.test'), good('other@sodrama.test')));
  await assertFails(setDoc(doc(db, 'people', 'Caps@SoDrama.test'), good('Caps@SoDrama.test')));
  await assertFails(setDoc(doc(db, 'people', 'not-an-email'), good('not-an-email')));
  await assertFails(setDoc(doc(db, 'people', 'f@sodrama.test'), good('f@sodrama.test', { seen: serverTimestamp() })));
});

test('people: staff and outsiders cannot add anyone', async () => {
  const shape = (by) => ({ email: 'x@sodrama.test', role: 'staff', added: serverTimestamp(), addedBy: by });
  await assertFails(setDoc(doc(as(STAFF), 'people', 'x@sodrama.test'), shape(STAFF)));
  await assertFails(setDoc(doc(as(OUTSIDER), 'people', OUTSIDER), { ...shape(OUTSIDER), email: OUTSIDER }));
  await assertFails(setDoc(doc(as(ADMIN, false), 'people', 'x@sodrama.test'), shape(ADMIN)));
});

test('people: admins can change someone else\'s role, and only the role', async () => {
  const db = as(ADMIN);
  const change = (role, extra = {}) => ({ role, changed: serverTimestamp(), changedBy: ADMIN, ...extra });
  await assertSucceeds(updateDoc(doc(db, 'people', STAFF), change('admin')));
  await assertSucceeds(updateDoc(doc(db, 'people', STAFF), change('staff')));
  await assertFails(updateDoc(doc(db, 'people', STAFF), change('owner')));
  await assertFails(updateDoc(doc(db, 'people', STAFF), change('admin', { email: 'other@sodrama.test' })));
  await assertFails(updateDoc(doc(db, 'people', STAFF), change('admin', { changedBy: OWNER })));
  await assertFails(updateDoc(doc(db, 'people', STAFF), change('admin', { owner: true })));
  await assertFails(updateDoc(doc(db, 'people', ADMIN), change('staff')));          // not yourself
  await assertFails(updateDoc(doc(db, 'people', OWNER), change('staff')));          // never the owner
  await assertFails(updateDoc(doc(as(STAFF), 'people', ADMIN), { role: 'staff', changed: serverTimestamp(), changedBy: STAFF }));
});

test('people: admins can remove others, but not themselves or the owner', async () => {
  await assertFails(deleteDoc(doc(as(STAFF), 'people', ADMIN)));
  await assertFails(deleteDoc(doc(as(ADMIN), 'people', ADMIN)));
  await assertFails(deleteDoc(doc(as(ADMIN), 'people', OWNER)));
  await assertFails(deleteDoc(doc(as(OWNER), 'people', OWNER)));
  await assertSucceeds(deleteDoc(doc(as(ADMIN), 'people', STAFF)));
  await assertSucceeds(deleteDoc(doc(as(OWNER), 'people', ADMIN)));
});

test('people: anyone on the list may note when they last came, and nothing else', async () => {
  await assertSucceeds(updateDoc(doc(as(STAFF), 'people', STAFF), { seen: serverTimestamp() }));
  await assertFails(updateDoc(doc(as(STAFF), 'people', STAFF), { seen: Timestamp.fromDate(new Date('2030-01-01')) }));
  await assertFails(updateDoc(doc(as(STAFF), 'people', STAFF), { role: 'admin' }));
  await assertFails(updateDoc(doc(as(STAFF), 'people', STAFF), { seen: serverTimestamp(), role: 'admin' }));
  await assertFails(updateDoc(doc(as(STAFF), 'people', ADMIN), { seen: serverTimestamp() }));
  await assertFails(updateDoc(doc(as(STAFF, false), 'people', STAFF), { seen: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(as(OWNER), 'people', OWNER), { seen: serverTimestamp() }));
});

test('everything else is closed', async () => {
  await assertFails(getDoc(doc(as(OWNER), 'secrets/anything')));
  await assertFails(setDoc(doc(as(OWNER), 'notes/x'), { a: 1 }));
});
