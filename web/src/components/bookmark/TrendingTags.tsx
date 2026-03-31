import { useMemo } from 'react';
import { TagBadge } from './TagBadge';
import type { ParsedBookmark } from '../../types/bookmark';

interface TrendingTagsProps {
  bookmarks: ParsedBookmark[];
  title?: string;
  limit?: number;
}

export function TrendingTags({ bookmarks, title = 'Trending Tags', limit = 20 }: TrendingTagsProps) {
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) {
      for (const tag of b.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }, [bookmarks, limit]);

  if (tagCounts.length === 0) return null;

  return (
    <div className="bg-crumbs-surface border border-crumbs-border rounded-lg p-4">
      <h3 className="font-serif text-sm font-semibold text-crumbs-gold mb-3">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tagCounts.map(([tag, count]) => (
          <TagBadge key={tag} tag={tag} count={count} />
        ))}
      </div>
    </div>
  );
}
