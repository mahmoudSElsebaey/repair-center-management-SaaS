/**
 * Fixer — bilingual key parity audit.
 *
 * `en.ts` and `ar.ts` are the consolidated locale bundles. This script walks
 * both objects and reports missing keys in either direction so the UI never
 * falls back to a raw key string in production.
 *
 * Run: npx tsx scripts/check-i18n-parity.ts
 */
