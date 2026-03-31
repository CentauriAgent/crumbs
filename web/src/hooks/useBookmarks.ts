import { useState, useEffect, useCallback } from 'react';
import type { NDKFilter } from '@nostr-dev-kit/ndk';
import { useAuthStore } from '../stores/authStore';
import { KIND_COMMENT } from '../lib/constants';
import { parseCommentToBookmark, buildCommentEvent, buildBookmarkListEvent } from '../lib/bookmarkEvent';
import type { ParsedBookmark } from '../types/bookmark';

/**
 * Fetch recent bookmarks from the network (kind 1111 with K=web)
 */
export function useNetworkBookmarks(limit = 50) {
  const ndk = useAuthStore(s => s.ndk);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const filter: NDKFilter = {
      kinds: [KIND_COMMENT as number],
      '#K': ['web'],
      limit,
    };

    (async () => {
      try {
        const events = await ndk.fetchEvents(filter);
        if (cancelled) return;
        const parsed = Array.from(events)
          .map(parseCommentToBookmark)
          .filter(b => b.url)
          .sort((a, b) => b.createdAt - a.createdAt);
        setBookmarks(parsed);
      } catch (err) {
        console.error('Failed to fetch network bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ndk, limit]);

  return { bookmarks, loading };
}

/**
 * Fetch bookmarks from followed users
 */
export function useFollowedBookmarks(limit = 50) {
  const ndk = useAuthStore(s => s.ndk);
  const following = useAuthStore(s => s.following);
  const pubkey = useAuthStore(s => s.pubkey);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pubkey || following.size === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const authors = Array.from(following).slice(0, 500);
    const filter: NDKFilter = {
      kinds: [KIND_COMMENT as number],
      '#K': ['web'],
      authors,
      limit,
    };

    (async () => {
      try {
        const events = await ndk.fetchEvents(filter);
        if (cancelled) return;
        const parsed = Array.from(events)
          .map(parseCommentToBookmark)
          .filter(b => b.url)
          .sort((a, b) => b.createdAt - a.createdAt);
        setBookmarks(parsed);
      } catch (err) {
        console.error('Failed to fetch followed bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ndk, pubkey, following, limit]);

  return { bookmarks, loading };
}

/**
 * Fetch bookmarks by a specific user
 */
export function useUserBookmarks(pubkey: string | undefined) {
  const ndk = useAuthStore(s => s.ndk);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pubkey) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const filter: NDKFilter = {
      kinds: [KIND_COMMENT as number],
      '#K': ['web'],
      authors: [pubkey],
      limit: 200,
    };

    (async () => {
      try {
        const events = await ndk.fetchEvents(filter);
        if (cancelled) return;
        const parsed = Array.from(events)
          .map(parseCommentToBookmark)
          .filter(b => b.url)
          .sort((a, b) => b.createdAt - a.createdAt);
        setBookmarks(parsed);
      } catch (err) {
        console.error('Failed to fetch user bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ndk, pubkey]);

  return { bookmarks, loading };
}

/**
 * Fetch all bookmarks for a specific URL
 */
export function useUrlBookmarks(url: string | null) {
  const ndk = useAuthStore(s => s.ndk);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [reactionCount, setReactionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Fetch kind 1111 comments on this URL
        const commentEvents = await ndk.fetchEvents({
          kinds: [KIND_COMMENT as number],
          '#I': [url],
        });

        // Fetch kind 17 reactions
        const reactionEvents = await ndk.fetchEvents({
          kinds: [17 as number],
          '#i': [url],
        });

        if (cancelled) return;

        const parsed = Array.from(commentEvents)
          .map(parseCommentToBookmark)
          .sort((a, b) => b.createdAt - a.createdAt);

        setBookmarks(parsed);
        setReactionCount(reactionEvents.size);
      } catch (err) {
        console.error('Failed to fetch URL bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ndk, url]);

  return { bookmarks, reactionCount, loading };
}

/**
 * Fetch bookmarks by tag
 */
export function useTagBookmarks(tag: string | undefined) {
  const ndk = useAuthStore(s => s.ndk);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tag) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const filter: NDKFilter = {
      kinds: [KIND_COMMENT as number],
      '#t': [tag.toLowerCase()],
      '#K': ['web'],
      limit: 100,
    };

    (async () => {
      try {
        const events = await ndk.fetchEvents(filter);
        if (cancelled) return;
        const parsed = Array.from(events)
          .map(parseCommentToBookmark)
          .filter(b => b.url)
          .sort((a, b) => b.createdAt - a.createdAt);
        setBookmarks(parsed);
      } catch (err) {
        console.error('Failed to fetch tag bookmarks:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [ndk, tag]);

  return { bookmarks, loading };
}

/**
 * Save a bookmark (publish kind 1111 + update kind 10003)
 */
export function useSaveBookmark() {
  const ndk = useAuthStore(s => s.ndk);
  const pubkey = useAuthStore(s => s.pubkey);
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (data: {
    url: string;
    title: string;
    description: string;
    tags: string[];
    isPrivate: boolean;
  }) => {
    if (!pubkey || !ndk.signer) throw new Error('Not logged in');

    setSaving(true);
    try {
      // Don't publish kind 1111 for private bookmarks
      if (!data.isPrivate) {
        const commentEvent = buildCommentEvent(ndk, data);
        await commentEvent.publish();
      }

      // Update kind 10003 bookmark list
      const existingEvents = await ndk.fetchEvents({
        kinds: [10003 as number],
        authors: [pubkey],
        limit: 1,
      });

      let existingTags: string[][] = [];
      for (const ev of existingEvents) {
        existingTags = ev.tags;
      }

      const listEvent = buildBookmarkListEvent(ndk, existingTags, data.url);
      await listEvent.publish();
    } finally {
      setSaving(false);
    }
  }, [ndk, pubkey]);

  return { save, saving };
}
