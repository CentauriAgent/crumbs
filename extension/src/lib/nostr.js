/**
 * Nostr event building, signing, and relay publishing for Crumbs extension.
 * Uses nostr-tools for signing. Schema: NIP-51 (kind 10003, d: "web-bookmarks") + NIP-22 (kind 1111).
 */

import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

/**
 * Get stored nsec from chrome.storage.local, return as hex bytes.
 */
export async function getSecretKey() {
  const { nsec_hex } = await chrome.storage.local.get('nsec_hex');
  if (!nsec_hex) return null;
  return hexToBytes(nsec_hex);
}

/**
 * Get the user's pubkey from stored nsec.
 */
export async function getPubkey() {
  const sk = await getSecretKey();
  if (!sk) return null;
  return getPublicKey(sk);
}

/**
 * Get configured relays from storage, or use defaults.
 */
export async function getRelays() {
  const { relays } = await chrome.storage.local.get('relays');
  if (relays && relays.length > 0) return relays;
  return DEFAULT_RELAYS;
}

/**
 * Build a kind 1111 (NIP-22 URL comment) event for a bookmark.
 */
export function buildBookmarkEvent(sk, { url, title, description, tags }) {
  // Build content: description + hashtags
  let content = description || '';
  if (tags && tags.length > 0) {
    const hashtags = tags.map(t => `#${t}`).join(' ');
    content = content ? `${content}\n\n${hashtags}` : hashtags;
  }

  const eventTags = [
    ['I', url, 'web'],
    ['K', 'web'],
    ['i', url, 'web'],
    ['k', 'web'],
  ];

  if (title) eventTags.push(['title', title]);
  if (tags) {
    for (const t of tags) {
      eventTags.push(['t', t.toLowerCase().trim()]);
    }
  }

  const event = finalizeEvent({
    kind: 1111,
    content,
    tags: eventTags,
    created_at: Math.floor(Date.now() / 1000),
  }, sk);

  return event;
}

/**
 * Build an updated kind 10003 (NIP-51 bookmark set, d: "web-bookmarks") event,
 * adding a new URL to the Crumbs bookmark list.
 */
export function buildBookmarkListEvent(sk, existingTags, newUrl) {
  // Filter existing tags — keep only r tags, skip old d/title tags
  const rTags = (existingTags || []).filter(t => t[0] === 'r');

  // Add new URL if not already present
  const urls = new Set(rTags.map(t => t[1]));
  if (!urls.has(newUrl)) {
    rTags.push(['r', newUrl]);
  }

  const event = finalizeEvent({
    kind: 10003,
    content: '',
    tags: [
      ['d', 'crumbs'],
      ['title', 'Crumbs Bookmarks'],
      ...rTags,
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, sk);

  return event;
}

/**
 * Publish a signed event to multiple relays.
 * Returns { successes: string[], failures: string[] }
 */
export async function publishToRelays(event, relays) {
  const results = { successes: [], failures: [] };

  const promises = relays.map(url =>
    new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ url, ok: false, error: 'timeout' });
      }, 8000);

      try {
        const ws = new WebSocket(url);

        ws.onopen = () => {
          ws.send(JSON.stringify(['EVENT', event]));
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data[0] === 'OK' && data[1] === event.id) {
              clearTimeout(timeout);
              ws.close();
              resolve({ url, ok: data[2] !== false, error: data[3] });
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ url, ok: false, error: 'connection error' });
        };
      } catch (e) {
        clearTimeout(timeout);
        resolve({ url, ok: false, error: e.message });
      }
    })
  );

  const outcomes = await Promise.all(promises);
  for (const o of outcomes) {
    if (o.ok) results.successes.push(o.url);
    else results.failures.push(o.url);
  }

  return results;
}

/**
 * Fetch events matching a filter from a relay.
 * Returns array of events.
 */
export function queryRelay(relayUrl, filter, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const events = [];
    const subId = 'crumbs_' + Math.random().toString(36).slice(2, 8);
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve(events);
    }, timeoutMs);

    let ws;
    try {
      ws = new WebSocket(relayUrl);
    } catch {
      clearTimeout(timeout);
      return resolve(events);
    }

    ws.onopen = () => {
      ws.send(JSON.stringify(['REQ', subId, filter]));
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data[0] === 'EVENT' && data[1] === subId) {
          events.push(data[2]);
        } else if (data[0] === 'EOSE' && data[1] === subId) {
          clearTimeout(timeout);
          ws.close();
          resolve(events);
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      try { ws.close(); } catch {}
      resolve(events);
    };
  });
}

/**
 * Fetch the user's current kind 10003 (d: "web-bookmarks") bookmark list from relays.
 */
export async function fetchBookmarkList(pubkey, relays) {
  const filter = { kinds: [10003], authors: [pubkey], '#d': ['web-bookmarks'], limit: 1 };
  let latest = null;

  for (const relay of relays) {
    const events = await queryRelay(relay, filter);
    for (const ev of events) {
      if (!latest || ev.created_at > latest.created_at) {
        latest = ev;
      }
    }
  }

  return latest;
}

/**
 * Count kind 1111 events for a given URL across relays.
 * Deduplicates by event id.
 */
export async function countUrlBookmarks(url, relays) {
  const filter = { kinds: [1111], '#I': [url], limit: 100 };
  const seen = new Set();

  const promises = relays.map(relay =>
    queryRelay(relay, filter, 5000).then(events => {
      for (const ev of events) seen.add(ev.id);
    }).catch(() => {})
  );

  await Promise.all(promises);
  return seen.size;
}

/**
 * Check if a specific pubkey has already bookmarked a URL.
 * Returns the event if found, null otherwise.
 */
export async function findUserBookmark(pubkey, url, relays) {
  const filter = { kinds: [1111], authors: [pubkey], '#I': [url], limit: 1 };

  for (const relay of relays) {
    const events = await queryRelay(relay, filter);
    if (events.length > 0) return events[0];
  }

  return null;
}

/**
 * Check if URL exists in user's kind 10003 (d: "web-bookmarks") bookmark list.
 */
export function isUrlInBookmarkList(bookmarkListEvent, url) {
  if (!bookmarkListEvent) return false;
  return bookmarkListEvent.tags.some(t => t[0] === 'r' && t[1] === url);
}
