#!/usr/bin/env bash
set -euo pipefail

# Fast wiki push: mirrors docs/wiki/*.md to the GitHub wiki repo and pushes changes.
# Removes wiki pages that no longer exist in docs/wiki/ (e.g., deleted sprint files).
#
# Usage: ./scripts/push-wiki.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_DIR="$REPO_ROOT/docs/wiki"
TMP_DIR="$(mktemp -d)"
WIKI_URL="${WIKI_GIT_URL:-https://github.com/aibaza/1on1.wiki.git}"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

git clone --quiet --depth 1 "$WIKI_URL" "$TMP_DIR/wiki" 2>/dev/null

# Remove wiki .md files that no longer exist in source (mirror deletions)
for f in "$TMP_DIR/wiki/"*.md; do
    base="$(basename "$f")"
    if [ ! -f "$WIKI_DIR/$base" ]; then
        rm "$f"
    fi
done

cp "$WIKI_DIR"/*.md "$TMP_DIR/wiki/"

cd "$TMP_DIR/wiki"
git add -A

if git diff --cached --quiet; then
    echo "wiki: already up to date"
    exit 0
fi

git commit --quiet -m "Update wiki ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
git push --quiet
echo "wiki: pushed updates"
