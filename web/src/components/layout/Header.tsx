import { Link, useNavigate } from 'react-router-dom';
import { Search, LogIn, LogOut, Cookie, User } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { nip19 } from 'nostr-tools';

export function Header() {
  const { pubkey, profile, login, logout, isLoggingIn } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoginError('');
      await login();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/t/${encodeURIComponent(searchQuery.trim().toLowerCase())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-crumbs-border bg-crumbs-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <Cookie className="w-6 h-6 text-crumbs-gold group-hover:rotate-12 transition-transform" />
          <span className="font-serif text-xl font-bold text-crumbs-gold hidden sm:inline">
            Crumbs
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crumbs-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full bg-crumbs-surface border border-crumbs-border rounded-lg pl-9 pr-3 py-2 text-sm
                text-crumbs-text placeholder:text-crumbs-muted focus:outline-none focus:border-crumbs-gold/50
                focus:ring-1 focus:ring-crumbs-gold/30 transition-colors"
            />
          </div>
        </form>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-4 text-sm text-crumbs-muted">
          <Link to="/" className="hover:text-crumbs-text transition-colors">Fresh</Link>
          <span className="text-crumbs-border">·</span>
          <Link to="/recent" className="hover:text-crumbs-text transition-colors">Recent</Link>
          <span className="text-crumbs-border">·</span>
          <Link to="/tags" className="hover:text-crumbs-text transition-colors">Tags</Link>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {pubkey ? (
            <div className="flex items-center gap-2">
              <Link
                to={`/u/${nip19.npubEncode(pubkey)}`}
                className="flex items-center gap-2 text-sm text-crumbs-muted hover:text-crumbs-text transition-colors"
              >
                {profile?.picture ? (
                  <img
                    src={profile.picture}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-crumbs-border"
                  />
                ) : (
                  <User className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">
                  {profile?.displayName || profile?.name || 'Profile'}
                </span>
              </Link>
              <button
                onClick={logout}
                className="p-1.5 text-crumbs-muted hover:text-crumbs-danger transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-crumbs-gold/10 text-crumbs-gold
                  border border-crumbs-gold/30 rounded-lg text-sm font-medium
                  hover:bg-crumbs-gold/20 disabled:opacity-50 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {isLoggingIn ? 'Signing in...' : 'Login'}
              </button>
              {loginError && (
                <span className="text-xs text-crumbs-danger">{loginError}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
