# RepairFlow — QA Checklist

How to verify RepairFlow. The per-phase checklist is what is run after each phase; the release checklist is what is run before a deployment.

---

## Phase 01 — Verification record

**Environment:** Windows · Node v22.14.0 · npm 11.19.0 · MongoDB 6.0.5 (local, port 27017)
**Result:** 28 API checks passed · 13 full-stack checks passed · 0 failures

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

### API suite (28 checks)

| Area | Checks | Result |
| ---- | ------ | ------ |
| Health and database | endpoint, `mongo connected`, environment, version | ✅ 4/4 |
| Login | success, access token, refresh token, role, no password leak, no refresh-hash leak | ✅ 6/6 |
| Authorization | `GET /auth/me`, unauthenticated request blocked with 401 | ✅ 2/2 |
| Credential safety | wrong password 401, generic message, unknown account 401, **identical** message | ✅ 4/4 |
| Validation | bad input 400 `VALIDATION_ERROR` with per-field errors | ✅ 2/2 |
| Refresh | new tokens issued, new access token works, **rotated-away token rejected** | ✅ 3/3 |
| Profile | `PATCH /auth/me` persists | ✅ 1/1 |
| Password change | accepted, revokes existing sessions, sign-in with new password works, seed password restored | ✅ 4/4 |
| Error contract | unknown route 404 `ROUTE_NOT_FOUND` | ✅ 1/1 |

### Full-stack suite (13 checks)

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
