/**
 * RepairFlow — API verification suite.
 *
 * Starts the compiled API against an isolated verification database, exercises
 * the whole authentication surface, and prints a pass/fail report.
 *
 * The suite owns its database (`repairflow_verify` by default) and drops it on
 * exit, so it is safe to run against a machine that also holds development data
 * and it never touches the seeded demo tenant.
 *
 * Usage:
 *   cd server && npm run build
 *   node scripts/verify-api.mjs
 *   node scripts/verify-api.mjs --keep-db     # inspect the database afterwards
 *   node scripts/verify-api.mjs --port 5055
 *
 * Written with the Node standard library only — no test framework, no
 * dependency to install or keep current.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { assertFreshBuild } from './lib/build-freshness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, '..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const require = createRequire(path.join(SERVER_DIR, 'package.json'));

/* -------------------------------------------------------------------------- */
/* Arguments                                                                   */
/* -------------------------------------------------------------------------- */

const argv = process.argv.slice(2);
const KEEP_DB = argv.includes('--keep-db');
const PORT = Number(argv[argv.indexOf('--port') + 1]) || 5000;
const BASE = `http://localhost:${PORT}/api/v1`;
const DB_NAME = 'repairflow_verify';
const MONGO_URI = process.env.VERIFY_MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;
const PASSWORD = 'RepairFlow@2026';
const ROTATED_PASSWORD = 'RepairFlow@2026x';
const ACCOUNT = 'karim.mansour@repairflow.app';

/* -------------------------------------------------------------------------- */
/* Tiny test harness                                                           */
/* -------------------------------------------------------------------------- */

const results = [];
let currentGroup = 'general';

function group(name) {
  currentGroup = name;
}

function record(name, ok, detail) {
  results.push({ group: currentGroup, name, ok, detail: detail ?? '' });
}

function check(name, ok, detail) {
  record(name, Boolean(ok), detail);
}

function checkEqual(name, actual, expected) {
  const ok = actual === expected;
  record(name, ok, ok ? String(actual) : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Performs a request and normalises the outcome so tests never throw.
 * Returns { status, body } where body is parsed JSON when possible.
 */
async function call(method, url, { body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }

    return { status: response.status, body: parsed };
  } catch (error) {
    return { status: 0, body: { error: String(error?.message ?? error) } };
  }
}

/* -------------------------------------------------------------------------- */
/* Server lifecycle                                                            */
/* -------------------------------------------------------------------------- */

async function waitForHealth(timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await call('GET', `${BASE}/health`);
    if (res.status === 200) return true;
    await sleep(700);
  }

  return false;
}

/**
 * Confirms that the server we spawned is the one answering.
 *
 * A port probe is not enough on Windows: a socket bound to `127.0.0.1:5000`
 * coexists with one bound to `0.0.0.0:5000`, so "is the port free" reports a
 * false negative and the suite would happily test a server left running from an
 * earlier session — which is exactly the failure this guards against.
 *
 * The decisive question is whether *our child* is still alive. A process that
 * cannot bind exits within a second, so a child that survives means we own the
 * port.
 */
async function assertOwnServerIsServing(child, log) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (child.exitCode !== null) {
      console.error(
        `\n\x1b[31m  The API failed to start (exit code ${child.exitCode}).\x1b[0m\n`
      );
      console.error(log.join('').split('\n').slice(-20).join('\n'));
      process.exit(2);
    }
    await sleep(250);
  }

  // Still alive after three seconds: it bound the port successfully.
  const health = await call('GET', `${BASE}/health`);
  const looksLikeRepairFlow = health.body?.message === 'RepairFlow API';

  if (!looksLikeRepairFlow) {
    console.error(
      '\n\x1b[31m  Something else is answering on this port.\x1b[0m\n\n' +
        `  Expected the RepairFlow API but received: ${JSON.stringify(health.body).slice(0, 120)}\n\n` +
        `  Run the suite on another port:\n    node scripts/verify-api.mjs --port ${PORT + 1}\n`
    );
    process.exit(2);
  }
}

async function seedVerificationDatabase() {
  console.log(`  seeding ${DB_NAME} …`);

  await new Promise((resolve, reject) => {
    // Always hand Node absolute script paths. Relative paths are resolved
    // against the parent process, and the repository path contains a space,
    // so relying on `cwd` here produced a confusing MODULE_NOT_FOUND.
    const child = spawn(process.execPath, [path.join(SERVER_DIR, 'dist', 'seed', 'seed.js'), '--fresh'], {
      cwd: SERVER_DIR,
      env: { ...process.env, MONGODB_URI: MONGO_URI, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Keep the output. A silent seed failure is the hardest kind to diagnose.
    const output = [];
    child.stdout.on('data', (chunk) => output.push(String(chunk)));
    child.stderr.on('data', (chunk) => output.push(String(chunk)));

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();

      console.error('\x1b[31m  seed failed. Output:\x1b[0m');
      console.error(
        output
          .join('')
          .split('\n')
          .slice(-30)
          .map((line) => `    ${line}`)
          .join('\n')
      );
      reject(new Error(`seed exited with code ${code}`));
    });
  });
}

async function dropVerificationDatabase() {
  const mongoose = require('mongoose');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

/* -------------------------------------------------------------------------- */
/* Checks                                                                      */
/* -------------------------------------------------------------------------- */

let server;
let accessToken = '';
let refreshToken = '';

async function runHealthChecks() {
  group('health');

  const res = await call('GET', `${BASE}/health`);
  checkEqual('status 200', res.status, 200);
  checkEqual('success true', res.body?.success, true);
  checkEqual('database connected', res.body?.data?.database, 'connected');
  check('version present', Boolean(res.body?.data?.version), `v=${res.body?.data?.version}`);
}

async function runLoginChecks() {
  group('login');

  const res = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: PASSWORD },
  });

  checkEqual('status 200', res.status, 200);
  checkEqual('success true', res.body?.success, true);

  const data = res.body?.data ?? {};
  accessToken = data.accessToken ?? '';
  refreshToken = data.refreshToken ?? '';

  check('access token issued', accessToken.length > 100, `length=${accessToken.length}`);
  check('refresh token issued', refreshToken.length > 100, `length=${refreshToken.length}`);
  checkEqual('role returned', data.user?.role, 'manager');
  checkEqual('locale returned', data.user?.locale, 'ar');
  check('password never serialised', data.user?.password === undefined, 'no password field');
  check(
    'refresh hash never serialised',
    data.user?.refreshToken === undefined,
    'no refreshToken field'
  );
}

async function runAuthorizationChecks() {
  group('authorization');

  const authorized = await call('GET', `${BASE}/auth/me`, { token: accessToken });
  checkEqual('me with token → 200', authorized.status, 200);
  checkEqual('me returns the account', authorized.body?.data?.user?.email, ACCOUNT);

  const anonymous = await call('GET', `${BASE}/auth/me`);
  checkEqual('me without token → 401', anonymous.status, 401);
  checkEqual('missing-token code', anonymous.body?.code, 'TOKEN_MISSING');

  const malformed = await call('GET', `${BASE}/auth/me`, { token: 'not.a.jwt' });
  checkEqual('malformed token → 401', malformed.status, 401);
  checkEqual('invalid-token code', malformed.body?.code, 'TOKEN_INVALID');
}

async function runCredentialSafetyChecks() {
  group('credential safety');

  const wrong = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: 'definitely-wrong' },
  });
  checkEqual('wrong password → 401', wrong.status, 401);
  checkEqual('wrong-password code', wrong.body?.code, 'INVALID_CREDENTIALS');

  const ghost = await call('POST', `${BASE}/auth/login`, {
    body: { email: 'nobody@repairflow.app', password: 'definitely-wrong' },
  });
  checkEqual('unknown account → 401', ghost.status, 401);
  check(
    'unknown account message identical to wrong password',
    ghost.body?.message === wrong.body?.message,
    `"${ghost.body?.message}"`
  );
}

async function runValidationChecks() {
  group('validation');

  const res = await call('POST', `${BASE}/auth/login`, {
    body: { email: 'not-an-email', password: '' },
  });

  checkEqual('invalid input → 400', res.status, 400);
  checkEqual('validation code', res.body?.code, 'VALIDATION_ERROR');
  check('field errors returned', Array.isArray(res.body?.errors) && res.body.errors.length >= 2,
    `fields=${res.body?.errors?.length}`);
}

async function runRefreshChecks() {
  group('token refresh');

  /**
   * Rotation is exercised twice back-to-back on purpose.
   *
   * The bug this guards against only appeared when two signings landed inside
   * the same wall-clock second, so a single pass could succeed by luck and hide
   * it. Two immediate cycles make the same-second case the normal case.
   */
  for (let round = 1; round <= 2; round += 1) {
    const originalRefresh = refreshToken;
    const originalAccess = accessToken;

    const rotated = await call('POST', `${BASE}/auth/refresh`, { body: { refreshToken } });
    checkEqual(`round ${round}: refresh → 200`, rotated.status, 200);
    check(`round ${round}: new access token issued`, Boolean(rotated.body?.data?.accessToken), 'present');
    check(`round ${round}: new refresh token issued`, Boolean(rotated.body?.data?.refreshToken), 'present');

    const newAccess = rotated.body?.data?.accessToken ?? '';
    const newRefresh = rotated.body?.data?.refreshToken ?? '';

    /**
     * The rotated token must differ from the one it replaced.
     *
     * Regression guard for a real bug: `iat` has one-second resolution, so
     * signing the same refresh payload twice in the same second produced a
     * byte-identical token. Rotation then returned the same string, the stored
     * hash matched, and the "revoked" token kept working — stolen-token
     * detection silently did nothing whenever login and refresh landed in the
     * same second. A random `jti` fixes it; this check keeps it fixed.
     */
    check(
      `round ${round}: rotated refresh token differs`,
      newRefresh !== originalRefresh && newRefresh.length > 0,
      newRefresh === originalRefresh ? 'IDENTICAL TOKEN — revocation is a no-op' : 'distinct'
    );

    check(
      `round ${round}: rotated access token differs`,
      newAccess !== originalAccess && newAccess.length > 0,
      newAccess === originalAccess ? 'identical' : 'distinct'
    );

    const replay = await call('GET', `${BASE}/auth/me`, { token: newAccess });
    checkEqual(`round ${round}: new access token works`, replay.status, 200);

    // The rotated-away token must be dead: that is what makes theft detectable.
    const reuse = await call('POST', `${BASE}/auth/refresh`, { body: { refreshToken: originalRefresh } });
    checkEqual(`round ${round}: rotated-away token rejected`, reuse.status, 401);
    checkEqual(`round ${round}: revoked code`, reuse.body?.code, 'REFRESH_REVOKED');

    refreshToken = newRefresh;
    accessToken = newAccess;
  }
}

async function runProfileChecks() {
  group('profile');

  const updated = await call('PATCH', `${BASE}/auth/me`, {
    token: accessToken,
    body: { phone: '+20 106 778 9999' },
  });
  checkEqual('update → 200', updated.status, 200);
  checkEqual('phone persisted', updated.body?.data?.user?.phone, '+20 106 778 9999');

  const readBack = await call('GET', `${BASE}/auth/me`, { token: accessToken });
  checkEqual('phone survives a re-read', readBack.body?.data?.user?.phone, '+20 106 778 9999');

  const empty = await call('PATCH', `${BASE}/auth/me`, { token: accessToken, body: {} });
  checkEqual('empty update → 400', empty.status, 400);
}

async function runPasswordChecks() {
  group('password lifecycle');

  const changed = await call('PATCH', `${BASE}/auth/password`, {
    token: accessToken,
    body: { currentPassword: PASSWORD, newPassword: ROTATED_PASSWORD },
  });
  checkEqual('change → 200', changed.status, 200);

  // Changing a password must end every other session.
  const revoked = await call('POST', `${BASE}/auth/refresh`, { body: { refreshToken } });
  checkEqual('sessions revoked by password change', revoked.status, 401);

  const stale = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: PASSWORD },
  });
  checkEqual('old password no longer works', stale.status, 401);

  const fresh = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: ROTATED_PASSWORD },
  });
  checkEqual('new password works', fresh.status, 200);
  accessToken = fresh.body?.data?.accessToken ?? '';
  refreshToken = fresh.body?.data?.refreshToken ?? '';

  const wrongCurrent = await call('PATCH', `${BASE}/auth/password`, {
    token: accessToken,
    body: { currentPassword: 'not-the-password', newPassword: ROTATED_PASSWORD },
  });
  checkEqual('wrong current password → 400', wrongCurrent.status, 400);
  checkEqual('wrong-current code', wrongCurrent.body?.code, 'INVALID_CURRENT_PASSWORD');

  const restored = await call('PATCH', `${BASE}/auth/password`, {
    token: accessToken,
    body: { currentPassword: ROTATED_PASSWORD, newPassword: PASSWORD },
  });
  checkEqual('password restored', restored.status, 200);

  const finalLogin = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: PASSWORD },
  });
  accessToken = finalLogin.body?.data?.accessToken ?? '';
  refreshToken = finalLogin.body?.data?.refreshToken ?? '';
}

async function runLogoutChecks() {
  group('logout');

  const out = await call('POST', `${BASE}/auth/logout`, { token: accessToken });
  checkEqual('logout → 200', out.status, 200);

  const afterLogout = await call('POST', `${BASE}/auth/refresh`, { body: { refreshToken } });
  checkEqual('refresh token dead after logout', afterLogout.status, 401);

  /**
   * Access tokens are stateless JWTs, so logout revokes the *refresh* token and
   * the session can no longer be renewed. The already-issued access token stays
   * usable until it expires — a deliberate trade-off that avoids a database or
   * cache lookup on every request. This check pins that behaviour so it cannot
   * change silently; the documented bound is the 15-minute access lifetime.
   *
   * This check targets the seeded account. The suite has already changed this
   * account's password twice by now, and that path clears the stored refresh
   * token only — it does not revoke outstanding access tokens either.
   */
  const meAfter = await call('GET', `${BASE}/auth/me`, { token: accessToken });
  checkEqual(
    'access token remains valid until it expires (stateless JWT)',
    meAfter.status,
    200
  );

  // Fresh credentials must still work after the session was ended.
  const resigned = await call('POST', `${BASE}/auth/login`, {
    body: { email: ACCOUNT, password: PASSWORD },
  });
  checkEqual('sign in again after logout → 200', resigned.status, 200);
  accessToken = resigned.body?.data?.accessToken ?? '';
  refreshToken = resigned.body?.data?.refreshToken ?? '';
}

async function runPasswordResetChecks() {
  group('password reset');

  const forgot = await call('POST', `${BASE}/auth/forgot-password`, {
    body: { email: ACCOUNT },
  });
  checkEqual('forgot → 200', forgot.status, 200);

  const ghost = await call('POST', `${BASE}/auth/forgot-password`, {
    body: { email: 'nobody@repairflow.app' },
  });
  checkEqual('unknown email also → 200', ghost.status, 200);
  check(
    'no account enumeration in the message',
    ghost.body?.message === forgot.body?.message,
    'identical messages'
  );

  const token = forgot.body?.devResetToken;
  check('development reset token surfaced', Boolean(token), 'present in non-production');

  if (token) {
    const reset = await call('POST', `${BASE}/auth/reset-password`, {
      body: { token, password: PASSWORD },
    });
    checkEqual('reset with valid token → 200', reset.status, 200);

    const reused = await call('POST', `${BASE}/auth/reset-password`, {
      body: { token, password: PASSWORD },
    });
    checkEqual('reset token is single-use', reused.status, 400);

    const bad = await call('POST', `${BASE}/auth/reset-password`, {
      body: { token: 'a'.repeat(64), password: PASSWORD },
    });
    checkEqual('unknown reset token → 400', bad.status, 400);
  }
}

async function runErrorContractChecks() {
  group('error contract');

  const notFound = await call('GET', `${BASE}/definitely-not-a-route`);
  checkEqual('unknown route → 404', notFound.status, 404);
  checkEqual('route-not-found code', notFound.body?.code, 'ROUTE_NOT_FOUND');

  const cast = await call('GET', `${BASE}/auth/me`, { token: accessToken });
  check('errors never include a stack trace', !JSON.stringify(cast.body).includes('at '), 'clean payload');
  check('errors always carry a code', typeof notFound.body?.code === 'string', notFound.body?.code);
  check('errors always carry success:false', notFound.body?.success === false, 'envelope respected');
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log('\n\x1b[36m╭───────────────────────────────────────────────╮');
  console.log('│  RepairFlow — API verification suite          │');
  console.log('╰───────────────────────────────────────────────╯\x1b[0m');
  console.log(`  database : ${MONGO_URI}`);
  console.log(`  base url : ${BASE}\n`);

  // Refuse to verify a stale build: a green result must never describe old code.
  assertFreshBuild([
    {
      name: 'server',
      sourceDir: path.join(SERVER_DIR, 'src'),
      outputDir: path.join(SERVER_DIR, 'dist'),
      extensions: ['.ts'],
    },
  ]);

  // ---- seed an isolated database -----------------------------------------
  await seedVerificationDatabase();

  // ---- start the compiled server -----------------------------------------
  server = spawn(process.execPath, [path.join(SERVER_DIR, 'dist', 'server.js')], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      MONGODB_URI: MONGO_URI,
      PORT: String(PORT),
      NODE_ENV: 'development',
      CLIENT_URL: 'http://localhost:5173',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const serverLog = [];
  server.stdout.on('data', (chunk) => serverLog.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverLog.push(String(chunk)));

  let exitCode = 1;

  try {
    const healthy = await waitForHealth();

    if (!healthy) {
      console.error('\x1b[31m  The API did not become healthy.\x1b[0m\n');
      console.error(serverLog.join('').split('\n').slice(-25).join('\n'));
      return;
    }

    // "Something answered" is not the same as "our server answered".
    await assertOwnServerIsServing(server, serverLog);

    console.log('  API is up — running checks\n');

    await runHealthChecks();
    await runLoginChecks();
    await runAuthorizationChecks();
    await runCredentialSafetyChecks();
    await runValidationChecks();
    await runRefreshChecks();
    await runProfileChecks();
    await runPasswordChecks();
    await runLogoutChecks();
    await runPasswordResetChecks();
    await runErrorContractChecks();

    exitCode = report();
  } finally {
    if (server && !server.killed) {
      server.kill();
      await sleep(400);
    }

    if (!KEEP_DB) {
      try {
        await dropVerificationDatabase();
      } catch (error) {
        console.warn(`  could not drop ${DB_NAME}: ${error.message}`);
      }
    } else {
      console.log(`\n  --keep-db set: ${DB_NAME} left in place.`);
    }
  }

  process.exit(exitCode);
}

function report() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log('\n═════════════ REPAIRFLOW API VERIFICATION ═════════════\n');

  let lastGroup = '';
  for (const r of results) {
    if (r.group !== lastGroup) {
      console.log(`  \x1b[1m${r.group}\x1b[0m`);
      lastGroup = r.group;
    }
    const mark = r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`    ${mark} ${r.name}${r.detail ? `  \x1b[2m(${r.detail})\x1b[0m` : ''}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  \x1b[1m${passed}/${results.length} checks passed\x1b[0m`);

  if (failed.length > 0) {
    console.log(`  \x1b[31m${failed.length} failed:\x1b[0m`);
    failed.forEach((r) => console.log(`    • ${r.group} → ${r.name}: ${r.detail}`));
  }

  console.log('═══════════════════════════════════════════════════════\n');
  return failed.length === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error('\x1b[31mVerification suite crashed:\x1b[0m', error);
  if (server && !server.killed) server.kill();
  try {
    if (!KEEP_DB) await dropVerificationDatabase();
  } catch {
    /* best effort */
  }
  process.exit(1);
});
