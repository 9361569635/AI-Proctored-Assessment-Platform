#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-http://localhost:4000}"
ready="$(curl -fsS "$BASE_URL/health/ready")"
echo "$ready"
echo "$ready" | grep -q '"status":"ready"'
echo "Deployment readiness check passed."
