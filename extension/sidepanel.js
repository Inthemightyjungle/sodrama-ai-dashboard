// Shows the full site in Chrome's side panel, opened at the AI news.
import { SITE, load, markSeen } from './shared.js';

const frame = document.querySelector('[data-site]');
const offline = document.querySelector('[data-offline]');

function show() {
  const online = navigator.onLine;
  offline.hidden = online;
  frame.hidden = !online;
  if (online && !frame.src) frame.src = SITE + '#news';
}

document.querySelector('[data-retry]').addEventListener('click', show);
window.addEventListener('online', show);
show();

// The news is on screen, so the "NEW" on the toolbar button can go.
load('news').then(({ data }) => markSeen(data.updated), () => {});
