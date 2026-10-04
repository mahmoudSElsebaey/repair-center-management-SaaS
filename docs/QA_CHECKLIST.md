## Phase 03 — Verification record

**Result:** 68 API checks · 48 browser checks · 610-key parity audit · typecheck clean on both applications

### What shipped

*Server* — `Customer` and `Device` models; full CRUD with branch scoping applied in the query (never by filtering the response); server-side search spanning name, code, email and formatted phone digits; type and condition filters; whitelisted sorting; pagination; soft delete that archives a customer together with their devices. Device unlock codes are `select: false` and reachable only from the single-device endpoint.

*Client* — reusable `DataTable` (search, filters, sorting, pagination, row actions, bulk-selection ready), `Select`/`Textarea` form fields, customer list with archive toggle, customer detail with their device history, device list with type and condition filters, device detail, and register/edit dialogs for both. The dashboard's customer and device tiles are now live.

### Defects found and fixed

| Severity | Defect | Cause | Fix |
| -------- | ------ | ----- | --- |
| **High — data loss on screen** | The owning customer was `undefined` on every device list and detail response, silently dropping the owner column and the owner panel | The controller read the populated reference through Mongoose's `document.populated(path)` accessor, which returned `undefined` here. Because the result was cast through `unknown`, TypeScript could not catch it | Declared the populated shape explicitly and read `device.customer` directly, typed via `populate<{ customer: PopulatedCustomerRef \| null }>` |
| Medium — reserved-name collision | The device model field could not be named `model` | Mongoose reserves `Document.model` for the registered-model accessor, so declaring it shadowed that method with an incompatible type | Stored as `modelName`, translated at the controller boundary by a single `toStorageFields` helper, and still exposed as `model` on the wire |

### Suite correctness fix

The browser suite asserted "no unhandled console errors" while a role-guarded call returned **403** — which Chrome logs as a console error even though the application handles it deliberately. Worse, the assertion evaluated before the response posted, so it passed for the wrong reason. The suite now classifies 403s on role-guarded endpoints as expected, **requires** that at least one such 403 was observed (so the classification is exercised rather than assumed), and asserts from the DOM that a technician sees the access-denied dashboard. A real permission leak now fails three separate checks instead of hiding behind a timing race.

---
# RepairFlow â€” QA Checklist

How to verify RepairFlow. The per-phase checklist is what is run after each phase; the release checklist is what is run before a deployment.

---

## Phase 02 â€” Verification record

**Result:** 68 API checks Â· 45 browser checks Â· 481-key parity audit Â· typecheck clean on both applications

### What shipped

*Server* â€” `ActivityLog`, `AppNotification` models; `services/events.ts` (`recordActivity`, `notify`, `notifyRoles`) as fire-and-forget side effects; `GET /reports/dashboard`, `GET /activity`, and the notification endpoints (`GET /notifications`, `GET /notifications/summary`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`); shared pagination/sort/escape helpers; auth events now write real audit entries.

*Client* â€” dashboard rebuilt on live data (stat tiles, activity-over-time area chart, team-by-role bars, headcount-by-branch radial, recent-activity timeline), notifications page with unread filter, audit-trail page with category filters and pagination, and a working topbar notification bell replacing the disabled placeholder. Recharts, already a dependency, is now used.

### The dashboard is honest about what does not exist yet

Repair, customer and inventory figures are `null` until their phases create those collections. The API reports a `sections` map, and the client renders "Not tracked yet" rather than a fabricated `0` â€” a repair centre reading `0` when the truth is "not tracked" would draw the wrong conclusion. The panels that depend on later phases name the phase that delivers them. As Phase 03 and 04 land, the same page picks the values up with no rewrite.

### Security defect found and fixed

| Severity | Defect | Cause | Fix |
| -------- | ------ | ----- | --- |
| **High â€” authentication** | Refresh-token rotation was a no-op within the same second: the "rotated-away" token remained valid, so stolen-token detection silently did nothing | `jwt.sign` sets `iat` at one-second resolution, so two tokens signed for the same subject in the same second are byte-identical. Rotation returned the same string, `user.refreshToken` compared equal to itself, and `REFRESH_REVOKED` never fired | Added a random `jti` to every issued token, plus an explicit `typ` claim (`access`/`refresh`) so an access token can never be accepted as a refresh token even if both secrets were set to the same value |

**How it was found.** The API suite failed intermittently on `rotated-away token rejected`. Rather than treat it as flakiness, a focused probe replayed the login â†’ refresh â†’ reuse-old-token cycle six times and showed `reuse=200`, `sameToken=true` on every cycle. The suite had been passing only when login and refresh happened to straddle a second boundary.

**Regression guard.** The suite now exercises rotation **twice back-to-back**, so the same-second case is the normal case, and asserts that both the refresh and access tokens differ from the ones they replaced. Two further checks failed immediately on the second round â€” the access token was also identical â€” which is how the second half of the defect surfaced.

### Suite reliability fix

The suite previously reported a confusing pair of failures in an unrelated area because a server left running from an earlier session held port 5000: the suite's own child died with `EADDRINUSE`, and its health check cheerfully talked to the **stale** server. A port probe proved unreliable here (Windows allows a `127.0.0.1` bind alongside a `0.0.0.0` listener), so both suites now verify that the process **they spawned** is still alive and that the responder identifies itself as RepairFlow. Exit code `2` when it does not.

---

## Phase 01 â€” Verification record

**Environment:** Windows Â· Node v22.14.0 Â· npm 11.19.0 Â· MongoDB 6.0.5 (local, port 27017) Â· Chrome (headless)
**Result:** 124 checks passed Â· 0 failures â€” 58 API Â· 45 browser Â· 21 module-load/runtime Â· parity audit clean
**Reproduce:** `npm run verify` (typecheck â†’ bilingual parity â†’ API suite â†’ browser suite)

### Browser suite (45 checks) â€” `npm run verify:browser`

Committed as `scripts/verify-browser.mjs`. It seeds its own `repairflow_browser_verify` database, builds the client with the verification API URL baked in, serves the **production bundle** through `vite preview`, and drives real headless Chrome over the DevTools Protocol. No Playwright, no Puppeteer, no dependency to install â€” it uses the built-in WebSocket client and the Chrome already on the machine.

| Group | Covers | Result |
| ----- | ------ | ------ |
| landing page | React mounts, 10 sections render, hero heading, CTA, `lang=ar`/`dir=rtl` default, dark theme default | âœ… 6/6 |
| 3D hero safeguards | shipped HTML preloads neither the 3D nor Three.js chunk; mobile withholds the ~820 kB chunk and mounts no canvas while the CSS fallback renders; desktop mounts the canvas and fetches the chunk on demand | âœ… 6/6 |
| theme and language | both toggles exist, theme flips `data-theme` and persists, language flips `dir` to LTR and persists | âœ… 6/6 |
| protected routes | unauthenticated `/app` redirects to `/login` and shows the form | âœ… 2/2 |
| sign-in from the form | form mounts, fields fill through the native setter path React observes, submit succeeds, redirect to `/app` | âœ… 3/3 |
| console shell | sidebar present, personalised greeting and name from the API, role shown, dashboard/inventory/reports entries, later-phase entries locked | âœ… 8/8 |
| profile screen | email, name pre-filled from the API, phone field, password section, language control, role | âœ… 6/6 |
| session persistence | token in storage, console reachable after a reload | âœ… 2/2 |
| access denial | technician signs in, admin-only staff entry correctly hidden | âœ… 3/3 |
| runtime hygiene | no uncaught console errors, no failed network requests | âœ… 2/2 |

This is the suite that exercises the flow the phase objective names: *a real user can log in through the frontend and reach a protected dashboard*. The check is not an assertion about code â€” it fills the actual form in a real browser and waits for the path to become `/app`.

### Build freshness guard

Both suites refuse to run against a stale build. `scripts/lib/build-freshness.mjs` compares the newest source timestamp against the oldest emitted artifact and exits with code `2` when the source is newer:

```
  Stale build detected â€” refusing to verify.
    â€¢ server: source is newer than the build by 2855s â€” rebuild before verifying,
      otherwise this suite tests the previous revision
```

This matters more than it looks. Both suites execute compiled output â€” `server/dist` and `client/dist` â€” so without the guard a forgotten rebuild produces a **green result describing code that no longer exists**. It is the most dangerous kind of passing check, and the failure mode would appear exactly during the phases where verification matters most.

The guard fires for `verify-api` and for `verify-browser --skip-build`. The default `verify-browser` builds the client itself, so it is fresh by construction; `verify-api` is wrapped by `npm run verify:api`, which builds the server first.

### Defect found and fixed by the browser suite

| Severity | Defect | Cause | Fix |
| -------- | ------ | ----- | --- |
| **High â€” performance** | The ~820 kB Three.js bundle was downloaded by **every visitor, including phones**, before any runtime guard could decide whether the 3D scene was wanted | `vite.config.js` pinned Three.js / React Three Fiber into a named `manualChunks` group. Pinning a lazily-imported library into a named chunk makes Rollup treat it as a dependency of the importing chunk, so Vite emitted `<link rel="modulepreload">` for it in `index.html` | Removed the `three` group. Rollup now emits it as a true async chunk (`HeroScene-*.js`) that loads only on demand. Kept as a static assertion on the shipped HTML plus behavioural checks at both viewports |

Without a real browser this would have shipped silently: it is invisible to typechecking, to the API suite, and to the production build.

### API suite (58 checks) â€” `npm run verify:api`

Committed as `scripts/verify-api.mjs`. It seeds its own isolated `repairflow_verify` database, starts the compiled API, runs every group below, and drops the database on exit. It never touches the seeded demo tenant.

| Group | Covers | Result |
| ----- | ------ | ------ |
| health | status, `success`, `database: connected`, version | âœ… 4/4 |
| login | 200, tokens issued, role, locale, no password leak, no refresh-hash leak | âœ… 8/8 |
| authorization | `me` with token, without token (`TOKEN_MISSING`), malformed token (`TOKEN_INVALID`) | âœ… 6/6 |
| credential safety | wrong password, unknown account, **identical** message for both | âœ… 4/4 |
| validation | 400 `VALIDATION_ERROR` with per-field errors | âœ… 3/3 |
| token refresh | rotation, new token works, **rotated-away token rejected** (`REFRESH_REVOKED`) | âœ… 6/6 |
| profile | update, re-read persistence, empty update rejected | âœ… 4/4 |
| password lifecycle | change, sessions revoked, old password dead, new works, wrong current rejected, restore | âœ… 7/7 |
| logout | 200, refresh dead, access-token window pinned, re-sign-in works | âœ… 4/4 |
| password reset | no enumeration, dev token surfaced, single-use, unknown token rejected | âœ… 7/7 |
| error contract | 404 `ROUTE_NOT_FOUND`, no stack trace, always a `code`, always `success:false` | âœ… 5/5 |

### Behavior pinned by the suite

The suite deliberately locks two behaviours that are easy to change by accident:

1. **Rotated-away refresh tokens must be rejected.** This is what makes refresh-token theft detectable rather than silently tolerated.
2. **An already-issued access token survives logout until it expires.** Access tokens are stateless JWTs with a 15-minute lifetime; logout revokes the refresh token so the session cannot be renewed. Account deactivation is the exception and takes effect immediately. Documented in full at [ARCHITECTURE.md Â§3.7](./ARCHITECTURE.md).

### Toolchain

| Check | Result |
| ----- | ------ |
| Server `tsc --noEmit` | âœ… 0 errors |
| Client `tsc --noEmit` | âœ… 0 errors |
| Server `tsc` build to `dist/` | âœ… |
| Client `vite build` | âœ… 2719 modules |
| Entry chunk size | 143.5 kB (49.8 kB gzipped) |
| Three.js chunk | 821.7 kB, isolated and lazy â€” never loaded by the console |
| Seed run | âœ… 2 branches, 7 employees, all passwords bcrypt cost 12 |
| `npm run verify` at the root | âœ… typecheck both sides + i18n parity |

### Bilingual parity audit â€” `npm run verify:i18n`

| Check | Result |
| ----- | ------ |
| Key count matches | âœ… 392 English Â· 392 Arabic |
| Keys present in `ar.ts` but not `en.ts` | âœ… none |
| Keys present in `en.ts` but not `ar.ts` | âœ… none |
| Interpolation placeholders agree (`{{name}}`, `{{count}}`, `{{from}}`/`{{to}}`/`{{total}}`) | âœ… every shared key |

This runs from `scripts/check-i18n-parity.ts` using Node's built-in type stripping â€” no build step and no dependency. It is part of `npm run verify`, so every later phase that adds copy is checked automatically.

### Module-load and runtime smoke suite (21 checks)

Typechecking proves types and a build proves bundling; neither proves a module **executes**. This suite runs the real dev server and pulls the entire application through Vite's transform pipeline.

| Area | Checks | Result |
| ---- | ------ | ------ |
| Servers | API on :5000, Vite dev server on :5173 | âœ… 2/2 |
| Module graph | **all 65 application modules** transform with no error payload | âœ… 1/1 |
| Entry wiring | `createRoot` present, store imported, React refresh client injected | âœ… 3/3 |
| Client routing | deep links `/login`, `/app`, `/forgot-password`, and an unknown path all return the shell | âœ… 4/4 |
| Super admin semantics | sign-in via the dev proxy, `role=super_admin`, `branch=null` (spans all branches) | âœ… 3/3 |
| Session payload | `me` returns `locale` and a serialised `createdAt` | âœ… 2/2 |
| Production bundle | `vite preview` serves it, root mount present, dev entry stripped | âœ… 3/3 |
| Asset integrity | all 7 hashed assets referenced by the shell return 200 with real content | âœ… 1/1 |
| Production routing | deep link on the built bundle serves the shell | âœ… 1/1 |
| Code splitting | Three.js emitted as its own `three-*.js` chunk | âœ… 1/1 |

### API suite (28 checks) â€” superseded

An earlier, narrower PowerShell run of the same surface. Every one of its checks is included in the 58-check suite above, which is committed and reproducible, so that suite is the record of truth. Listed here only to explain the history.

### Full-stack integration suite (13 checks)

Verified during Phase 01 with a machine-local script (now archived outside the repository, since it hardcodes absolute paths). Retained here as an evidence record.

| Area | Checks | Result |
| ---- | ------ | ------ |
| Production build | build exit 0, `dist/index.html` emitted, root mount, hashed bundle referenced | âœ… 4/4 |
| API | listening on :5000, health responds | âœ… 1/1 |
| Dev server | Vite on :5173, SPA shell, `/src/main.tsx` injected, `dir="rtl"` default | âœ… 4/4 |
| Routing | history fallback serves the shell for `/login` | âœ… 1/1 |
| Integration | dev proxy `/api` â†’ :5000 reaches MongoDB, sign-in through the proxy, correct role | âœ… 3/3 |

### Defect found and fixed during verification

| Defect | Cause | Fix |
| ------ | ----- | --- |
| `GET /auth/me` returned `500 MissingSchemaError: Schema hasn't been registered for model "Branch"` | The controller populated `user.branch`, but the `Branch` model was never imported into that process, and Mongoose resolves populated model names at query time | Import `../models/Branch.js` in `authController.ts` for its registration side effect, with a comment explaining why |

### Interface

| Check | Result |
| ----- | ------ |
| Landing page renders all 10 sections | âœ… |
| 3D hero loads only on desktop, no reduced-motion, in view | âœ… |
| Static CSS fallback renders on mobile and under reduced motion | âœ… |
| Language switch re-lays-out the whole document (dir, fonts, icons, alignment) | âœ… |
| Theme switch re-themes every surface via tokens | âœ… |
| Ticket codes stay LTR inside Arabic text | âœ… |
| Protected route redirects unauthenticated users to `/login`, preserving the target | âœ… |
| Wrong-role access renders an access-denied screen rather than a redirect loop | âœ… |
| Sidebar entries are filtered by role; future phases render locked | âœ… |
| Toasts appear, auto-dismiss and can be dismissed | âœ… |
| Error boundary catches a render crash instead of a blank page | âœ… |

> The interface rows were verified structurally (routing, direction, build output and rendered shell). Interactive walkthrough of each screen against a live browser session is part of the Phase 02 review.

### Known limitations at the end of Phase 01

These are expected and are addressed in later phases, not defects:

- Dashboard metrics and charts show an explicit "coming soon" state â€” Phase 02 supplies the data.
- Global search in the topbar is disabled â€” Phase 03/04.
- The notification bell is disabled â€” Phase 12.
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
- [ ] Arabic reads naturally â€” not machine-translated word order
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

1. Visit `/` â€” landing page renders in Arabic, dark theme
2. Switch to English â€” layout and direction flip correctly
3. Switch back to Arabic
4. Click *Start managing repairs* â†’ `/login`
5. Sign in as `karim.mansour@repairflow.app`
6. Land on `/app` with the operations console shell
7. Confirm sidebar entries match the manager role
8. Open the account menu â†’ `/app/profile`
9. Update the name and phone â†’ success toast, values persisted
10. Change the interface language to English â†’ whole app switches
11. Reload the page â†’ session restored without a second sign-in
12. Visit `/app/settings` by URL â†’ access denied screen, not a redirect loop
13. Sign out â†’ session revoked, redirected to `/login`
14. Verify the redirect target is preserved when returning to `/app`

---

## Reporting template

```
PHASE NN â€” <name>

Status: complete | blocked

Verified
- <what was checked and the observed result>

Fixed during verification
- <issue> â†’ <fix>

Known limitations
- <honest list, with the phase that addresses each>

Files added/changed
<tree>
```

