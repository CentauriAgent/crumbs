import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import type { UserProfile } from '../types/bookmark';

const profileCache = new Map<string, UserProfile>();

export function useProfile(pubkey: string | undefined): {
  profile: UserProfile | null;
  loading: boolean;
} {
  const fetchProfile = useAuthStore(s => s.fetchProfile);
  const [profile, setProfile] = useState<UserProfile | null>(
    pubkey ? profileCache.get(pubkey) || null : null
  );
  const [loading, setLoading] = useState(!profile && !!pubkey);

  useEffect(() => {
    if (!pubkey) return;

    const cached = profileCache.get(pubkey);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const p = await fetchProfile(pubkey);
      if (cancelled) return;
      if (p) {
        profileCache.set(pubkey, p);
        setProfile(p);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [pubkey, fetchProfile]);

  return { profile, loading };
}
