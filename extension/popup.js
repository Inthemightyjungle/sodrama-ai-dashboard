/*
  The toolbar window: today's AI news, the apps and the four steps, read from
  the live site (see shared.js). Everything from the site is written into the
  page as plain text, never as HTML.
*/
import { SITE, FORM, load, onSite, markSeen } from './shared.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function link(href, className) {
  const a = el('a', className);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function image(src, alt = '') {
  const img = el('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

const ARROW = '<svg class="app-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"></path></svg>';

/* ---------- AI news ---------- */

function niceDate(iso, withTime) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const opts = withTime
    ? { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore' }
    : { day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' };
  return new Intl.DateTimeFormat('en-SG', opts).format(d);
}

function showNews(news, thumbs, fresh) {
  const box = $('[data-stories]');
  box.replaceChildren();
  const stale = Date.now() - new Date(news.updated).getTime() > 36 * 3600 * 1000;
  const edition = $('[data-edition]');
  edition.classList.toggle('is-stale', stale || !fresh);
  $('[data-edition-text]').textContent = !fresh
    ? 'You’re offline. This is the last news seen, from ' + niceDate(news.updated, true) + '.'
    : (stale ? 'Last updated ' : 'Updated ') + niceDate(news.updated, true);

  (news.stories || []).forEach((story, i) => {
    const caution = story.kind === 'caution';
    const card = link(story.url, 'story' + (i === 0 ? ' is-lead' : '') + (caution ? ' is-caution' : ''));
    const frame = el('span', 'story-thumb');
    const thumb = thumbs && thumbs[story.id];
    const fallback = 'assets/img/posters/' + (caution ? 'news-caution.webp' : 'news-update.webp');
    frame.append(image(thumb && thumb.src && story.thumb !== 'none' ? onSite(thumb.src) + '?v=' + (thumb.v || '') : onSite(fallback)));
    const text = el('span', 'story-text');
    const kicker = el('span', 'story-kicker');
    if (caution) kicker.append(el('span', 'caution', 'Word of caution'));
    kicker.append(el('span', '', story.category || ''));
    text.append(kicker, el('span', 'story-title', story.title));
    if (i === 0 && story.summary) text.append(el('span', 'story-summary', story.summary));
    text.append(el('span', 'story-meta', [story.source, niceDate(story.date + 'T12:00:00+08:00')].filter(Boolean).join(', ')));
    card.append(frame, text);
    box.append(card);
  });
  if (!box.children.length) box.append(el('p', 'note', 'No stories today yet. Check back after 7 am.'));
}

/* ---------- apps ---------- */

function showApps(apps) {
  const box = $('[data-apps]');
  box.replaceChildren();
  apps.forEach((app) => {
    const row = link(app.url, 'app');
    const cover = el('span', 'app-cover');
    const c = app.cover || {};
    if (c.type === 'layers') {
      const back = image(onSite(c.background));
      const logo = image(onSite(c.logo));
      logo.classList.add('is-logo');
      if (c.pixelated) { back.classList.add('is-pixelated'); logo.classList.add('is-pixelated'); }
      cover.append(back, logo);
    } else if (c.src) {
      const img = image(onSite(c.src));
      if (c.position) img.style.objectPosition = c.position;
      if (c.pixelated) img.classList.add('is-pixelated');
      cover.append(img);
    }
    const text = el('span', 'app-text');
    text.append(el('span', 'app-name', app.name), el('span', 'app-meta', app.meta), el('span', 'app-desc', app.description));
    row.append(cover, text);
    row.insertAdjacentHTML('beforeend', ARROW);
    row.setAttribute('aria-label', app.name + ': ' + app.action);
    box.append(row);
  });
}

/* ---------- tabs ---------- */

function choose(name, instant) {
  $$('[data-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
  $$('[data-pane]').forEach((pane) => { pane.hidden = pane.dataset.pane !== name; });
  const tab = $(`[data-tab="${name}"]`);
  const pill = $('[data-pill]');
  if (instant) pill.style.transition = 'none';
  pill.style.width = tab.offsetWidth + 'px';
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
  if (instant) requestAnimationFrame(() => { pill.style.transition = ''; });
  $('.panes').scrollTop = 0;
  try { localStorage.setItem('tab', name); } catch (e) { /* not important */ }
}

/* ---------- start ---------- */

function failed(box, what, retry) {
  box.replaceChildren(el('p', 'note', 'Couldn’t reach the dashboard to get ' + what + '. Check your connection.'));
  const again = el('button', 'btn btn-ghost', 'Try again');
  again.type = 'button';
  again.addEventListener('click', retry);
  box.firstChild.append(el('br'), again);
}

async function loadNews() {
  try {
    const [news, thumbs] = await Promise.all([load('news'), load('thumbs').catch(() => ({ data: {} }))]);
    showNews(news.data, thumbs.data, news.fresh);
    markSeen(news.data.updated);
  } catch (err) {
    failed($('[data-stories]'), 'today’s news', loadNews);
  }
}

async function loadApps() {
  try {
    showApps((await load('apps')).data);
  } catch (err) {
    failed($('[data-apps]'), 'the apps', loadApps);
  }
}

$('[data-form]').href = FORM;
$('[data-site]').href = SITE + '#news';
$('[data-site-how]').href = SITE + '#how';
$$('[data-tab]').forEach((tab) => tab.addEventListener('click', () => choose(tab.dataset.tab)));
let start = 'news';
try { start = localStorage.getItem('tab') || 'news'; } catch (e) { /* first time */ }
document.fonts.ready.then(() => choose(start, true));
choose(start, true);

// The side panel opens beside the page you are on. Chrome only allows it straight after a click,
// so the window is looked up first.
let windowId = null;
chrome.windows.getCurrent().then((w) => { windowId = w.id; });
$('[data-panel]').addEventListener('click', () => {
  if (windowId == null || !chrome.sidePanel) return;
  chrome.sidePanel.open({ windowId }).then(() => window.close(), () => {});
});

loadNews();
loadApps();
