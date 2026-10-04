<div align="center">

# RepairFlow

**Repair center operations software — from device intake to warranty.**

Customers · Devices · Repair tickets · Technicians · Spare parts · Quotations · Approvals · Invoices · Payments · Live customer tracking · Appointments · Reports · Notifications · Polish · **Production hardening**

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOY.md) · [Seed data](docs/SEED.md) · [QA checklist](docs/QA_CHECKLIST.md) · [Roadmap](docs/PROJECT_PHASES.md) · [Security](docs/SECURITY_CHECKLIST.md)

</div>

---

## What this is

RepairFlow is a full-stack MERN platform for businesses that repair things — phones, laptops, appliances, air conditioners, general technical service. It models the real operational workflow from intake through warranty.

Every phase of the build is a working vertical slice: **UI → API → controller → model → database → response → UI state**.

---

## Status

**Phases 01–14 complete.** The platform is feature-complete for the planned roadmap and production-hardened (validated env, security headers, rate limits, health probes, indexes, deploy checklist).

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 01 | Foundation · brand · design system · i18n/RTL · landing · auth · console shell | ✅ |
| 02 | Dashboard metrics, charts, activity feed, notifications | ✅ |
| 03 | Customers and devices | ✅ |
| 04 | Repair tickets and status workflow | ✅ |
| 05 | Technicians, staff and permissions | ✅ |
| 06 | Inventory and spare parts | ✅ |
| 07 | Quotations and customer approval | ✅ |
| 08 | Invoices and payments | ✅ |
| 09 | Public QR tracking | ✅ |
| 10 | Appointments | ✅ |
| 11 | Reports and analytics | ✅ |
| 12 | Notifications and activity logs | ✅ |
| 13 | Polish and advanced UX (a11y, responsive, performance) | ✅ |
| **14** | **Production hardening** | **✅** |

---

## Phase 14 summary

| Area | Deliverables |
| ---- | ------------ |
| Config | Zod `env.ts`, server/client env examples, fail-fast boot |
| Security | Helmet + HSTS + CSP, CORS allow-list, rate limits (global/auth/public) |
| Errors | Central handler, no prod stack leaks, stable codes |
| Ops | `/health` + `/ready`, request IDs, structured logger |
| Data | `ensureIndexes()` for critical collections |
| Docs | Security checklist, deploy validation, prod-smoke script |

Integration: see `INTEGRATION.md` and `artifacts/phase14/`.

---

## Tech stack

**Client** — React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS 3 · Redux Toolkit · React Router 6 · i18next · Axios · Zod · React Hook Form · Framer Motion · Swiper · Recharts · Lucide

**Server** — Node.js · Express 4 · TypeScript (ESM) · MongoDB · Mongoose 8 · JWT · bcrypt · Zod · Helmet · CORS · Morgan · express-rate-limit · Cloudinary · Multer

**Deployment** — Vercel (client and server), MongoDB Atlas, Cloudinary

---

## Getting started

```bash
cd server && npm install && cp .env.example .env
cd ../client && npm install && cp .env.example .env
cd ../server && npm run seed
# terminal 1: cd server && npm run dev
# terminal 2: cd client && npm run dev
```

Open **http://localhost:5173**. Demo password: **`RepairFlow@2026`**

### Production smoke

```bash
API_BASE=https://your-api/api/v1 bash artifacts/phase14/scripts/prod-smoke.sh
```

---

## Demo accounts

Shared password: **`RepairFlow@2026`**

| Role | Email |
| ---- | ----- |
| Super Admin | `mahmoud.elsebaey@repairflow.app` |
| Admin | `nourhan.abdelaziz@repairflow.app` |
| Branch Manager | `karim.mansour@repairflow.app` |
| Technician | `youssef.ragab@repairflow.app` |
| Receptionist | `ahmed.sherif@repairflow.app` |
| Inventory Manager | `doaa.kamel@repairflow.app` |

---

## License

Private project. All rights reserved.
