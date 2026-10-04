# RepairFlow — Project Phases

RepairFlow is built in vertical phases. Every phase delivers **frontend + backend + database + UX** as a working slice, ends in a runnable state, and is verified before the next one starts.

Rule: after each phase the application is installed, run, verified, typechecked and built. Then it stops for review.

---

## Phase 01 — Foundation, brand and authentication ✅

**Ships** foundation, brand, i18n, auth, console shell. See repository history for full checklist.

**End state:** a real user signs in through the frontend and reaches a protected operations console.

---

## Phase 02 — Dashboard and application shell ✅

**Ships** dashboard metrics from MongoDB, activity log, notifications.

**End state:** dashboard figures come from MongoDB through the API — no hardcoded numbers.

---

## Phase 03 — Customers and devices ✅

**Ships** customer and device CRUD, search, pagination, relationships.

**End state:** a real customer is created and a real device is assigned to them.

---

## Phase 04 — Repair tickets ✅

**Ships**

*Client* — ticket list with status filters, create dialog, ticket detail with interactive timeline, status transitions driven by server-computed available actions, diagnosis and cost editing.

*Server* — `RepairTicket` model, CRUD, status transition table (`repairWorkflow`), technician assignment, ticket code generation (`RF-YYYY-NNNNN`), status history with actor and timestamp.

**End state:** a complete repair workflow runs from the frontend to MongoDB and back.

---

## Phase 05 — Technicians, staff and permissions

**Ships** staff CRUD, role assignment, workload views.

---

## Phase 06 — Inventory

**Ships** inventory items, stock movements, low-stock alerts.

---

## Phase 07 — Quotations and customer approval

**Ships** quotation builder and approval state machine.

---

## Phase 08 — Invoices and payments

**Ships** invoice generation and payment recording.

---

## Phase 09 — Customer tracking and QR

**Ships** public tracking page at `/track/:code`.

---

## Phase 10 — Appointments

**Ships** appointment calendar and conflict detection.

---

## Phase 11 — Reports and analytics

**Ships** revenue and performance reports from real data.

---

## Phase 12 — Notifications and activity logs

**Ships** (partially delivered in Phase 02) expanded event coverage.

---

## Phase 13 — Polish and advanced UX

**Ships** accessibility, responsive refinement, performance.

---

## Phase 14 — Production hardening

**Ships** security review, production config, final deployment validation.

---

## Working agreement

After each phase: install, run, verify, typecheck, build, then stop for review until an explicit Continue.

---

## Current position

**Phases 01–04 are complete.**

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 01 Foundation · brand · auth | ✅ Complete | JWT rotation, bilingual shell, seed staff |
| 02 Dashboard · activity · notifications | ✅ Complete | Real MongoDB aggregates |
| 03 Customers · devices | ✅ Complete | Branch-scoped CRUD |
| 04 Repair tickets | ✅ Complete | Full workflow: create, list, detail, status transitions, timeline |
| 05–14 | Not started | — |

**Next phase:** Phase 05 — Technicians, staff and permissions.
