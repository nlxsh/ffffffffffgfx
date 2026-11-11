/**
 * Formats large numbers into clean human-readable compact strings with letters (e.g. 1.2K, 35K, 1.5M, 2B).
 * Ensures numbers always fit within cards and never overflow.
 */
export function formatCompactNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '0';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n) || n === 0) return '0';

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs < 1000) {
    return `${sign}${Math.round(abs)}`;
  }

  // 1,000 to 999,999 -> K
  if (abs < 1_000_000) {
    const k = abs / 1000;
    const formatted = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
    return `${sign}${formatted}K`;
  }

  // 1,000,000 to 999,999,999 -> M
  if (abs < 1_000_000_000) {
    const m = abs / 1_000_000;
    const formatted = m >= 100 ? Math.round(m) : Math.round(m * 10) / 10;
    return `${sign}${formatted}M`;
  }

  // 1,000,000,000 to 999,999,999,999 -> B
  if (abs < 1_000_000_000_000) {
    const b = abs / 1_000_000_000;
    const formatted = b >= 100 ? Math.round(b) : Math.round(b * 10) / 10;
    return `${sign}${formatted}B`;
  }

  // 1 Trillion and beyond -> T
  const t = abs / 1_000_000_000_000;
  const formatted = t >= 100 ? Math.round(t) : Math.round(t * 10) / 10;
  return `${sign}${formatted}T`;
}
