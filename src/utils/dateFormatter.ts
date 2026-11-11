/**
 * Formats a timestamp into a Facebook-style relative and contextual date string.
 * Examples:
 * - Just now (< 1 min)
 * - 45m ago (< 1 hour)
 * - 3h ago (< 24 hours)
 * - Yesterday at 4:15 PM
 * - 8 Nov at 10:24 AM
 * - 8 Nov 2025
 */
export function formatFacebookPostTime(timestamp: number): {
  label: string;
  fullDate: string;
} {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const dateObj = new Date(timestamp);
  const fullDate = dateObj.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const timeStr = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = dateObj.getDate();
  const yearNum = dateObj.getFullYear();
  const currentYear = new Date().getFullYear();

  // Less than 1 minute
  if (diffSecs < 60) {
    return { label: 'Just now', fullDate };
  }

  // Less than 60 minutes
  if (diffMins < 60) {
    return { label: `${diffMins}m ago`, fullDate };
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return { label: `${diffHours}h ago`, fullDate };
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === dateObj.getDate() &&
    yesterday.getMonth() === dateObj.getMonth() &&
    yesterday.getFullYear() === dateObj.getFullYear();

  if (isYesterday) {
    return { label: `Yesterday at ${timeStr}`, fullDate };
  }

  // Within last 7 days
  if (diffDays < 7) {
    return { label: `${diffDays}d ago · ${dayNum} ${monthShort}`, fullDate };
  }

  // Same year
  if (yearNum === currentYear) {
    return { label: `${dayNum} ${monthShort} at ${timeStr}`, fullDate };
  }

  // Different year
  return { label: `${dayNum} ${monthShort} ${yearNum}`, fullDate };
}
