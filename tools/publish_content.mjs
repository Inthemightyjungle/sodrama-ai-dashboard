/*
  Run by .github/workflows/deploy.yml (and by the emulator tests). Three jobs:

  1. Writes the web address book for sign-in, assets/js/firebase-config.js,
     into the folder that is about to be published (the first argument).
  2. Copies the news, thumbnails, apps, approved tools, tool icons and links
     from assets/data/ into the database as content/site. Only signed-in people
     on the list can read it (firestore.rules); the files themselves are not
     published.
  3. Makes sure the owner (the OWNER_EMAIL secret) is on the list as an admin
     and marked as the owner, so they can never be locked out.

  With FIRESTORE_EMULATOR_HOST set it talks to the local emulators instead,
  and needs no key.

  Never prints the owner's address or anything from the key.
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const out = process.argv[2];
if (!out) fail('Usage: node publish_content.mjs <folder being published>');

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
let projectId;
let credential;
if (emulator) {
  projectId = process.env.GCLOUD_PROJECT || 'demo-dashboard';
} else {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) fail('GOOGLE_APPLICATION_CREDENTIALS is not set.');
  const key = JSON.parse(readFileSync(keyFile, 'utf8'));
  projectId = key.project_id;
  credential = cert(key);
}

const app = initializeApp(credential ? { credential, projectId } : { projectId });
const db = getFirestore(app);

function fail(message) {
  console.error('::error::' + message);
  process.exit(1);
}

/* ---------- 1. the sign-in settings for the page ---------- */

async function google(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const why = (data.error && data.error.message) || res.statusText;
    if (res.status === 403) {
      fail('The Firebase key is not allowed to read the project\'s web app settings (' + why + '). ' +
        'In the Google Cloud console, open IAM, find the firebase-adminsdk service account and give it the role "Firebase Admin".');
    }
    fail('Firebase answered ' + res.status + ': ' + why);
  }
  return data;
}

async function webConfig() {
  if (emulator) {
    return {
      apiKey: 'demo-key', authDomain: projectId + '.firebaseapp.com', projectId, appId: '1:1:web:1',
      emulator: { auth: 'http://' + (process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'), firestore: 'http://' + emulator },
    };
  }
  const { access_token: token } = await credential.getAccessToken();
  const base = 'https://firebase.googleapis.com/v1beta1/projects/' + projectId;
  let apps = (await google(token, 'GET', base + '/webApps')).apps || [];
  apps = apps.filter((a) => a.state !== 'DELETED');
  let appId = (apps.find((a) => a.displayName === 'AI Solutions Dashboard') || apps[0] || {}).appId;
  if (!appId) {
    console.log('No web app registered yet: registering "AI Solutions Dashboard".');
    let op = await google(token, 'POST', base + '/webApps', { displayName: 'AI Solutions Dashboard' });
    for (let i = 0; i < 30 && !op.done; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      op = await google(token, 'GET', 'https://firebase.googleapis.com/v1beta1/' + op.name);
    }
    if (!op.done || !op.response) fail('Registering the web app did not finish.');
    appId = op.response.appId;
  }
  const c = await google(token, 'GET', base + '/webApps/' + appId + '/config');
  if (!c.apiKey) fail('The web app has no browser key. In the Firebase console, open Project settings and check the web app is listed.');
  return { apiKey: c.apiKey, authDomain: c.authDomain || projectId + '.firebaseapp.com', projectId: c.projectId || projectId, appId: c.appId || appId };
}

/* ---------- 2. the content ---------- */

const FILES = {
  news: ['assets/data/news.js', 'SD_NEWS'],
  newsThumbs: ['assets/data/news-thumbs.js', 'SD_NEWS_THUMBS'],
  apps: ['assets/data/apps.js', 'SD_APPS'],
  tools: ['assets/data/tools.js', 'SD_TOOLS'],
  toolIcons: ['assets/data/tool-icons.js', 'SD_TOOL_ICONS'],
  links: ['assets/data/links.js', 'SD_LINKS'],
};

// Each file is strict JSON inside "window.SD_… = …;", after an optional comment.
function readData(path, name) {
  const text = readFileSync(path, 'utf8');
  const start = text.search(new RegExp('^window\\.' + name + '\\s*=', 'm'));
  if (start < 0) fail(path + ': could not find window.' + name + ' = …;');
  const body = text.slice(start).replace(/^window\.\w+\s*=\s*/, '').trim().replace(/;$/, '');
  try {
    return JSON.stringify(JSON.parse(body));
  } catch (err) {
    fail(path + ' is not strict JSON: ' + err.message);
  }
}

/* ---------- 3. the owner ---------- */

async function keepOwner() {
  const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(owner)) {
    fail('The OWNER_EMAIL secret is missing or is not an email address.');
  }
  const people = db.collection('people');
  const ref = people.doc(owner);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ email: owner, role: 'admin', owner: true, added: FieldValue.serverTimestamp(), addedBy: 'setup' });
    console.log('Added the owner to the list as an admin.');
  } else if (snap.get('role') !== 'admin' || snap.get('owner') !== true) {
    await ref.update({ role: 'admin', owner: true });
    console.log('Made sure the owner is an admin.');
  } else {
    console.log('The owner is on the list as an admin.');
  }
  // If OWNER_EMAIL was changed, the previous owner stays on the list as an ordinary admin.
  const former = await people.where('owner', '==', true).get();
  for (const doc of former.docs) {
    if (doc.id !== owner) {
      await doc.ref.update({ owner: FieldValue.delete() });
      console.log('A previous owner is now an ordinary admin.');
    }
  }
}

/* ---------- run ---------- */

const config = await webConfig();
const configFile = join(out, 'assets/js/firebase-config.js');
mkdirSync(dirname(configFile), { recursive: true });
writeFileSync(configFile,
  '// Written by tools/publish_content.mjs when the site is deployed. These values only say which Firebase\n' +
  '// project to sign in to; they are not secret. What each person may read is decided by firestore.rules.\n' +
  'export default ' + JSON.stringify(config, null, 2) + ';\n');
console.log('Wrote the sign-in settings for project ' + projectId + '.');

const site = {};
let size = 0;
for (const [key, [path, name]] of Object.entries(FILES)) {
  site[key] = readData(path, name);
  size += site[key].length;
}
if (size > 900 * 1024) fail('The content is ' + Math.round(size / 1024) + ' KB, over the database\'s limit for one record.');
site.published = FieldValue.serverTimestamp();
site.commit = process.env.GITHUB_SHA || '';
await db.doc('content/site').set(site);
console.log('Published the content (' + Math.round(size / 1024) + ' KB).');

await keepOwner();
