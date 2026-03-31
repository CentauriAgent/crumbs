import type NDK from '@nostr-dev-kit/ndk';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { KIND_COMMENT, KIND_BOOKMARK_LIST } from './constants';
import type { BookmarkFormData, ParsedBookmark } from '../types/bookmark';

/**
 * Build a kind 1111 (NIP-22 URL comment) event for a bookmark
 */
export function buildCommentEvent(ndk: NDK, data: BookmarkFormData): NDKEvent {
  const hashtags = data.tags.map(t => `#${t}`).join(' ');
  const content = data.description
    ? `${data.description}${hashtags ? ' ' + hashtags : ''}`
    : hashtags || data.title;

  const event = new NDKEvent(ndk);
  event.kind = KIND_COMMENT;
  event.content = content;
  event.tags = [
    ['I', data.url, 'web'],
    ['K', 'web'],
    ['i', data.url, 'web'],
    ['k', 'web'],
  ];

  if (data.title) {
    event.tags.push(['title', data.title]);
  }
  for (const tag of data.tags) {
    event.tags.push(['t', tag.toLowerCase()]);
  }

  return event;
}

/**
 * Build an updated kind 10003 bookmark list event
 * Appends the new URL to existing bookmark list
 */
export function buildBookmarkListEvent(
  ndk: NDK,
  existingTags: string[][],
  newUrl: string,
): NDKEvent {
  const event = new NDKEvent(ndk);
  event.kind = KIND_BOOKMARK_LIST;
  event.content = '';

  // Copy existing r tags, avoid duplicates
  const urls = new Set<string>();
  const tags: string[][] = [];
  for (const tag of existingTags) {
    if (tag[0] === 'r') {
      urls.add(tag[1]);
    }
    tags.push([...tag]);
  }

  if (!urls.has(newUrl)) {
    tags.push(['r', newUrl]);
  }

  event.tags = tags;
  return event;
}

/**
 * Parse a kind 1111 event into a structured bookmark
 */
export function parseCommentToBookmark(event: NDKEvent): ParsedBookmark {
  const url = event.tagValue('I') || '';
  const title = event.tagValue('title') || '';
  const tags = event.tags
    .filter(t => t[0] === 't')
    .map(t => t[1]);

  // Extract description (content minus hashtags)
  let description = event.content;
  for (const tag of tags) {
    description = description.replace(new RegExp(`\\s*#${tag}\\b`, 'gi'), '');
  }
  description = description.trim();

  return {
    id: event.id,
    url,
    title,
    description,
    tags,
    pubkey: event.pubkey,
    createdAt: event.created_at || 0,
    event,
  };
}
