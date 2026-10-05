import type { BranchRef, StoredSession } from '@/types/auth';
import type { Locale, Theme } from '@/types/domain';

/**
 * Browser storage keys and accessors.
 *
 * Read/write of the session lives here rather than in the Redux slice so that
 * the axios layer can read the current access token without importing the store,
 * which would create a circular dependency.
 */

const KEYS = {
  session: 'fixer:session',
  theme: 'fixer:theme',
  lang: 'fixer:lang',
} as const;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Storage can be unavailable (private mode, quota). Non-fatal. */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

export function readSession(): StoredSession | null {
  const raw = safeGet(KEYS.session);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed as StoredSession;
  } catch {
    // Corrupted payload — drop it rather than trapping the user in a broken state.
    safeRemove(KEYS.session);
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  safeSet(KEYS.session, JSON.stringify(session));
}

export function clearSession(): void {
  safeRemove(KEYS.session);
}

/* -------------------------------------------------------------------------- */
/* Preferences                                                                 */
/* -------------------------------------------------------------------------- */

export function readTheme(): Theme | null {
  const value = safeGet(KEYS.theme);
  return value === 'light' || value === 'dark' ? value : null;
}

export function writeTheme(theme: Theme): void {
  safeSet(KEYS.theme, theme);
}

export function readLocale(): Locale | null {
  const value = safeGet(KEYS.lang);
  return value === 'ar' || value === 'en' ? value : null;
}

export function writeLocale(locale: Locale): void {
  safeSet(KEYS.lang, locale);
}

export const STORAGE_KEYS = KEYS;

export type { BranchRef };
