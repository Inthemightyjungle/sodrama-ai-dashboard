/*
  Lets the dashboard be installed as an app, and open without a connection.

  When online, every request goes to the network first, so a new version of
  the site shows straight away. A copy of the site's own files is kept, and
  used only when the network cannot be reached. The news, apps and tools are
  not among them: they come from the database after sign-in, on another
  address, and this worker never touches or keeps them.

  The daily news job never needs to touch this file. Change VERSION only when
  the list in SHELL changes.
*/
const VERSION = 'v3';
const CACHE = 'sd-dashboard-' + VERSION;
const SHELL = [
  './',
  'assets/css/site.css',
  'assets/js/site.js',
  'assets/js/stage-boot.js',
  'assets/js/account.js',
  'assets/fonts/bodonimoda-var.woff',
  'assets/fonts/bodonimoda-italic-var.woff',
  'assets/fonts/archivo-var.woff',
  'assets/img/logo-white.png',
  'assets/img/favicon.png',
  'assets/img/posters/news-update.webp',
  'assets/img/posters/news-caution.webp',
];
const HOME = new URL('./', self.location).pathname;   // the folder the site lives in
const NEWS_PICTURES = '/assets/img/news/';
const KEEP_NEWS_PICTURES = 20;   // older thumbnails are dropped from the offline copy

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('sd-dashboard-') && name !== CACHE).map((name) => caches.delete(name)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event, url));
});

// The dashboard itself, whether it was opened as …/, …/index.html or with something after a "?".
function isDashboard(request, url) {
  return request.mode === 'navigate' && (url.pathname === HOME || url.pathname === HOME + 'index.html');
}

async function networkFirst(event, url) {
  const request = event.request;
  try {
    const response = (await event.preloadResponse) || (await fetch(request));
    if (response.ok && response.type === 'basic' && response.status === 200) {
      event.waitUntil(keep(request, response.clone(), url));
    }
    return response;
  } catch (offline) {
    const cache = await caches.open(CACHE);
    const copy = isDashboard(request, url) ? await cache.match('./') : await cache.match(request);
    if (copy) return copy;
    throw offline;
  }
}

async function keep(request, response, url) {
  const cache = await caches.open(CACHE);
  await cache.put(isDashboard(request, url) ? './' : request, response);
  if (url.pathname.includes(NEWS_PICTURES)) {
    const pictures = (await cache.keys()).filter((key) => key.url.includes(NEWS_PICTURES));
    const extra = pictures.length - KEEP_NEWS_PICTURES;
    for (let i = 0; i < extra; i++) await cache.delete(pictures[i]);
  }
}
