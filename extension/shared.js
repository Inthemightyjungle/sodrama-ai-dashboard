/*
  What the popup, the side panel and the background script share.

  The extension carries no news or app list of its own. It reads them from the
  live site, the same files the site itself uses, so it is up to date as soon
  as the daily news job has run. The last copy read is kept, so the popup
  still shows something when the computer is offline.
*/
export const SITE = 'https://inthemightyjungle.github.io/sodrama-ai-dashboard/';
export const FORM = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=rcy329-Y_kaUIVobvsyr0TBFYZVJ-u1FmQ3PZtT_HmlUNFlVNjJPVjcwTFJTTjVITE5IQVpZUTNYOSQlQCN0PWcu';

const FILES = {
  news: 'assets/data/news.js',
  thumbs: 'assets/data/news-thumbs.js',
  apps: 'assets/data/apps.js',
};

// The site's data files are strict JSON inside "window.SD_… = …;". Only the JSON is read; nothing is run.
export function parse(text) {
  const match = text.match(/window\.SD_[A-Z_]+\s*=\s*([[{][\s\S]*?)\s*;\s*$/);
  if (!match) throw new Error('Unexpected file format');
  return JSON.parse(match[1]);
}

// Returns { data, fresh }. fresh is false when the copy kept from last time had to be used.
export async function load(name) {
  const key = 'data:' + name;
  try {
    const response = await fetch(SITE + FILES[name] + '?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = parse(await response.text());
    await chrome.storage.local.set({ [key]: data });
    return { data, fresh: true };
  } catch (err) {
    const kept = (await chrome.storage.local.get(key))[key];
    if (kept) return { data: kept, fresh: false };
    throw err;
  }
}

// An address on the site, for pictures and links that the data files give as relative paths.
export function onSite(path) {
  return /^https?:/.test(path) ? path : SITE + path.replace(/^\.?\//, '');
}

// The toolbar button shows "NEW" until the newest edition of the news has been opened.
export async function updateBadge(updated) {
  const { seen } = await chrome.storage.local.get('seen');
  const fresh = !!updated && updated !== seen;
  await chrome.action.setBadgeText({ text: fresh ? 'NEW' : '' });
  if (fresh) {
    await chrome.action.setBadgeBackgroundColor({ color: '#ffc24a' });
    if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({ color: '#0c0a10' });
  }
}

export async function markSeen(updated) {
  if (!updated) return;
  await chrome.storage.local.set({ seen: updated });
  await updateBadge(updated);
}
