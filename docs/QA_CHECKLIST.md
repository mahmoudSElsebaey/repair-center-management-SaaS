# RepairFlow — QA Checklist

How to verify RepairFlow. The per-phase checklist is what is run after each phase; the release checklist is what is run before a deployment.

---

## Phase 01 — Verification record

**Environment:** Windows · Node v22.14.0 · npm 11.19.0 · MongoDB 6.0.5 (local, port 27017) · Chrome (headless)
**Result:** 124 checks passed · 0 failures — 58 API · 45 browser · 21 module-load/runtime · parity audit clean
**Reproduce:** `npm run verify` (typecheck → bilingual parity → API suite → browser suite)

### Browser suite (45 checks) — `npm run verify:browser`

Committed as `scripts/verify-browser.mjs`. It seeds its own `repairflow_browser_verify` database, builds the client with the verification API URL baked in, serves the **production bundle** through `vite preview`, and drives real headless Chrome over the DevTools Protocol. No Playwright, no Puppeteer, no dependency to install — it uses the built-in WebSocket client and the Chrome already on the machine.

| Group | Covers | Result |
| ----- | ------ | ------ |
| landing page | React mounts, 10 sections render, hero heading, CTA, `lang=ar`/`dir=rtl` default, dark theme default | ✅ 6/6 |
| 3D hero safeguards | shipped HTML preloads neither the 3D nor Three.js chunk; mobile withholds the ~820 kB chunk and mounts no canvas while the CSS fallback renders; desktop mounts the canvas and fetches the chunk on demand | ✅ 6/6 |
| theme and language | both toggles exist, theme flips `data-theme` and persists, language flips `dir` to LTR and persists | ✅ 6/6 |
| protected routes | unauthenticated `/app` redirects to `/login` and shows the form | ✅ 2/2 |
| sign-in from the form | form mounts, fields fill through the native setter path React observes, submit succeeds, redirect to `/app` | ✅ 3/3 |
| console shell | sidebar present, personalised greeting and name from the API, role shown, dashboard/inventory/reports entries, later-phase entries locked | ✅ 8/8 |
| profile screen | email, name pre-filled from the API, phone field, password section, language control, role | ✅ 6/6 |
| session persistence | token in storage, console reachable after a reload | ✅ 2/2 |
| access denial | technician signs in, admin-only staff entry correctly hidden | ✅ 3/3 |
| runtime hygiene | no uncaught console errors, no failed network requests | ✅ 2/2 |

This is the suite that exercises the flow the phase objective names: *a real user can log in through the frontend and reach a protected dashboard*. The check is not an assertion about code — it fills the actual form in a real browser and waits for the path to become `/app`.

### Defect found and fixed by the browser suite

| Severity | Defect | Cause | Fix |
| -------- | ------ | ----- | --- |
| **High — performance** | The ~820 kB Three.js bundle was downloaded by **every visitor, including phones**, before any runtime guard could decide whether the 3D scene was wanted | `vite.config.js` pinned Three.js / React Three Fiber into a named `manualChunks` group. Pinning a lazily-imported library into a named chunk makes Rollup treat it as a dependency of the importing chunk, so Vite emitted `<link rel="modulepreload">` for it in `index.html` | Removed the `three` group. Rollup now emits it as a true async chunk (`HeroScene-*.js`) that loads only on demand. Kept as a static assertion on the shipped HTML plus behavioural checks at both viewports |

Without a real browser this would have shipped silently: it is invisible to typechecking, to the API suite, and to the production build.

### API suite (58 checks) — `npm run verify:api`

Committed as `scripts/verify-api.mjs`. It seeds its own isolated `repairflow_verify` database, starts the compiled API, runs every group below, and drops the database on exit. It never touches the seeded demo tenant.

| Group | Covers | Result |
| ----- | ------ | ------ |
| health | status, `success`, `database: connected`, version | ✅ 4/4 |
| login | 200, tokens issued, role, locale, no password leak, no refresh-hash leak | ✅ 8/8 |
| authorization | `me` with token, without token (`TOKEN_MISSING`), malformed token (`TOKEN_INVALID`) | ✅ 6/6 |
| credential safety | wrong password, unknown account, **identical** message for both | ✅ 4/4 |
| validation | 400 `VALIDATION_ERROR` with per-field errors | ✅ 3/3 |
| token refresh | rotation, new token works, **rotated-away token rejected** (`REFRESH_REVOKED`) | ✅ 6/6 |
| profile | update, re-read persistence, empty update rejected | ✅ 4/4 |
| password lifecycle | change, sessions revoked, old password dead, new works, wrong current rejected, restore | ✅ 7/7 |
| logout | 200, refresh dead, access-token window pinned, re-sign-in works | ✅ 4/4 |
| password reset | no enumeration, dev token surfaced, single-use, unknown token rejected | ✅ 7/7 |
| error contract | 404 `ROUTE_NOT_FOUND`, no stack trace, always a `code`, always `success:false` | ✅ 5/5 |

### Behavior pinned by the suite

The suite deliberately locks two behaviours that are easy to change by accident:

1. **Rotated-away refresh tokens must be rejected.** This is what makes refresh-token theft detectable rather than silently tolerated.
2. **An already-issued access token survives logout until it expires.** Access tokens are stateless JWTs with a 15-minute lifetime; logout revokes the refresh token so the session cannot be renewed. Account deactivation is the exception and takes effect immediately. Documented in full at [ARCHITECTURE.md §3.7](./ARCHITECTURE.md).

### Toolchain

| Check | Result |
| ----- | ------ |
| Server `tsc --noEmit` | ✅ 0 errors |
| Client `tsc --noEmit` | ✅ 0 errors |
| Server `tsc` build to `dist/` | ✅ |
| Client `vite build` | ✅ 2719 modules |
| Entry chunk size | 143.5 kB (49.8 kB gzipped) |
| Three.js chunk | 821.7 kB, isolated and lazy — never loaded by the console |
| Seed run | ✅ 2 branches, 7 employees, all passwords bcrypt cost 12 |
| `npm run verify` at the root | ✅ typecheck both sides + i18n parity |

### Bilingual parity audit — `npm run verify:i18n`

| Check | Result |
| ----- | ------ |
| Key count matches | ✅ 392 English · 392 Arabic |
| Keys present in `ar.ts` but not `en.ts` | ✅ none |
| Keys present in `en.ts` but not `ar.ts` | ✅ none |
| Interpolation placeholders agree (`{{name}}`, `{{count}}`, `{{from}}`/`{{to}}`/`{{total}}`) | ✅ every shared key |

This runs from `scripts/check-i18n-parity.ts` using Node's built-in type stripping — no build step and no dependency. It is part of `npm run verify`, so every later phase that adds copy is checked automatically.

### Module-load and runtime smoke suite (21 checks)

Typechecking proves types and a build proves bundling; neither proves a module **executes**. This suite runs the real dev server and pulls the entire application through Vite's transform pipeline.

| Area | Checks | Result |
| ---- | ------ | ------ |
| Servers | API on :5000, Vite dev server on :5173 | ✅ 2/2 |
| Module graph | **all 65 application modules** transform with no error payload | ✅ 1/1 |
| Entry wiring | `createRoot` present, store imported, React refresh client injected | ✅ 3/3 |
| Client routing | deep links `/login`, `/app`, `/forgot-password`, and an unknown path all return the shell | ✅ 4/4 |
| Super admin semantics | sign-in via the dev proxy, `role=super_admin`, `branch=null` (spans all branches) | ✅ 3/3 |
| Session payload | `me` returns `locale` and a serialised `createdAt` | ✅ 2/2 |
| Production bundle | `vite preview` serves it, root mount present, dev entry stripped | ✅ 3/3 |
| Asset integrity | all 7 hashed assets referenced by the shell return 200 with real content | ✅ 1/1 |
| Production routing | deep link on the built bundle serves the shell | ✅ 1/1 |
| Code splitting | Three.js emitted as its own `three-*.js` chunk | ✅ 1/1 |

### API suite (28 checks) — superseded

An earlier, narrower PowerShell run of the same surface. Every one of its checks is included in the 58-check suite above, which is committed and reproducible, so that suite is the record of truth. Listed here only to explain the history.

### Full-stack integration suite (13 checks)

Verified during Phase 01 with a machine-local script (now archived outside the repository, since it hardcodes absolute paths). Retained here as an evidence record.

| Area | Checks | Result |
| ---- | ------ | ------ |
| Production build | build exit 0, `dist/index.html` emitted, root mount, hashed bundle referenced | ✅ 4/4 |
| API | listening on :5000, health responds | ✅ 1/1 |
| Dev server | Vite on :5173, SPA shell, `/src/main.tsx` injected, `dir="rtl"` default | ✅ 4/4 |
| Routing | history fallback serves the shell for `/login` | ✅ 1/1 |
| Integration | dev proxy `/api` → :5000 reaches MongoDB, sign-in through the proxy, correct role | ✅ 3/3 |

### Defect found and fixed during verification

| Defect | Cause | Fix |
| ------ | ----- | --- |
| `GET /auth/me` returned `500 MissingSchemaError: Schema hasn't been registered for model "Branch"` | The controller populated `user.branch`, but the `Branch` model was never imported into that process, and Mongoose resolves populated model names at query time | Import `../models/Branch.js` in `authController.ts` for its registration side effect, with a comment explaining why |

### Interface

| Check | Result |
| ----- | ------ |
| Landing page renders all 10 sections | ✅ |
| 3D hero loads only on desktop, no reduced-motion, in view | ✅ |
| Static CSS fallback renders on mobile and under reduced motion | ✅ |
| Language switch re-lays-out the whole document (dir, fonts, icons, alignment) | ✅ |
| Theme switch re-themes every surface via tokens | ✅ |
| Ticket codes stay LTR inside Arabic text | ✅ |
| Protected route redirects unauthenticated users to `/login`, preserving the target | ✅ |
| Wrong-role access renders an access-denied screen rather than a redirect loop | ✅ |
| Sidebar entries are filtered by role; future phases render locked | ✅ |
| Toasts appear, auto-dismiss and can be dismissed | ✅ |
| Error boundary catches a render crash instead of a blank page | ✅ |

> The interface rows were verified structurally (routing, direction, build output and rendered shell). Interactive walkthrough of each screen against a live browser session is part of the Phase 02 review.

### Known limitations at the end of Phase 01

These are expected and are addressed in later phases, not defects:

- Dashboard metrics and charts show an explicit "coming soon" state — Phase 02 supplies the data.
- Global search in the topbar is disabled — Phase 03/04.
- The notification bell is disabled — Phase 12.
- Navigation entries for later phases are visible but locked.
- Password reset emails are not sent; the token is returned in development only.

---

## Per-phase checklist

Run this after every phase, in order, before reporting completion.

### 1. Dependencies

- [ ] New packages installed on the correct side
- [ ] No unused dependency left behind
- [ ] `package.json` scripts still accurate

### 2. Run

- [ ] API starts and logs the MongoDB connection
- [ ] Client dev server starts with no build errors
- [ ] `GET /api/v1/health` reports `database: connected`

### 3. Data

- [ ] Seed updated for any new entity
- [ ] `npm run seed` runs cleanly and is idempotent on a second run
- [ ] New collections and indexes exist as intended

### 4. Feature

- [ ] Every screen added this phase is reachable and renders
- [ ] Every endpoint added this phase is consumed by a screen
- [ ] Create / read / update / delete all round-trip to MongoDB
- [ ] Validation rejects bad input with a localised message
- [ ] Authorization is enforced server-side, not only by hiding UI
- [ ] Loading, empty, error and success states exist

### 5. Bilingual and RTL

- [ ] New copy exists in both `en.ts` and `ar.ts`
- [ ] Layout is correct in RTL and LTR
- [ ] No hardcoded user-facing string in a component
- [ ] Numbers, codes and money render correctly in both directions

### 6. Quality

- [ ] `npm run typecheck` clean on both applications
- [ ] `npm run build` succeeds on the client
- [ ] Browser console has no errors or warnings introduced this phase
- [ ] No `any`, no `@ts-ignore`, no empty catch block
- [ ] Responsive at 375 px, 768 px, 1280 px and 1920 px
- [ ] Keyboard navigation reaches every interactive control
- [ ] Focus is visible

### 7. Report

- [ ] Summarise what shipped
- [ ] Show the relevant file structure
- [ ] State known limitations honestly

---

## Release checklist

Before a production deployment, run the full [DEPLOY.md](./DEPLOY.md) checklist plus everything below.

### Security

- [ ] No secret, key or connection string in the repository (`git log -p | grep -i secret`)
- [ ] `.env` files ignored; `.env.example` complete and current
- [ ] Both JWT secrets 32+ random characters and different from each other
- [ ] Password hashing at cost 12 and `select: false` on every credential field
- [ ] Refresh tokens stored hashed
- [ ] Authorization verified per endpoint, not just per route group
- [ ] File uploads restricted by MIME type and size
- [ ] Error responses leak no stack traces, driver messages or field names beyond validation
- [ ] Rate limits active on the abusable endpoints
- [ ] CORS allow-list contains only real origins

### Performance

- [ ] Bundle chunks reviewed; nothing heavy in the entry chunk
- [ ] 3D and charts still lazy
- [ ] Images served through Cloudinary with transformations
- [ ] List endpoints paginate server-side
- [ ] Queries used by new features have supporting indexes
- [ ] No N+1 query pattern in aggregates

### Accessibility

- [ ] Semantic landmarks on every page
- [ ] All form controls labelled
- [ ] Dialogs trap focus, close on Escape and restore focus
- [ ] Colour contrast meets WCAG AA in both themes
- [ ] `prefers-reduced-motion` disables non-essential motion
- [ ] Pages usable at 200% zoom
- [ ] Icon-only buttons have accessible names

### Internationalisation

- [ ] Every user-facing string present in both locales
- [ ] Arabic reads naturally — not machine-translated word order
- [ ] Dates, numbers and currency formatted per locale
- [ ] No layout overflow from longer Arabic strings

### Product

- [ ] The full workflow from intake to payment is walkable without a dead end
- [ ] Empty states offer a useful next action
- [ ] Error states offer a retry
- [ ] Destructive actions require confirmation
- [ ] Success is confirmed visibly after every mutation

---

## Regression suite

The end-to-end path that must survive every future phase:

1. Visit `/` — landing page renders in Arabic, dark theme
2. Switch to English — layout and direction flip correctly
3. Switch back to Arabic
4. Click *Start managing repairs* → `/login`
5. Sign in as `karim.mansour@repairflow.app`
6. Land on `/app` with the operations console shell
7. Confirm sidebar entries match the manager role
8. Open the account menu → `/app/profile`
9. Update the name and phone → success toast, values persisted
10. Change the interface language to English → whole app switches
11. Reload the page → session restored without a second sign-in
12. Visit `/app/settings` by URL → access denied screen, not a redirect loop
13. Sign out → session revoked, redirected to `/login`
14. Verify the redirect target is preserved when returning to `/app`

---

## Reporting template

```
PHASE NN — <name>

Status: complete | blocked

Verified
- <what was checked and the observed result>

Fixed during verification
- <issue> → <fix>

Known limitations
- <honest list, with the phase that addresses each>

Files added/changed
<tree>
```
