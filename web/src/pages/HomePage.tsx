import { useState } from 'react';
import { Cookie, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNetworkBookmarks, useFollowedBookmarks } from '../hooks/useBookmarks';
import { BookmarkList } from '../components/bookmark/BookmarkList';
import { TrendingTags } from '../components/bookmark/TrendingTags';
import { SaveBookmarkModal } from '../components/bookmark/SaveBookmarkModal';

export function HomePage() {
  const pubkey = useAuthStore(s => s.pubkey);
  const [tab, setTab] = useState<'fresh' | 'following'>('fresh');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const { bookmarks: networkBookmarks, loading: networkLoading } = useNetworkBookmarks(60);
  const { bookmarks: followedBookmarks, loading: followedLoading } = useFollowedBookmarks(60);

  const activeBookmarks = tab === 'following' ? followedBookmarks : networkBookmarks;
  const activeLoading = tab === 'following' ? followedLoading : networkLoading;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-crumbs-gold flex items-center justify-center gap-3">
          <Cookie className="w-8 h-8" />
          Fresh Crumbs
        </h1>
        <p className="text-crumbs-muted mt-2 text-sm">
          · · · the trail others have left across the web · · ·
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          {pubkey && (
            <div className="flex gap-1 mb-4 border-b border-crumbs-border">
              <button
                onClick={() => setTab('fresh')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${tab === 'fresh'
                    ? 'border-crumbs-gold text-crumbs-gold'
                    : 'border-transparent text-crumbs-muted hover:text-crumbs-text'}`}
              >
                🍞 Fresh
              </button>
              <button
                onClick={() => setTab('following')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${tab === 'following'
                    ? 'border-crumbs-gold text-crumbs-gold'
                    : 'border-transparent text-crumbs-muted hover:text-crumbs-text'}`}
              >
                👥 Following
              </button>
            </div>
          )}

          <BookmarkList
            bookmarks={activeBookmarks}
            loading={activeLoading}
            emptyMessage={
              tab === 'following'
                ? "No crumbs from people you follow yet. Try the Fresh feed!"
                : "No crumbs on the trail yet. Be the first to leave one!"
            }
          />
        </div>

        {/* Sidebar */}
        <aside className="lg:w-72 shrink-0 space-y-4">
          <TrendingTags
            bookmarks={networkBookmarks}
            title="🔥 Trending Tags"
          />

          {/* Info card */}
          <div className="bg-crumbs-surface border border-crumbs-border rounded-lg p-4">
            <h3 className="font-serif text-sm font-semibold text-crumbs-gold mb-2">
              What is Crumbs?
            </h3>
            <p className="text-xs text-crumbs-muted leading-relaxed">
              Social bookmarking on Nostr. Save URLs, tag them, share the trail.
              Like del.icio.us reborn for the decentralized web. Every bookmark is a
              Nostr event — your data, your relays, your crumbs.
            </p>
          </div>
        </aside>
      </div>

      {/* FAB: Save bookmark */}
      {pubkey && (
        <button
          onClick={() => setShowSaveModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-crumbs-gold text-crumbs-bg rounded-full
            shadow-lg shadow-crumbs-gold/20 flex items-center justify-center
            hover:bg-crumbs-gold-dim hover:scale-105 active:scale-95 transition-all z-40"
          title="Drop a Crumb"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <SaveBookmarkModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
      />
    </div>
  );
}
