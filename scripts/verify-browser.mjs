/**
 * RepairFlow — browser verification suite.
 *
 * Drives a real headless Chrome instance over the DevTools Protocol to verify
 * the part of Phase 01 that typechecking and API tests cannot reach: that the
 * React application actually renders, that sign-in works from the form, that
 * the authenticated console appears, and that the protected-route and
 * language/theme behaviours are real rather than assumed.
 *
 * Everything runs against the production bundle served by `vite preview`, so it
 * tests what would actually be deployed.
 *
 * Uses only the Node standard library and the Chrome already installed on the
 * machine. No Playwright, no Puppeteer, no package to install.
 *
 * Usage:
 *   node scripts/verify-browser.mjs
 *   node scripts/verify-browser.mjs --headed      # watch it run
 *   node scripts/verify-browser.mjs --skip-build  # verify an existing client/dist
 *   node scripts/verify-browser.mjs --keep-open   # leave Chrome and the servers up
 *
 * `--skip-build` exists because esbuild's temp-file delete is denied to
 * grandchild processes on some locked-down Windows hosts. Build once in your own
 * shell with `VITE_API_URL` set, then pass `--skip-build`:
 *
 *   cd client
 *   $env:VITE_API_URL = 'http://localhost:5000/api/v1'   # bash: VITE_API_URL=… npm run build
 *   npm run build
 *   node scripts/verify-browser.mjs --skip-build
 *
 * Override the browser with `CHROME_PATH` and the build temp directory with
 * `RF_ESBUILD_TMPDIR`.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { assertFreshBuild } from './lib/build-freshness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(HERE, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const SERVER_DIR = path.join(ROOT_DIR, 'server');

const argv = process.argv.slice(2);
const HEADED = argv.includes('--headed');
const KEEP_OPEN = argv.includes('--keep-open');
/**
 * Skips the build and verifies the existing `client/dist`.
 *
 * Useful on hosts that deny esbuild's temp-file delete to a grandchild process:
 * build once in your own shell, then verify. It also avoids rebuilding when you
 * are iterating on the checks themselves.
 */
const SKIP_BUILD = argv.includes('--skip-build');

const APP_PORT = 4173;
const API_PORT = 5000;
const DEBUG_PORT = 9333;
const APP_URL = `http://localhost:${APP_PORT}`;
const API_URL = `http://localhost:${API_PORT}/api/v1`;

const VERIFY_DB = 'repairflow_browser_verify';
const MONGO_URI = `mongodb://localhost:27017/${VERIFY_DB}`;
const EMAIL = 'karim.mansour@repairflow.app';
const PASSWORD = 'RepairFlow@2026';

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const PROFILE_DIR = path.join(os.tmpdir(), 'rf-browser-profile');

/* -------------------------------------------------------------------------- */
/* Harness                                                                     */
/* -------------------------------------------------------------------------- */

const results = [];
let currentGroup = 'general';

const group = (name) => {
  currentGroup = name;
};

function check(name, ok, detail) {
  results.push({ group: currentGroup, name, ok: Boolean(ok), detail: detail ?? '' });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
  const explicit = process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* CDP client over the built-in WebSocket                                      */
/* -------------------------------------------------------------------------- */

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
        return;
      }

      if (msg.method) {
        const handlers = this.listeners.get(msg.method) ?? [];
        handlers.forEach((handler) => handler(msg.params));
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30_000);
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }
}

async function connectToPage() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${DEBUG_PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);

      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          ws.addEventListener('open', resolve, { once: true });
          ws.addEventListener('error', () => reject(new Error('WebSocket failed')), { once: true });
          setTimeout(() => reject(new Error('WebSocket open timeout')), 15_000);
        });
        return new CdpSession(ws);
      }
    } catch {
      /* Chrome is not listening yet */
    }
    await sleep(500);
  }

  throw new Error('Could not attach to a Chrome page target');
}

/* -------------------------------------------------------------------------- */
/* Page helpers                                                                */
/* -------------------------------------------------------------------------- */

/** Evaluates an expression in the page and returns its JSON value. */
async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (result.exceptionDetails) {
    const text = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(`Page exception: ${text}`);
  }

  return result.result?.value;
}

/** Polls a predicate in the page until it returns truthy or time runs out. */
async function waitFor(session, expression, { timeout = 15_000, label = expression } = {}) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      if (await evaluate(session, expression)) return true;
    } catch {
      /* the page may be mid-navigation */
    }
    await sleep(200);
  }

  throw new Error(`Timed out waiting for: ${label}`);
}

async function navigate(session, url) {
  await session.send('Page.navigate', { url });
  await waitFor(session, 'document.readyState === "complete" || document.readyState === "interactive"', {
    label: `page load of ${url}`,
  });
}

/**
 * Fills and submits the sign-in form.
 *
 * React tracks input state internally, so assigning `.value` directly is ignored.
 * The native prototype setter is invoked instead, followed by a bubbling `input`
 * event — the sequence a real keystroke produces.
 *
 * Returns a description rather than throwing, so a missing field surfaces as a
 * readable failed check instead of crashing the whole suite.
 */
async function submitLoginForm(session, email, password) {
  return evaluate(
    session,
    `(() => {
      const form = document.querySelector('form');
      if (!form) return { ok: false, reason: 'no form on the page' };

      const emailEl = form.querySelector('input[type="email"]');
      const passEl = form.querySelector('input[type="password"]');
      if (!emailEl) return { ok: false, reason: 'email field missing' };
      if (!passEl) return { ok: false, reason: 'password field missing' };

      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;

      setter.call(emailEl, ${JSON.stringify(email)});
      emailEl.dispatchEvent(new Event('input', { bubbles: true }));

      setter.call(passEl, ${JSON.stringify(password)});
      passEl.dispatchEvent(new Event('input', { bubbles: true }));

      const button = form.querySelector('button[type="submit"]');
      if (!button) return { ok: false, reason: 'submit button missing' };

      button.click();
      return { ok: true };
    })()`
  );
}

/** Waits until the sign-in form is mounted and its fields are usable. */
async function waitForLoginForm(session, timeout = 20_000) {
  await waitFor(
    session,
    `(() => {
      const form = document.querySelector('form');
      return !!form
        && !!form.querySelector('input[type="email"]')
        && !!form.querySelector('input[type="password"]')
        && !!form.querySelector('button[type="submit"]');
    })()`,
    { timeout, label: 'sign-in form to mount' }
  );
}

/* -------------------------------------------------------------------------- */
/* Processes                                                                   */
/* -------------------------------------------------------------------------- */

function startProcess(command, args, options) {
  return spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
}

function collect(child) {
  const log = [];
  child.stdout?.on('data', (c) => log.push(String(c)));
  child.stderr?.on('data', (c) => log.push(String(c)));
  return log;
}

async function seedDatabase() {
  await new Promise((resolve, reject) => {
    const child = startProcess(
      process.execPath,
      [path.join(SERVER_DIR, 'dist', 'seed', 'seed.js'), '--fresh'],
      { cwd: SERVER_DIR, env: { ...process.env, MONGODB_URI: MONGO_URI, NODE_ENV: 'development' } }
    );

    const log = collect(child);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      console.error(log.join('').split('\n').slice(-20).join('\n'));
      reject(new Error(`seed exited with code ${code}`));
    });
  });
}

/**
 * Resolves a temp directory that esbuild can write to *and* delete from.
 *
 * esbuild's Go binary writes a temp file and then removes it. On hosts where the
 * system temp directory denies that removal the build fails with
 * `[vite:esbuild-transpile] remove … Access is denied`. Prefer a directory
 * inside the repository; fall back to the system temp directory.
 */
function resolveBuildTempDir() {
  if (process.env.RF_ESBUILD_TMPDIR) return process.env.RF_ESBUILD_TMPDIR;

  const candidates = [
    path.join(path.resolve(ROOT_DIR, '..'), '.rf-cache', 'esbuild'),
    path.join(ROOT_DIR, '.cache', 'esbuild'),
  ];

  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch {
      /* not writable — try the next candidate */
    }
  }

  return os.tmpdir();
}

/**
 * Builds the client with the verification API URL baked in.
 *
 * `VITE_API_URL` is a build-time constant — Vite inlines it, so it cannot be
 * overridden at runtime. The production bundle is therefore rebuilt here rather
 * than reusing whatever `dist/` happens to contain.
 */
async function buildClient() {
  const tempDir = resolveBuildTempDir();
  console.log(`  building client with VITE_API_URL=${API_URL} …`);
  console.log(`  esbuild temp: ${tempDir}`);

  await new Promise((resolve, reject) => {
    const child = startProcess(
      process.execPath,
      [path.join(CLIENT_DIR, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
      {
        cwd: CLIENT_DIR,
        env: {
          ...process.env,
          VITE_API_URL: API_URL,
          // All three: esbuild's Go binary and its JS wrapper read different ones.
          TMPDIR: tempDir,
          TEMP: tempDir,
          TMP: tempDir,
        },
      }
    );

    const log = collect(child);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      console.error(log.join('').split('\n').slice(-25).join('\n'));
      reject(new Error(`client build exited with code ${code}`));
    });
  });
}

async function dropDatabase() {
  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(SERVER_DIR, 'package.json'));
  const mongoose = require('mongoose');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8_000 });
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}

async function waitForHttp(url, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(600);
  }
  return false;
}

/**
 * Confirms the API answering on this port is the one this suite started.
 *
 * A child that cannot bind exits within a second, so a surviving process means
 * we own the port. Without this, a server left running from an earlier session
 * would be tested instead — silently, and against the wrong code.
 */
async function assertApiIsOurs(child, log, port) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (child.exitCode !== null) {
      console.error(`\n\x1b[31m  The API failed to start (exit code ${child.exitCode}).\x1b[0m\n`);
      console.error(log.join('').split('\n').slice(-20).join('\n'));
      process.exit(2);
    }
    await sleep(250);
  }

  const health = await (await fetch(`${API_URL}/health`)).json().catch(() => null);

  if (health?.message !== 'RepairFlow API') {
    console.error(
      `\n\x1b[31m  Something else is answering on port ${port}.\x1b[0m\n\n` +
        `  Received: ${JSON.stringify(health).slice(0, 120)}\n` +
        '  Stop it before running this suite.\n'
    );
    process.exit(2);
  }
}

/** Same guard for the static preview server. */
async function assertPreviewIsOurs(child, log, port) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (child.exitCode !== null) {
      console.error(
        `\n\x1b[31m  The preview server failed to start (exit code ${child.exitCode}).\x1b[0m\n`
      );
      console.error(log.join('').split('\n').slice(-20).join('\n'));
      process.exit(2);
    }
    await sleep(250);
  }

  const html = await (await fetch(APP_URL)).text().catch(() => '');

  if (!html.includes('id="root"')) {
    console.error(
      `\n\x1b[31m  Something else is answering on port ${port}.\x1b[0m\n\n` +
        '  The response is not the RepairFlow app shell. Stop it before running\n' +
        '  this suite.\n'
    );
    process.exit(2);
  }
}

/* -------------------------------------------------------------------------- */
/* Checks                                                                      */
/* -------------------------------------------------------------------------- */

let consoleErrors = [];
let failedRequests = [];
/** URLs Chrome actually fetched — used to prove lazy chunks are/aren't loaded. */
const requestedUrls = [];

/**
 * True when the 3D scene's chunk has been downloaded by the page.
 *
 * The chunk is named after its entry module (`HeroScene-*.js`) and contains
 * Three.js plus React Three Fiber. It is a plain async chunk, so it must appear
 * only when the scene is actually wanted.
 */
const threeChunkRequested = () => requestedUrls.some((url) => /HeroScene-[^/]*\.js$/.test(url));

/** True when the app has mounted a WebGL canvas. */
const threeCanvasMounted = async (session) => evaluate(session, '!!document.querySelector("canvas")');

async function runChecks(session) {
  /* ---------------------------------------------------------------- landing */
  group('landing page');

  await navigate(session, `${APP_URL}/`);

  await waitFor(session, 'document.querySelectorAll("section").length >= 8', {
    label: 'landing sections to render',
  });

  const landing = await evaluate(
    session,
    `(() => {
      const html = document.documentElement;
      return {
        lang: html.lang,
        dir: html.dir,
        theme: html.getAttribute('data-theme'),
        sections: document.querySelectorAll('section').length,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        hasCta: !!Array.from(document.querySelectorAll('button, a')).find(
          (el) => /Start managing repairs|ابدأ إدارة الصيانة/i.test(el.textContent || '')
        ),
        hasTechGrid: !!document.querySelector('.rf-tech-grid'),
        rootChildren: document.getElementById('root')?.children.length ?? 0,
      };
    })()`
  );

  check('React mounted and rendered', landing.rootChildren > 0, `root children=${landing.rootChildren}`);
  check('all landing sections present', landing.sections >= 8, `${landing.sections} sections`);
  check('hero heading rendered', landing.h1.length > 10, `"${landing.h1.slice(0, 40)}…"`);
  check('call to action present', landing.hasCta, 'CTA found');
  check('document defaults to Arabic + RTL', landing.lang === 'ar' && landing.dir === 'rtl',
    `lang=${landing.lang} dir=${landing.dir}`);
  check('dark theme applied by default', landing.theme === 'dark', `data-theme=${landing.theme}`);

  /* ---------------------------------------------------------------- 3D hero */
  group('3D hero (performance safeguards)');

  /**
   * The 3D core is expensive, so it must load only on a desktop-sized viewport,
   * only when motion is welcome, and only once the hero is in view.
   *
   * First a static guarantee about the artifact itself: the shipped HTML must
   * not module-preload the 3D chunk. That is the failure mode this originally
   * had — pinning Three.js into a named manual chunk made Rollup treat it as a
   * dependency of the entry, so every visitor downloaded ~820 kB before any
   * runtime guard could run. Then the behavioural checks below.
   */
  const shippedHtml = await (await fetch(`${APP_URL}/`)).text();
  const preloadedHrefs = [...shippedHtml.matchAll(/<link[^>]+modulepreload[^>]+href="([^"]+)"/g)]
    .map((match) => match[1]);

  check('shipped HTML does not module-preload the 3D chunk',
    !preloadedHrefs.some((href) => /HeroScene-/.test(href)),
    preloadedHrefs.length ? `${preloadedHrefs.length} preloaded chunks, none is the 3D scene` : 'none preloaded');
  check('shipped HTML does not preload Three.js',
    !preloadedHrefs.some((href) => /three-/.test(href)),
    'no three-*.js in modulepreload');

  // --- mobile viewport: emulates a phone, touch included ---------------
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  requestedUrls.length = 0;

  await navigate(session, `${APP_URL}/`);
  await waitFor(session, 'document.querySelectorAll("section").length >= 8', {
    label: 'landing render on mobile',
  });
  // Give any lazy import a chance to fire before declaring it absent.
  await sleep(2500);

  check('mobile: 3D bundle never downloaded', !threeChunkRequested(),
    threeChunkRequested() ? '3D chunk requested on a phone viewport' : '~820 kB lazy chunk withheld');
  check('mobile: no WebGL canvas mounted', !(await threeCanvasMounted(session)),
    'CSS fallback used instead');
  check('mobile: static fallback still renders the hero',
    await evaluate(session, '!!document.querySelector(".rf-tech-grid")'),
    'fallback composition present');

  // --- desktop viewport: the scene is expected -------------------------
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  requestedUrls.length = 0;

  await navigate(session, `${APP_URL}/`);
  await waitFor(session, 'document.querySelectorAll("section").length >= 8', {
    label: 'landing render on desktop',
  });

  try {
    await waitFor(session, '!!document.querySelector("canvas")', {
      timeout: 20_000,
      label: 'WebGL canvas to mount',
    });
    check('desktop: WebGL canvas mounted', true, '3D core active');
  } catch {
    check('desktop: WebGL canvas mounted', false, 'canvas never appeared');
  }

  check('desktop: 3D bundle loaded on demand', threeChunkRequested(),
    threeChunkRequested() ? 'HeroScene-*.js fetched only once wanted' : 'chunk not requested');

  // Back to a neutral desktop size for the remaining checks.
  await session.send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);

  /* ---------------------------------------------------------------- theme + lang */
  group('theme and language switching');

  // Toggle the theme and confirm the token layer responds.
  const themeToggled = await evaluate(
    session,
    `(() => {
      const before = document.documentElement.getAttribute('data-theme');
      const btn = document.querySelector('button[aria-label*="theme" i], button[aria-label*="المظهر"]');
      if (!btn) return { found: false };
      btn.click();
      return { found: true, before };
    })()`
  );

  check('theme toggle control exists', themeToggled.found, 'found');

  if (themeToggled.found) {
    await sleep(400);
    const after = await evaluate(session, 'document.documentElement.getAttribute("data-theme")');
    check('theme toggle switches the document theme', after !== themeToggled.before,
      `${themeToggled.before} → ${after}`);
    check('theme choice persisted to storage',
      (await evaluate(session, 'localStorage.getItem("repairflow:theme")')) === after,
      'localStorage matches');

    // Switch back so later checks run in the default theme.
    await evaluate(
      session,
      `document.querySelector('button[aria-label*="theme" i], button[aria-label*="المظهر"]')?.click()`
    );
    await sleep(300);
  }

  const langToggled = await evaluate(
    session,
    `(() => {
      const btn = document.querySelector('button[aria-label*="language" i], button[aria-label*="اللغة"]');
      if (!btn) return { found: false };
      btn.click();
      return { found: true };
    })()`
  );

  check('language toggle control exists', langToggled.found, 'found');

  if (langToggled.found) {
    await sleep(700);
    const afterLang = await evaluate(
      session,
      `({ lang: document.documentElement.lang, dir: document.documentElement.dir })`
    );
    check('language switch flips direction to LTR', afterLang.lang === 'en' && afterLang.dir === 'ltr',
      `lang=${afterLang.lang} dir=${afterLang.dir}`);
    check('language choice persisted',
      (await evaluate(session, 'localStorage.getItem("repairflow:lang")')) === 'en',
      'localStorage matches');
  }

  /* ---------------------------------------------------------------- route guard */
  group('protected routes');

  // Clear any session, then try to reach the console directly.
  await evaluate(session, 'localStorage.clear()');
  await navigate(session, `${APP_URL}/app`);
  await sleep(1200);

  const guarded = await evaluate(
    session,
    `({ path: location.pathname, search: location.search, hasLoginHeading: /sign in|تسجيل الدخول/i.test(document.body.innerText) })`
  );

  check('unauthenticated /app redirects to /login', guarded.path === '/login', `path=${guarded.path}`);
  check('sign-in form is shown after redirect', guarded.hasLoginHeading, 'heading matched');

  /* ---------------------------------------------------------------- login */
  group('sign-in from the form');

  let formReady = true;
  try {
    await waitForLoginForm(session);
  } catch {
    formReady = false;
  }
  check('sign-in form mounted with usable fields', formReady,
    formReady ? 'email, password and submit present' : 'form did not mount');

  if (formReady) {
    const filled = await submitLoginForm(session, EMAIL, PASSWORD);
    check('sign-in form filled and submitted', filled.ok,
      filled.ok ? 'submitted' : filled.reason);

    // The redirect to the console is the proof the whole slice works.
    try {
      await waitFor(session, 'location.pathname === "/app"', {
        timeout: 25_000,
        label: 'redirect to /app',
      });
      check('credentials accepted and redirected to /app', true, 'path=/app');
    } catch {
      const state = await evaluate(
        session,
        `({ path: location.pathname, text: document.body.innerText.slice(0, 300) })`
      );
      check('credentials accepted and redirected to /app', false,
        `path=${state.path} body="${state.text.replace(/\s+/g, ' ').slice(0, 120)}"`);
    }
  }

  /* ---------------------------------------------------------------- console shell */
  group('operations console shell');

  await waitFor(session, '!!document.querySelector("header")', { label: 'console header' });
  await sleep(800);

  const shell = await evaluate(
    session,
    `(() => {
      const text = document.body.innerText;
      return {
        path: location.pathname,
        hasSidebar: !!document.querySelector('aside'),
        greeting: /Welcome back|أهلاً بعودتك/i.test(text),
        roleShown: /Branch Manager|مدير فرع/i.test(text),
        navDashboard: /Dashboard|لوحة التشغيل/i.test(text),
        navRepairs: /Repair Tickets|تذاكر الصيانة/i.test(text),
        navInventory: /Inventory|المخزون/i.test(text),
        navReports: /Reports|التقارير/i.test(text),
        lockedShown: /Coming soon|قريباً/i.test(text),
        userName: /Karim Fathy Mansour/.test(text),
      };
    })()`
  );

  check('console shell rendered with a sidebar', shell.hasSidebar, 'aside present');
  check('personalised greeting from the API', shell.greeting, 'greeting matched');
  check('signed-in role displayed', shell.roleShown, 'Branch Manager');
  check('sidebar shows the dashboard entry', shell.navDashboard, 'present');
  check('sidebar shows phase-04 entries as locked', shell.navRepairs && shell.lockedShown,
    'locked entries visible');
  check('sidebar shows inventory entry for this role', shell.navInventory, 'present');
  check('sidebar shows reports entry for this role', shell.navReports, 'present');
  check('user name from the API displayed', shell.userName, 'name matched');

  /* ---------------------------------------------------------------- profile */
  group('profile screen');

  await navigate(session, `${APP_URL}/app/profile`);
  await waitFor(session, 'document.body.innerText.length > 200', { label: 'profile render' });
  await sleep(900);

  const profile = await evaluate(
    session,
    `(() => {
      const text = document.body.innerText;
      const nameInput = document.querySelector('input[name="name"]');
      return {
        email: text.includes(${JSON.stringify(EMAIL)}),
        hasNameField: !!nameInput,
        nameValue: nameInput?.value ?? '',
        hasPhoneField: !!document.querySelector('input[name="phone"]'),
        hasPasswordSection: !!document.querySelector('input[type="password"]'),
        hasLanguageSelect: !!document.querySelector('select'),
        hasRoleBadge: /Branch Manager|مدير فرع/i.test(text),
      };
    })()`
  );

  check('account email displayed', profile.email, EMAIL);
  check('name pre-filled from the API', profile.nameValue === 'Karim Fathy Mansour',
    `value="${profile.nameValue}"`);
  check('phone field present', profile.hasPhoneField, 'present');
  check('password change section present', profile.hasPasswordSection, 'present');
  check('language preference control present', profile.hasLanguageSelect, 'present');
  check('role displayed', profile.hasRoleBadge, 'Branch Manager');

  /* ---------------------------------------------------------------- session restore */
  group('session persistence');

  await navigate(session, `${APP_URL}/app`);
  await sleep(1500);

  const restored = await evaluate(
    session,
    `({ path: location.pathname, authed: !!localStorage.getItem('repairflow:session'),
       hasSidebar: !!document.querySelector('aside') })`
  );

  check('session token persisted in storage', restored.authed, 'repairflow:session present');
  check('console reachable after a reload', restored.path === '/app' && restored.hasSidebar,
    `path=${restored.path}`);

  /* ---------------------------------------------------------------- access denied */
  group('access denial');

  // A technician must not see an admin-only area. Sign out, sign in as one.
  await evaluate(session, 'localStorage.clear()');
  await navigate(session, `${APP_URL}/login`);

  let techFormReady = true;
  try {
    await waitForLoginForm(session);
  } catch {
    techFormReady = false;
  }

  if (!techFormReady) {
    check('technician signs in successfully', false, 'login form never mounted');
  } else {
    const techFilled = await submitLoginForm(session, 'youssef.ragab@repairflow.app', PASSWORD);
    check('technician credentials submitted', techFilled.ok,
      techFilled.ok ? 'submitted' : techFilled.reason);

    try {
      await waitFor(session, 'location.pathname === "/app"', {
        timeout: 25_000,
        label: 'technician login',
      });
      const hasAdminNav = await evaluate(
        session,
        `/Staff & Permissions|الموظفون والصلاحيات/i.test(document.body.innerText)`
      );
      check('technician signs in successfully', true, 'reached /app');
      check('technician does not see the admin-only staff entry', !hasAdminNav,
        hasAdminNav ? 'admin nav visible — permission leak' : 'correctly hidden');
    } catch (error) {
      check('technician signs in successfully', false, error.message);
    }
  }

  /* ---------------------------------------------------------------- console hygiene */
  group('runtime hygiene');

  const fatal = consoleErrors.filter(
    (e) => !/favicon|Download the React DevTools|ResizeObserver loop/i.test(e)
  );
  check('no uncaught console errors', fatal.length === 0,
    fatal.length === 0 ? 'clean' : fatal.slice(0, 3).join(' | '));

  const fatalRequests = failedRequests.filter(
    (r) => !/favicon|\.map$/.test(r)
  );
  check('no failed network requests', fatalRequests.length === 0,
    fatalRequests.length === 0 ? 'clean' : fatalRequests.slice(0, 3).join(' | '));
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

let chrome;
let api;
let preview;

async function main() {
  console.log('\n\x1b[36m╭──────────────────────────────────────────────────╮');
  console.log('│  RepairFlow — real-browser verification          │');
  console.log('╰──────────────────────────────────────────────────╯\x1b[0m');

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('  No Chrome or Edge installation found. Set CHROME_PATH to override.\n');
    process.exit(2);
  }
  console.log(`  browser  : ${path.basename(chromePath)}`);
  console.log(`  app      : ${APP_URL} (production bundle)`);
  console.log(`  database : ${MONGO_URI}\n`);

  if (existsSync(PROFILE_DIR)) rmSync(PROFILE_DIR, { recursive: true, force: true });
  mkdirSync(PROFILE_DIR, { recursive: true });

  let exitCode = 1;

  try {
    // ---- refuse to verify a stale server build --------------------------
    assertFreshBuild([
      {
        name: 'server',
        sourceDir: path.join(SERVER_DIR, 'src'),
        outputDir: path.join(SERVER_DIR, 'dist'),
        extensions: ['.ts'],
      },
    ]);

    // ---- data -----------------------------------------------------------
    await seedDatabase();

    // ---- build the bundle the browser will actually run ------------------
    if (SKIP_BUILD) {
      const indexHtml = path.join(CLIENT_DIR, 'dist', 'index.html');
      if (!existsSync(indexHtml)) {
        console.error(
          `\n  --skip-build was passed but no build exists at ${indexHtml}\n` +
            '  Build it first:\n' +
            '    cd client && VITE_API_URL=http://localhost:5000/api/v1 npm run build\n'
        );
        process.exit(2);
      }

      // With --skip-build the client bundle is taken as given, so it must be
      // checked for staleness — otherwise the browser suite would happily
      // verify a revision that no longer exists in the source.
      assertFreshBuild([
        {
          name: 'client',
          sourceDir: path.join(CLIENT_DIR, 'src'),
          outputDir: path.join(CLIENT_DIR, 'dist', 'assets'),
          extensions: ['.ts', '.tsx', '.css'],
        },
      ]);

      console.log('  using the existing client/dist build (--skip-build)');
    } else {
      await buildClient();
    }

    // ---- API ------------------------------------------------------------
    console.log('  starting API …');
    api = startProcess(process.execPath, [path.join(SERVER_DIR, 'dist', 'server.js')], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        MONGODB_URI: MONGO_URI,
        PORT: String(API_PORT),
        NODE_ENV: 'development',
        // The production bundle is served from the preview origin, so CORS
        // must allow it — this is exactly what a cross-origin deployment does.
        CLIENT_URL: APP_URL,
      },
    });
    const apiLog = collect(api);

    if (!(await waitForHttp(`${API_URL}/health`))) {
      console.error(apiLog.join('').split('\n').slice(-20).join('\n'));
      throw new Error('API did not start');
    }
    await assertApiIsOurs(api, apiLog, API_PORT);

    // ---- production bundle ---------------------------------------------
    console.log('  starting vite preview …');
    preview = startProcess(
      process.execPath,
      [path.join(CLIENT_DIR, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview',
       '--port', String(APP_PORT), '--strictPort'],
      { cwd: CLIENT_DIR, env: { ...process.env } }
    );
    const previewLog = collect(preview);

    if (!(await waitForHttp(APP_URL))) {
      console.error(previewLog.join('').split('\n').slice(-20).join('\n'));
      throw new Error('preview server did not start');
    }
    await assertPreviewIsOurs(preview, previewLog, APP_PORT);

    // ---- browser --------------------------------------------------------
    console.log('  launching headless Chrome …\n');
    chrome = startProcess(
      chromePath,
      [
        HEADED ? '--new-window' : '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-networking',
        '--window-size=1440,900',
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${PROFILE_DIR}`,
        'about:blank',
      ],
      { cwd: ROOT_DIR }
    );
    collect(chrome);

    const session = await connectToPage();

    // Instrument before the app loads.
    await session.send('Runtime.enable');
    await session.send('Page.enable');
    await session.send('Log.enable');
    await session.send('Network.enable');

    session.on('Runtime.exceptionThrown', (params) => {
      const text =
        params?.exceptionDetails?.exception?.description ??
        params?.exceptionDetails?.text ??
        'unknown exception';
      consoleErrors.push(text.split('\n')[0]);
    });

    session.on('Runtime.consoleAPICalled', (params) => {
      if (params?.type === 'error') {
        consoleErrors.push(
          (params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200)
        );
      }
    });

    session.on('Log.entryAdded', (params) => {
      if (params?.entry?.level === 'error') consoleErrors.push(params.entry.text ?? '');
    });

    session.on('Network.loadingFailed', (params) => {
      if (!params?.canceled) failedRequests.push(params?.errorText ?? 'unknown');
    });

    session.on('Network.requestWillBeSent', (params) => {
      if (params?.request?.url) requestedUrls.push(params.request.url);
    });

    session.on('Network.responseReceived', (params) => {
      const status = params?.response?.status ?? 0;
      if (status >= 500) failedRequests.push(`${status} ${params.response.url}`);
    });

    await runChecks(session);

    exitCode = report();
  } finally {
    if (!KEEP_OPEN) {
      for (const child of [chrome, preview, api]) {
        if (child && !child.killed) child.kill();
      }
      await sleep(600);
      if (existsSync(PROFILE_DIR)) {
        try {
          rmSync(PROFILE_DIR, { recursive: true, force: true });
        } catch {
          /* profile may still be locked briefly */
        }
      }
    }

    try {
      await dropDatabase();
    } catch (error) {
      console.warn(`  could not drop ${VERIFY_DB}: ${error.message}`);
    }
  }

  process.exit(exitCode);
}

function report() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log('\n════════════ REPAIRFLOW BROWSER VERIFICATION ════════════\n');

  let lastGroup = '';
  for (const r of results) {
    if (r.group !== lastGroup) {
      console.log(`  \x1b[1m${r.group}\x1b[0m`);
      lastGroup = r.group;
    }
    const mark = r.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`    ${mark} ${r.name}${r.detail ? `  \x1b[2m(${r.detail})\x1b[0m` : ''}`);
  }

  console.log('\n═════════════════════════════════════════════════════════');
  console.log(`  \x1b[1m${passed}/${results.length} checks passed\x1b[0m`);

  if (failed.length > 0) {
    console.log(`  \x1b[31m${failed.length} failed:\x1b[0m`);
    failed.forEach((r) => console.log(`    • ${r.group} → ${r.name}: ${r.detail}`));
  }
  console.log('═════════════════════════════════════════════════════════\n');

  return failed.length === 0 ? 0 : 1;
}

main().catch(async (error) => {
  console.error('\x1b[31mBrowser suite crashed:\x1b[0m', error?.message ?? error);
  for (const child of [chrome, preview, api]) {
    if (child && !child.killed) child.kill();
  }
  process.exit(1);
});
