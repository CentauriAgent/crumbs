/**
 * Crumbs — Background Service Worker (Manifest V3)
 *
 * Handles:
 * - SAVE_BOOKMARK: signs + publishes kind 1111, updates kind 10003
 * - GET_COUNT: returns cached crumb count for a URL
 * - GET_STATUS: checks if user is logged in + if URL already saved
 * - CHECK_BOOKMARK: checks if user already bookmarked this URL
 */

import {
  getSecretKey, getPubkey, getRelays,
  buildBookmarkEvent, buildBookmarkListEvent,
  publishToRelays, fetchBookmarkList,
  countUrlBookmarks, findUserBookmark, isUrlInBookmarkList,
} from './lib/nostr.js';
import { getCachedCount, setCachedCount, addRecentTags } from './lib/storage.js';
import { normalizeUrl } from './lib/url.js';

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => {
    sendResponse({ error: err.message || 'Unknown error' });
  });
  return true; // async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'SAVE_BOOKMARK':
      return await saveBookmark(msg.payload);

    case 'GET_COUNT':
      return await getCount(msg.url);

    case 'GET_STATUS':
      return await getStatus(msg.url);

    case 'CHECK_BOOKMARK':
      return await checkBookmark(msg.url);

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

/**
 * Save a bookmark: publish kind 1111 + update kind 10003.
 */
async function saveBookmark(payload) {
  const sk = await getSecretKey();
  if (!sk) return { error: 'Not logged in. Add your nsec in extension settings.' };

  const relays = await getRelays();
  const pubkey = await getPubkey();
  const url = normalizeUrl(payload.url);

  // 1. Publish kind 1111 (NIP-22 URL comment with metadata)
  const bookmarkEvent = buildBookmarkEvent(sk, {
    url,
    title: payload.title,
    description: payload.description,
    tags: payload.tags,
  });

  const pubResult = await publishToRelays(bookmarkEvent, relays);

  // 2. Fetch current kind 10003 and update it
  const currentList = await fetchBookmarkList(pubkey, relays);
  const existingTags = currentList ? currentList.tags : [];

  const listEvent = buildBookmarkListEvent(sk, existingTags, url);
  const listResult = await publishToRelays(listEvent, relays);

  // 3. Save tags to recent list for autocomplete
  if (payload.tags && payload.tags.length > 0) {
    await addRecentTags(payload.tags);
  }

  // 4. Invalidate count cache for this URL
  setCachedCount(url, null);

  return {
    success: true,
    bookmarkEventId: bookmarkEvent.id,
    listEventId: listEvent.id,
    relays: {
      bookmark: pubResult,
      list: listResult,
    },
  };
}

/**
 * Get the crumb count for a URL (cached, 5-min TTL).
 */
async function getCount(url) {
  const normalized = normalizeUrl(url);
  const cached = await getCachedCount(normalized);
  if (cached !== null) return { count: cached };

  const relays = await getRelays();
  const count = await countUrlBookmarks(normalized, relays);
  setCachedCount(normalized, count);
  return { count };
}

/**
 * Get full status for a URL: logged in, already saved, count.
 */
async function getStatus(url) {
  const pubkey = await getPubkey();
  const normalized = normalizeUrl(url);
  const relays = await getRelays();

  const result = {
    loggedIn: !!pubkey,
    pubkey,
    url: normalized,
    alreadySaved: false,
    existingEvent: null,
    count: 0,
  };

  if (!pubkey) return result;

  // Check count (use cache if available)
  const cached = await getCachedCount(normalized);
  if (cached !== null) {
    result.count = cached;
  } else {
    result.count = await countUrlBookmarks(normalized, relays);
    setCachedCount(normalized, result.count);
  }

  // Check if user already bookmarked this URL
  const existing = await findUserBookmark(pubkey, normalized, relays);
  if (existing) {
    result.alreadySaved = true;
    result.existingEvent = existing;
  }

  return result;
}

/**
 * Quick check if URL is bookmarked by user.
 */
async function checkBookmark(url) {
  const pubkey = await getPubkey();
  if (!pubkey) return { saved: false };

  const normalized = normalizeUrl(url);
  const relays = await getRelays();
  const existing = await findUserBookmark(pubkey, normalized, relays);
  return { saved: !!existing, event: existing };
}
