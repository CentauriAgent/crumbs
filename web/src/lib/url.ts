const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source',
];

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    parsed.hash = '';

    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }
    parsed.searchParams.sort();

    let result = parsed.toString();
    if (result.endsWith('/') && parsed.pathname !== '/') {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return url;
  }
}

export async function hashUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url);
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
