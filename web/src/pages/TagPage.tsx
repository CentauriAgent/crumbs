import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Hash } from 'lucide-react';
import { useTagBookmarks } from '../hooks/useBookmarks';
import { BookmarkList } from '../components/bookmark/BookmarkList';
import { TagBadge } from '../components/bookmark/TagBadge';

export function TagPage() {
  const { tag } = useParams<{ tag: string }>();
  const decodedTag = tag ? decodeURIComponent(tag).toLowerCase() : undefined;
  const { bookmarks, loading } = useTagBookmarks(decodedTag);

  // Find related tags (tags that co-occur with this one)
  const relatedTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags) {
        if (t !== decodedTag) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [bookmarks, decodedTag]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Hash className="w-7 h-7 text-crumbs-gold" />
          <h1 className="font-serif text-3xl font-bold text-crumbs-text">
            {decodedTag}
          </h1>
        </div>
        <p className="text-crumbs-muted text-sm">
          {loading ? 'Loading...' : `${bookmarks.length} crumbs tagged "${decodedTag}"`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Bookmarks */}
        <div className="flex-1 min-w-0">
          <BookmarkList
            bookmarks={bookmarks}
            loading={loading}
            emptyMessage={`No crumbs tagged "${decodedTag}" yet.`}
            emptyIcon="🏷️"
          />
        </div>

        {/* Sidebar: related tags */}
        {relatedTags.length > 0 && (
          <aside className="lg:w-64 shrink-0">
            <div className="bg-crumbs-surface border border-crumbs-border rounded-lg p-4">
              <h3 className="font-serif text-sm font-semibold text-crumbs-gold mb-3">
                🔗 Related Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {relatedTags.map(([t, count]) => (
                  <TagBadge key={t} tag={t} count={count} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
