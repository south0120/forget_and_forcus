// =============================================================================
// i18n — Multi-language Support (ja / en)
// =============================================================================

const MESSAGES = {
  ja: {
    // Header
    appName: 'Forget & Focus',
    tagline: 'Forget Tabs, Focus on Tasks.',
    settings: '設定',

    // Popup
    idleTabs: '放置中のタブ',
    refresh: '更新',
    loading: '読み込み中...',
    noIdleTabs: '放置中のタブはありません',
    archiveSelected: '選択したタブを忘却する',
    archiveAll: 'すべて忘却する',
    processing: '処理中...',
    recentArchives: '最近の忘却録',
    exportMd: 'MD出力',
    noArchives: 'アーカイブはまだありません',
    minutesIdle: '{min}分放置',
    settingsLink: '設定',

    // Popup — Pro features
    proLabel: 'Pro',
    aiSummaryLocked: 'AI忘却メモはPro版限定機能です',
    upgradeForSummary: 'アップグレードしてAI要約を有効化',

    // Options — AI
    aiSettings: 'AI設定（Pro版限定）',
    aiProvider: 'AIプロバイダ',
    aiModelLabel: 'モデル（空欄でデフォルト）',
    aiModelPlaceholder: '例: gemini-1.5-flash',
    apiKeyLabel: 'APIキー（BYOK）',
    apiKeyPlaceholder: 'sk-... / AIza...',
    apiKeyNote: 'キーはローカルに保存され、外部には送信されません。',
    aiProOnly: 'AI忘却メモ機能を利用するにはPro版へのアップグレードが必要です。',

    // Options — Auto archive
    autoArchiveTitle: '自動アーカイブ',
    autoArchiveLabel: '放置タブの自動アーカイブを有効にする',
    autoArchiveDesc: 'しきい値時間以上放置されたタブを定期的にチェックし、自動でアーカイブします。',
    idleThreshold: 'アーカイブまでの放置時間',
    thresholdOption: '{min}分',
    thresholdHour: '{h}時間',
    bookmarkArchive: 'ブックマークの自動アーカイブ',
    bookmarkArchiveLabel: '一定期間アクセスしていないブックマークもアーカイブ対象にする',
    bookmarkThreshold: 'ブックマーク放置期間',
    bookmarkDays: '{d}日',

    // Options — Whitelist
    whitelistTitle: 'ホワイトリスト（忘却しないサイト）',
    whitelistDesc: 'ドメイン名やURLプレフィクスを指定してください。固定タブは自動的に除外されます。',
    whitelistPlaceholder: '例: github.com',
    whitelistAdd: '追加',
    whitelistEmpty: '登録なし',
    whitelistRemove: '削除',

    // Options — Subscription
    subscriptionTitle: 'サブスクリプション',
    freePlan: 'Free プラン',
    proPlan: 'Pro プラン（有効）',
    upgradeBtn: 'Pro版にアップグレード ($5/月)',
    manageBtn: 'プランを管理',
    proDesc: 'Pro版ではAI忘却メモ機能が使えます。AIがタブを要約・カテゴリ分けし、アクションアイテムを提案します。',
    freeFeatures: 'Free版の機能:',
    freeFeature1: 'タブの自動アーカイブ（URL・タイトル保存）',
    freeFeature2: 'ブックマークのアーカイブ',
    freeFeature3: 'Markdown形式でのエクスポート',
    proFeatures: 'Pro版の追加機能:',
    proFeature1: 'AI忘却メモ（タブの要約・カテゴリ分類）',
    proFeature2: 'アクションアイテムの自動抽出',
    proFeature3: 'BYOKモード（自分のAPIキーで利用可）',

    // Options — Language
    languageTitle: '言語 / Language',
    languageLabel: '表示言語',

    // Options — Data
    dataTitle: 'データ管理',
    exportAll: '全データをMarkdownで出力',
    exportWeekly: '今週のレポート出力',
    clearAll: '全データを削除',
    noExportData: 'エクスポートするデータがありません。',
    clearConfirm: 'すべてのアーカイブデータを削除しますか？この操作は取り消せません。',
    clearDone: 'データを削除しました。',

    // Options — Save
    save: '保存',
    saved: '保存しました',
  },

  en: {
    appName: 'Forget & Focus',
    tagline: 'Forget Tabs, Focus on Tasks.',
    settings: 'Settings',

    idleTabs: 'Idle Tabs',
    refresh: 'Refresh',
    loading: 'Loading...',
    noIdleTabs: 'No idle tabs found',
    archiveSelected: 'Archive Selected',
    archiveAll: 'Archive All',
    processing: 'Processing...',
    recentArchives: 'Recent Archives',
    exportMd: 'Export MD',
    noArchives: 'No archives yet',
    minutesIdle: '{min}m idle',
    settingsLink: 'Settings',

    proLabel: 'Pro',
    aiSummaryLocked: 'AI Notes is a Pro feature',
    upgradeForSummary: 'Upgrade to enable AI summaries',

    aiSettings: 'AI Settings (Pro Only)',
    aiProvider: 'AI Provider',
    aiModelLabel: 'Model (blank for default)',
    aiModelPlaceholder: 'e.g. gemini-1.5-flash',
    apiKeyLabel: 'API Key (BYOK)',
    apiKeyPlaceholder: 'sk-... / AIza...',
    apiKeyNote: 'Keys are stored locally and never sent externally.',
    aiProOnly: 'Upgrade to Pro to use AI Notes feature.',

    autoArchiveTitle: 'Auto Archive',
    autoArchiveLabel: 'Enable automatic archiving of idle tabs',
    autoArchiveDesc: 'Periodically checks for tabs idle beyond the threshold and archives them automatically.',
    idleThreshold: 'Idle time before archive',
    thresholdOption: '{min} min',
    thresholdHour: '{h} hour(s)',
    bookmarkArchive: 'Bookmark Archiving',
    bookmarkArchiveLabel: 'Also archive bookmarks not accessed for a set period',
    bookmarkThreshold: 'Bookmark idle period',
    bookmarkDays: '{d} days',

    whitelistTitle: 'Whitelist (Never Archive)',
    whitelistDesc: 'Specify domains or URL prefixes. Pinned tabs are always excluded.',
    whitelistPlaceholder: 'e.g. github.com',
    whitelistAdd: 'Add',
    whitelistEmpty: 'No entries',
    whitelistRemove: 'Remove',

    subscriptionTitle: 'Subscription',
    freePlan: 'Free Plan',
    proPlan: 'Pro Plan (Active)',
    upgradeBtn: 'Upgrade to Pro ($5/mo)',
    manageBtn: 'Manage Plan',
    proDesc: 'Pro unlocks AI Notes: AI-powered summaries, categorization, and action item extraction for your archived tabs.',
    freeFeatures: 'Free features:',
    freeFeature1: 'Auto tab archiving (URL & title saved)',
    freeFeature2: 'Bookmark archiving',
    freeFeature3: 'Markdown export',
    proFeatures: 'Pro features:',
    proFeature1: 'AI Notes (tab summarization & categorization)',
    proFeature2: 'Automatic action item extraction',
    proFeature3: 'BYOK mode (use your own API key)',

    languageTitle: 'Language / 言語',
    languageLabel: 'Display language',

    dataTitle: 'Data Management',
    exportAll: 'Export All as Markdown',
    exportWeekly: 'Export Weekly Report',
    clearAll: 'Delete All Data',
    noExportData: 'No data to export.',
    clearConfirm: 'Delete all archive data? This cannot be undone.',
    clearDone: 'Data deleted.',

    save: 'Save',
    saved: 'Saved',
  },
};

/**
 * Get the current locale from storage (defaults to 'ja').
 */
export async function getLocale() {
  const { locale = 'ja' } = await chrome.storage.local.get('locale');
  return locale;
}

/**
 * Get translation function for the given locale.
 */
export function t(locale, key, params = {}) {
  const msgs = MESSAGES[locale] || MESSAGES.ja;
  let text = msgs[key] || MESSAGES.ja[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

/**
 * Apply translations to all elements with data-i18n attribute.
 */
export function applyI18n(locale, root = document) {
  const elements = root.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(locale, key);
  }

  const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
  for (const el of placeholders) {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(locale, key);
  }

  const titles = root.querySelectorAll('[data-i18n-title]');
  for (const el of titles) {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(locale, key);
  }
}

export const SUPPORTED_LOCALES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];
