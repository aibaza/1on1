#!/usr/bin/env bash
# Rebuild and restart the UAT Docker container for 1on1.
# Non-blocking — intended to be called from hooks (runs in background by caller).
#
# Usage: rebuild-uat.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$REPO_ROOT/scripts/hooks/rebuild-uat.log"

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting UAT rebuild..."
  cd "$REPO_ROOT"
  docker compose build app 2>&1
  docker compose up -d app 2>&1
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] UAT rebuild complete — https://1on1.surmont.co/"
} >> "$LOG" 2>&1
