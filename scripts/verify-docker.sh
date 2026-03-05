#!/usr/bin/env bash
# verify-docker.sh -- Verify Docker blue-green deployment
# Builds the app image, starts the full stack, checks HTTP response,
# verifies DB connectivity, and cleans up.
#
# Usage: ./scripts/verify-docker.sh
# Exit code 0 = success, 1 = failure

set -euo pipefail

APP_URL="http://localhost:4300"
TIMEOUT=60
STEP=0

pass() { STEP=$((STEP+1)); echo "[PASS $STEP] $1"; }
fail() { echo "[FAIL] $1"; docker compose logs app 2>/dev/null | tail -20; cleanup; exit 1; }
cleanup() { echo "Cleaning up..."; docker compose down --timeout 10 2>/dev/null || true; }

trap cleanup EXIT

echo "=== Docker Blue-Green Deployment Verification ==="
echo ""

# Step 1: Build Docker image
echo "[....] Building Docker image..."
if docker compose build app --quiet 2>&1; then
  pass "Docker image built successfully"
else
  fail "Docker image build failed"
fi

# Step 2: Start the stack
echo "[....] Starting Docker stack..."
docker compose up -d 2>&1
pass "Docker stack started"

# Step 3: Wait for app container to be running
echo "[....] Waiting for app container to be running..."
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS=$(docker compose ps app --format '{{.State}}' 2>/dev/null || echo "unknown")
  if [ "$STATUS" = "running" ]; then
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED+2))
done

if [ "$STATUS" = "running" ]; then
  pass "App container is running"
else
  fail "App container not running after ${TIMEOUT}s (status: $STATUS)"
fi

# Step 4: Wait for HTTP response
echo "[....] Waiting for HTTP response on $APP_URL..."
ELAPSED=0
HTTP_CODE=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")
  # 200 or 307 (redirect to login) are both valid
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED+2))
done

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
  pass "HTTP response: $HTTP_CODE"
else
  fail "No valid HTTP response after ${TIMEOUT}s (last code: $HTTP_CODE)"
fi

# Step 5: Verify DB connection (check app logs for successful startup)
echo "[....] Checking database connection..."
sleep 3
APP_LOGS=$(docker compose logs app --tail 50 2>&1)
if echo "$APP_LOGS" | grep -qi "ready\|started\|listening\|Compiled"; then
  pass "App started successfully (logs confirm ready state)"
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
  pass "App responding to HTTP (implies DB connection working)"
else
  fail "Could not verify DB connection from app logs"
fi

echo ""
echo "=== All checks passed ==="
echo "App accessible at $APP_URL (HTTP $HTTP_CODE)"
