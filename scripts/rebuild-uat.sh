#!/bin/bash
# Rebuild UAT (Docker stack), run migrations, and seed demo data.
# Safe to run multiple times — migrations and seed are both idempotent.
set -e

cd "$(dirname "$0")/.."

echo "==> Rebuilding UAT Docker stack..."
docker compose down
docker compose up -d --build

echo "==> Waiting for DB to be healthy..."
until docker compose exec -T db pg_isready -U postgres -q; do
  sleep 2
done

echo "==> Running migrations..."
SEED_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oneonone_stable \
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oneonone_stable \
  bunx drizzle-kit migrate

echo "==> Seeding UAT data..."
SEED_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oneonone_stable \
  bun run src/lib/db/seed.ts

echo ""
echo "UAT ready at https://1on1.surmont.co"
echo "  ciprian@techvibe.example.com / password123"
echo "  bob@acme.example.com / password123"
