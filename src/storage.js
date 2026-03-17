// =============================================================================
// Storage & Markdown Export Module
// =============================================================================

/**
 * Save an archive entry to local storage.
 */
export async function saveArchivedTabs(archiveEntry) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  archives.unshift(archiveEntry);

  // Keep max 500 entries to stay within storage limits
  if (archives.length > 500) {
    archives.length = 500;
  }

  await chrome.storage.local.set({ archives });
}

/**
 * Get all archived entries.
 */
export async function getArchives() {
  const { archives = [] } = await chrome.storage.local.get('archives');
  return archives;
}

/**
 * Delete a specific archive entry by ID.
 */
export async function deleteArchive(id) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  const filtered = archives.filter((a) => a.id !== id);
  await chrome.storage.local.set({ archives: filtered });
}

/**
 * Clear all archives.
 */
export async function clearAllArchives() {
  await chrome.storage.local.set({ archives: [] });
}

// =============================================================================
// Markdown Export
// =============================================================================

/**
 * Convert a single archive entry to Markdown.
 */
function archiveToMarkdown(entry) {
  const date = new Date(entry.archivedAt).toLocaleString('ja-JP');
  let md = `## ${entry.category} — ${date}\n\n`;
  md += `> ${entry.summary}\n\n`;

  md += `### タブ一覧\n\n`;
  for (const tab of entry.tabs) {
    md += `- **[${tab.title}](${tab.url})**\n`;
    md += `  ${tab.oneLiner}\n`;
  }

  if (entry.actionItems && entry.actionItems.length > 0) {
    md += `\n### アクションアイテム\n\n`;
    for (const item of entry.actionItems) {
      md += `- [ ] ${item}\n`;
    }
  }

  return md;
}

/**
 * Export all archives (or a subset) as a Markdown string.
 * Designed for Obsidian-compatible output.
 */
export function exportToMarkdown(archives) {
  let md = `# Forget & Focus — 忘却録\n\n`;
  md += `> Generated: ${new Date().toLocaleString('ja-JP')}\n\n`;
  md += `---\n\n`;

  for (const entry of archives) {
    md += archiveToMarkdown(entry);
    md += `\n---\n\n`;
  }

  return md;
}

/**
 * Export a weekly summary (last 7 days) as Markdown.
 */
export function exportWeeklySummary(archives) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = archives.filter(
    (a) => new Date(a.archivedAt).getTime() >= oneWeekAgo
  );

  if (recent.length === 0) {
    return '# 今週の忘却録\n\n今週はまだアーカイブがありません。\n';
  }

  const totalTabs = recent.reduce((sum, a) => sum + a.tabs.length, 0);
  const categories = [...new Set(recent.map((a) => a.category))];

  let md = `# 今週の忘却録\n\n`;
  md += `- **期間:** 直近7日間\n`;
  md += `- **アーカイブ数:** ${recent.length}件\n`;
  md += `- **タブ合計:** ${totalTabs}個\n`;
  md += `- **カテゴリ:** ${categories.join(', ')}\n\n`;
  md += `---\n\n`;

  for (const entry of recent) {
    md += archiveToMarkdown(entry);
    md += `\n---\n\n`;
  }

  return md;
}

/**
 * Trigger a file download of the Markdown content.
 * (Used from popup / options page context)
 */
export function downloadMarkdown(markdownContent, filename) {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `forget-and-focus-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
