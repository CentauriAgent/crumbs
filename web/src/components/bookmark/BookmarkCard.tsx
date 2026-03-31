import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { TagBadge } from './TagBadge';
import { useProfile } from '../../hooks/useProfile';
import { extractDomain, normalizeUrl } from '../../lib/url';
import { FAVICON_URL } from '../../lib/constants';
import { timeAgo } from '../../lib/time';
import type { ParsedBookmark } from '../../types/bookmark';

interface BookmarkCardProps {
  bookmark: ParsedBookmark;
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const { profile } = useProfile(bookmark.pubkey);
  const domain = extractDomain(bookmark.url);
  const npub = nip19.npubEncode(bookmark.pubkey);

  return (
    <article className="group bg-crumbs-surface border border-crumbs-border rounded-lg p-4 hover:border-crumbs-gold/30 transition-colors animate-fade-in">
      {/* Top: favicon + title + external link */}
      <div className="flex items-start gap-3">
        <img
          src={FAVICON_URL(domain)}
          alt=""
          className="w-5 h-5 mt-0.5 rounded-sm shrink-0"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-serif text-base font-semibold text-crumbs-text leading-snug line-clamp-2 flex-1">
              {bookmark.title ? (
                <Link
                  to={`/url?url=${encodeURIComponent(normalizeUrl(bookmark.url))}`}
                  className="hover:text-crumbs-gold transition-colors"
                >
                  {bookmark.title}
                </Link>
              ) : (
                <Link
                  to={`/url?url=${encodeURIComponent(normalizeUrl(bookmark.url))}`}
                  className="hover:text-crumbs-gold transition-colors"
                >
                  {domain}
                </Link>
              )}
            </h3>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 text-crumbs-muted hover:text-crumbs-gold transition-colors opacity-0 group-hover:opacity-100"
              title="Open link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Domain */}
          <p className="text-xs text-crumbs-muted mt-0.5">{domain}</p>
        </div>
      </div>

      {/* Description */}
      {bookmark.description && (
        <p className="mt-2 text-sm text-crumbs-text/80 leading-relaxed line-clamp-2 pl-8">
          {bookmark.description}
        </p>
      )}

      {/* Tags */}
      {bookmark.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
          {bookmark.tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Footer: who saved + time */}
      <div className="mt-3 flex items-center gap-2 pl-8 text-xs text-crumbs-muted">
        <Link
          to={`/u/${npub}`}
          className="flex items-center gap-1.5 hover:text-crumbs-text transition-colors"
        >
          {profile?.picture ? (
            <img
              src={profile.picture}
              alt=""
              className="w-4 h-4 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-crumbs-tag" />
          )}
          <span>{profile?.displayName || profile?.name || npub.slice(0, 12) + '...'}</span>
        </Link>
        <span>·</span>
        <time>{timeAgo(bookmark.createdAt)}</time>
      </div>
    </article>
  );
}
