// =============================================================================
// Options Page Script — Forget & Focus
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

// =============================================================================
// DOM Elements
// =============================================================================

const localeSelect = document.getElementById('locale-select');
const aiProvider = document.getElementById('ai-provider');
const aiModel = document.getElementById('ai-model');
const apiKey = document.getElementById('api-key');
const autoArchive = document.getElementById('auto-archive');
const idleThreshold = document.getElementById('idle-threshold');
const bookmarkArchiveCheckbox = document.getElementById('bookmark-archive');
const bookmarkThreshold = document.getElementById('bookmark-threshold');
const whitelistInput = document.getElementById('whitelist-input');
const btnAddWhitelist = document.getElementById('btn-add-whitelist');
const whitelistItems = document.getElementById('whitelist-items');
const btnSubscribe = document.getElementById('btn-subscribe');
const subscriptionStatus = document.getElementById('subscription-status');
const aiLockedNotice = document.getElementById('ai-locked-notice');
const aiFields = document.getElementById('ai-fields');
const btnExportAll = document.getElementById('btn-export-all');
const btnExportWeekly = document.getElementById('btn-export-weekly');
const btnClearAll = document.getElementById('btn-clear-all');
const btnSave = document.getElementById('btn-save');
const saveStatus = document.getElementById('save-status');

// =============================================================================
// Load Settings
// =============================================================================

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    locale: 'ja',
    aiProvider: 'gemini',
    aiModel: '',
    apiKey: '',
    autoArchive: false,
    idleThresholdMinutes: 60,
    bookmarkArchive: false,
    bookmarkThresholdDays: 30,
    subscriptionActive: false,
  });

  locale = settings.locale;
  localeSelect.value = locale;
  aiProvider.value = settings.aiProvider;
  aiModel.value = settings.aiModel;
  apiKey.value = settings.apiKey;
  autoArchive.checked = settings.autoArchive;
  idleThreshold.value = String(settings.idleThresholdMinutes);
  bookmarkArchiveCheckbox.checked = settings.bookmarkArchive;
  bookmarkThreshold.value = String(settings.bookmarkThresholdDays);

  applyI18n(locale);
  updateThresholdLabels();
  await updateTierUI(settings.subscriptionActive);
  await loadWhitelistUI();
}

// =============================================================================
// Tier UI
// =============================================================================

async function updateTierUI(isActive) {
  if (isActive) {
    subscriptionStatus.innerHTML =
      `<p style="color: var(--success); font-weight: 600;">${t(locale, 'proPlan')}</p>`;
    btnSubscribe.textContent = t(locale, 'manageBtn');
    aiLockedNotice.classList.add('hidden');
    aiFields.classList.remove('ai-disabled');
    setAiFieldsEnabled(true);
  } else {
    subscriptionStatus.innerHTML =
      `<p class="text-secondary">${t(locale, 'freePlan')}</p>`;
    btnSubscribe.textContent = t(locale, 'upgradeBtn');
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
// Locale-dependent threshold labels
// =============================================================================

function updateThresholdLabels() {
  for (const opt of idleThreshold.options) {
    const min = Number(opt.value);
    if (min >= 60) {
      opt.textContent = t(locale, 'thresholdHour', { h: min / 60 });
    } else {
      opt.textContent = t(locale, 'thresholdOption', { min });
    }
  }

  for (const opt of bookmarkThreshold.options) {
    opt.textContent = t(locale, 'bookmarkDays', { d: opt.value });
  }
}

// =============================================================================
// Save Settings
// =============================================================================

btnSave.addEventListener('click', async () => {
  const newLocale = localeSelect.value;

  await chrome.storage.local.set({
    locale: newLocale,
    aiProvider: aiProvider.value,
    aiModel: aiModel.value,
    apiKey: apiKey.value,
    autoArchive: autoArchive.checked,
    idleThresholdMinutes: Number(idleThreshold.value),
    bookmarkArchive: bookmarkArchiveCheckbox.checked,
    bookmarkThresholdDays: Number(bookmarkThreshold.value),
  });

  // Re-apply locale if changed
  if (newLocale !== locale) {
    locale = newLocale;
    applyI18n(locale);
    updateThresholdLabels();
    const pro = await isPro();
    await updateTierUI(pro);
  }

  saveStatus.textContent = t(locale, 'saved');
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
});

// =============================================================================
// Live locale preview
// =============================================================================

localeSelect.addEventListener('change', () => {
  locale = localeSelect.value;
  applyI18n(locale);
  updateThresholdLabels();
});

// =============================================================================
// Whitelist UI
// =============================================================================

async function loadWhitelistUI() {
  const whitelist = await getWhitelist();
  whitelistItems.innerHTML = '';

  if (whitelist.length === 0) {
    whitelistItems.innerHTML =
      `<li class="text-secondary" style="border:none;">${t(locale, 'whitelistEmpty')}</li>`;
    return;
  }

  for (const pattern of whitelist) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(pattern)}</span>
      <button class="btn-remove" data-pattern="${escapeHtml(pattern)}">${t(locale, 'whitelistRemove')}</button>
    `;
    whitelistItems.appendChild(li);
  }
}

btnAddWhitelist.addEventListener('click', async () => {
  const value = whitelistInput.value.trim();
  if (!value) return;
  await addToWhitelist(value);
  whitelistInput.value = '';
  await loadWhitelistUI();
});

whitelistInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnAddWhitelist.click();
});

whitelistItems.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-remove')) {
    const pattern = e.target.dataset.pattern;
    await removeFromWhitelist(pattern);
    await loadWhitelistUI();
  }
});

// =============================================================================
// Subscription (Stripe placeholder)
// =============================================================================

btnSubscribe.addEventListener('click', () => {
  // TODO: Stripe Checkout への遷移
  chrome.tabs.create({
    url: 'https://buy.stripe.com/placeholder-forget-and-focus',
  });
});

// =============================================================================
// Data Management
// =============================================================================

btnExportAll.addEventListener('click', async () => {
  const archives = await getArchives();
  if (archives.length === 0) {
    alert(t(locale, 'noExportData'));
    return;
  }
  const md = exportToMarkdown(archives);
  downloadMarkdown(md, `forget-and-focus-all-${new Date().toISOString().slice(0, 10)}.md`);
});

btnExportWeekly.addEventListener('click', async () => {
  const archives = await getArchives();
  const md = exportWeeklySummary(archives);
  downloadMarkdown(md, `forget-and-focus-weekly-${new Date().toISOString().slice(0, 10)}.md`);
});

btnClearAll.addEventListener('click', async () => {
  if (!confirm(t(locale, 'clearConfirm'))) return;
  await clearAllArchives();
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  alert(t(locale, 'clearDone'));
});

// =============================================================================
// Model placeholder update
// =============================================================================

aiProvider.addEventListener('change', () => {
  const placeholders = {
    gemini: 'gemini-1.5-flash',
    openai: 'gpt-4o-mini',
    claude: 'claude-haiku-4-5-20251001',
  };
  const example = locale === 'ja' ? '例: ' : 'e.g. ';
  aiModel.placeholder = example + (placeholders[aiProvider.value] || '');
});

// =============================================================================
// Utilities
// =============================================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =============================================================================
// Init
// =============================================================================

loadSettings();
