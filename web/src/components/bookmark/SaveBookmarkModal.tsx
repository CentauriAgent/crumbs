import { useState, useCallback } from 'react';
import { X, Plus, Loader2, Lock, Globe } from 'lucide-react';
import { useSaveBookmark } from '../../hooks/useBookmarks';
import { isValidUrl } from '../../lib/url';

interface SaveBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveBookmarkModal({ isOpen, onClose, onSaved }: SaveBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const { save, saving } = useSaveBookmark();

  const addTag = useCallback((raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
    }
  }, [tags]);

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      // Process remaining tag input
      if (tagInput.trim()) {
        addTag(tagInput);
        setTagInput('');
      }

      await save({
        url,
        title: title || url,
        description,
        tags: tagInput.trim()
          ? [...tags, tagInput.trim().toLowerCase()]
          : tags,
        isPrivate,
      });

      // Reset
      setUrl('');
      setTitle('');
      setDescription('');
      setTags([]);
      setIsPrivate(false);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-crumbs-surface border border-crumbs-border rounded-xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-crumbs-border">
          <h2 className="font-serif text-lg font-semibold text-crumbs-gold">
            🍞 Drop a Crumb
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-crumbs-muted hover:text-crumbs-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* URL */}
          <div>
            <label className="block text-xs text-crumbs-muted mb-1.5">URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full bg-crumbs-bg border border-crumbs-border rounded-lg px-3 py-2 text-sm
                text-crumbs-text placeholder:text-crumbs-muted focus:outline-none focus:border-crumbs-gold/50
                focus:ring-1 focus:ring-crumbs-gold/30"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-crumbs-muted mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Page title (auto-fetched later)"
              className="w-full bg-crumbs-bg border border-crumbs-border rounded-lg px-3 py-2 text-sm
                text-crumbs-text placeholder:text-crumbs-muted focus:outline-none focus:border-crumbs-gold/50
                focus:ring-1 focus:ring-crumbs-gold/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-crumbs-muted mb-1.5">Notes</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Why you're saving this..."
              rows={2}
              className="w-full bg-crumbs-bg border border-crumbs-border rounded-lg px-3 py-2 text-sm
                text-crumbs-text placeholder:text-crumbs-muted focus:outline-none focus:border-crumbs-gold/50
                focus:ring-1 focus:ring-crumbs-gold/30 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-crumbs-muted mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 bg-crumbs-bg border border-crumbs-border rounded-lg px-3 py-2 min-h-[38px]
              focus-within:border-crumbs-gold/50 focus-within:ring-1 focus-within:ring-crumbs-gold/30">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-crumbs-tag text-crumbs-gold rounded-full px-2.5 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-crumbs-danger transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Add tags (comma or space separated)' : ''}
                className="flex-1 min-w-[100px] bg-transparent text-sm text-crumbs-text placeholder:text-crumbs-muted focus:outline-none"
              />
            </div>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors
                ${isPrivate
                  ? 'bg-crumbs-tag border-crumbs-muted text-crumbs-muted'
                  : 'bg-crumbs-gold/10 border-crumbs-gold/30 text-crumbs-gold'}`}
            >
              {isPrivate ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Private
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" /> Public
                </>
              )}
            </button>
            <span className="text-xs text-crumbs-muted">
              {isPrivate
                ? "Only you can see this crumb"
                : "Visible on the trail for everyone"}
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-crumbs-danger">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-crumbs-gold text-crumbs-bg font-semibold rounded-lg
              hover:bg-crumbs-gold-dim disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Leave a Crumb
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
