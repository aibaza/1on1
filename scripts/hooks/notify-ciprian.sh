#!/usr/bin/env bash
# Send a WhatsApp notification to Ciprian (+40769808800) via OpenClaw.
# Usage: notify-ciprian.sh "message text"
#
# Runs non-interactively — safe to call from hooks.

set -euo pipefail

CIPRIAN="+40769808800"
MSG="${1:-}"

if [ -z "$MSG" ]; then
  echo "notify-ciprian: no message provided" >&2
  exit 1
fi

# Escape the message for the prompt and ask the agent to relay it verbatim.
PROMPT="Reply with ONLY this exact text, nothing else: ${MSG}"

openclaw agent \
  --to "$CIPRIAN" \
  --channel whatsapp \
  --deliver \
  --message "$PROMPT" \
  --timeout 30 \
  > /dev/null 2>&1 || true  # never fail the caller
