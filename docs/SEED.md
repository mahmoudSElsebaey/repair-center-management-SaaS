# Fixer — Seed Data

Fixer ships a realistic development tenant so every screen can be exercised without hand-typing records. The data models an Egyptian repair chain with a flagship workshop in Cairo and a satellite service point in Alexandria.

---

## Running the seed

```bash
cd server

npm run seed              # idempotent — converges the demo tenant
npm run seed -- --fresh   # clears Fixer collections first, then seeds
```

If `tsx` cannot launch its helper process in your environment (see [ARCHITECTURE.md §13](./ARCHITECTURE.md)), use the spawn-free variant, which compiles first and then runs the emitted JavaScript:

```bash
npm run seed:dist
npm run seed:dist -- --fresh
```

The runner connects using `MONGODB_URI` from `server/.env` and prints the full credential list when it finishes.

### What "idempotent" means here

- Running it twice does not create duplicates.
- It uses `findOneAndUpdate(..., { upsert: true })` on natural keys — `Branch.code` and `User.email`.
- It **never drops collections** unless `--fresh` is passed.
- Re-seeding updates an existing employee's name, phone, role and branch but **does not reset their password**, so a password changed locally survives.

---

## Sign-in credentials

All seeded accounts share one password.

| | |
| --- | --- |
| **Password** | `RepairFlow@2026` |

Override it for a specific run:

```bash
# server
SEED_PASSWORD='YourStrongerPassword' npm run seed
```

If you override it, set the matching `VITE_DEMO_PASSWORD` in `client/.env` so the demo panel on the login screen prefills correctly.

### Accounts

| Role | Name | Email | Branch |
| ---- | ---- | ----- | ------ |
| `super_admin` | Mahmoud Said El-Sebaey | `mahmoud.elsebaey@fixer.app` | *all branches* |
| `admin` | Nourhan Abdelaziz | `nourhan.abdelaziz@fixer.app` | CAI-01 |
| `manager` | Karim Fathy Mansour | `karim.mansour@fixer.app` | CAI-01 |
| `technician` | Youssef Hany Ragab | `youssef.ragab@fixer.app` | CAI-01 |
| `technician` | Salma Ibrahim Zaki | `salma.zaki@fixer.app` | ALX-02 |
| `receptionist` | Ahmed Gamal Sherif | `ahmed.sherif@fixer.app` | CAI-01 |
| `inventory_manager` | Doaa Mostafa Kamel | `doaa.kamel@fixer.app` | CAI-01 |

Sign in as several of them. The sidebar is generated from the navigation model filtered by role, so a technician and a super admin genuinely see different products.

---

## Branches

| Code | Name | City | Phone |
| ---- | ---- | ---- | ----- |
| `CAI-01` | Nasr City Flagship Workshop | Cairo | +20 2 2670 4412 |
| `ALX-02` | Smouha Service Point | Alexandria | +20 3 425 8890 |

`super_admin` has no branch and therefore sees every branch. Every other role is scoped to one.

---

## Customers (staged for Phase 03)

Six customer profiles are staged in [`server/src/seed/data/customers.ts`](../server/src/seed/data/customers.ts) and are persisted in Phase 03 together with their devices. They were written to exercise the fields the product actually cares about:

| Customer | Why they exist in the seed |
| -------- | -------------------------- |
| Hesham Adel Barakat | Prefers WhatsApp for approval updates — tests notification preference |
| Mariam Tarek El-Gohary | Straightforward walk-in |
| Omar Sherif Nabil | Corporate account — invoices must carry a VAT number |
| Rania Fouad Selim | Alexandria branch, Arabic locale |
| Ziad Khaled Hosny | Alexandria branch, repeat device owner |
| Aya Mahmoud Roshdy | Cairo, newest customer |

---

## Data quality rules

The seed exists to make development honest, so it follows three rules:

1. **No placeholder data.** No `John Doe`, no `test@test.com`, no `123456`. Names, phone numbers, addresses and cities are shaped like real Egyptian records.
2. **Business-meaningful variety.** Every role is represented, both branches are staffed, and at least one account is scoped to all branches. Later phases add tickets across the full status range, parts at and below minimum, and invoices in both settled and outstanding states.
3. **Credentials are documented, not hidden.** Demo accounts are development-only, they are printed by the seed, listed above, and surfaced on the login screen from `VITE_DEMO_ACCOUNTS`. A deployment without that variable shows no demo panel at all.

---

## Environment variables involved

| Variable | Where | Default |
| -------- | ----- | ------- |
| `MONGODB_URI` | `server/.env` | `mongodb://localhost:27017/repairflow` |
| `SEED_PASSWORD` | shell / `server/.env` | `RepairFlow@2026` |
| `VITE_DEMO_ACCOUNTS` | `client/.env` | the five accounts listed above |
| `VITE_DEMO_PASSWORD` | `client/.env` | `RepairFlow@2026` |

---

## Resetting

```bash
# Remove only Fixer data and reseed
cd server && npm run seed -- --fresh

# Or remove the database entirely, then reseed
mongosh --eval "db.getSiblingDB('repairflow').dropDatabase()"
cd server && npm run seed
```

> `--fresh` clears only the collections RepairFlow owns (`users`, `branches`). It will not touch unrelated collections in the same database.

---

## Production

**Do not run the seed against a production database.** It creates accounts with a shared, documented password. Production tenants are provisioned deliberately: one `super_admin` created through a controlled process, then real branches and staff added through the application in Phase 05.
