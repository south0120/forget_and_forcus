// =============================================================================
// Options — ルール（カスタマイズはほとんどない。それが設計思想だ。）
// =============================================================================

import { getWhitelist, addToWhitelist, removeFromWhitelist } from './whitelist.js';
import {
  getArchives,
  clearAllArchives,
  exportToMarkdown,
  exportWeeklySummary,
  downloadMarkdown,
} from './storage.js';
import { getLocale, t, applyI18n } from './i18n.js';
import { isPro } from './tier.js';

let locale = 'ja';

// DOM
const localeSelect = document.getElementById('locale-select');
const autoArchive = document.getElementById('auto-archive');
const bookmarkArchive = document.getElementById('bookmark-archive');
const aiProvider = document.getElementById('ai-provider');
const apiKey = document.getElementById('api-key');
const aiLockedNotice = document.getElementById('ai-locked-notice');
const aiFields = document.getElementById('ai-fields');
const btnSubscribe = document.getElementById('btn-subscribe');
const subscriptionStatus = document.getElementById('subscription-status');
const btnExportAll = document.getElementById('btn-export-all');
const btnExportWeekly = document.getElementById('btn-export-weekly');
const btnClearAll = document.getElementById('btn-clear-all');
const btnSave = document.getElementById('btn-save');
const saveStatus = document.getElementById('save-status');

// =============================================================================
// Load
// =============================================================================

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    locale: 'ja',
    aiProvider: 'gemini',
    apiKey: '',
    autoArchive: false,
    bookmarkArchive: false,
    subscriptionActive: false,
  });

  locale = settings.locale;
  localeSelect.value = locale;
  autoArchive.checked = settings.autoArchive;
  bookmarkArchive.checked = settings.bookmarkArchive;
  aiProvider.value = settings.aiProvider;
  apiKey.value = settings.apiKey;

  applyI18n(locale);
  // Preserve newlines in manifesto
  const manifesto = document.getElementById('manifesto');
  manifesto.innerHTML = t(locale, 'manifesto').replace(/\n/g, '<br>');

  await updateTierUI(settings.subscriptionActive);
}

// =============================================================================
// Tier UI
// =============================================================================

async function updateTierUI(isActive) {
  if (isActive) {
    subscriptionStatus.innerHTML = `<span class="status-pro">${t(locale, 'subPro')}</span>`;
    btnSubscribe.textContent = t(locale, 'subManage');
    btnSubscribe.classList.remove('btn-awaken');
    btnSubscribe.classList.add('btn-ghost');
    aiLockedNotice.classList.add('hidden');
    aiFields.classList.remove('ai-disabled');
    setAiFieldsEnabled(true);
  } else {
    subscriptionStatus.innerHTML = `<span class="status-free">${t(locale, 'subFree')}</span>`;
    btnSubscribe.textContent = t(locale, 'subUpgrade');
    btnSubscribe.classList.remove('btn-ghost');
    btnSubscribe.classList.add('btn-awaken');
    aiLockedNotice.classList.remove('hidden');
    aiFields.classList.add('ai-disabled');
    setAiFieldsEnabled(false);
  }
}

function setAiFieldsEnabled(enabled) {
  const inputs = aiFields.querySelectorAll('input, select');
  for (const input of inputs) {
    input.disabled = !enabled;
  }
}

// =============================================================================
// Save — 「適用」
// =============================================================================

btnSave.addEventListener('click', async () => {
  const newLocale = localeSelect.value;

  await chrome.storage.local.set({
    locale: newLocale,
    aiProvider: aiProvider.value,
    apiKey: apiKey.value,
    autoArchive: autoArchive.checked,
    bookmarkArchive: bookmarkArchive.checked,
    // Fixed values — no user choice. That's the point.
    idleThresholdMinutes: 30, // ⚠️ TEST: 30 minutes (本番は 1440)
    bookmarkThresholdDays: 30,  // 30 days. Deal with it.
  });

  if (newLocale !== locale) {
    locale = newLocale;
    applyI18n(locale);
    const manifesto = document.getElementById('manifesto');
    manifesto.innerHTML = t(locale, 'manifesto').replace(/\n/g, '<br>');
    const pro = await isPro();
    await updateTierUI(pro);
  }

  saveStatus.textContent = t(locale, 'saved');
  saveStatus.classList.add('saved-flash');
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.classList.remove('saved-flash');
  }, 2000);
});

// Live locale switch
localeSelect.addEventListener('change', () => {
  locale = localeSelect.value;
  applyI18n(locale);
  const manifesto = document.getElementById('manifesto');
  manifesto.innerHTML = t(locale, 'manifesto').replace(/\n/g, '<br>');
});

// =============================================================================
// Subscription
// =============================================================================

btnSubscribe.addEventListener('click', () => {
  chrome.tabs.create({
    url: 'https://buy.stripe.com/placeholder-forget-and-focus',
  });
});

// =============================================================================
// Data
// =============================================================================

btnExportAll.addEventListener('click', async () => {
  const archives = await getArchives();
  if (archives.length === 0) {
    alert(t(locale, 'noExportData'));
    return;
  }
  const md = exportToMarkdown(archives);
  downloadMarkdown(md, `oblivion-all-${new Date().toISOString().slice(0, 10)}.md`);
});

btnExportWeekly.addEventListener('click', async () => {
  const archives = await getArchives();
  const md = exportWeeklySummary(archives);
  downloadMarkdown(md, `oblivion-weekly-${new Date().toISOString().slice(0, 10)}.md`);
});

btnClearAll.addEventListener('click', async () => {
  if (!confirm(t(locale, 'clearConfirm'))) return;
  await clearAllArchives();
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  alert(t(locale, 'clearDone'));
});

// =============================================================================
// Init
// =============================================================================

loadSettings();
