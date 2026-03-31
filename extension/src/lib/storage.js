/**
 * Chrome storage helpers with caching.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const countCache = new Map(); // url -> { count, ts }

export async function getCachedCount(url) {
  const entry = countCache.get(url);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.count;
  }
  return null;
}

export function setCachedCount(url, count) {
  countCache.set(url, { count, ts: Date.now() });
}

/**
 * Get recent tags from storage for autocomplete.
 */
export async function getRecentTags() {
  const { recentTags } = await chrome.storage.local.get('recentTags');
  return recentTags || [];
}

/**
 * Add tags to the recent tags list (max 100).
 */
export async function addRecentTags(tags) {
  const existing = await getRecentTags();
  const combined = [...new Set([...tags, ...existing])].slice(0, 100);
  await chrome.storage.local.set({ recentTags: combined });
}

/**
 * Get/set generic storage values.
 */
export async function getStorage(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function setStorage(key, value) {
  await chrome.storage.local.set({ [key]: value });
}
