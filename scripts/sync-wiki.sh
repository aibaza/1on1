#!/usr/bin/env bash
set -euo pipefail

# Sync docs/wiki/*.md to the GitHub Wiki git repo.
#
# Prerequisites:
#   1. The wiki must be initialized (first page created via GitHub web UI)
#   2. Git push access to the wiki repo (the gh CLI OAuth token works fine
#      once the wiki exists; alternatively use SSH or PAT)
#
# Usage:
#   ./scripts/sync-wiki.sh           # sync using default HTTPS URL
#   WIKI_GIT_URL=git@github.com:dobrician/1on1.wiki.git ./scripts/sync-wiki.sh  # SSH

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_DIR="$REPO_ROOT/docs/wiki"
TMP_DIR="$(mktemp -d)"
WIKI_URL="${WIKI_GIT_URL:-https://github.com/dobrician/1on1.wiki.git}"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Check if wiki repo exists
echo "Checking wiki repo..."
if ! git ls-remote "$WIKI_URL" &>/dev/null; then
  echo ""
  echo "ERROR: Wiki repo not found at $WIKI_URL"
  echo ""
  echo "The GitHub Wiki must be initialized first:"
  echo "  1. Go to https://github.com/dobrician/1on1/wiki"
  echo "  2. Click 'Create the first page'"
  echo "  3. Click 'Save page'"
  echo "  4. Run this script again"
  echo ""
  echo "Alternatively, trigger the sync-wiki GitHub Actions workflow"
  echo "from the Actions tab after creating the first page."
  exit 1
fi

echo "Cloning wiki repo..."
git clone "$WIKI_URL" "$TMP_DIR/wiki"

echo "Copying wiki pages..."
cp "$WIKI_DIR"/*.md "$TMP_DIR/wiki/"

cd "$TMP_DIR/wiki"
git add -A

if git diff --cached --quiet; then
  echo "Wiki is already up to date."
  exit 0
fi

git commit -m "Sync wiki from main repo ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push
echo "Wiki synced successfully."
