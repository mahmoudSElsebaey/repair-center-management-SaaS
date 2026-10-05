/**
 * Fixer — bilingual key parity audit.
 *
 * `en.ts` and `ar.ts` are the contract for a fully bilingual UI. Nothing in the
 * type system enforces that they stay in lockstep, so this script walks both
 * trees, flattens every leaf path, and reports any divergence.
 *
 * Run with Node's type stripping (no build step, no dependencies):
 *   node --experimental-strip-types scripts/check-i18n-parity.ts
 */

import en from '../client/src/i18n/locales/en.ts';
import ar from '../client/src/i18n/locales/ar.ts';

type Tree = Record<string, unknown>;

function flatten(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return [prefix];

  return Object.entries(node as Tree).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key)
  );
}

const enKeys = flatten(en).sort();
const arKeys = flatten(ar).sort();

const enSet = new Set(enKeys);
const arSet = new Set(arKeys);

const missingInArabic = enKeys.filter((key) => !arSet.has(key));
const missingInEnglish = arKeys.filter((key) => !enSet.has(key));

/** Interpolation placeholders must match, or a translation renders `{{name}}`. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
}

function collectStrings(node: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (node === null || typeof node !== 'object') return out;

  for (const [key, value] of Object.entries(node as Tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else if (value && typeof value === 'object') {
      for (const [k, v] of collectStrings(value, path)) out.set(k, v);
    }
  }
  return out;
}

const enStrings = collectStrings(en);
const arStrings = collectStrings(ar);

const placeholderMismatches: string[] = [];
for (const [path, enValue] of enStrings) {
  const arValue = arStrings.get(path);
  if (arValue === undefined) continue;

  const a = placeholders(enValue).join(',');
  const b = placeholders(arValue).join(',');
  if (a !== b) placeholderMismatches.push(`${path}: en[${a}] vs ar[${b}]`);
}

/* -------------------------------------------------------------------------- */
/* Report                                                                      */
/* -------------------------------------------------------------------------- */

console.log('Fixer — i18n parity');
console.log('─'.repeat(64));
console.log(`English keys : ${enKeys.length}`);
console.log(`Arabic keys  : ${arKeys.length}`);

let failed = false;

if (missingInArabic.length > 0) {
  failed = true;
  console.log(`\n✗ Missing in ar.ts (${missingInArabic.length}):`);
  missingInArabic.forEach((key) => console.log(`    ${key}`));
}

if (missingInEnglish.length > 0) {
  failed = true;
  console.log(`\n✗ Missing in en.ts (${missingInEnglish.length}):`);
  missingInEnglish.forEach((key) => console.log(`    ${key}`));
}

if (placeholderMismatches.length > 0) {
  failed = true;
  console.log(`\n✗ Interpolation mismatch (${placeholderMismatches.length}):`);
  placeholderMismatches.forEach((entry) => console.log(`    ${entry}`));
}

if (!failed) {
  console.log('\n✓ Both locales define the same keys.');
  console.log('✓ Interpolation placeholders agree on every shared key.');
}

console.log('─'.repeat(64));
process.exit(failed ? 1 : 0);
