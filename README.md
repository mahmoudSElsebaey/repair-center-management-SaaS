<div align="center">

# RepairFlow

**Repair center operations software — from device intake to warranty.**

Customers · Devices · Repair tickets · Technicians · Spare parts · Quotations · Approvals · Invoices · Payments · Live customer tracking

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOY.md) · [Seed data](docs/SEED.md) · [QA checklist](docs/QA_CHECKLIST.md) · [Roadmap](docs/PROJECT_PHASES.md)

</div>

---

## What this is

RepairFlow is a full-stack MERN platform for businesses that repair things — phones, laptops, appliances, air conditioners, general technical service. It models the real operational workflow from intake through warranty.

Every phase of the build is a working vertical slice: **UI → API → controller → model → database → response → UI state**.

---

## Status

Phase-based build, **Phases 01–09 complete**. The application authenticates against MongoDB, ships a bilingual marketing site, live dashboard, customers, devices, repair tickets, staff/technician management, inventory with stock movements, quotations with customer approval, invoices and payments, and public QR tracking.

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 01 | Foundation · brand · design system · i18n/RTL · landing page · authentication · console shell | ✅ Complete |
| 02 | Dashboard metrics, charts, activity feed, notifications | ✅ Complete |
| 03 | Customers and devices | ✅ Complete |
| 04 | Repair tickets and the status workflow | ✅ Complete |
| 05 | Technicians, staff and permissions | ✅ Complete |
| 06 | Inventory and spare parts | ✅ Complete |
| 07 | Quotations and customer approval | ✅ Complete |
| 08 | Invoices and payments | ✅ Complete |
| 09 | Public QR tracking | ✅ Complete |
| 10 | Appointments | Planned |
| 11 | Reports and analytics | Planned |
| 12 | Notifications and activity logs | Planned |
| 13 | Polish and advanced UX | Planned |
| 14 | Production hardening | Planned |

See [docs/PROJECT_PHASES.md](docs/PROJECT_PHASES.md) for the detail of each phase.

---

## Tech stack

**Client** — React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS 3 · Redux Toolkit · React Router 6 · i18next · Axios · Zod · React Hook Form · Framer Motion · Swiper · Recharts · Lucide · Three.js / React Three Fiber

**Server** — Node.js · Express 4 · TypeScript (ESM, `NodeNext`) · MongoDB · Mongoose 8 · JWT access + refresh · bcrypt · Zod · Helmet · CORS · Morgan · express-rate-limit · Cloudinary · Multer

**Deployment** — Vercel (client and server), MongoDB Atlas, Cloudinary

---

## Getting started

### Prerequisites

- Node.js **18+**
- MongoDB **6+**
- npm 9+

### Install and run

```bash
cd server && npm install && cp .env.example .env
cd ../client && npm install && cp .env.example .env
cd ../server && npm run seed
# terminal 1
cd server && npm run dev
# terminal 2
cd client && npm run dev
```

Open **http://localhost:5173**. Demo password for all seeded accounts: **`RepairFlow@2026`**

### Verify

```bash
npm run typecheck
npm run verify:i18n
curl http://localhost:5000/api/v1/health
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
