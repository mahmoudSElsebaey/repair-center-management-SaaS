# RepairFlow — Architecture

This document explains how RepairFlow is put together and why. It is the reference for anyone extending the system, and it records the conventions that keep the codebase consistent as features are added.

---

## 1. Guiding principles

1. **Vertical slices.** Every phase delivers UI → API → controller → model → database → response → UI state. No frontend-only screens backed by mock data, and no endpoint without a consumer.
2. **Simple MERN.** React, Express, MongoDB, Node. No microservices, no message bus, no queue, no Redis. Complexity is added only when a real requirement proves it necessary.
3. **One source of truth per concern.** Domain vocabulary, design tokens, environment configuration, error shape and navigation permissions each live in exactly one file.
4. **Typed end to end.** TypeScript in `strict` mode on both sides, with `noUnusedLocals`, `noUnusedParameters` and `noImplicitOverride` enabled. `any` is not used; `unknown` plus narrowing is.
5. **Honest UI.** If something is not implemented, the interface says so — it does not render a plausible-looking placeholder. Loading, empty, error and success states exist for every data surface.

---

## 2. Repository layout

```
client/   React application (marketing site + operations console)
server/   Express API
docs/     Architecture, deployment, seed, QA and roadmap documentation
```

The two applications deploy independently and share nothing but the API contract and the domain vocabulary, which is mirrored deliberately (see §7).

---

## 3. Server architecture

### 3.1 Layers

| Layer | Responsibility | Must not |
| ----- | -------------- | -------- |
| `routes/` | URL → middleware → controller wiring | Contain business logic |
| `controllers/` | Parse input, call the domain, shape the response | Query models directly with complex filters, or know about Express response internals beyond `res.json` |
| `validators/` | Zod schemas, the boundary contract | Touch the database |
| `models/` | Schema, indexes, instance methods, hooks | Contain request-aware logic |
| `middleware/` | Cross-cutting concerns (auth, errors, rate limits) | Contain feature logic |
| `utils/` | Pure helpers (`AppError`, `asyncHandler`, code formatting) | Import models |
| `config/` | Environment resolution and fail-fast validation | Contain secrets |

Controllers stay small by delegating repeated shaping to helpers. When a controller approaches a few hundred lines in a later phase, its business rules move into a domain module rather than growing further.

### 3.2 Module system

ESM throughout (`"type": "module"`), compiled with `module: NodeNext`. **Relative imports carry the `.js` extension** even though the source is `.ts` — this is what Node's ESM resolver requires of the emitted files, and it is consistent with the project's reference conventions.

### 3.3 Two entry points

| File | Used by | Behaviour |
| ---- | ------- | --------- |
| `src/app.ts` | Vercel, tests | Builds and exports the Express app. Never listens. |
| `src/server.ts` | Local dev, long-running hosts | Connects Mongoose, listens, handles `SIGINT`/`SIGTERM`, exports `app`. |
| `api/[...path].ts` | Vercel serverless | Caches one connection promise across warm invocations, then delegates to the app. |

Keeping the listener out of `app.ts` is what makes the same codebase runnable locally and as a serverless function without a conditional import chain.

### 3.4 Error contract

Every error response has the same shape:

```json
{
  "success": false,
  "message": "Human-readable, already safe to display",
  "code": "MACHINE_READABLE_CODE",
  "errors": [{ "path": "email", "message": "Enter a valid email address" }]
}
```

`errorHandler` maps four classes of failure and never leaks internals:

| Source | Status | Code |
| ------ | ------ | ---- |
| `AppError` | As constructed | As constructed |
| `ZodError` | 400 | `VALIDATION_ERROR` (+ per-field `errors`) |
| Mongoose `CastError` | 400 | `INVALID_IDENTIFIER` |
| Mongoose `ValidationError` | 400 | `MONGOOSE_VALIDATION` |
| Duplicate key (`11000`) | 409 | `DUPLICATE_KEY` |
| Anything else | 500 | `INTERNAL_ERROR` — generic message in production, real message plus `requestId` in development |

Controllers throw; they never build error responses by hand. `asyncHandler` funnels rejected promises into the same path.

### 3.5 Configuration

`config/index.ts` resolves and *validates* the environment at import time. In production the process exits rather than starting in an unsafe state if:

- `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing, shorter than 32 characters, or contains a placeholder marker such as `change_me` or `secret`
- `MONGODB_URI` is missing or points at `localhost`
- any Cloudinary credential is missing

Secret resolution is centralised in `resolveSecret`, so there is one auditable place where token security is decided.

### 3.6 Authentication

```
POST /auth/login ──► access token (15 min, JWT)
                 └─► refresh token (30 d, JWT) ──► SHA-256 hash stored on User
```

- Access tokens carry `{ sub, role }` and are verified in `protect`, which **reloads the user on every request**. A deactivated account therefore loses access immediately instead of waiting for token expiry.
- Refresh tokens are stored **hashed**. A database dump contains nothing usable.
- `POST /auth/refresh` rotates both tokens. Presenting a refresh token whose hash no longer matches the stored value means the session was superseded or stolen, and the request is rejected with `REFRESH_REVOKED`.
- `PATCH /auth/password` clears the stored refresh token, so changing a password ends sessions on every other device.
- `POST /auth/logout` unsets the stored refresh token server-side.
- `restrictTo(...roles)` is the only authorization primitive. It always runs after `protect`.

### 3.7 Rate limiting

Three tiers, all skipped under `NODE_ENV=test`:

| Limiter | Window | Max | Applies to |
| ------- | ------ | --- | ---------- |
| `apiLimiter` | 15 min | 600 | Every `/api/v1` route |
| `authLimiter` | 15 min | 40 (successes not counted) | login, refresh |
| `passwordResetLimiter` | 60 min | 10 | forgot/reset password |
| `publicTrackLimiter` | 1 min | 60 | Public QR lookups (Phase 09) |

`app.set('trust proxy', 1)` is required so the real client IP is read from `X-Forwarded-For` behind Vercel's proxy — without it, one address would throttle everyone.

---

## 4. Client architecture

### 4.1 Layers

| Directory | Responsibility |
| --------- | -------------- |
| `pages/` | Route components. Compose features and containers; hold no business logic. |
| `features/` | Feature-scoped slices, API calls, schemas and private components. |
| `components/ui/` | Design-system primitives (Button, Input, Card, Badge, Modal, Skeleton, Logo). |
| `components/layout/` | Application chrome (Sidebar, Topbar, toggles, footer, sections). |
| `components/feedback/` | Loading, empty, error, success states, toasts, error boundary. |
| `components/motion/` | Framer Motion primitives — the single place reduced motion is handled. |
| `components/3d/` | WebGL scene plus its progressive loader and fallback. |
| `lib/` | Cross-cutting infrastructure: `env`, `apiClient`, `storage`, `utils`. |
| `config/` | The navigation model, which doubles as the permission table. |
| `store/` | Redux store plus the UI slice. |

### 4.2 State

Redux Toolkit holds two slices:

- **`auth`** — user, tokens, status (`idle | loading | authenticated | anonymous`), `bootstrapped`, error. Tokens are mirrored into `localStorage` through `lib/storage`.
- **`ui`** — theme, locale, sidebar/drawer state, toasts.

Everything else is component-local state. Server data is fetched per screen through the typed API client; when a phase needs cross-screen caching, that phase introduces it deliberately rather than pre-emptively.

The session token is read from `lib/storage` by the Axios interceptor rather than from the store. This is what keeps `apiClient` free of a circular import on the store.

### 4.3 Transport

`lib/apiClient.ts` is the only module that talks HTTP.

- **One envelope.** `request<T>()` unwraps `{ success, data, message, code }` and returns `data`, or throws a normalised `ApiError` with `status`, `code` and `fieldErrors`.
- **Automatic refresh.** A 401 on a non-auth endpoint triggers one refresh attempt and replays the original request. Concurrent 401s **share a single refresh promise** — without this, a dashboard firing six parallel calls would rotate the refresh token six times and invalidate its own session.
- **Session expiry.** If refresh fails, storage is cleared and a registered handler dispatches `sessionCleared()`, so the app returns to sign-in instead of looping.
- **Network clarity.** A request that never reached the server becomes `ApiError` with status `0` and `NETWORK_ERROR`, which the UI can present differently from a rejected request.

### 4.4 Routing and permissions

`config/navigation.ts` declares every destination with its icon, i18n key, path, permitted roles and shipping phase. Three things derive from that single declaration:

1. The sidebar, filtered by role.
2. `ProtectedRoute`, which redirects unauthenticated users to `/login` and renders an access-denied screen — **not** a redirect — for a signed-in user whose role is not permitted. Redirecting them to login would look like an involuntary sign-out.
3. `findNavItem`, which resolves the current path to its page title.

Entries from future phases render as locked items so the roadmap is visible without pretending the screen exists.

---

## 5. Design system

All visual decisions live in `client/src/styles/tokens.css` as CSS custom properties. `tailwind.config.js` maps them into utility names (`bg-surface`, `text-foreground-muted`, `duration-fast`) and contains no literal colour values.

Consequences worth knowing:

- A theme is a token override block. `[data-theme='light']` re-declares the same variable names with daylight-calibrated values; no component is aware of the theme.
- `prefers-reduced-motion` is handled in the token layer by collapsing the duration variables to `0ms`, and in `components/motion/primitives.tsx` by dropping transforms.
- Directionality uses logical properties throughout (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`), so RTL support is a property of the layout rather than a set of overrides.
- Numeric content (ticket codes, money, quantities) carries the `.numeric` class, which forces `direction: ltr; unicode-bidi: isolate` so `RF-2026-00421` does not scramble inside Arabic sentences.

---

## 6. Internationalisation

`client/src/i18n/locales/{en,ar}.ts` hold parallel key trees. `i18n/index.ts` owns the language, and `applyDocumentLanguage()` sets `<html lang>` and `<html dir>` — which is what actually re-lays-out the product, since the CSS font stack and every logical property respond to it.

Arabic is not a translation layer applied afterwards:

- Layout, alignment, navigation order and icon direction flip automatically.
- `useLanguage()` keeps i18next, the Redux preference and the stored user profile (`locale`) in agreement.
- Zod schemas emit **i18n keys** as messages, which the form layer resolves, so validation text is localised without duplicating rules.

---

## 7. Domain vocabulary

`server/src/types/domain.ts` is the canonical list of roles, device types, repair statuses, priorities, inventory transaction types and payment methods. `client/src/types/domain.ts` mirrors it.

The duplication is intentional: the client must not import from the server, and a shared package would add build complexity for a small, slowly-changing list. The rule is that **any change to one must be made to the other in the same commit**.

### Roles

| Role | Scope |
| ---- | ----- |
| `super_admin` | Every branch, every setting |
| `admin` | Operations plus staff administration |
| `manager` | Branch operations and reporting |
| `technician` | Assigned work, diagnosis, parts consumption |
| `receptionist` | Intake, customers, approvals, payments |
| `inventory_manager` | Stock, suppliers, movements |

### Repair status machine (implemented in Phase 04)

```
received ──► diagnosing ──► waiting_customer ──► approved ──► in_repair ──► ready ──► delivered
                  │                                  │            │
                  └──────────────► cancelled ◄────────┴────────────┘
                                                 in_repair ◄──► waiting_parts
```

Statuses are a closed set, not free text. Phase 04 adds the transition table, validates every change against it, and records who moved the ticket and when.

---

## 8. Data model

14 entities are planned. Phase 01 implements two.

```
Branch ──1:N──► User

Branch ──1:N──► Customer ──1:N──► Device ──1:N──► RepairTicket
                                                      │
                    ┌─────────────────────────────────┼───────────────────────┐
                    ▼                                 ▼                       ▼
              PartUsage ──► InventoryItem      Quotation (1:1)         Invoice (1:1)
                                 │                                          │
                    InventoryTransaction                              Payment (1:N)
                    (purchase/usage/return/                            Warranty (N:1)
                     adjustment/transfer)
```

**Relationship rules**

- `Customer` belongs to a branch; `Device` belongs to a customer; `RepairTicket` references customer, device, branch and an assigned technician.
- `PartUsage` is the join between a ticket and an inventory item, and writing one **also writes an `InventoryTransaction` of type `usage`**. Stock never changes without a ledger row.
- `Quotation` is one-to-one with a ticket and carries the customer decision; the ticket cannot advance to `in_repair` without an `approved` quotation.
- `Invoice` derives its lines from the approved quotation. `Payment` rows sum to the amount settled; the remainder is the outstanding balance.
- `Warranty` starts at delivery and references both the ticket and the parts used, so a claim can be traced back to the exact component.

**Implemented in Phase 01**

- `Branch` — name, code (unique), city, address, phone, active.
- `User` — name, email (unique, lowercased), phone, password (bcrypt 12, `select: false`), role (six-value enum, indexed), avatar, branch reference, locale, active flag, `lastLogin`, hashed refresh token, password-reset token and expiry. `toPublicJSON()` defines exactly what leaves the server: no hash, no tokens.

Indexes are declared for the access paths that already exist (`email`, `{role, isActive}`, `{branch}`). Later phases add indexes alongside the queries that need them, not speculatively.

---

## 9. API design

Base path `/api/v1`. REST conventions: `GET` list/read, `POST` create, `PATCH` partial update, `DELETE` remove; action endpoints are verbs on a sub-resource (`PATCH /repairs/:id/status`).

**Phase 01**

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| `GET` | `/health` | Public | Liveness, version, database and Cloudinary state |
| `POST` | `/auth/login` | Public | Start a session |
| `POST` | `/auth/refresh` | Public | Rotate tokens |
| `POST` | `/auth/logout` | Bearer | Revoke the session |
| `GET` | `/auth/me` | Bearer | Current account |
| `PATCH` | `/auth/me` | Bearer | Update name, phone, avatar, locale |
| `PATCH` | `/auth/password` | Bearer | Change password, end other sessions |
| `POST` | `/auth/forgot-password` | Public | Request a reset link |
| `POST` | `/auth/reset-password` | Public | Complete a reset |

**Planned** — `/customers`, `/devices`, `/repairs`, `/repairs/:id/status`, `/technicians`, `/inventory`, `/inventory/:id/transactions`, `/quotations`, `/invoices`, `/payments`, `/appointments`, `/reports/*`, `/notifications`, `/activity`, `/track/:code` (public, limited fields).

### Response envelope

```json
{
  "success": true,
  "message": "Optional, already localisable",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 143, "pages": 8 }
}
```

List endpoints accept `page`, `limit`, `search`, `sort`, `order` plus feature filters, and always return `meta`. Filtering and pagination happen in MongoDB, never in the browser.

---

## 10. Performance

- **Route-level code splitting.** Every page is `React.lazy`. The production build caps the entry chunk at ~144 kB (50 kB gzipped); the marketing page, charts, motion and 3D each load only when reached.
- **Isolated heavy dependencies.** Three.js (~822 kB) sits in its own chunk behind a `lazy()` import, so it is never downloaded by the console.
- **3D safeguards.** The scene loads only on desktop-sized viewports, only when motion is welcome, and only once the hero approaches the viewport. WebGL failure or a render error falls back to the CSS composition. The whole scene is three primitives plus one instanced mesh — 48 nodes in a single draw call, no textures, no post-processing.
- **Reduced device pressure.** `dpr` is capped at 1.75, and the canvas is `pointer-events: none` so it can never intercept scrolling.
- **Connection reuse.** The Vercel entry caches one Mongoose connection promise across warm invocations; a burst of concurrent requests triggers exactly one `connect()`.

---

## 11. Security checklist

| Control | Implementation |
| ------- | -------------- |
| Password storage | bcrypt, cost 12, `select: false`, stripped by `toPublicJSON` |
| Token storage | Access in memory/storage; refresh **hashed** server-side |
| Token rotation | Refresh rotates both tokens and revokes the previous one |
| Session revocation | Logout, password change, and deactivation all invalidate sessions |
| Enumeration resistance | Identical response for unknown account and wrong password |
| Input validation | Zod on every mutating endpoint, before any query |
| Injection | Mongoose parameterises; no string-built queries |
| Transport headers | Helmet; CSP enabled in production |
| CORS | Explicit origin allow-list from `CLIENT_URL`, credentials enabled |
| Rate limiting | Three tiers, proxy-aware |
| Error disclosure | Generic 500 in production; details logged with a `requestId` |
| Secret hygiene | `.env` ignored; `.env.example` documents every variable; production boots refuse placeholders |
| Upload validation | MIME and size limits via Multer (Cloudinary flow, Phase 06/13) |

---

## 12. Coding conventions

- **Language.** Code, identifiers, filenames, folder names, database fields, endpoints, commits and this document are English. The user interface is Arabic and English.
- **Naming.** `camelCase` for variables and functions, `PascalCase` for types and components, `SCREAMING_SNAKE_CASE` for constants. Files match their export (`User.ts`, `authController.ts`, `Button.tsx`).
- **Components.** Function components with named exports for library code and default exports for route pages. Props interfaces are declared and exported where a consumer needs them.
- **Comments.** Explain *why*, never *what*. Non-obvious trade-offs carry a short note — e.g. why the refresh promise is shared, why the token lives in `lib/storage` rather than the store.
- **Commits.** Conventional prefixes with real intent: `feat: add repair ticket workflow`, `fix: reject status transition without approval`, `refactor: simplify dashboard data flow`. Never `update`, `fix`, `changes`.
- **No suppressed errors.** No `@ts-ignore`, no empty catch blocks. Where an error is intentionally swallowed, it is commented with the reason (for example, local sign-out must succeed even if the logout request fails).

---

## 13. Environment notes

These are host toolchain behaviours, recorded so they are not rediscovered. **They do not affect the deployed product** — Vercel builds and runs RepairFlow with the standard commands in `package.json`.

### 13.1 Vite configuration is `.js`, not `.ts`

Vite transpiles a TypeScript config by spawning its bundled esbuild service as a child process. In locked-down Windows environments that spawn can be blocked. A JavaScript config is loaded by Node directly, so `vite.config.js`, `tailwind.config.js` and `postcss.config.js` are plain JavaScript. This is also why the source files stay `.ts` while only the build configuration is `.js`.

### 13.2 esbuild's temp directory

esbuild's Go binary derives its temp directory from the environment and then **deletes** the file it wrote there. If the process token is denied that delete, the build fails at the transpile step with:

```
[vite:esbuild-transpile] remove C:\Users\...\Temp\esbuild-<hash>: Access is denied.
```

Fixing it is an environment concern, not a code change — point the temp variables at a writable directory before invoking the build:

```powershell
$env:TMPDIR = 'F:\CV\.rf-cache\esbuild'
$env:TEMP   = $env:TMPDIR
$env:TMP    = $env:TMPDIR
npm run build
```

```bash
# bash equivalent
export TMPDIR=/tmp/rf-esbuild && npm run build
```

The same applies to `npm run dev` on the server, which runs through `tsx` (also esbuild-backed).

### 13.3 Spawn-free alternatives

If child-process spawning is unavailable, the server can be run without `tsx`:

```bash
cd server
npm run build      # tsc → dist/
node dist/server.js

npm run seed:dist  # tsc && node dist/seed/seed.js
```

`tsc` does not spawn helper processes, so this path works even where the standard development tooling cannot. It trades hot reload for reliability.

