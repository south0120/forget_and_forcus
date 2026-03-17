// =============================================================================
// Whitelist Module — 忘却対象から除外するURL管理
// =============================================================================

/**
 * Get the whitelist patterns from storage.
 * Each entry is a string pattern (domain or URL prefix).
 */
export async function getWhitelist() {
  const { whitelist = [] } = await chrome.storage.local.get('whitelist');
  return whitelist;
}

/**
 * Save the whitelist patterns.
 */
export async function saveWhitelist(patterns) {
  await chrome.storage.local.set({ whitelist: patterns });
}

/**
 * Add a pattern to the whitelist.
 */
export async function addToWhitelist(pattern) {
  const whitelist = await getWhitelist();
  const trimmed = pattern.trim();
  if (trimmed && !whitelist.includes(trimmed)) {
    whitelist.push(trimmed);
    await saveWhitelist(whitelist);
  }
  return whitelist;
}

/**
 * Remove a pattern from the whitelist.
 */
export async function removeFromWhitelist(pattern) {
  const whitelist = await getWhitelist();
  const filtered = whitelist.filter((p) => p !== pattern);
  await saveWhitelist(filtered);
  return filtered;
}

/**
 * Check if a URL matches any whitelist pattern.
 * Supports:
 *   - Domain match: "github.com" matches any github.com URL
 *   - Prefix match: "https://docs.google.com" matches sub-paths
 *   - Wildcard: "*.example.com" matches subdomains
 */
export function isWhitelistedUrl(url, whitelist) {
  if (!url || !whitelist || whitelist.length === 0) return false;

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }

  return whitelist.some((pattern) => {
    // Wildcard subdomain: *.example.com
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2);
      return hostname === domain || hostname.endsWith('.' + domain);
    }
    // Full URL prefix match
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      return url.startsWith(pattern);
    }
    // Domain match
    return hostname === pattern || hostname.endsWith('.' + pattern);
  });
}
