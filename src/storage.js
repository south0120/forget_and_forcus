// =============================================================================
// Storage & Markdown Export — 忘却録
// =============================================================================

export async function saveArchivedTabs(archiveEntry) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  archives.unshift(archiveEntry);
  if (archives.length > 500) archives.length = 500;
  await chrome.storage.local.set({ archives });
}

export async function getArchives() {
  const { archives = [] } = await chrome.storage.local.get('archives');
  return archives;
}

export async function deleteArchive(id) {
  const { archives = [] } = await chrome.storage.local.get('archives');
  await chrome.storage.local.set({ archives: archives.filter((a) => a.id !== id) });
}

export async function clearAllArchives() {
  await chrome.storage.local.set({ archives: [] });
}

// =============================================================================
// Markdown — Oblivion Log
// =============================================================================

function archiveToMarkdown(entry) {
  const date = new Date(entry.archivedAt).toLocaleString('ja-JP');
  const source = entry.source === 'bookmark' ? 'Bookmark' : 'Tab';
  const hasSummary = entry.tier !== 'free' && entry.summary;

  let md = `## [${source}] ${entry.category || 'Uncategorized'} — ${date}\n\n`;

  if (hasSummary) {
    md += `> ${entry.summary}\n\n`;
  }

  for (const tab of entry.tabs) {
    md += `- [${tab.title}](${tab.url})`;
    if (tab.oneLiner) md += ` — ${tab.oneLiner}`;
    md += `\n`;
  }

  if (entry.actionItems && entry.actionItems.length > 0) {
    md += `\n**Next:**\n`;
    for (const item of entry.actionItems) {
      md += `- [ ] ${item}\n`;
    }
  }

  return md;
}

export function exportToMarkdown(archives) {
  let md = `# Forget & Focus — Oblivion Log\n\n`;
  md += `> "明日に回すな。今日を生きろ。"\n`;
  md += `> Generated: ${new Date().toLocaleString('ja-JP')}\n\n`;
  md += `---\n\n`;

  for (const entry of archives) {
    md += archiveToMarkdown(entry);
    md += `\n---\n\n`;
  }

  return md;
}

export function exportWeeklySummary(archives) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = archives.filter(
    (a) => new Date(a.archivedAt).getTime() >= oneWeekAgo
  );

  if (recent.length === 0) {
    return '# Oblivion Report\n\n> You let go of nothing this week. Are you even trying?\n';
  }

  const totalTabs = recent.reduce((sum, a) => sum + a.tabs.length, 0);

  let md = `# Oblivion Report — This Week\n\n`;
  md += `> ${totalTabs} things forgotten. ${recent.length} sessions of letting go.\n\n`;
  md += `---\n\n`;

  for (const entry of recent) {
    md += archiveToMarkdown(entry);
    md += `\n---\n\n`;
  }

  return md;
}

export function downloadMarkdown(markdownContent, filename) {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `oblivion-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
