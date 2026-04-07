export const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

export const SEARCH_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.nostr.band',
];

export const KIND_BOOKMARK_LIST = 10003;
export const KIND_BOOKMARK_SET = 10003;
export const KIND_COMMENT = 1111;
export const KIND_REACTION = 17;
export const KIND_PROFILE = 0;
export const KIND_CONTACTS = 3;
export const KIND_RELAY_LIST = 10002;
export const KIND_PROFILE_THEME = 16767;

export const FAVICON_URL = (domain: string, size = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;

export const APP_NAME = 'Crumbs';
export const APP_TAGLINE = 'Leave a trail. Discover the web.';
