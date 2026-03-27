/**
 * URL normalization and hashing for Pinstr bookmarks.
 * Shared between web app and browser extension.
 */

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'mc_cid', 'mc_eid',
];

export function normalizeUrl(url: string): string {
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
}

export async function hashUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function makeDTag(urlHash: string): string {
  return `pinstr:${urlHash}`;
}
