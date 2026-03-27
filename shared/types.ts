/**
 * Shared type definitions for Pinstr.
 */

import type { ThemeName, ProfileShape } from './constants';

export interface Bookmark {
  /** SHA-256 hash of normalized URL */
  urlHash: string;
  /** Original URL */
  url: string;
  /** Page title */
  title: string;
  /** User description/notes */
  description: string;
  /** User-assigned tags */
  tags: string[];
  /** Public or private */
  visibility: 'public' | 'private';
  /** Author pubkey (hex) */
  pubkey: string;
  /** Created timestamp (unix seconds) */
  createdAt: number;
  /** Nostr event ID */
  eventId?: string;
}

export interface BookmarkCollection {
  /** d-tag identifier */
  id: string;
  /** Display title */
  title: string;
  /** Description */
  description: string;
  /** Cover image URL */
  image?: string;
  /** References to bookmark events (a-tags) */
  bookmarkRefs: string[];
  /** Author pubkey */
  pubkey: string;
}

export interface UserTheme {
  theme: ThemeName;
  profileShape: ProfileShape;
  accentColor?: string;
}

export interface UserProfile {
  pubkey: string;
  npub: string;
  name?: string;
  displayName?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
}
