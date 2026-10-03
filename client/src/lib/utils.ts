/** Small class-name joiner. Avoids pulling in clsx for a one-line utility. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** `RF-2026-00421` → readable in both directions without bidi damage. */
export function formatTicketCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Formats money for the UI. The currency is intentionally a parameter — the
 * platform is resold into different markets, so nothing is hardcoded to EGP.
 */
export function formatCurrency(
  amount: number,
  currency = 'EGP',
  locale: 'ar' | 'en' = 'en'
): string {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Tabular, locale-aware number formatting for dashboards and tables. */
export function formatNumber(value: number, locale: 'ar' | 'en' = 'en'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US').format(value);
}

export function formatDate(
  value: string | Date | undefined,
  locale: 'ar' | 'en' = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...options,
  }).format(date);
}

export function formatRelativeTime(value: string | Date, locale: 'ar' | 'en' = 'en'): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);

  const formatter = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    numeric: 'auto',
  });

  const thresholds: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 24 * 30 * 12],
    ['month', 60 * 24 * 30],
    ['day', 60 * 24],
    ['hour', 60],
    ['minute', 1],
  ];

  for (const [unit, minutesPerUnit] of thresholds) {
    if (Math.abs(diffMinutes) >= minutesPerUnit) {
      return formatter.format(Math.round(diffMinutes / minutesPerUnit), unit);
    }
  }

  return formatter.format(diffMinutes, 'minute');
}

/** Two-letter monogram for avatar fallbacks. Works for Arabic and Latin names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function truncate(value: string, max = 60): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Builds a query string, dropping empty values so URLs stay clean. */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Reads a human message out of an unknown thrown value. Used by every form's
 * catch block so no screen ever renders "[object Object]".
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}
