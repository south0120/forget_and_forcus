import { summarizeAndArchiveTabs } from './ai.js';
import { getWhitelist, isWhitelistedUrl } from './whitelist.js';
import { saveArchivedTabs } from './storage.js';
import { isPro, createFreeArchiveEntry } from './tier.js';

// =============================================================================
// Constants & Defaults
// =============================================================================
const CHECK_ALARM_NAME = 'check-idle-tabs';
const BOOKMARK_ALARM_NAME = 'check-idle-bookmarks';
const CHECK_INTERVAL_MINUTES = 15;
const BOOKMARK_CHECK_INTERVAL_MINUTES = 60;
const BATCH_SIZE = 10;

const DEFAULT_IDLE_THRESHOLD_MINUTES = 60;
const DEFAULT_BOOKMARK_THRESHOLD_DAYS = 30;

// =============================================================================
// Tab Activity Tracking
// =============================================================================

const tabLastActive = new Map();

chrome.runtime.onInstalled.addListener(seedTabTimestamps);
chrome.runtime.onStartup.addListener(seedTabTimestamps);

async function seedTabTimestamps() {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    tabLastActive.set(tab.id, now);
  }

  await chrome.alarms.create(CHECK_ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });
  await chrome.alarms.create(BOOKMARK_ALARM_NAME, {
    periodInMinutes: BOOKMARK_CHECK_INTERVAL_MINUTES,
  });
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabLastActive.set(tabId, Date.now());
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    tabLastActive.set(tabId, Date.now());
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabLastActive.delete(tabId);
});

// =============================================================================
// Settings Helpers
// =============================================================================

async function getIdleThresholdMs() {
  const { idleThresholdMinutes = DEFAULT_IDLE_THRESHOLD_MINUTES } =
    await chrome.storage.local.get('idleThresholdMinutes');
  return idleThresholdMinutes * 60 * 1000;
}

// =============================================================================
// Idle Tab Detection
// =============================================================================

async function getIdleTabs() {
  const now = Date.now();
  const idleThresholdMs = await getIdleThresholdMs();
  const allTabs = await chrome.tabs.query({});
  const whitelist = await getWhitelist();

  const idleTabs = allTabs.filter((tab) => {
    if (tab.pinned) return false;
    if (tab.active) return false;
    if (!tab.url || !tab.url.startsWith('http')) return false;
    if (isWhitelistedUrl(tab.url, whitelist)) return false;

    const lastActive = tabLastActive.get(tab.id) || 0;
    return now - lastActive >= idleThresholdMs;
  });

  idleTabs.sort((a, b) => {
    const aTime = tabLastActive.get(a.id) || 0;
    const bTime = tabLastActive.get(b.id) || 0;
    return aTime - bTime;
  });

  return idleTabs.slice(0, BATCH_SIZE);
}

// =============================================================================
// Bookmark Archiving
// =============================================================================

async function getIdleBookmarks() {
  const { bookmarkArchive = false, bookmarkThresholdDays = DEFAULT_BOOKMARK_THRESHOLD_DAYS } =
    await chrome.storage.local.get(['bookmarkArchive', 'bookmarkThresholdDays']);

  if (!bookmarkArchive) return [];

  const whitelist = await getWhitelist();
  const thresholdMs = bookmarkThresholdDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Get bookmark access timestamps from storage
  const { bookmarkAccess = {} } = await chrome.storage.local.get('bookmarkAccess');

  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarks(tree);

  const idle = bookmarks.filter((bm) => {
    if (!bm.url || !bm.url.startsWith('http')) return false;
    if (isWhitelistedUrl(bm.url, whitelist)) return false;

    const lastAccess = bookmarkAccess[bm.id] || (bm.dateAdded || 0);
    return now - lastAccess >= thresholdMs;
  });

  return idle.slice(0, BATCH_SIZE);
}

function flattenBookmarks(nodes) {
  const result = [];
  for (const node of nodes) {
    if (node.url) result.push(node);
    if (node.children) result.push(...flattenBookmarks(node.children));
  }
  return result;
}

async function processIdleBookmarks() {
  const bookmarks = await getIdleBookmarks();
  if (bookmarks.length === 0) return;

  const tabData = bookmarks.map((bm) => ({
    id: bm.id,
    title: bm.title || '(No Title)',
    url: bm.url,
    lastActive: bm.dateAdded || Date.now(),
    source: 'bookmark',
  }));

  try {
    let archiveEntry;
    if (await isPro()) {
      archiveEntry = await summarizeAndArchiveTabs(tabData);
    } else {
      archiveEntry = createFreeArchiveEntry(tabData);
    }
    archiveEntry.source = 'bookmark';
    await saveArchivedTabs(archiveEntry);

    // Remove archived bookmarks
    for (const bm of bookmarks) {
      try {
        await chrome.bookmarks.remove(bm.id);
      } catch {
        // bookmark may already be removed
      }
    }

    await updateBadge();
  } catch (err) {
    console.error('[F&F] Failed to process idle bookmarks:', err);
  }
}

// Track bookmark access when a tab navigates to a bookmarked URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;

  const { bookmarkArchive = false } = await chrome.storage.local.get('bookmarkArchive');
  if (!bookmarkArchive) return;

  try {
    const results = await chrome.bookmarks.search({ url: tab.url });
    if (results.length > 0) {
      const { bookmarkAccess = {} } = await chrome.storage.local.get('bookmarkAccess');
      for (const bm of results) {
        bookmarkAccess[bm.id] = Date.now();
      }
      await chrome.storage.local.set({ bookmarkAccess });
    }
  } catch {
    // ignore errors
  }
});

// =============================================================================
// Alarm Handler
// =============================================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CHECK_ALARM_NAME) {
    const { autoArchive } = await chrome.storage.local.get({ autoArchive: false });
    if (!autoArchive) return;
    await processIdleTabs();
  }

  if (alarm.name === BOOKMARK_ALARM_NAME) {
    const { autoArchive, bookmarkArchive } = await chrome.storage.local.get({
      autoArchive: false,
      bookmarkArchive: false,
    });
    if (!autoArchive || !bookmarkArchive) return;
    await processIdleBookmarks();
  }
});

// =============================================================================
// Core Processing — Tier-aware
// =============================================================================

async function processIdleTabs() {
  const idleTabs = await getIdleTabs();
  if (idleTabs.length === 0) return;

  const tabData = idleTabs.map((tab) => ({
    id: tab.id,
    title: tab.title || '(No Title)',
    url: tab.url,
    lastActive: tabLastActive.get(tab.id) || Date.now(),
  }));

  try {
    let archiveEntry;
    if (await isPro()) {
      archiveEntry = await summarizeAndArchiveTabs(tabData);
    } else {
      archiveEntry = createFreeArchiveEntry(tabData);
    }
    archiveEntry.source = 'tab';
    await saveArchivedTabs(archiveEntry);

    const tabIds = idleTabs.map((t) => t.id);
    await chrome.tabs.remove(tabIds);
    tabIds.forEach((id) => tabLastActive.delete(id));

    await updateBadge();
  } catch (err) {
    console.error('[F&F] Failed to process idle tabs:', err);
  }
}

// =============================================================================
// Badge
// =============================================================================

async function updateBadge() {
  const { archives = [] } = await chrome.storage.local.get('archives');
  const totalCount = archives.reduce((sum, a) => sum + a.tabs.length, 0);
  const text = totalCount > 0 ? String(totalCount) : '';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#6C63FF' });
}

// =============================================================================
// Message API
// =============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_IDLE_TABS') {
    getIdleTabs().then((tabs) => {
      const tabData = tabs.map((tab) => ({
        id: tab.id,
        title: tab.title || '(No Title)',
        url: tab.url,
        idleMinutes: Math.round(
          (Date.now() - (tabLastActive.get(tab.id) || Date.now())) / 60000
        ),
      }));
      sendResponse({ tabs: tabData });
    });
    return true;
  }

  if (message.type === 'GET_IDLE_BOOKMARKS') {
    getIdleBookmarks().then((bookmarks) => {
      const data = bookmarks.map((bm) => ({
        id: bm.id,
        title: bm.title || '(No Title)',
        url: bm.url,
        source: 'bookmark',
      }));
      sendResponse({ bookmarks: data });
    });
    return true;
  }

  if (message.type === 'ARCHIVE_TABS') {
    processIdleTabs()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'ARCHIVE_SELECTED') {
    archiveSelectedTabs(message.tabIds)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'ARCHIVE_BOOKMARKS') {
    processIdleBookmarks()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'UPDATE_BADGE') {
    updateBadge().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === 'GET_TIER') {
    isPro().then((pro) => sendResponse({ isPro: pro }));
    return true;
  }
});

async function archiveSelectedTabs(tabIds) {
  const allTabs = await chrome.tabs.query({});
  const targetTabs = allTabs.filter((t) => tabIds.includes(t.id));

  if (targetTabs.length === 0) return;

  const tabData = targetTabs.map((tab) => ({
    id: tab.id,
    title: tab.title || '(No Title)',
    url: tab.url,
    lastActive: tabLastActive.get(tab.id) || Date.now(),
  }));

  let archiveEntry;
  if (await isPro()) {
    archiveEntry = await summarizeAndArchiveTabs(tabData);
  } else {
    archiveEntry = createFreeArchiveEntry(tabData);
  }
  archiveEntry.source = 'tab';
  await saveArchivedTabs(archiveEntry);
  await chrome.tabs.remove(tabIds);
  tabIds.forEach((id) => tabLastActive.delete(id));
  await updateBadge();
}
