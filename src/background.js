import { summarizeAndArchiveTabs } from './ai.js';
import { getWhitelist, isWhitelistedUrl } from './whitelist.js';
import { saveArchivedTabs } from './storage.js';
import { isPro, createFreeArchiveEntry } from './tier.js';

// =============================================================================
// The Rules — Non-negotiable
// =============================================================================
// 24 hours. That's all you get.
// No settings. No mercy. No "just 5 more minutes."
// =============================================================================

const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // ⚠️ TEST: 5 minutes (本番は 24 * 60 * 60 * 1000)
const BOOKMARK_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days.
const CHECK_ALARM_NAME = 'check-idle-tabs';
const BOOKMARK_ALARM_NAME = 'check-idle-bookmarks';
const CHECK_INTERVAL_MINUTES = 1; // ⚠️ TEST: 1 minute (本番は 15)
const BOOKMARK_CHECK_INTERVAL_MINUTES = 60;
const BATCH_SIZE = 10;

// =============================================================================
// Tab Activity Tracking
// =============================================================================

// In-memory cache — restored from storage on service worker wake-up
let tabLastActive = new Map();

const STORAGE_KEY_TAB_TIMESTAMPS = 'tabLastActiveTimestamps';

chrome.runtime.onInstalled.addListener(seedTabTimestamps);
chrome.runtime.onStartup.addListener(seedTabTimestamps);

async function seedTabTimestamps() {
  // Restore persisted timestamps so SW restarts don't reset idle clocks
  const { [STORAGE_KEY_TAB_TIMESTAMPS]: saved = {} } =
    await chrome.storage.local.get(STORAGE_KEY_TAB_TIMESTAMPS);
  const savedMap = new Map(Object.entries(saved).map(([k, v]) => [Number(k), v]));

  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    // Keep persisted timestamp if it exists; otherwise start fresh
    tabLastActive.set(tab.id, savedMap.get(tab.id) || now);
  }

  // Persist back (cleans up closed tab entries)
  await persistTimestamps();

  await chrome.alarms.create(CHECK_ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });
  await chrome.alarms.create(BOOKMARK_ALARM_NAME, {
    periodInMinutes: BOOKMARK_CHECK_INTERVAL_MINUTES,
  });
}

// Ensure in-memory map is populated even on alarm-wake (no onInstalled/onStartup)
async function ensureTimestampsLoaded() {
  if (tabLastActive.size > 0) return;
  const { [STORAGE_KEY_TAB_TIMESTAMPS]: saved = {} } =
    await chrome.storage.local.get(STORAGE_KEY_TAB_TIMESTAMPS);
  tabLastActive = new Map(Object.entries(saved).map(([k, v]) => [Number(k), v]));
}

async function persistTimestamps() {
  const obj = Object.fromEntries(tabLastActive);
  await chrome.storage.local.set({ [STORAGE_KEY_TAB_TIMESTAMPS]: obj });
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabLastActive.set(tabId, Date.now());
  persistTimestamps();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Only reset on actual navigation, NOT on status:'complete'
  // Chrome fires 'complete' for background tabs (favicon, SW restart, etc.)
  // which would perpetually reset idle timers
  if (changeInfo.url) {
    tabLastActive.set(tabId, Date.now());
    persistTimestamps();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabLastActive.delete(tabId);
  persistTimestamps();
});

// =============================================================================
// Idle Tab Detection — The Judge
// =============================================================================

async function getIdleTabs() {
  await ensureTimestampsLoaded();
  const now = Date.now();
  const allTabs = await chrome.tabs.query({});
  const whitelist = await getWhitelist();

  const idleTabs = allTabs.filter((tab) => {
    if (tab.pinned) return false;
    if (tab.active) return false;
    if (!tab.url || !tab.url.startsWith('http')) return false;
    if (isWhitelistedUrl(tab.url, whitelist)) return false;

    const lastActive = tabLastActive.get(tab.id) || 0;
    return now - lastActive >= IDLE_THRESHOLD_MS;
  });

  idleTabs.sort((a, b) => {
    const aTime = tabLastActive.get(a.id) || 0;
    const bTime = tabLastActive.get(b.id) || 0;
    return aTime - bTime;
  });

  return idleTabs.slice(0, BATCH_SIZE);
}

// Also return "warned" tabs (idle > 50% of threshold) for countdown display
async function getAllTabsWithStatus() {
  await ensureTimestampsLoaded();
  const now = Date.now();
  const allTabs = await chrome.tabs.query({});
  const whitelist = await getWhitelist();

  const warnThreshold = IDLE_THRESHOLD_MS * 0.5; // Warn at 12 hours

  const result = [];
  for (const tab of allTabs) {
    if (tab.pinned || tab.active) continue;
    if (!tab.url || !tab.url.startsWith('http')) continue;
    if (isWhitelistedUrl(tab.url, whitelist)) continue;

    const lastActive = tabLastActive.get(tab.id) || now;
    const idleMs = now - lastActive;

    if (idleMs >= warnThreshold) {
      result.push({
        id: tab.id,
        title: tab.title || '(No Title)',
        url: tab.url,
        idleMinutes: Math.round(idleMs / 60000),
        isDoomed: idleMs >= IDLE_THRESHOLD_MS,
      });
    }
  }

  // Most doomed first
  result.sort((a, b) => b.idleMinutes - a.idleMinutes);
  return result;
}

// =============================================================================
// Bookmark Archiving
// =============================================================================

async function getIdleBookmarks() {
  const { bookmarkArchive = false } = await chrome.storage.local.get('bookmarkArchive');
  if (!bookmarkArchive) return [];

  const whitelist = await getWhitelist();
  const now = Date.now();
  const { bookmarkAccess = {} } = await chrome.storage.local.get('bookmarkAccess');

  const tree = await chrome.bookmarks.getTree();
  const bookmarks = flattenBookmarks(tree);

  const idle = bookmarks.filter((bm) => {
    if (!bm.url || !bm.url.startsWith('http')) return false;
    if (isWhitelistedUrl(bm.url, whitelist)) return false;
    const lastAccess = bookmarkAccess[bm.id] || (bm.dateAdded || 0);
    return now - lastAccess >= BOOKMARK_THRESHOLD_MS;
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

// Track bookmark access
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
    // ignore
  }
});

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
    let entry;
    if (await isPro()) {
      try {
        entry = await summarizeAndArchiveTabs(tabData);
      } catch (aiErr) {
        console.warn('[F&F] AI archiving failed for bookmarks, falling back:', aiErr.message);
        entry = createFreeArchiveEntry(tabData);
      }
    } else {
      entry = createFreeArchiveEntry(tabData);
    }
    entry.source = 'bookmark';
    await saveArchivedTabs(entry);

    for (const bm of bookmarks) {
      try { await chrome.bookmarks.remove(bm.id); } catch { /* gone already */ }
    }
    await updateBadge();
  } catch (err) {
    console.error('[F&F] Bookmark archiving failed:', err);
  }
}

// =============================================================================
// Alarm — The Executioner
// =============================================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await ensureTimestampsLoaded();
  if (alarm.name === CHECK_ALARM_NAME) {
    console.log('[F&F] ⏰ Alarm fired. Checking idle tabs...');
    const { autoArchive } = await chrome.storage.local.get({ autoArchive: false });
    if (!autoArchive) {
      console.log('[F&F] autoArchive is OFF — skipping.');
      return;
    }
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
// Core — Tier-aware Processing
// =============================================================================

async function processIdleTabs() {
  const idleTabs = await getIdleTabs();
  console.log(`[F&F] Idle tabs found: ${idleTabs.length}`, idleTabs.map((t) => t.title));
  if (idleTabs.length === 0) return;

  const tabData = idleTabs.map((tab) => ({
    id: tab.id,
    title: tab.title || '(No Title)',
    url: tab.url,
    lastActive: tabLastActive.get(tab.id) || Date.now(),
  }));

  try {
    let entry;
    if (await isPro()) {
      try {
        entry = await summarizeAndArchiveTabs(tabData);
      } catch (aiErr) {
        console.warn('[F&F] AI archiving failed, falling back to free tier:', aiErr.message);
        entry = createFreeArchiveEntry(tabData);
      }
    } else {
      entry = createFreeArchiveEntry(tabData);
    }
    entry.source = 'tab';
    await saveArchivedTabs(entry);

    const tabIds = idleTabs.map((t) => t.id);
    await chrome.tabs.remove(tabIds);
    tabIds.forEach((id) => tabLastActive.delete(id));
    await persistTimestamps();
    await updateBadge();
    console.log(`[F&F] ✅ Archived ${tabIds.length} tabs.`);
  } catch (err) {
    console.error('[F&F] Tab archiving failed:', err);
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
  await chrome.action.setBadgeBackgroundColor({ color: '#DC2626' }); // Red. Urgent.
}

// =============================================================================
// Message API
// =============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_IDLE_TABS') {
    getAllTabsWithStatus().then((tabs) => sendResponse({ tabs }));
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

  let entry;
  if (await isPro()) {
    try {
      entry = await summarizeAndArchiveTabs(tabData);
    } catch (aiErr) {
      console.warn('[F&F] AI archiving failed for selected tabs, falling back:', aiErr.message);
      entry = createFreeArchiveEntry(tabData);
    }
  } else {
    entry = createFreeArchiveEntry(tabData);
  }
  entry.source = 'tab';
  await saveArchivedTabs(entry);
  await chrome.tabs.remove(tabIds);
  tabIds.forEach((id) => tabLastActive.delete(id));
  await persistTimestamps();
  await updateBadge();
}
