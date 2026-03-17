// =============================================================================
// i18n — 「今日を生きろ」コンセプト
// =============================================================================

const MESSAGES = {
  ja: {
    // Core philosophy
    appName: 'Forget & Focus',
    tagline: '明日に回すな。今日を生きろ。',
    manifesto: '開いたまま放置されたタブは、先送りされた決断だ。\nこのツールは、お前の代わりに決断する。',

    // Popup — The Reckoning
    countdownTitle: '残り時間',
    tabsDoomed: '個のタブが忘却される',
    noTabs: 'タブはない。お前は今、集中している。',
    forgetNow: '今すぐ忘れろ',
    forgetAll: '全部捨てろ',
    forgetting: '忘却中...',
    forgotten: '忘却した。前を向け。',

    // Tab states
    doomingIn: 'あと{h}時間{m}分',
    doomingSoon: 'まもなく忘却',
    doomed: '忘却済み',

    // Archives — 忘却録
    archiveTitle: '忘却録',
    archiveEmpty: 'まだ何も手放していない。',
    archiveExport: '記録を持ち出す',

    // Pro upsell
    proLabel: 'Pro',
    proBannerFree: '忘れた記憶にAIが意味を与える。',
    proUnlock: 'Pro版で忘却メモを解放する',

    // Settings — minimal
    settingsTitle: 'ルール',
    ruleExplain: 'このツールにカスタマイズはほとんどない。\nそれが設計思想だ。',
    ruleAutoOn: '自動忘却',
    ruleAutoOnDesc: 'ONにすると、24時間放置されたタブは自動で消える。容赦なく。',
    ruleBookmark: 'ブックマークも対象にする',
    ruleBookmarkDesc: '30日間開いていないブックマークは、もう必要ない。',

    // AI (Pro)
    aiTitle: '忘却メモ（Pro版）',
    aiDesc: 'AIが忘れたタブを要約し、意味を残す。タブは消えても、知識は残る。',
    aiLocked: 'この機能はPro版でのみ利用可能。',
    aiProvider: 'AI',
    apiKeyLabel: 'APIキー',
    apiKeyPlaceholder: 'キーを入力',
    apiKeyNote: 'ローカル保存。外部送信なし。',

    // Subscription
    subTitle: 'プラン',
    subFree: 'Free — 忘却のみ',
    subPro: 'Pro — 忘却 + AI記憶',
    subUpgrade: 'Proに覚醒する ($5/月)',
    subManage: 'プランを管理',
    subFreeDesc: 'タブとブックマークを強制的に忘却する。記録はURLとタイトルのみ。',
    subProDesc: 'AIが忘れたタブに意味を与え、知識として保存する。',

    // Language
    langTitle: '言語 / Language',

    // Data
    dataTitle: 'データ',
    exportAll: '全忘却録をMarkdownで出力',
    exportWeekly: '今週の忘却レポート',
    clearAll: '全記録を抹消',
    clearConfirm: '全ての忘却録を完全に消去する。\n本当にいいのか？',
    clearDone: '全記録を抹消した。',
    noExportData: '出力する記録がない。',

    // Save
    save: '適用',
    saved: '適用した',

    // Quotes — random philosophical nudges
    quotes: [
      '開きっぱなしのタブは、先送りされた人生だ。',
      '情報を溜めることは、思考を止めることだ。',
      '忘れることを恐れるな。忘れた分だけ、今に集中できる。',
      '100個のタブを持つ者は、何一つ読んでいない。',
      'ブックマークは墓場だ。今日読め、さもなくば忘れろ。',
      'タブを閉じることは、決断することだ。',
      '明日やろうは、永遠にやらないの別名だ。',
      '集中とは、捨てる勇気のことだ。',
    ],
  },

  en: {
    appName: 'Forget & Focus',
    tagline: "Don't push it to tomorrow. Live today.",
    manifesto: "Tabs left open are decisions left unmade.\nThis tool makes them for you.",

    countdownTitle: 'Time Left',
    tabsDoomed: 'tab(s) will be forgotten',
    noTabs: 'No tabs. You are focused.',
    forgetNow: 'Forget Now',
    forgetAll: 'Forget Everything',
    forgetting: 'Forgetting...',
    forgotten: 'Forgotten. Move on.',

    doomingIn: '{h}h {m}m left',
    doomingSoon: 'Forgetting soon',
    doomed: 'Forgotten',

    archiveTitle: 'Oblivion Log',
    archiveEmpty: "You haven't let go of anything yet.",
    archiveExport: 'Export Log',

    proLabel: 'Pro',
    proBannerFree: 'AI gives meaning to what you forget.',
    proUnlock: 'Unlock AI Notes with Pro',

    settingsTitle: 'Rules',
    ruleExplain: "There's almost nothing to customize here.\nThat's by design.",
    ruleAutoOn: 'Auto-forget',
    ruleAutoOnDesc: 'Turn this on, and tabs idle for 24 hours die. No mercy.',
    ruleBookmark: 'Include bookmarks',
    ruleBookmarkDesc: "Bookmarks untouched for 30 days? You don't need them.",

    aiTitle: 'AI Notes (Pro)',
    aiDesc: 'AI summarizes forgotten tabs. Tabs die, knowledge lives.',
    aiLocked: 'This feature requires Pro.',
    aiProvider: 'AI',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Enter key',
    apiKeyNote: 'Stored locally. Never sent externally.',

    subTitle: 'Plan',
    subFree: 'Free — Oblivion only',
    subPro: 'Pro — Oblivion + AI Memory',
    subUpgrade: 'Awaken to Pro ($5/mo)',
    subManage: 'Manage Plan',
    subFreeDesc: 'Force-forgets tabs and bookmarks. Records URL and title only.',
    subProDesc: 'AI gives meaning to forgotten tabs, preserving knowledge.',

    langTitle: 'Language / 言語',

    dataTitle: 'Data',
    exportAll: 'Export all as Markdown',
    exportWeekly: "This week's oblivion report",
    clearAll: 'Erase everything',
    clearConfirm: "Permanently erase all records.\nAre you sure?",
    clearDone: 'All records erased.',
    noExportData: 'Nothing to export.',

    save: 'Apply',
    saved: 'Applied',

    quotes: [
      'Tabs left open are a life left on hold.',
      'Hoarding information is the death of thought.',
      "Don't fear forgetting. The more you forget, the more you focus.",
      'He who has 100 tabs has read none.',
      "Bookmarks are a graveyard. Read it today, or forget it.",
      'Closing a tab is making a decision.',
      '"I\'ll do it tomorrow" is another name for never.',
      'Focus is the courage to let go.',
    ],
  },
};

export async function getLocale() {
  const { locale = 'ja' } = await chrome.storage.local.get('locale');
  return locale;
}

export function t(locale, key, params = {}) {
  const msgs = MESSAGES[locale] || MESSAGES.ja;
  let text = msgs[key] || MESSAGES.ja[key] || key;
  if (Array.isArray(text)) return text;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function getRandomQuote(locale) {
  const quotes = t(locale, 'quotes');
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function applyI18n(locale, root = document) {
  const elements = root.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    const text = t(locale, key);
    if (typeof text === 'string') el.textContent = text;
  }

  const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
  for (const el of placeholders) {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(locale, key);
  }
}

export const SUPPORTED_LOCALES = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];
