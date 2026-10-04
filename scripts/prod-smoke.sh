#!/usr/bin/env bash
# Phase 14 — quick production smoke against a live API base URL.
# Usage: API_BASE=https://api.example.com/api/v1 ./prod-smoke.sh

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:5000/api/v1}"
FAIL=0

green() { printf '\033[32m✓ %s\033[0m\n' "$*"; }
red()   { printf '\033[31m✗ %s\033[0m\n' "$*"; FAIL=1; }

echo "Smoke testing $API_BASE"

# Health
code=$(curl -sS -o /tmp/rf-health.json -w '%{http_code}' "$API_BASE/health" || true)
if [[ "$code" == "200" ]]; then
  green "GET /health → 200"
else
  red "GET /health → $code"
fi

# Ready
code=$(curl -sS -o /tmp/rf-ready.json -w '%{http_code}' "$API_BASE/ready" || true)
if [[ "$code" == "200" ]]; then
  green "GET /ready → 200"
else
  red "GET /ready → $code (Mongo down or HEALTH_DEEP_CHECK)"
fi

# Security headers on health
headers=$(curl -sSI "$API_BASE/health" || true)
if echo "$headers" | grep -qi 'x-content-type-options'; then
  green "X-Content-Type-Options present"
else
  red "Missing X-Content-Type-Options"
fi

if echo "$headers" | grep -qi 'x-request-id'; then
  green "X-Request-Id present"
else
  red "Missing X-Request-Id (requestId middleware?)"
fi

# 404 shape
code=$(curl -sS -o /tmp/rf-404.json -w '%{http_code}' "$API_BASE/this-route-does-not-exist" || true)
if [[ "$code" == "404" ]]; then
  green "Unknown route → 404 JSON"
else
  red "Unknown route → $code (expected 404)"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "All smoke checks passed."
  exit 0
else
  echo "One or more smoke checks failed."
  exit 1
fi
