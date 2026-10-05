# Fixer — Security checklist (Phase 14)

Use this list before every production deploy. Mark each item when verified.

## Secrets & configuration

- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are ≥ 48 random characters and unique per environment
- [ ] No secrets in client bundle (`VITE_*` only for public config)
- [ ] `.env` / Vercel env vars not committed; `.env.example` is the only template in git
- [ ] MongoDB user is least-privilege (readWrite on app DB only; no atlasAdmin in production)
- [ ] Cloudinary (if used) keys restricted to upload-only where possible

## HTTP & transport

- [ ] HTTPS only in production (Vercel / reverse proxy terminates TLS)
- [ ] `CLIENT_ORIGIN` set to the real SPA origin (no `*`, no localhost)
- [ ] Helmet enabled with HSTS (2 years) and CSP in production
- [ ] `x-powered-by` disabled
- [ ] `trust proxy` enabled when behind Vercel / load balancer

## Auth

- [ ] Access tokens short-lived (≤ 15m); refresh tokens rotated on use
- [ ] Password hashing via bcrypt with cost ≥ 12
- [ ] Login / refresh endpoints use `authLimiter`
- [ ] Sensitive responses send `Cache-Control: no-store`
- [ ] Role checks (`restrictTo`) on every mutating admin route

## API surface

- [ ] Global rate limit active on `/api/v1`
- [ ] Public `/track` limited separately (`publicLimiter`)
- [ ] Body size capped (≤ 1mb JSON)
- [ ] Zod validation on all write endpoints
- [ ] Error handler never returns stack traces in production
- [ ] Branch scope (`resolveScope`) enforced for non–super-admin roles

## Data

- [ ] Critical indexes ensured at boot (`ensureIndexes`)
- [ ] Activity log is append-only (no update/delete routes)
- [ ] Public track payload excludes internal notes / costs / staff PII
- [ ] Soft-delete or status flags preferred over hard deletes for customers/repairs

## Client

- [ ] Auth tokens stored securely (memory + httpOnly cookie preferred; if localStorage, document XSS risk)
- [ ] Axios interceptor clears session on 401 and redirects to login
- [ ] No API base URL hard-coded; uses `VITE_API_BASE_URL`
- [ ] Production build (`npm run build`) succeeds with zero type errors

## Operations

- [ ] `/api/v1/health` returns 200 without auth
- [ ] `/api/v1/ready` fails (503) when Mongo is down
- [ ] Structured logs include `X-Request-Id`
- [ ] Backup / point-in-time recovery enabled on Atlas
- [ ] Deploy smoke test: login → create customer → open repair → issue invoice
