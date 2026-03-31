import { formatDistanceToNowStrict, format, isThisYear } from 'date-fns';

export function timeAgo(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  }
  if (diffHours < 48) {
    return 'yesterday';
  }
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}
