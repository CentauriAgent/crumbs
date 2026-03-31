/**
 * URL normalization and hashing utilities for Crumbs.
 */

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'mc_cid', 'mc_eid',
];

/**
 * Normalize a URL for consistent deduplication.
 */
export function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove www prefix
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    // Remove fragment
    parsed.hash = '';

    // Remove tracking params
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining params
    parsed.searchParams.sort();

    // Remove trailing slash (but keep root /)
    let result = parsed.toString();
    if (result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    return url;
  }
}

/**
 * SHA-256 hash of a normalized URL (hex string).
 */
export async function hashUrl(url) {
  const normalized = normalizeUrl(url);
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
