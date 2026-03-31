import { useMemo } from 'react';
import { Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNetworkBookmarks } from '../hooks/useBookmarks';

export function TagsPage() {
  const { bookmarks, loading } = useNetworkBookmarks(200);

  const tagData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) {
      for (const tag of b.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const maxCount = tagData.length > 0 ? tagData[0][1] : 1;

  function getTagSize(count: number): string {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'text-2xl font-bold';
    if (ratio > 0.4) return 'text-lg font-semibold';
    if (ratio > 0.2) return 'text-base font-medium';
    return 'text-sm';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-crumbs-gold flex items-center gap-3">
          <Tags className="w-7 h-7" />
          Browse Tags
        </h1>
        <p className="text-crumbs-muted mt-2 text-sm">
          {loading ? 'Loading...' : `${tagData.length} tags across the network`}
        </p>
      </div>

      {loading ? (
        <div className="bg-crumbs-surface border border-crumbs-border rounded-xl p-8 animate-pulse">
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="shimmer rounded-full" style={{ width: 60 + Math.random() * 80, height: 28 }} />
            ))}
          </div>
        </div>
      ) : tagData.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="text-crumbs-muted">No tags found yet.</p>
        </div>
      ) : (
        <div className="bg-crumbs-surface border border-crumbs-border rounded-xl p-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            {tagData.map(([tag, count]) => (
              <Link
                key={tag}
                to={`/t/${encodeURIComponent(tag)}`}
                className={`text-crumbs-gold hover:text-crumbs-text transition-colors ${getTagSize(count)}`}
                title={`${count} crumb${count === 1 ? '' : 's'}`}
              >
                {tag}
                <span className="text-crumbs-muted text-xs ml-1">({count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
