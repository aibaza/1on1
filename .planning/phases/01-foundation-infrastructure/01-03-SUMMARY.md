---
phase: 01-foundation-infrastructure
plan: 03
subsystem: infra
tags: [aes-256-gcm, hkdf, encryption, vitest, seed-data, multi-tenancy, node-postgres]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure/01-01
    provides: Next.js project with Bun, Docker Compose PostgreSQL, .env configuration
  - phase: 01-foundation-infrastructure/01-02
    provides: Complete Drizzle schema with 14 tables, RLS policies, withTenantContext()
provides:
  - AES-256-GCM encryption with HKDF per-tenant key derivation and key versioning
  - encryptNote/decryptNote functions for private note encryption at rest
  - Vitest test framework with path aliases and 11 passing encryption tests
  - Idempotent seed script with two tenants (Acme Corp + Beta Inc) for multi-tenancy testing
  - Verified RLS tenant isolation with seeded data
affects: [02-auth, 03-user-management, 05-session-wizard, all-private-note-features]

# Tech tracking
tech-stack:
  added: [vitest 4.0.18, "@vitest/coverage-v8 4.0.18", pg 8.19.0]
  patterns: [tdd-red-green, hkdf-key-derivation, aes-256-gcm-encryption, deterministic-uuid-seeding, upsert-idempotent-seed]

key-files:
  created: [src/lib/encryption/keys.ts, src/lib/encryption/private-notes.ts, src/lib/encryption/__tests__/encryption.test.ts, src/lib/db/seed.ts, vitest.config.ts]
  modified: [package.json, .env.example, CHANGELOG.md]

key-decisions:
  - "Used node-postgres (pg) for seed script instead of Neon serverless driver (Neon requires WebSocket, local PostgreSQL uses TCP)"
  - "Deterministic UUIDs in seed data for idempotent re-runs via onConflictDoUpdate"
  - "Seed connects as postgres superuser via SEED_DATABASE_URL to bypass RLS during seeding"

patterns-established:
  - "Encryption pattern: deriveTenantKey(tenantId, keyVersion) -> encryptNote/decryptNote with EncryptedPayload JSON"
  - "Test pattern: Vitest with globals, node environment, @ path alias"
  - "Seed pattern: deterministic UUIDs, upsert via onConflictDoUpdate, separate SEED_DATABASE_URL"
  - "Seed uses pg (node-postgres) for local dev, app uses @neondatabase/serverless for production"

requirements-completed: [SEC-01, SEC-02, INFR-03]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 1 Plan 03: Encryption & Seed Data Summary

**AES-256-GCM encryption with HKDF per-tenant key derivation and comprehensive two-tenant seed data for multi-tenancy development**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T09:23:20Z
- **Completed:** 2026-03-03T09:30:12Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 8

## Accomplishments
- AES-256-GCM encryption infrastructure with HKDF key derivation from master key to per-tenant keys, supporting key versioning for rotation
- 11 passing Vitest tests covering encryption round-trips, key isolation between tenants/versions, unicode content, empty strings, and GCM tampering detection
- Comprehensive seed data with two tenants: Acme Corp (7 users, 2 teams, 2 templates, 3 series, 3 completed sessions with 15 answers, 3 action items, 1 encrypted private note) and Beta Inc (3 users, 1 template, 1 series)
- RLS tenant isolation verified: app_user with Acme tenant_id sees 7 users, Beta tenant_id sees 3 users
- Seed script is fully idempotent using deterministic UUIDs and upsert behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement encryption infrastructure with AES-256-GCM and HKDF** - `2e4ca5d` (feat, TDD)
2. **Task 2: Create development seed data with two tenants** - `db5fda0` (feat)

Task 3 (checkpoint:human-verify) pending user verification.

## Files Created/Modified
- `src/lib/encryption/keys.ts` - HKDF key derivation from master key to per-tenant 32-byte AES keys
- `src/lib/encryption/private-notes.ts` - AES-256-GCM encrypt/decrypt with EncryptedPayload JSON format and key versioning
- `src/lib/encryption/__tests__/encryption.test.ts` - 11 test cases for encryption round-trips, key isolation, unicode, tampering
- `src/lib/db/seed.ts` - Idempotent seed script with Acme Corp and Beta Inc tenant data
- `vitest.config.ts` - Vitest configuration with globals, node environment, and @ path alias
- `package.json` - Added test scripts, vitest, @vitest/coverage-v8, pg dependencies
- `.env.example` - Added SEED_DATABASE_URL template
- `CHANGELOG.md` - Updated with encryption and seed data entries

## Decisions Made
- Used node-postgres (pg) for the seed script instead of Neon serverless driver. The Neon driver requires WebSocket connections which are not available on local PostgreSQL. The seed script is a dev-only tool so using a different driver is acceptable. Production app code continues using @neondatabase/serverless.
- Deterministic UUIDs (hardcoded) for all seed entities enable idempotent re-runs. Combined with `onConflictDoUpdate` on the primary key, the seed script can be run multiple times producing identical results.
- Seed connects as postgres superuser via SEED_DATABASE_URL to bypass RLS during seeding, since the seed needs to write data across multiple tenants without tenant context.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used node-postgres instead of Neon serverless driver for seed script**
- **Found during:** Task 2 (seed script execution)
- **Issue:** Neon serverless driver requires WebSocket connections (`wss://localhost/v2`); local PostgreSQL only supports TCP
- **Fix:** Installed `pg` package, used `drizzle-orm/node-postgres` adapter instead of `drizzle-orm/neon-serverless`
- **Files modified:** `src/lib/db/seed.ts`, `package.json`
- **Verification:** Seed runs successfully, data verified in database
- **Committed in:** `db5fda0` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Driver change only affects the seed script (dev tool). No impact on application code or production behavior.

## Issues Encountered
- Neon serverless driver cannot connect to local PostgreSQL (same issue as Plan 01-02). Resolved by using node-postgres for the seed script. This is a known limitation documented in STATE.md.

## User Setup Required

**Vercel deployment** requires manual configuration by the user:
- Create Vercel project linked to GitHub repo
- Set `DATABASE_URL` and `ENCRYPTION_MASTER_KEY` environment variables in Vercel
- Optionally install Neon Vercel integration for automated DATABASE_URL provisioning

Details are documented in the plan's `user_setup` section.

## Next Phase Readiness
- Phase 1 foundation is complete: project scaffolding, database schema, RLS, encryption, and seed data
- Pending: Task 3 human-verify checkpoint for end-to-end verification
- After checkpoint approval, Phase 2 (Authentication & Organization) can begin
- All encryption utilities available for any future private note features
- Seed data provides realistic development environment for all future phase work

## Self-Check: PASSED

All 5 created files verified present. Both task commits (2e4ca5d, db5fda0) verified in git log.

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-03-03*
