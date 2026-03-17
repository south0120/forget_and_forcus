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

// =============================================================================
// DOM Elements
// =============================================================================

const aiProvider = document.getElementById('ai-provider');
const aiModel = document.getElementById('ai-model');
const apiKey = document.getElementById('api-key');
const autoArchive = document.getElementById('auto-archive');
const whitelistInput = document.getElementById('whitelist-input');
const btnAddWhitelist = document.getElementById('btn-add-whitelist');
const whitelistItems = document.getElementById('whitelist-items');
const btnSubscribe = document.getElementById('btn-subscribe');
const subscriptionStatus = document.getElementById('subscription-status');
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
    aiProvider: 'gemini',
    aiModel: '',
    apiKey: '',
    autoArchive: false,
    subscriptionActive: false,
  });

  aiProvider.value = settings.aiProvider;
  aiModel.value = settings.aiModel;
  apiKey.value = settings.apiKey;
  autoArchive.checked = settings.autoArchive;

  updateSubscriptionUI(settings.subscriptionActive);
  await loadWhitelistUI();
}

// =============================================================================
// Save Settings
// =============================================================================

btnSave.addEventListener('click', async () => {
  await chrome.storage.local.set({
    aiProvider: aiProvider.value,
    aiModel: aiModel.value,
    apiKey: apiKey.value,
    autoArchive: autoArchive.checked,
  });

  saveStatus.textContent = '保存しました';
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
});

// =============================================================================
// Whitelist UI
// =============================================================================

async function loadWhitelistUI() {
  const whitelist = await getWhitelist();
  whitelistItems.innerHTML = '';

  if (whitelist.length === 0) {
    whitelistItems.innerHTML =
      '<li class="text-secondary" style="border:none;">登録なし</li>';
    return;
  }

  for (const pattern of whitelist) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(pattern)}</span>
      <button class="btn-remove" data-pattern="${escapeHtml(pattern)}">削除</button>
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

function updateSubscriptionUI(isActive) {
  if (isActive) {
    subscriptionStatus.innerHTML =
      '<p style="color: var(--success); font-weight: 600;">Pro プラン（有効）</p>';
    btnSubscribe.textContent = 'プランを管理';
  } else {
    subscriptionStatus.innerHTML =
      '<p class="text-secondary">Free プラン</p>';
    btnSubscribe.textContent = 'Pro版にアップグレード ($5/月)';
  }
}

btnSubscribe.addEventListener('click', () => {
  // TODO: Stripe Checkout への遷移
  // 本番では Stripe の Payment Link または Checkout Session URL を開く
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
    alert('エクスポートするデータがありません。');
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
  if (!confirm('すべてのアーカイブデータを削除しますか？この操作は取り消せません。')) {
    return;
  }
  await clearAllArchives();
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
  alert('データを削除しました。');
});

// =============================================================================
// Model placeholder update
// =============================================================================

aiProvider.addEventListener('change', () => {
  const placeholders = {
    gemini: '例: gemini-1.5-flash',
    openai: '例: gpt-4o-mini',
    claude: '例: claude-haiku-4-5-20251001',
  };
  aiModel.placeholder = placeholders[aiProvider.value] || '';
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
