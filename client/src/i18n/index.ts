import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { env } from '@/lib/env';
import { readLocale, writeLocale } from '@/lib/storage';
import type { Locale } from '@/types/domain';
import ar from './locales/ar';
import en from './locales/en';

/**
 * Bilingual bootstrap.
 *
 * i18next owns the language. Direction, `lang` and `dir` are applied to the
 * document element here so that switching language re-lays-out the entire
 * application — navigation, tables, forms and charts included.
 */

const savedLocale = readLocale();
const initialLocale: Locale = savedLocale ?? env.defaultLocale;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initialLocale,
  fallbackLng: 'en',
  supportedLngs: ['ar', 'en'],
  defaultNS: 'translation',
  interpolation: {
    // React already escapes everything it renders.
    escapeValue: false,
  },
  returnNull: false,
});

/** True when the active language reads right-to-left. */
export function isRtl(locale: Locale = i18n.language as Locale): boolean {
  return locale === 'ar';
}

export function directionFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Applies a language to the document. Called on boot and on every change so
 * the two never drift apart.
 */
export function applyDocumentLanguage(locale: Locale): void {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = directionFor(locale);
  root.dataset.locale = locale;
  writeLocale(locale);
}

export async function changeLanguage(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  applyDocumentLanguage(locale);
}

export function toggleLanguage(current: Locale): Locale {
  return current === 'ar' ? 'en' : 'ar';
}

/** Typed access to the translation function outside React components. */
export const t = i18n.t.bind(i18n);

// Applied immediately at module load, before React mounts.
applyDocumentLanguage(initialLocale);

export default i18n;
export { initialLocale };
