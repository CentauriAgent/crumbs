import { Cookie } from 'lucide-react';
import { useNetworkBookmarks } from '../hooks/useBookmarks';
import { BookmarkList } from '../components/bookmark/BookmarkList';
import { TrendingTags } from '../components/bookmark/TrendingTags';

export function RecentPage() {
  const { bookmarks, loading } = useNetworkBookmarks(100);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-crumbs-gold flex items-center gap-3">
          <Cookie className="w-7 h-7" />
          Recent Crumbs
        </h1>
        <p className="text-crumbs-muted mt-2 text-sm">
          The latest bookmarks dropped across the network
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <BookmarkList
            bookmarks={bookmarks}
            loading={loading}
            emptyMessage="No crumbs on the trail yet."
          />
        </div>

        <aside className="lg:w-72 shrink-0">
          <TrendingTags bookmarks={bookmarks} title="🔥 Trending Tags" />
        </aside>
      </div>
    </div>
  );
}
