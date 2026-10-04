# RepairFlow — Project Phases

RepairFlow is built in vertical phases. Every phase delivers **frontend + backend + database + UX** as a working slice, ends in a runnable state, and is verified before the next one starts.

Rule: after each phase the application is installed, run, verified, typechecked and built. Then it stops for review.

---

## Phase 01 — Foundation, brand and authentication ✅

**Ships**

*Client*
- Vite + React 18 + TypeScript (strict) project with the RepairFlow design-token system
- Light and dark themes driven entirely by tokens; no literal colours in components
- Brand identity: original SVG mark, wordmark, product palette
- Bilingual i18n (Arabic RTL / English LTR) with automatic direction, layout and font switching
- Public landing page: hero with a lazy-loaded 3D core, how-it-works, workflow timeline, features, inventory, customer tracking, analytics, testimonials (Swiper), pricing, CTA, footer
- Authentication screens: login, forgot password, reset password, with localised inline validation
- Operations console shell: sidebar, topbar, mobile drawer, role-filtered navigation, API health indicator
- Profile screen: account details, preferences, password change
- Design-system primitives, loading/empty/error/success states, toasts, error boundary, skip links

*Server*
- Express + TypeScript (ESM) with a strict, fail-fast configuration layer
- MongoDB connection, `User` and `Branch` models
- JWT authentication: access + refresh, hashed refresh storage, rotation, revocation
- Zod validation, `AppError` + `asyncHandler` + centralised error handler
- Helmet, CORS allow-list, three tiers of rate limiting
- Vercel serverless entry with connection reuse
- Idempotent seed with two branches and seven employees across all six roles

**Verified by:** real sign-in through the UI against MongoDB, `/health` reporting `database: connected`, client and server typecheck clean, production client build succeeding.

**End state:** a real user signs in through the frontend and reaches a protected operations console.

---

## Phase 02 — Dashboard and application shell ✅

**Ships**

*Client* — metric tiles with real values, activity-over-time chart, team-by-role distribution, headcount by branch, recent-activity timeline, notification bell with unread badge and dropdown, notifications page with unread filter, audit-trail page with category filters and pagination.

*Server* — `ActivityLog` and `AppNotification` models, `services/events.ts` for audit and notification side effects, `GET /reports/dashboard` (branch-scoped aggregates), `GET /activity`, and the notification endpoints. Authentication events now produce real audit entries.

**Verified by:** 68 API checks, 45 browser checks, 481-key bilingual parity audit, typecheck clean on both applications.

**End state:** dashboard figures come from MongoDB through the API — no hardcoded numbers and no fabricated placeholders. Figures whose collections do not exist yet render as "Not tracked yet" and fill in automatically as Phases 03, 04 and 06 land.

**Security note:** verification of this phase uncovered and fixed a high-severity authentication defect — refresh-token rotation was a no-op inside the same second because JWTs signed for the same subject in the same second are byte-identical, which silently disabled stolen-token detection. Every issued token now carries a unique `jti`. See [QA_CHECKLIST.md](./QA_CHECKLIST.md#phase-02--verification-record).

---

## Phase 03 — Customers and devices

**Ships**

*Client* — customer list with search, filtering, sorting and pagination; customer detail with their device history; create and edit forms; device list; add device with images; device detail.

*Server* — `Customer` and `Device` models, controllers, routes, Zod validation, text search, pagination, relationship integrity, `customerCode` generation.

**End state:** a real customer is created and a real device is assigned to them.

---

## Phase 04 — Repair tickets

**Ships**

*Client* — ticket creation wizard (customer → device → issue → priority), ticket list with status and priority filters, ticket detail with an interactive timeline, status transitions, technician assignment, diagnosis capture, cost estimation, parts selection.

*Server* — `RepairTicket` model, CRUD, the **status transition table**, technician assignment, business rules (no work without approval, no delivery while unpaid), ticket code generation (`RF-YYYY-NNNNN`), status history with actor and timestamp.

**End state:** a complete repair workflow runs from the frontend to MongoDB and back.

---

## Phase 05 — Technicians, staff and permissions

**Ships**

*Client* — technician management, staff list, technician profile with workload and completion metrics, permission matrix UI, role assignment.

*Server* — staff CRUD, role-based authorization hardening, branch scoping, workload aggregation.

**End state:** different staff members see genuinely different capabilities, enforced on both sides.

---

## Phase 06 — Inventory

**Ships**

*Client* — inventory dashboard, parts list with low-stock and out-of-stock states, part detail with movement history, add/edit part, stock adjustment, transaction ledger, branch transfer.

*Server* — `InventoryItem` and `InventoryTransaction` models, stock calculation, repair part consumption that writes the ledger row atomically, low-stock queries, valuation aggregation, Cloudinary upload for part images.

**End state:** using a spare part in a repair updates inventory and records who consumed it.

---

## Phase 07 — Quotations and customer approval

**Ships**

*Client* — quotation builder (labour + parts breakdown), send for approval, customer decision capture, approval status on the ticket, printable/emailable summary.

*Server* — `Quotation` model, part and labour pricing, approval state machine, ticket workflow integration, approval audit fields.

**End state:** a repair waits for customer approval before work begins, and the decision is recorded permanently.

---

## Phase 08 — Invoices and payments

**Ships**

*Client* — invoice list, invoice detail, generation from the approved quotation, payment recording, partial payments, payment history, outstanding balance views, printable invoice.

*Server* — `Invoice` and `Payment` models, line calculation, tax handling, outstanding balance aggregation, invoice numbering, payment method validation.

**End state:** completed repairs produce invoices and payments, and balances reconcile.

---

## Phase 09 — Customer tracking and QR

**Ships**

*Client* — a public, mobile-first tracking page at `/track/:code` with a plain-language timeline, a QR code on the printed receipt, and no exposed customer data.

*Server* — a public, rate-limited lookup returning a deliberately limited projection: ticket code, device type and brand, current status, timeline, expected completion. Never names, phones, addresses or prices.

**End state:** a customer scans a QR code and sees their repair status immediately.

---

## Phase 10 — Appointments

**Ships**

*Client* — appointment calendar (day/week), booking form, technician schedule view, rescheduling and cancellation, conflict warnings.

*Server* — `Appointment` model, availability logic, conflict detection, reminder preparation.

**End state:** appointments are scheduled, moved and cancelled without double-booking a technician.

---

## Phase 11 — Reports and analytics

**Ships**

*Client* — revenue reports, repair reports, technician performance, inventory analytics, brand and device-type breakdowns, date-range filters, export-ready tables.

*Server* — MongoDB aggregation pipelines for every report, date bucketing, branch comparison, cached where it measurably helps.

**End state:** every figure on screen is computed from real operational data.

---

## Phase 12 — Notifications and activity logs

**Ships**

*Client* — notification centre with read/unread state, real-time-ish polling, activity timeline per ticket and per customer.

*Server* — `Notification` and `ActivityLog` models, event generation on meaningful actions (status change, assignment, approval, payment, stock movement), per-role targeting.

**End state:** important business actions are tracked and attributable.

---

## Phase 13 — Polish and advanced UX

**Ships** — micro-interaction and transition refinement, dashboard 3D seasoning where it adds meaning, additional Swiper experiences, richer skeletons, illustrated empty states, error recovery flows, accessibility audit and fixes, responsive refinement across every screen.

Rule: nothing is added purely for visual complexity. Every change must make a real task faster or clearer.

**End state:** the product feels finished, not merely functional.

---

## Phase 14 — Production hardening

**Ships**

- Security review: authentication, authorization per endpoint, input validation coverage, rate limits, upload safety, secret handling
- API review: consistent envelopes, status codes, pagination, error codes
- Performance review: bundle analysis, query indexes, aggregation efficiency
- Production configuration: MongoDB Atlas, Cloudinary, Vercel, CORS allow-list, environment audit
- Documentation: `DEPLOY.md`, `QA_CHECKLIST.md`, `ARCHITECTURE.md`, `SEED.md`
- Final frontend build and backend production build

**End state:** deployable to production with documented operational procedures.

---

## Working agreement

After each phase the following happens before anything else:

1. Install or update dependencies
2. Run the frontend and the backend
3. Verify API communication and MongoDB connectivity
4. Manually verify the feature that was just built
5. Fix every error found
6. Run typechecking on both applications
7. Build the frontend
8. Confirm there are no console errors
9. Summarise what shipped and show the file structure

Then the work stops and waits for an explicit "Continue" before the next phase begins.

---

## Current position

**Phase 01 is complete and verified.** 124 checks pass across four independent layers — 58 API, 45 real-browser, 21 module-load, plus a bilingual parity audit. Reproduce with `npm run verify`.

**Phases 02–14 have not been started.** Nothing outside Phase 01's scope exists in the codebase: the API mounts `/health` and `/auth` only, and no `Customer`, `Device`, `RepairTicket` or inventory code has been written.

### Why the next phase needs a decision, not just a "Continue"

The phases were specified as a sequence, but two dependencies in that sequence are worth stating explicitly before work resumes:

- **Phase 02 (dashboard) depends on data that does not exist yet.** Its metrics are aggregates over repair tickets, devices and customers — created in Phases 03 and 04. Building it now means either inventing numbers or shipping a second, throwaway dashboard. Phase 01 deliberately left its metric tiles empty and labelled rather than fabricated, and that standard should hold.
- **Phase 04 (repair tickets) depends on Phase 03.** A ticket references a customer and a device; `RepairTicket.customer` cannot be populated before `Customer` exists.

So the dependency-respecting order to reach a meaningful dashboard is:

```
Phase 03 (customers + devices)  →  Phase 04 (repair tickets)  →  Phase 02 (dashboard)
```

That is a reordering of the original list, which is why it needs an explicit decision rather than an assumption. Three viable paths:

| Path | Order | Trade-off |
| ---- | ----- | --------- |
| **A — dependency-first** *(recommended)* | 03 → 04 → 02 | The dashboard is built once, against real data. Reaches a convincing demo slightly later. |
| **B — as originally specified** | 02 → 03 → 04 | Follows the brief literally. The dashboard must either show placeholder metrics again or be rebuilt in Phase 04. |
| **C — ticket-first** | 03 → 04, then reassess | Fastest route to the product's core value (the repair workflow). Dashboard and everything else follow. |

Work resumes on whichever path is chosen. Until then the build stays at Phase 01, and the verification suites keep it honest.

