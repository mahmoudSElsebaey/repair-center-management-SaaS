import i18n from '@/i18n';

/**
 * Translation helper for strings composed at runtime.
 *
 * i18next's `t` has overloads that return `object` when a key is not statically
 * known, which React cannot render. Notification and activity copy is stored as
 * keys in the database, so those lookups are always dynamic and need a
 * guaranteed string. Rather than casting at each call site, they go through
 * here.
 *
 * If a key is genuinely missing, the key itself is returned — visible during
 * development, harmless in production.
 */
export function translate(
  key: string,
  params?: Record<string, unknown>,
  fallback?: string
): string {
  const result = i18n.t(key, { ...params, defaultValue: fallback ?? key });
  return typeof result === 'string' ? result : (fallback ?? key);
}

/** The active locale, narrowed to what the formatters accept. */
export function activeLocale(): 'ar' | 'en' {
  return i18n.language === 'ar' ? 'ar' : 'en';
}
