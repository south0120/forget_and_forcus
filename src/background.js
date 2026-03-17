import { summarizeAndArchiveTabs } from './ai.js';
import { getWhitelist, isWhitelistedUrl } from './whitelist.js';
import { saveArchivedTabs } from './storage.js';

// =============================================================================
// Constants
// =============================================================================
const IDLE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const CHECK_ALARM_NAME = 'check-idle-tabs';
const CHECK_INTERVAL_MINUTES = 15;
const BATCH_SIZE = 10;

// =============================================================================
// Tab Activity Tracking
// =============================================================================

// Record the last time each tab was activated: { [tabId]: timestamp }
const tabLastActive = new Map();

// On install / startup, seed all existing tabs
chrome.runtime.onInstalled.addListener(seedTabTimestamps);
chrome.runtime.onStartup.addListener(seedTabTimestamps);

async function seedTabTimestamps() {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  for (const tab of tabs) {
    tabLastActive.set(tab.id, now);
  }

  // Set up periodic alarm
  await chrome.alarms.create(CHECK_ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
  });
}

// Track tab activation
chrome.tabs.onActivated.addListener(({ tabId }) => {
  tabLastActive.set(tabId, Date.now());
});

// Track navigation (counts as activity)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    tabLastActive.set(tabId, Date.now());
  }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  tabLastActive.delete(tabId);
});

// =============================================================================
// Idle Tab Detection
// =============================================================================

async function getIdleTabs() {
  const now = Date.now();
  const allTabs = await chrome.tabs.query({});
  const whitelist = await getWhitelist();

  const idleTabs = allTabs.filter((tab) => {
    // Skip pinned tabs
    if (tab.pinned) return false;

    // Skip active tab in any window
    if (tab.active) return false;

    // Skip chrome:// and other internal URLs
    if (!tab.url || !tab.url.startsWith('http')) return false;

    // Skip whitelisted URLs
    if (isWhitelistedUrl(tab.url, whitelist)) return false;

    // Check idle threshold
    const lastActive = tabLastActive.get(tab.id) || 0;
    return now - lastActive >= IDLE_THRESHOLD_MS;
  });

  // Sort by idle time (oldest first) and take a batch
  idleTabs.sort((a, b) => {
    const aTime = tabLastActive.get(a.id) || 0;
    const bTime = tabLastActive.get(b.id) || 0;
    return aTime - bTime;
  });

  return idleTabs.slice(0, BATCH_SIZE);
}

// =============================================================================
// Alarm Handler — periodic idle tab check
// =============================================================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== CHECK_ALARM_NAME) return;

  const { autoArchive } = await chrome.storage.local.get({ autoArchive: false });
  if (!autoArchive) return;

  await processIdleTabs();
});

// =============================================================================
// Core Processing
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
    const summaryResult = await summarizeAndArchiveTabs(tabData);
    await saveArchivedTabs(summaryResult);

    // Close the archived tabs
    const tabIds = idleTabs.map((t) => t.id);
    await chrome.tabs.remove(tabIds);
    tabIds.forEach((id) => tabLastActive.delete(id));

    // Update badge to indicate archived count
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
// Message API — communication with popup / options
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
    return true; // async response
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

  if (message.type === 'UPDATE_BADGE') {
    updateBadge().then(() => sendResponse({ success: true }));
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

  const summaryResult = await summarizeAndArchiveTabs(tabData);
  await saveArchivedTabs(summaryResult);
  await chrome.tabs.remove(tabIds);
  tabIds.forEach((id) => tabLastActive.delete(id));
  await updateBadge();
}
