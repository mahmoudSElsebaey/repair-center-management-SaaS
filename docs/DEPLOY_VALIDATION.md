# RepairFlow — Deployment validation (Phase 14)

Run after every production or staging deploy.

## 1. Build

```bash
# Server
cd server && npm ci && npm run typecheck && npm run build

# Client
cd client && npm ci && npm run typecheck && npm run verify:i18n && npm run build
```

## 2. Environment

Confirm Vercel / host has:

| Variable | Required |
| -------- | -------- |
| `MONGODB_URI` | yes |
| `JWT_ACCESS_SECRET` | yes (≥48 chars) |
| `JWT_REFRESH_SECRET` | yes (≥48 chars) |
| `CLIENT_ORIGIN` | yes (SPA URL) |
| `NODE_ENV=production` | yes |
| `TRUST_PROXY=true` | yes on Vercel |
| `VITE_API_BASE_URL` | client |

## 3. Health probes

```bash
curl -sS https://API_HOST/api/v1/health | jq
# expect: { "success": true, "status": "ok", ... }

curl -sS https://API_HOST/api/v1/ready | jq
# expect: { "success": true, "status": "ready", "mongo": "connected" }
```

## 4. Security headers

```bash
curl -sI https://API_HOST/api/v1/health | grep -iE 'strict-transport|x-content-type|x-frame|content-security|referrer-policy'
```

Expect HSTS, `X-Content-Type-Options: nosniff`, frame denial, CSP (if configured).

## 5. CORS

```bash
curl -sI -H "Origin: https://WRONG.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://API_HOST/api/v1/health
# should not reflect wrong origin

curl -sI -H "Origin: https://YOUR_SPA_ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS https://API_HOST/api/v1/health
# Access-Control-Allow-Origin should match SPA
```

## 6. Auth smoke

1. Open SPA → login with seed admin  
2. Confirm access token received and dashboard loads  
3. Open Network tab: no 401 loops; refresh works once  
4. Logout → protected routes redirect to login  

## 7. Domain smoke (10 minutes)

| Step | Expected |
| ---- | -------- |
| Create customer + device | Success toast, appears in list |
| Open repair ticket | Code `RF-YYYY-#####` assigned |
| Move status → diagnosis → quotation | Timeline updates |
| Approve quotation (or staff override) | Ticket → approved |
| Issue invoice + record payment | Balance decreases |
| Open `/track/CODE` logged out | Public status, no PII leak |
| Schedule appointment | Conflict rejected if overlap |
| Open Reports for last 30 days | KPIs + charts render |
| Activity log | New rows for invoice/appointment actions |

## 8. Rate limit smoke

```bash
# Rapid-fire public track (should eventually 429)
for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}\n" https://API_HOST/api/v1/track/RF-TEST; done
```

## 9. Rollback plan

- Keep previous Vercel deployment instant-rollback ready  
- MongoDB Atlas snapshot before schema-heavy deploys  
- Feature flags not required for Phase 14; if a route breaks, redeploy previous git SHA  

## Sign-off

| Role | Name | Date | OK |
| ---- | ---- | ---- | -- |
| Engineer | | | ☐ |
| Reviewer | | | ☐ |
