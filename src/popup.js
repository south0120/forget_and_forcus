// =============================================================================
// Popup Script — Forget & Focus
// =============================================================================

import { getArchives, exportToMarkdown, downloadMarkdown } from './storage.js';
import { getLocale, t, applyI18n } from './i18n.js';

let locale = 'ja';

const idleTabsList = document.getElementById('idle-tabs-list');
const archivesList = document.getElementById('archives-list');
const btnRefresh = document.getElementById('btn-refresh');
const btnArchiveSelected = document.getElementById('btn-archive-selected');
const btnArchiveAll = document.getElementById('btn-archive-all');
const btnExport = document.getElementById('btn-export');
const linkOptions = document.getElementById('link-options');
const planIndicator = document.getElementById('plan-indicator');
const planLabel = document.getElementById('plan-label');
const proBanner = document.getElementById('pro-banner');

// =============================================================================
// Tier UI
// =============================================================================

async function loadTierUI() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_TIER' });
  const pro = response?.isPro || false;

  if (pro) {
    planIndicator.classList.remove('plan-free');
    planIndicator.classList.add('plan-pro');
    planLabel.textContent = 'Pro';
    proBanner.classList.add('hidden');
  } else {
    planIndicator.classList.remove('plan-pro');
    planIndicator.classList.add('plan-free');
    planLabel.textContent = 'Free';
    proBanner.classList.remove('hidden');
  }
}

// =============================================================================
// Load idle tabs
// =============================================================================

async function loadIdleTabs() {
  idleTabsList.innerHTML = `<p class="text-secondary">${t(locale, 'loading')}</p>`;

  const response = await chrome.runtime.sendMessage({ type: 'GET_IDLE_TABS' });
  const tabs = response?.tabs || [];

  if (tabs.length === 0) {
    idleTabsList.innerHTML = `<p class="empty-state">${t(locale, 'noIdleTabs')}</p>`;
    btnArchiveAll.disabled = true;
    return;
  }

  btnArchiveAll.disabled = false;
  idleTabsList.innerHTML = '';

  for (const tab of tabs) {
    const item = document.createElement('div');
    item.className = 'tab-item';
    const idleText = t(locale, 'minutesIdle', { min: tab.idleMinutes });
    item.innerHTML = `
      <input type="checkbox" data-tab-id="${tab.id}">
      <div class="tab-info">
        <div class="tab-title" title="${escapeHtml(tab.title)}">${escapeHtml(tab.title)}</div>
        <div class="tab-meta">${idleText} — ${truncateUrl(tab.url)}</div>
      </div>
    `;
    idleTabsList.appendChild(item);
  }

  updateSelectedButton();
}

// =============================================================================
// Load recent archives
// =============================================================================

async function loadArchives() {
  const archives = await getArchives();
  const recent = archives.slice(0, 5);

  if (recent.length === 0) {
    archivesList.innerHTML = `<p class="empty-state">${t(locale, 'noArchives')}</p>`;
    return;
  }

  archivesList.innerHTML = '';
  for (const entry of recent) {
    const date = new Date(entry.archivedAt).toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US');
    const item = document.createElement('div');
    item.className = 'archive-item';

    const sourceIcon = entry.source === 'bookmark' ? '&#128278;' : '&#128196;';
    const tierBadge = entry.tier === 'free' ? '' : '<span class="badge badge-pro-sm">AI</span>';

    item.innerHTML = `
      <div class="archive-category">
        <span class="source-icon">${sourceIcon}</span>
        <span class="badge">${escapeHtml(entry.category)}</span>
        ${tierBadge}
        <span class="archive-date">${date}</span>
      </div>
      <div class="archive-summary">${escapeHtml(entry.summary || entry.tabs.map(t => t.title).join(', '))}</div>
    `;
    archivesList.appendChild(item);
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

btnRefresh.addEventListener('click', loadIdleTabs);

btnArchiveSelected.addEventListener('click', async () => {
  const checked = idleTabsList.querySelectorAll('input[type="checkbox"]:checked');
  const tabIds = [...checked].map((cb) => Number(cb.dataset.tabId));
  if (tabIds.length === 0) return;

  btnArchiveSelected.textContent = t(locale, 'processing');
  btnArchiveSelected.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: 'ARCHIVE_SELECTED', tabIds });
    await loadIdleTabs();
    await loadArchives();
  } catch (err) {
    console.error(err);
  } finally {
    btnArchiveSelected.textContent = t(locale, 'archiveSelected');
  }
});

btnArchiveAll.addEventListener('click', async () => {
  btnArchiveAll.textContent = t(locale, 'processing');
  btnArchiveAll.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: 'ARCHIVE_TABS' });
    await loadIdleTabs();
    await loadArchives();
  } catch (err) {
    console.error(err);
  } finally {
    btnArchiveAll.textContent = t(locale, 'archiveAll');
    btnArchiveAll.disabled = false;
  }
});

btnExport.addEventListener('click', async () => {
  const archives = await getArchives();
  if (archives.length === 0) return;
  const md = exportToMarkdown(archives);
  downloadMarkdown(md, `forget-and-focus-${new Date().toISOString().slice(0, 10)}.md`);
});

linkOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

idleTabsList.addEventListener('change', updateSelectedButton);

function updateSelectedButton() {
  const checked = idleTabsList.querySelectorAll('input[type="checkbox"]:checked');
  btnArchiveSelected.disabled = checked.length === 0;
}

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncateUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + '...' : u.pathname;
    return u.hostname + path;
  } catch {
    return url.slice(0, 50);
  }
}

// =============================================================================
// Init
// =============================================================================

async function init() {
  locale = await getLocale();
  applyI18n(locale);
  await loadTierUI();
  loadIdleTabs();
  loadArchives();
}

init();
