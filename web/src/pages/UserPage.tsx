import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Link as LinkIcon, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useUserBookmarks } from '../hooks/useBookmarks';
import { UserAvatar } from '../components/user/UserAvatar';
import { BookmarkList } from '../components/bookmark/BookmarkList';
import { TrendingTags } from '../components/bookmark/TrendingTags';

export function UserPage() {
  const { npub } = useParams<{ npub: string }>();

  const pubkey = useMemo(() => {
    if (!npub) return undefined;
    try {
      const decoded = nip19.decode(npub);
      if (decoded.type === 'npub') return decoded.data;
    } catch { /* ignore */ }
    // Maybe it's a raw hex pubkey
    if (/^[0-9a-f]{64}$/.test(npub)) return npub;
    return undefined;
  }, [npub]);

  const { profile, loading: profileLoading } = useProfile(pubkey);
  const { bookmarks, loading: bookmarksLoading } = useUserBookmarks(pubkey);

  if (!pubkey) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-4xl mb-3">🤷</p>
        <p className="text-crumbs-muted">Invalid profile identifier</p>
      </div>
    );
  }

  const displayName = profile?.displayName || profile?.name || npub?.slice(0, 16) + '...';

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Profile header */}
      <div className="bg-crumbs-surface border border-crumbs-border rounded-xl p-6 mb-6">
        {profileLoading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-20 h-20 rounded-full shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-6 shimmer rounded w-48" />
              <div className="h-4 shimmer rounded w-32" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <UserAvatar
              src={profile?.picture}
              shape={profile?.shape}
              size={80}
            />
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-2xl font-bold text-crumbs-text">
                {displayName}
              </h1>
              {profile?.nip05 && (
                <p className="text-sm text-crumbs-gold mt-0.5">
                  {profile.nip05}
                </p>
              )}
              {profile?.about && (
                <p className="text-sm text-crumbs-text/80 mt-2 leading-relaxed line-clamp-3">
                  {profile.about}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-crumbs-muted">
                <span className="flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {bookmarks.length} crumbs
                </span>
                {profile?.lud16 && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    {profile.lud16}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Bookmarks */}
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-lg font-semibold text-crumbs-gold mb-4">
            🍞 {displayName}'s Trail
          </h2>
          <BookmarkList
            bookmarks={bookmarks}
            loading={bookmarksLoading}
            emptyMessage="This person hasn't left any crumbs yet."
          />
        </div>

        {/* Sidebar: tag cloud */}
        <aside className="lg:w-64 shrink-0">
          <TrendingTags
            bookmarks={bookmarks}
            title="📌 Their Tags"
            limit={30}
          />
        </aside>
      </div>
    </div>
  );
}
