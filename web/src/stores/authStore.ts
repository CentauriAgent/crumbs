import { create } from 'zustand';
import type NDK from '@nostr-dev-kit/ndk';
import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import { getNDK } from '../lib/ndk';
import type { UserProfile } from '../types/bookmark';
import { KIND_PROFILE, KIND_CONTACTS } from '../lib/constants';

interface AuthState {
  ndk: NDK;
  pubkey: string | null;
  profile: UserProfile | null;
  following: Set<string>;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  logout: () => void;
  fetchProfile: (pubkey: string) => Promise<UserProfile | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ndk: getNDK(),
  pubkey: localStorage.getItem('crumbs:pubkey'),
  profile: null,
  following: new Set(),
  isLoggingIn: false,

  login: async () => {
    const ndk = get().ndk;
    if (typeof window.nostr === 'undefined') {
      throw new Error('No NIP-07 extension found. Install Alby, nos2x, or similar.');
    }

    set({ isLoggingIn: true });
    try {
      const signer = new NDKNip07Signer();
      ndk.signer = signer;
      const user = await signer.user();
      const pubkey = user.pubkey;
      localStorage.setItem('crumbs:pubkey', pubkey);

      // Fetch profile
      const profile = await get().fetchProfile(pubkey);

      // Fetch contacts (kind 3)
      const contactEvents = await ndk.fetchEvents({
        kinds: [KIND_CONTACTS as number],
        authors: [pubkey],
        limit: 1,
      });
      const following = new Set<string>();
      for (const ev of contactEvents) {
        for (const tag of ev.tags) {
          if (tag[0] === 'p') following.add(tag[1]);
        }
      }

      set({ pubkey, profile, following, isLoggingIn: false });
    } catch (err) {
      set({ isLoggingIn: false });
      throw err;
    }
  },

  logout: () => {
    const ndk = get().ndk;
    ndk.signer = undefined;
    localStorage.removeItem('crumbs:pubkey');
    set({ pubkey: null, profile: null, following: new Set() });
  },

  fetchProfile: async (pubkey: string) => {
    const ndk = get().ndk;
    const events = await ndk.fetchEvents({
      kinds: [KIND_PROFILE as number],
      authors: [pubkey],
      limit: 1,
    });
    for (const ev of events) {
      try {
        const meta = JSON.parse(ev.content);
        return {
          pubkey,
          name: meta.name,
          displayName: meta.display_name || meta.displayName,
          picture: meta.picture,
          about: meta.about,
          nip05: meta.nip05,
          lud16: meta.lud16,
          shape: meta.shape,
        };
      } catch {
        return null;
      }
    }
    return null;
  },
}));
