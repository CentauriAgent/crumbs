export function Footer() {
  return (
    <footer className="mt-auto border-t border-crumbs-border py-6 text-center text-xs text-crumbs-muted">
      <div className="mx-auto max-w-6xl px-4">
        <p>
          <span className="text-crumbs-gold">🍞</span>
          {' '}Crumbs — Social bookmarks on Nostr{' '}
          <span className="text-crumbs-gold">🍞</span>
        </p>
        <p className="mt-1 opacity-60">
          · · · leave a trail, discover the web · · ·
        </p>
      </div>
    </footer>
  );
}
