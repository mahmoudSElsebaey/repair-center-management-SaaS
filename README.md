<div align="center">

# RepairFlow

**Repair center operations software — from device intake to warranty.**

Customers · Devices · Repair tickets · Technicians · Spare parts · Quotations · Approvals · Invoices · Payments · Live customer tracking

[Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOY.md) · [Seed data](docs/SEED.md) · [QA checklist](docs/QA_CHECKLIST.md) · [Roadmap](docs/PROJECT_PHASES.md)

</div>

---

## What this is

RepairFlow is a full-stack MERN platform for businesses that repair things — phones, laptops, appliances, air conditioners, general technical service. It is **not** a generic CRUD dashboard with a repair label on it. It models the real operational workflow:

```
intake → diagnosis → quotation → customer approval → repair
       → parts consumed from inventory → quality check → invoice → payment → warranty
```

Every screen answers a question somebody at the counter or the bench asks daily, and every phase of the build is a working vertical slice: **UI → API → controller → model → database → response → UI state**.

---

## Status

Phase-based build, **Phase 01 complete**. The application runs, authenticates against MongoDB, and ships a bilingual marketing site plus the operations console shell.

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 01 | Foundation · brand · design system · i18n/RTL · landing page · authentication · console shell | ✅ Complete |
| 02 | Dashboard metrics, charts, activity feed, notifications | Planned |
| 03 | Customers and devices | Planned |
| 04 | Repair tickets and the status workflow | Planned |
| 05 | Technicians, staff and permissions | Planned |
| 06 | Inventory and spare parts | Planned |
| 07 | Quotations and customer approval | Planned |
| 08 | Invoices and payments | Planned |
| 09 | Public QR tracking | Planned |
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

- Node.js **18+** (developed against 22)
- MongoDB **6+**, running locally or a MongoDB Atlas connection string
- npm 9+

### 1. Install

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure

```bash
# server
cp server/.env.example server/.env

# client
cp client/.env.example client/.env
```

The development defaults work against a local MongoDB with no changes:

| Variable | Development default |
| -------- | ------------------- |
| `MONGODB_URI` | `mongodb://localhost:27017/repairflow` |
| `PORT` | `5000` |
| `CLIENT_URL` | `http://localhost:5173` |
| `VITE_API_URL` | *(empty — the dev server proxies `/api` to port 5000)* |

### 3. Seed the demo tenant

```bash
cd server
npm run seed          # idempotent — safe to run repeatedly
npm run seed -- --fresh   # clears RepairFlow collections first
```

This creates two branches and seven employees covering all six roles. The shared password and the full account list are printed at the end of the run and documented in [docs/SEED.md](docs/SEED.md).

### 4. Run

```bash
# terminal 1 — API on http://localhost:5000
cd server && npm run dev

# terminal 2 — client on http://localhost:5173
cd client && npm run dev
```

Open **http://localhost:5173**, sign in with any seeded account, and you land in the operations console.

### 5. Verify

```bash
curl http://localhost:5000/api/v1/health
```

```json
{
  "success": true,
  "message": "RepairFlow API",
  "data": {
    "version": "0.1.0",
    "environment": "development",
    "database": "connected",
    "cloudinary": "not_configured"
  }
}
```

---

## Demo accounts

Every seeded account shares one password: **`RepairFlow@2026`**

| Role | Email | Sees |
| ---- | ----- | ---- |
| Super Admin | `mahmoud.elsebaey@repairflow.app` | Everything, all branches |
| Admin | `nourhan.abdelaziz@repairflow.app` | Operations + staff administration |
| Branch Manager | `karim.mansour@repairflow.app` | Branch operations + reports |
| Technician | `youssef.ragab@repairflow.app` | Assigned work, parts consumption |
| Receptionist | `ahmed.sherif@repairflow.app` | Intake, customers, approvals, payments |
| Inventory Manager | `doaa.kamel@repairflow.app` | Stock, suppliers, movements |

Signing in as different roles is the fastest way to see how permissions shape the navigation. The login screen reads this list from `VITE_DEMO_ACCOUNTS`, so a production deployment can ship without it.

---

## Scripts

### server

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Watch mode API (`tsx watch src/server.ts`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Seed the demo tenant |
| `npm run seed:dist` | Compile, then seed without `tsx` |

> If your environment blocks the helper processes `tsx` and `vite` spawn, see [ARCHITECTURE.md §13](./docs/ARCHITECTURE.md) for the spawn-free equivalents (`node dist/server.js`, `npm run seed:dist`, and the `TMPDIR` note for client builds).

### client

| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run preview` | Serve the production build locally |

---

## Project structure

```
repairflow/
├── client/                     # React + TypeScript console and marketing site
│   ├── src/
│   │   ├── components/         # ui · layout · motion · 3d · feedback · a11y · landing · routing
│   │   ├── config/             # navigation model and permissions
│   │   ├── features/           # auth (slice · api · schemas · components)
│   │   ├── hooks/              # theme · language · media query · reduced motion · title
│   │   ├── i18n/               # index + locales/{ar,en}.ts
│   │   ├── layouts/            # MainLayout (public) · AppLayout (console)
│   │   ├── lib/                # env · apiClient · storage · utils
│   │   ├── pages/              # LandingPage · auth/* · app/* · NotFoundPage
│   │   ├── store/              # store · uiSlice · hooks
│   │   ├── styles/             # tokens.css · index.css · vendor.css
│   │   └── types/              # api · auth · domain
│   └── public/brand/
│
├── server/                     # Express + TypeScript API
│   ├── api/[...path].ts        # Vercel serverless entry
│   └── src/
│       ├── config/             # strict environment resolution
│       ├── controllers/        # authController
│       ├── middleware/         # auth · errorHandler · rateLimit
│       ├── models/             # User · Branch
│       ├── routes/             # authRoutes
│       ├── seed/               # seed runner + realistic data
│       ├── types/              # domain vocabulary (roles, statuses, device types)
│       ├── utils/              # AppError · asyncHandler · codes
│       ├── validators/         # Zod schemas
│       ├── app.ts              # Express app (importable, no listener)
│       └── server.ts           # listener + graceful shutdown
│
├── docs/                       # ARCHITECTURE · DEPLOY · QA_CHECKLIST · SEED · PROJECT_PHASES
├── client/vercel.json
├── server/vercel.json
└── .gitignore
```

---

## Design system

RepairFlow has its own identity — deliberately nothing like a fashion storefront or a generic admin template.

**Direction:** operations · technology · field service. Deep graphite ink, layered surfaces, soft borders, and indigo→cyan energy reserved for live and active states. No gold, no neon, no glassmorphism as decoration.

| Token | Dark | Purpose |
| ----- | ---- | ------- |
| `--primary` | `#4F5BF5` | RepairFlow indigo — actions, active navigation |
| `--secondary` | `#22D3EE` | Live signal cyan — tracking, telemetry |
| `--accent` | `#F59E0B` | Operational waiting amber |
| `--success` | `#14B8A6` | Completed work teal |
| `--danger` | `#F04438` | Failures, cancellations |
| `--background` | `#070A12` | Brand ink |
| `--surface` / `--elevated` | `#0E1420` / `#151E2E` | Layered depth |

Every colour, space, radius, shadow, gradient, duration and easing curve lives in [`client/src/styles/tokens.css`](client/src/styles/tokens.css). Tailwind reads those variables and nothing else, so changing a token re-themes the entire product — both themes included.

**Typography** — Inter (Latin), Cairo (Arabic), JetBrains Mono for ticket codes and figures. Arabic is a first-class locale: switching language re-lays-out navigation, tables, forms, charts and icon direction, and ticket codes stay LTR inside RTL text.

---

## Security

- bcrypt password hashing at cost 12; passwords are `select: false` and never serialised
- Short-lived access tokens (15 min) plus rotating refresh tokens **stored hashed** — a database dump yields no usable session
- Refresh rotation revokes the previous token; password change invalidates every other session
- Identical responses for "no such account" and "wrong password" to prevent staff enumeration
- Zod validation on every mutating endpoint before any query runs
- Helmet, origin-scoped CORS, three tiers of rate limiting
- Centralised error handler — internal messages are hidden in production, and a `requestId` is logged instead
- Configuration refuses to boot in production with missing, short or placeholder secrets
- No secrets in the repository; both `.env.example` files document every required variable

---

## Documentation

| Document | Contents |
| -------- | -------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data model, API design, auth flow, conventions |
| [DEPLOY.md](docs/DEPLOY.md) | Vercel + MongoDB Atlas + Cloudinary production setup |
| [SEED.md](docs/SEED.md) | Demo tenant contents, credentials, how to re-seed |
| [QA_CHECKLIST.md](docs/QA_CHECKLIST.md) | Per-phase verification and release checklist |
| [PROJECT_PHASES.md](docs/PROJECT_PHASES.md) | All 14 phases and what ships in each |

---

## License

Private project. All rights reserved.
