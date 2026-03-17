// =============================================================================
// Popup — 「全部捨てろ」
// =============================================================================

import { getArchives, exportToMarkdown, downloadMarkdown } from './storage.js';
import { getLocale, t, applyI18n, getRandomQuote } from './i18n.js';
import { isPro } from './tier.js';

let locale = 'ja';

const quoteEl = document.getElementById('quote');
const doomCount = document.getElementById('doom-count');
const doomLabel = document.getElementById('doom-label');
const doomedTabs = document.getElementById('doomed-tabs');
const btnForget = document.getElementById('btn-forget');
const proBanner = document.getElementById('pro-banner');
const proLink = document.getElementById('pro-link');
const archivesList = document.getElementById('archives-list');
const btnExport = document.getElementById('btn-export');
const linkOptions = document.getElementById('link-options');

// =============================================================================
// Load doomed tabs
// =============================================================================

async function loadDoomedTabs() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_IDLE_TABS' });
  const tabs = response?.tabs || [];

  // Dramatic count
  doomCount.textContent = tabs.length;

  if (tabs.length === 0) {
    doomCount.classList.add('doom-zero');
    doomLabel.textContent = t(locale, 'noTabs');
    btnForget.disabled = true;
    doomedTabs.innerHTML = '';
    return;
  }

  doomCount.classList.remove('doom-zero');
  doomLabel.textContent = `${tabs.length} ${t(locale, 'tabsDoomed')}`;
  btnForget.disabled = false;

  doomedTabs.innerHTML = '';
  for (const tab of tabs) {
    const item = document.createElement('div');
    item.className = 'doomed-item';

    // Calculate remaining time (visual urgency)
    const urgencyClass = tab.idleMinutes > 1200 ? 'urgency-critical' :
                          tab.idleMinutes > 600 ? 'urgency-high' : 'urgency-normal';

    const timeText = formatCountdown(tab.idleMinutes);

    item.innerHTML = `
      <div class="doomed-info">
        <div class="doomed-title">${escapeHtml(tab.title)}</div>
        <div class="doomed-url">${truncateUrl(tab.url)}</div>
      </div>
      <div class="doomed-timer ${urgencyClass}">${timeText}</div>
    `;
    doomedTabs.appendChild(item);
  }
}

function formatCountdown(idleMinutes) {
  if (idleMinutes >= 1440) return t(locale, 'doomingSoon');
  const h = Math.floor(idleMinutes / 60);
  const m = idleMinutes % 60;
  return t(locale, 'doomingIn', { h, m });
}

// =============================================================================
// Load oblivion log
// =============================================================================

async function loadArchives() {
  const archives = await getArchives();
  const recent = archives.slice(0, 5);

  if (recent.length === 0) {
    archivesList.innerHTML = `<p class="empty-text">${t(locale, 'archiveEmpty')}</p>`;
    return;
  }

  archivesList.innerHTML = '';
  for (const entry of recent) {
    const date = new Date(entry.archivedAt).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : 'en-US'
    );
    const count = entry.tabs.length;
    const item = document.createElement('div');
    item.className = 'archive-entry';

    const hasSummary = entry.tier !== 'free' && entry.summary;
    const summaryHtml = hasSummary
      ? `<div class="archive-summary">${escapeHtml(entry.summary)}</div>`
      : `<div class="archive-urls">${entry.tabs.map(t => escapeHtml(t.title)).join(' / ')}</div>`;

    item.innerHTML = `
      <div class="archive-header">
        <span class="archive-date">${date}</span>
        <span class="archive-count">${count} tabs</span>
        ${hasSummary ? '<span class="ai-badge">AI</span>' : ''}
      </div>
      ${summaryHtml}
    `;
    archivesList.appendChild(item);
  }
}

// =============================================================================
// Tier check
// =============================================================================

async function loadTierUI() {
  // Check tier directly — avoids flaky message channel to service worker
  const pro = await isPro();

  if (pro) {
    proBanner.classList.add('hidden');
  } else {
    proBanner.classList.remove('hidden');
  }
}

// =============================================================================
// Events
// =============================================================================

btnForget.addEventListener('click', async () => {
  btnForget.textContent = t(locale, 'forgetting');
  btnForget.disabled = true;
  btnForget.classList.add('btn-forgetting');

  try {
    await chrome.runtime.sendMessage({ type: 'ARCHIVE_TABS' });
    // Dramatic pause
    await new Promise((r) => setTimeout(r, 600));
    btnForget.textContent = t(locale, 'forgotten');
    btnForget.classList.remove('btn-forgetting');
    btnForget.classList.add('btn-forgotten');

    await new Promise((r) => setTimeout(r, 1200));
    await loadDoomedTabs();
    await loadArchives();
  } catch (err) {
    console.error(err);
  } finally {
    btnForget.classList.remove('btn-forgetting', 'btn-forgotten');
    btnForget.textContent = t(locale, 'forgetAll');
  }
});

btnExport.addEventListener('click', async () => {
  const archives = await getArchives();
  if (archives.length === 0) return;
  const md = exportToMarkdown(archives);
  downloadMarkdown(md, `oblivion-${new Date().toISOString().slice(0, 10)}.md`);
});

linkOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

proLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

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
    return u.hostname;
  } catch {
    return url.slice(0, 40);
  }
}

// =============================================================================
// Init
// =============================================================================

async function init() {
  locale = await getLocale();
  applyI18n(locale);
  quoteEl.textContent = getRandomQuote(locale);
  await loadTierUI();
  loadDoomedTabs();
  loadArchives();
}

init();
