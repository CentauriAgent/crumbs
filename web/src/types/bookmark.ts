import type { NDKEvent } from '@nostr-dev-kit/ndk';

export interface BookmarkFormData {
  url: string;
  title: string;
  description: string;
  tags: string[];
  isPrivate: boolean;
}

export interface ParsedBookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  pubkey: string;
  createdAt: number;
  event: NDKEvent;
}

export interface UserProfile {
  pubkey: string;
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  shape?: string;
}
