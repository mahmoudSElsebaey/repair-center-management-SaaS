/**
 * Fixer — build freshness guard.
 *
 * The verification suites run against compiled output: `server/dist` for the API
 * suite and `client/dist` for the browser suite. If either is older than the
 * source it was built from, the suite silently verifies the *previous* revision
 * and reports a pass. That is the most dangerous kind of green check, so it is
 * detected explicitly rather than trusted.
 *
 * Imported by both suites. Uses only the Node standard library.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Newest modification time under `dir`, or 0 when it does not exist. */
function newestMtime(dir, { extensions = null, skip = [] } = {}) {
  if (!existsSync(dir)) return 0;

  let newest = 0;

  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (skip.includes(entry.name)) continue;
        walk(full);
        continue;
      }

      if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) continue;

      try {
        const { mtimeMs } = statSync(full);
        if (mtimeMs > newest) newest = mtimeMs;
      } catch {
        /* unreadable file — ignore */
      }
    }
  };

  walk(dir);
  return newest;
}

/** Oldest modification time among the files directly inside `dir`. */
function oldestMtime(dir, { extensions = null } = {}) {
  if (!existsSync(dir)) return 0;

  const times = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (extensions && !extensions.some((ext) => entry.name.endsWith(ext))) continue;

    try {
      times.push(statSync(path.join(dir, entry.name)).mtimeMs);
    } catch {
      /* ignore */
    }
  }

  return times.length ? Math.min(...times) : 0;
}

const seconds = (ms) => `${Math.round(ms / 1000)}s`;

/**
 * Checks that compiled output is at least as new as its source.
 *
 * Returns { ok, reason }. `ok: false` means the build is stale or missing and
 * the caller must rebuild before trusting any result.
 */
export function checkBuildFreshness({ name, sourceDir, outputDir, extensions }) {
  if (!existsSync(outputDir)) {
    return { ok: false, reason: `${name}: output directory is missing (${outputDir})` };
  }

  const newestSource = newestMtime(sourceDir, { extensions });
  // Compare against the oldest emitted file: a partial rebuild leaves some
  // artifacts older than the source, which is exactly the case to catch.
  const oldestOutput = oldestMtime(outputDir, { extensions: ['.js'] });

  if (newestSource === 0) {
    return { ok: false, reason: `${name}: no source files found under ${sourceDir}` };
  }

  if (oldestOutput === 0) {
    return { ok: false, reason: `${name}: no compiled files found under ${outputDir}` };
  }

  if (newestSource > oldestOutput) {
    return {
      ok: false,
      reason:
        `${name}: source is newer than the build by ${seconds(newestSource - oldestOutput)} ` +
        `— rebuild before verifying, otherwise this suite tests the previous revision`,
    };
  }

  return { ok: true, reason: `${name}: build is current` };
}

/**
 * Convenience wrapper for the suites: prints a clear failure and exits when a
 * build is stale, so a green result can never refer to old code.
 */
export function assertFreshBuild(checks, { onFail } = {}) {
  const failures = checks
    .map((check) => checkBuildFreshness(check))
    .filter((result) => !result.ok);

  if (failures.length === 0) return;

  console.error('\n\x1b[31m  Stale build detected — refusing to verify.\x1b[0m\n');
  for (const failure of failures) console.error(`    • ${failure.reason}`);

  console.error(
    '\n  Rebuild first:\n' +
      '    npm run build:server      # server/dist\n' +
      '    npm run build:client      # client/dist\n'
  );

  if (onFail) onFail();
  process.exit(2);
}
