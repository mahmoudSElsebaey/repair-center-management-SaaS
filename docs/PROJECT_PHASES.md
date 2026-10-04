# RepairFlow — Project Phases

RepairFlow is built in vertical phases. Every phase delivers **frontend + backend + database + UX** as a working slice, ends in a runnable state, and is verified before the next one starts.

Rule: after each phase the application is installed, run, verified, typechecked and built. Then it stops for review.

---

## Phase 01 — Foundation, brand and authentication ✅

**Ships** foundation, brand, i18n, auth, console shell.

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

**Ships** ticket list, create dialog, detail with timeline, status transitions, diagnosis and cost editing; server workflow table and ticket codes.

**End state:** a complete repair workflow runs from the frontend to MongoDB and back.

---

## Phase 05 — Technicians, staff and permissions ✅

**Ships** staff CRUD, role assignment, technician workload views.

**End state:** administrators manage staff accounts; managers see technician workload from real ticket data.

---

## Phase 06 — Inventory ✅

**Ships** inventory items, stock movements (purchase / usage / return / adjustment), low-stock alerts, seed data, Inventory page.

**End state:** branch-scoped spare-parts catalogue with a ledger; stock never changes without a transaction row; low-stock notifies inventory managers.

---

## Phase 07 — Quotations and customer approval ✅

**Ships** quotation builder (line items), send-for-approval, customer decision, ticket status linkage.

**End state:** a quotation with labour/parts lines can be drafted on a ticket, sent to the customer, and approved or rejected — moving the ticket through `waiting_customer` → `approved` or `cancelled`.

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

**Phases 01–07 are complete.**

| Phase | Status | Notes |
| ----- | ------ | ----- |
| 01 Foundation · brand · auth | ✅ Complete | JWT rotation, bilingual shell, seed staff |
| 02 Dashboard · activity · notifications | ✅ Complete | Real MongoDB aggregates |
| 03 Customers · devices | ✅ Complete | Branch-scoped CRUD |
| 04 Repair tickets | ✅ Complete | Full workflow: create, list, detail, status transitions, timeline |
| 05 Technicians · staff | ✅ Complete | Staff CRUD, role assignment, technician workload |
| 06 Inventory | ✅ Complete | Items, ledger movements, low-stock, Inventory page |
| 07 Quotations · customer approval | ✅ Complete | Quotation 1:1 with ticket, lines, send, decide |
| 08–14 | Not started | — |

**Next phase:** Phase 08 — Invoices and payments.
