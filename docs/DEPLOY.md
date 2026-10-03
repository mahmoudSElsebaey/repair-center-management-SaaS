# RepairFlow — Deployment

Production deployment for RepairFlow: **Vercel** for the client, **Vercel** for the API, **MongoDB Atlas** for data, **Cloudinary** for images.

The two applications deploy separately. Deploy the API first — the client needs its URL.

---

## 1. MongoDB Atlas

1. Create a project and an **M0** (free) or larger cluster.
2. **Database Access** → add a user with `readWrite` on the RepairFlow database. Use a generated password, not an account password.
3. **Network Access** → allow Vercel. Vercel's serverless egress IPs are not static, so either allow `0.0.0.0/0` (acceptable because access still requires credentials) or attach a static egress IP through a Vercel integration and allow only that.
4. **Connect** → *Drivers* → copy the SRV string:

```
mongodb+srv://repairflow_user:PASSWORD@cluster0.xxxxx.mongodb.net/repairflow?retryWrites=true&w=majority
```

Notes:

- The database name (`/repairflow`) must be in the path. Without it, Mongoose writes into `test`.
- URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
- Create indexes on production data. Mongoose builds the ones declared in the schemas, but confirm they exist after the first deploy.
- Enable **point-in-time recovery** once the tenant holds real work.

---

## 2. Cloudinary

1. Create an account and note the **cloud name**, **API key** and **API secret** from the dashboard.
2. Create folders matching `CLOUDINARY_FOLDER` (default `repairflow`), with subfolders for `devices`, `parts`, `avatars` and `repairs` as those phases land.
3. Optional but recommended: add an upload preset restricted to `image/*`, and cap the maximum upload size.
4. Use a **separate Cloudinary account per environment** so a development upload can never overwrite production media.

The API refuses to boot in production when Cloudinary is only partially configured. In development it degrades gracefully and upload endpoints report that they are unavailable.

---

## 3. Deploy the API to Vercel

### 3.1 Import

1. Vercel → **Add New** → **Project** → import the repository.
2. **Root Directory:** `server`
3. Framework preset: **Other**
4. Build and output settings are read from `server/vercel.json`, which routes every request to the single serverless function at `api/[...path].ts`.

### 3.2 Environment variables

Add these in **Settings → Environment Variables** for Production, Preview and Development:

| Variable | Value |
| -------- | ----- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the Atlas SRV string |
| `CLIENT_URL` | `https://your-client.vercel.app` (comma-separate for preview URLs) |
| `JWT_ACCESS_SECRET` | 32+ random characters |
| `JWT_REFRESH_SECRET` | 32+ random characters, **different** from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary |
| `CLOUDINARY_API_KEY` | from Cloudinary |
| `CLOUDINARY_API_SECRET` | from Cloudinary |
| `CLOUDINARY_FOLDER` | `repairflow` |
| `API_VERSION` | `0.1.0` |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**The API deliberately refuses to start in production** if either JWT secret is missing, shorter than 32 characters, or contains a placeholder marker such as `change_me`, `secret` or `password`; if `MONGODB_URI` is missing or points at localhost; or if Cloudinary is partially configured. A failed deployment here is the guard working, not a bug.

Do **not** set `PORT` — the serverless runtime owns it.

### 3.3 Verify

```bash
curl https://your-api.vercel.app/api/v1/health
```

```json
{
  "success": true,
  "data": {
    "version": "0.1.0",
    "environment": "production",
    "database": "connected",
    "cloudinary": "configured"
  }
}
```

If `database` is not `connected`, the response is `503` and the cause is almost always the Atlas IP allow-list or an unencoded character in the password.

---

## 4. Deploy the client to Vercel

1. Vercel → **Add New** → **Project** → import the same repository again.
2. **Root Directory:** `client`
3. Framework preset: **Vite** (build `npm run build`, output `dist`), also declared in `client/vercel.json`.
4. Environment variables:

| Variable | Value |
| -------- | ----- |
| `VITE_API_URL` | `https://your-api.vercel.app/api/v1` |
| `VITE_APP_NAME` | `RepairFlow` |
| `VITE_DEFAULT_LOCALE` | `ar` |
| `VITE_DEFAULT_THEME` | `dark` |
| `VITE_PUBLIC_TRACK_BASE` | `https://your-client.vercel.app` |
| `VITE_DEMO_ACCOUNTS` | *(leave empty in production unless it is a demo tenant)* |
| `VITE_DEMO_PASSWORD` | *(leave empty in production)* |

`client/vercel.json` rewrites all paths to `index.html` for client-side routing and sets long-lived caching on hashed assets plus baseline security headers.

### Order of operations

`VITE_API_URL` is baked in at build time. If you change it, **redeploy the client** — editing the variable alone does nothing until the next build.

---

## 5. CORS

The API allows exactly the origins listed in `CLIENT_URL`, comma-separated:

```
CLIENT_URL=https://repairflow.vercel.app,https://repairflow-git-main-you.vercel.app
```

If you use Vercel preview deployments, either add each preview origin or set a wildcard-capable preview domain. A request from an unlisted origin fails the preflight — that is the allow-list working as intended.

---

## 6. Production checklist

Before going live:

- [ ] `GET /api/v1/health` returns `success: true` with `database: connected`
- [ ] Both JWT secrets are 32+ random characters and different from each other
- [ ] `NODE_ENV=production` on the API
- [ ] `CLIENT_URL` lists the real client origin(s) and nothing else
- [ ] `VITE_API_URL` points at the deployed API, and the client was rebuilt afterwards
- [ ] `VITE_DEMO_ACCOUNTS` and `VITE_DEMO_PASSWORD` are **empty** on a real tenant
- [ ] The seed script has **not** been run against production
- [ ] One `super_admin` exists, created deliberately
- [ ] Atlas IP allow-list is as narrow as your setup permits
- [ ] Cloudinary credentials are production-specific
- [ ] Sign-in works and a 401 correctly triggers one refresh attempt
- [ ] Signing out revokes the session server-side
- [ ] Browser console is free of errors on the landing page and the console
- [ ] `prefers-reduced-motion` is respected (3D disabled, transitions collapsed)
- [ ] Arabic and English both render with the correct direction

---

## 7. Operations

### Rotating a compromised secret

Rotating `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` invalidates every session, which is the point. Update the variable, redeploy, and tell staff they will need to sign in again.

### Adding a branch or employee

Not yet self-service — staff management arrives in Phase 05. Until then, use the API directly with a `super_admin` token:

```bash
curl -X POST https://your-api.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"…"}'
```

### Database backups

Atlas M0 takes daily snapshots with limited retention. Before onboarding a paying tenant, move to a paid tier with continuous backup and point-in-time recovery.

### Logs

- **Vercel** → Project → Logs, filtered to the `api` function. The error handler logs each unexpected failure with a `requestId` that is also returned to the client in development, which makes correlating a report with a log line straightforward.
- **Atlas** → Metrics for connections, operations and slow queries.

### Common failures

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `503 DATABASE_UNAVAILABLE` | Atlas unreachable | Check the IP allow-list and URL-encode the password |
| Deployment fails immediately | A weak or missing secret | The config guard refused to start — set real secrets |
| Preflight/CORS error | Client origin missing | Add it to `CLIENT_URL` and redeploy the API |
| Client calls `localhost:5000` | `VITE_API_URL` empty or changed after build | Set it and redeploy the client |
| Everyone is signed out | A JWT secret rotated | Expected — sign in again |
| Uploads rejected | Cloudinary incomplete | Set all three credentials |
