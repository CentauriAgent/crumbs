import { useSearchParams, Link } from 'react-router-dom';
import { useMemo } from 'react';
import { ExternalLink, Heart, Users } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { useUrlBookmarks } from '../hooks/useBookmarks';
import { useProfile } from '../hooks/useProfile';
import { UserAvatar } from '../components/user/UserAvatar';
import { TagBadge } from '../components/bookmark/TagBadge';
import { extractDomain } from '../lib/url';
import { FAVICON_URL } from '../lib/constants';
import { timeAgo } from '../lib/time';
import type { ParsedBookmark } from '../types/bookmark';

function BookmarkerRow({ bookmark }: { bookmark: ParsedBookmark }) {
  const { profile } = useProfile(bookmark.pubkey);
  const npub = nip19.npubEncode(bookmark.pubkey);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-crumbs-border/50 last:border-0">
      <Link to={`/u/${npub}`}>
        <UserAvatar src={profile?.picture} shape={profile?.shape} size={36} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/u/${npub}`}
          className="text-sm font-medium text-crumbs-text hover:text-crumbs-gold transition-colors"
        >
          {profile?.displayName || profile?.name || npub.slice(0, 16) + '...'}
        </Link>
        {bookmark.description && (
          <p className="text-xs text-crumbs-text/70 mt-0.5 line-clamp-2">
            {bookmark.description}
          </p>
        )}
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {bookmark.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        <span className="text-xs text-crumbs-muted mt-1 block">
          {timeAgo(bookmark.createdAt)}
        </span>
      </div>
    </div>
  );
}

export function UrlPage() {
  const [searchParams] = useSearchParams();
  const url = searchParams.get('url');
  const { bookmarks, reactionCount, loading } = useUrlBookmarks(url);
  const domain = url ? extractDomain(url) : '';

  // Aggregate tags across all bookmarks
  const tagAggregate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  if (!url) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-4xl mb-3">🔗</p>
        <p className="text-crumbs-muted">No URL specified</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* URL Header */}
      <div className="bg-crumbs-surface border border-crumbs-border rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <img
            src={FAVICON_URL(domain, 64)}
            alt=""
            className="w-10 h-10 rounded-lg shrink-0"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-bold text-crumbs-text break-all">
              {domain}
            </h1>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-crumbs-gold hover:text-crumbs-gold-dim flex items-center gap-1 mt-1 break-all"
            >
              {url}
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-crumbs-muted">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {bookmarks.length} {bookmarks.length === 1 ? 'person' : 'people'} dropped a crumb
          </span>
          {reactionCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-pink-400" />
              {reactionCount} {reactionCount === 1 ? 'reaction' : 'reactions'}
            </span>
          )}
        </div>

        {/* Tag aggregate */}
        {tagAggregate.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-crumbs-muted mb-2">
              Tagged by the community:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tagAggregate.map(([tag, count]) => (
                <TagBadge key={tag} tag={tag} count={count} size="md" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Who dropped a crumb here */}
      <div className="bg-crumbs-surface border border-crumbs-border rounded-xl p-5">
        <h2 className="font-serif text-lg font-semibold text-crumbs-gold mb-4">
          🍞 Who else dropped a crumb here?
        </h2>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <div className="w-9 h-9 rounded-full shimmer" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 shimmer rounded w-32" />
                  <div className="h-3 shimmer rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🕵️</p>
            <p className="text-crumbs-muted text-sm">
              No one has saved this URL yet. Be the first!
            </p>
          </div>
        ) : (
          <div>
            {bookmarks.map(b => (
              <BookmarkerRow key={b.id} bookmark={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
