import { Link } from 'react-router-dom';

interface TagBadgeProps {
  tag: string;
  count?: number;
  size?: 'sm' | 'md';
}

export function TagBadge({ tag, count, size = 'sm' }: TagBadgeProps) {
  return (
    <Link
      to={`/t/${encodeURIComponent(tag)}`}
      className={`inline-flex items-center gap-1 bg-crumbs-tag hover:bg-crumbs-tag-hover
        text-crumbs-gold rounded-full transition-colors
        ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
    >
      <span>{tag}</span>
      {count !== undefined && (
        <span className="text-crumbs-muted">({count})</span>
      )}
    </Link>
  );
}
