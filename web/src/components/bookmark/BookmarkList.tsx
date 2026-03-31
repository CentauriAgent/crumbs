import { BookmarkCard } from './BookmarkCard';
import { BookmarkSkeleton } from './BookmarkSkeleton';
import type { ParsedBookmark } from '../../types/bookmark';

interface BookmarkListProps {
  bookmarks: ParsedBookmark[];
  loading: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
}

export function BookmarkList({
  bookmarks,
  loading,
  emptyMessage = 'No crumbs here yet...',
  emptyIcon = '🍞',
}: BookmarkListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <BookmarkSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3">{emptyIcon}</p>
        <p className="text-crumbs-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookmarks.map(b => (
        <BookmarkCard key={b.id} bookmark={b} />
      ))}
    </div>
  );
}
