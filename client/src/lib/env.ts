import type { Locale, Theme } from '@/types/domain';

/**
 * Centralised runtime configuration.
 *
 * Nothing else in the client reads `import.meta.env` directly, so there is one
 * place to audit environment behaviour and one place to change it.
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * In development the browser talks to the Vite dev server and `/api` is
 * proxied, so relative URLs avoid CORS entirely.
 *
 * In production `VITE_API_URL` must point at the deployed API, e.g.
 * `https://repairflow-api.vercel.app/api/v1`.
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const env = {
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
  apiBaseUrl: trimTrailingSlash(configuredApiUrl || '/api/v1'),
  appName: (import.meta.env.VITE_APP_NAME as string | undefined) || 'RepairFlow',
  defaultLocale: ((import.meta.env.VITE_DEFAULT_LOCALE as Locale | undefined) || 'ar') as Locale,
  defaultTheme: ((import.meta.env.VITE_DEFAULT_THEME as Theme | undefined) || 'dark') as Theme,
  /** Public base used to build QR tracking links. */
  publicTrackingBase:
    (import.meta.env.VITE_PUBLIC_TRACK_BASE as string | undefined) || window.location.origin,
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 20_000,
} as const;
