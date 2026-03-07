#!/usr/bin/env bash
# PostToolUse:Bash hook — fires after every Bash tool call.
# Detects plan and phase completion commits and triggers:
#   - Phase complete: WhatsApp notification + Docker UAT rebuild + wiki push
#   - Plan complete:  WhatsApp notification + Docker UAT rebuild
#
# Receives JSON on stdin from Claude Code.

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$REPO_ROOT/scripts/hooks/progress-hook.log"

# Read stdin (JSON from Claude Code hook system)
INPUT=$(cat 2>/dev/null || echo "{}")

# Extract the bash command that was run
COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('command', ''))
except:
    print('')
" 2>/dev/null || echo "")

# Only care about git commit invocations
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

# Get the latest commit message from git log
COMMIT_MSG=$(cd "$REPO_ROOT" && git log --format="%s" -1 2>/dev/null || echo "")
if [ -z "$COMMIT_MSG" ]; then
  exit 0
fi

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Checking commit: $COMMIT_MSG" >> "$LOG"

# ── Phase complete ────────────────────────────────────────────────────────────
# Matches: "docs(phase-N): complete phase execution and verification"
if echo "$COMMIT_MSG" | grep -qE "^docs\(phase-[0-9]+(\.[0-9]+)?\): complete phase"; then
  PHASE_NUM=$(echo "$COMMIT_MSG" | grep -oE "phase-[0-9]+(\.[0-9]+)?" | grep -oE "[0-9]+(\.[0-9]+)?")
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Phase $PHASE_NUM complete — triggering full suite" >> "$LOG"

  # Rebuild UAT (background)
  bash "$REPO_ROOT/scripts/hooks/rebuild-uat.sh" &
  disown

  # Push wiki (background)
  bash "$REPO_ROOT/scripts/push-wiki.sh" >> "$LOG" 2>&1 &
  disown

  # WhatsApp to Ciprian
  bash "$REPO_ROOT/scripts/hooks/notify-ciprian.sh" \
    "✅ 1on1 — Phase $PHASE_NUM complete. Wiki updated. UAT rebuilding at https://1on1.surmont.co/" &
  disown

  exit 0
fi

# ── Plan complete ─────────────────────────────────────────────────────────────
# Matches: "docs(N-N): complete <anything>" (e.g. "docs(16-01): complete import schema plan")
if echo "$COMMIT_MSG" | grep -qE "^docs\([0-9]+-[0-9]+\): complete"; then
  PLAN_ID=$(echo "$COMMIT_MSG" | grep -oE "[0-9]+-[0-9]+" | head -1)
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Plan $PLAN_ID complete — triggering rebuild + notify" >> "$LOG"

  # Rebuild UAT (background)
  bash "$REPO_ROOT/scripts/hooks/rebuild-uat.sh" &
  disown

  # WhatsApp to Ciprian
  bash "$REPO_ROOT/scripts/hooks/notify-ciprian.sh" \
    "🔨 1on1 — Plan $PLAN_ID complete. UAT rebuilding at https://1on1.surmont.co/" &
  disown

  exit 0
fi

exit 0
