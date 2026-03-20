#!/bin/bash
# Quick deploy: build locally + fast Docker rebuild (~3s vs ~2min)
# Skips bun install/build in Docker — uses local .next output
set -e

echo "→ Building locally..."
bun run build

echo "→ Deploying to Docker (prebuilt)..."
# Swap dockerignore to allow .next through
cp .dockerignore .dockerignore.bak
cp .dockerignore.prebuilt .dockerignore

# Build image directly with prebuilt Dockerfile
docker build -t 1on1-app -f Dockerfile.prebuilt .

# Restore dockerignore
mv .dockerignore.bak .dockerignore

# Restart just the app container
docker compose up -d app --no-deps

echo "→ Done! UAT at https://1on1.surmont.co/"
