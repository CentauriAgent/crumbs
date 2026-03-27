/**
 * Shared constants for Pinstr.
 */

// Nostr event kinds
export const KIND_BOOKMARK = 30078;       // App-specific data (NIP-78)
export const KIND_BOOKMARK_SET = 30003;   // Bookmark sets (NIP-51)
export const KIND_BOOKMARK_LIST = 10003;  // Global bookmark list (NIP-51)
export const KIND_PROFILE = 0;            // User profile (NIP-01)
export const KIND_RELAY_LIST = 10002;     // Relay list metadata (NIP-65)
export const KIND_FOLLOW_LIST = 3;        // Follow list (NIP-02)

// Label namespace (NIP-32)
export const LABEL_NAMESPACE = 'social.pinstr.bookmark';

// Client identifier
export const CLIENT_TAG = 'pinstr';

// D-tag prefix
export const D_TAG_PREFIX = 'pinstr:';
export const THEME_D_TAG = 'pinstr:theme';

// Default relays
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
];

export const SEARCH_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
];

// Theme presets
export const THEMES = {
  midnight: { bg: '#0f0f23', bgSecondary: '#1a1a3e', text: '#e2e8f0', accent: '#8B5CF6' },
  ocean:    { bg: '#0c1426', bgSecondary: '#162040', text: '#e2e8f0', accent: '#3B82F6' },
  forest:   { bg: '#0f1a0f', bgSecondary: '#1a2e1a', text: '#d4e8d4', accent: '#22C55E' },
  sunset:   { bg: '#1a0f0f', bgSecondary: '#2e1a1a', text: '#f0e2e2', accent: '#F97316' },
  snow:     { bg: '#fafafa', bgSecondary: '#f0f0f0', text: '#1a1a2e', accent: '#6366F1' },
  terminal: { bg: '#000000', bgSecondary: '#111111', text: '#00FF00', accent: '#00FF00' },
  bitcoin:  { bg: '#1a1a2e', bgSecondary: '#2d2d4e', text: '#f7931a', accent: '#f7931a' },
} as const;

export type ThemeName = keyof typeof THEMES;

// Profile shapes
export const PROFILE_SHAPES = {
  circle:   'circle(50% at 50% 50%)',
  hexagon:  'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
  squircle: 'inset(0 round 25%)',
  diamond:  'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  octagon:  'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  shield:   'polygon(50% 0%, 100% 15%, 100% 65%, 50% 100%, 0% 65%, 0% 15%)',
} as const;

export type ProfileShape = keyof typeof PROFILE_SHAPES;
