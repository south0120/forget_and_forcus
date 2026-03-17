// =============================================================================
// Tier System — Free / Pro plan management
// =============================================================================
// Free: Tab & bookmark archiving (URL + title only, no AI)
// Pro:  AI忘却メモ (AI summary, categorization, action items)
// =============================================================================

/**
 * Check if the user has an active Pro subscription.
 */
export async function isPro() {
  // ⚠️ TEST: 強制的にPro有効（本番は storage から取得）
  return true;
  // const { subscriptionActive = false } = await chrome.storage.local.get('subscriptionActive');
  // return subscriptionActive;
}

/**
 * Set subscription status.
 */
export async function setSubscriptionStatus(active) {
  await chrome.storage.local.set({ subscriptionActive: active });
}

/**
 * Create a Free-tier archive entry (no AI, just URL + title).
 */
export function createFreeArchiveEntry(tabs) {
  return {
    id: crypto.randomUUID(),
    archivedAt: new Date().toISOString(),
    category: 'Uncategorized',
    summary: '',
    tabs: tabs.map((t) => ({
      title: t.title,
      url: t.url,
      oneLiner: '',
    })),
    actionItems: [],
    tier: 'free',
  };
}
