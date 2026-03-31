export function BookmarkSkeleton() {
  return (
    <div className="bg-crumbs-surface border border-crumbs-border rounded-lg p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-sm shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 shimmer rounded w-3/4" />
          <div className="h-3 shimmer rounded w-1/4" />
        </div>
      </div>
      <div className="mt-2 pl-8 space-y-1.5">
        <div className="h-3 shimmer rounded w-full" />
        <div className="h-3 shimmer rounded w-2/3" />
      </div>
      <div className="mt-3 pl-8 flex gap-1.5">
        <div className="h-5 shimmer rounded-full w-14" />
        <div className="h-5 shimmer rounded-full w-10" />
      </div>
    </div>
  );
}
