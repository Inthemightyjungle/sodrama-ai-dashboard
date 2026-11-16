/*
  Checks the live site for a new edition of the AI news every hour, and puts
  "NEW" on the toolbar button when there is one. Nothing else runs in the
  background.
*/
import { load, updateBadge } from './shared.js';

async function check() {
  try {
    const { data } = await load('news');
    await updateBadge(data.updated);
  } catch (err) {
    // Offline or the site is unreachable: try again at the next check.
  }
}

async function ensureAlarm() {
  if (!(await chrome.alarms.get('news'))) chrome.alarms.create('news', { periodInMinutes: 60, delayInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(() => { ensureAlarm(); check(); });
chrome.runtime.onStartup.addListener(() => { ensureAlarm(); check(); });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'news') check(); });
