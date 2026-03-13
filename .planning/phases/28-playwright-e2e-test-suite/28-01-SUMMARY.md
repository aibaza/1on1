---
phase: 28-playwright-e2e-test-suite
plan: 01
subsystem: testing
tags: [playwright, e2e, auth, storageState, fixtures, pg, neon]

# Dependency graph
requires: []
provides:
  - Multi-role Playwright auth setup (admin/manager/member storageState)
  - e2e/fixtures.ts with typed per-role browser context helpers
  - playwright.config.ts with chromium-manager and chromium-member projects
  - Fix for @neondatabase/serverless WebSocket Pool failing on local PostgreSQL
affects:
  - 28-02-core-flows
  - 28-03-rbac-corrections
  - 28-04-templates-people
  - All future Playwright E2E specs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-role storageState: each role's session saved to e2e/.auth/{role}.json during setup project"
    - "Playwright fixtures: extend base test with per-role contexts via browser.newContext({ storageState })"
    - "Neon vs local DB detection: isNeon(url) checks for .neon.tech in URL; falls back to pg Pool for local dev"

key-files:
  created:
    - e2e/fixtures.ts
    - e2e/.auth/.gitkeep
  modified:
    - e2e/auth.setup.ts
    - playwright.config.ts
    - src/lib/db/index.ts
    - .gitignore

key-decisions:
  - "@neondatabase/serverless Pool uses WebSocket protocol incompatible with local PostgreSQL — detect via URL pattern and fall back to standard pg Pool"
  - "Fixtures approach (fresh context per test) preferred over project-level storageState for multi-role tests"
  - "chromium project remains admin default; chromium-manager and chromium-member added for role-specific test runs"

patterns-established:
  - "Pattern: Import { test, expect } from ./fixtures instead of @playwright/test for role-switching tests"
  - "Pattern: DB connection detection — isNeon(url) gates neon-serverless vs node-postgres adapter choice"

requirements-completed: [E2E-01]

# Metrics
duration: 25min
completed: 2026-03-13
---

# Phase 28 Plan 01: Auth Setup Summary

**Multi-role Playwright auth setup with pg fallback fix — storageState saved for admin, manager, member; local PostgreSQL DB connection restored**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-13T09:10:00Z
- **Completed:** 2026-03-13T09:38:38Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Fixed root cause of auth failure: `@neondatabase/serverless` WebSocket Pool cannot connect to local PostgreSQL (no proxy). DB module now detects Neon cloud vs local via URL pattern and uses `pg` Pool for local dev.
- Expanded `auth.setup.ts` to save storageState for all three roles (admin alice, manager bob, member dave) — 3 JSON files in `e2e/.auth/`
- Created `e2e/fixtures.ts` with `adminPage`, `managerPage`, `memberPage` fixtures — specs import `{ test, expect }` from fixtures for pre-authenticated contexts
- Added `chromium-manager` and `chromium-member` projects to `playwright.config.ts`

## Task Commits

1. **Task 1: Diagnose and fix auth + multi-role setup** - `526acc1` (fix)
2. **Task 2: Create fixtures.ts + update playwright.config.ts** - `507a214` (feat)

## Files Created/Modified

- `e2e/auth.setup.ts` — expanded to 3 setup steps (admin, manager, member); uses `waitForURL(/\/(overview|dashboard)/i)`
- `e2e/fixtures.ts` — Playwright test extension with `adminPage`, `managerPage`, `memberPage` pre-auth contexts
- `e2e/.auth/.gitkeep` — ensures auth state directory is tracked in git
- `playwright.config.ts` — added `chromium-manager` and `chromium-member` projects
- `src/lib/db/index.ts` — detect Neon vs local URL; use `pg` Pool for local, Neon Pool for cloud
- `.gitignore` — added `!e2e/.auth/.gitkeep` exception

## Decisions Made

- **pg Pool fallback for local dev**: `@neondatabase/serverless` Pool v0.10.4 requires WebSocket protocol (Neon proxy); local PostgreSQL speaks standard TCP. Detection via `url.includes('.neon.tech')` — local dev uses `drizzle-orm/node-postgres` + `pg` Pool; production uses `drizzle-orm/neon-serverless` + Neon Pool. Both support transactions and SET LOCAL for RLS.
- **Fixtures over project storageState for multi-role tests**: A single spec file cannot belong to multiple projects simultaneously. Fixtures create fresh contexts per test, enabling role-switching within the same spec file.
- **Admin remains default project**: `chromium` project uses `admin.json`; `chromium-manager` and `chromium-member` added for role-targeted runs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @neondatabase/serverless WebSocket incompatibility with local PostgreSQL**
- **Found during:** Task 1 (diagnosing auth failure)
- **Issue:** `@neondatabase/serverless` Pool was introduced (commit 7727465, March 10) to support transactions for RLS. This pool uses WebSocket protocol incompatible with local PostgreSQL, causing all DB queries in local dev to fail silently — auth always returned "Invalid email or password"
- **Fix:** Added URL detection in `src/lib/db/index.ts`: if URL contains `.neon.tech`, use Neon WebSocket Pool; otherwise use standard `pg` Pool with `drizzle-orm/node-postgres`
- **Files modified:** `src/lib/db/index.ts`
- **Verification:** Login works, auth setup runs 3/3 tests passing, no TypeScript errors
- **Committed in:** `526acc1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Essential fix — without it, no authentication works in local dev/test. No scope creep; `pg` was already in `node_modules`.

## Issues Encountered

- Previous `admin.json` (created March 5) was from before the neon WebSocket migration — session tokens are now invalid since the dev server can't validate them (DB not reachable). New auth files were generated successfully.
- The existing stored session token age is unrelated — the core issue was DB connectivity, not session expiry.

## Next Phase Readiness

- Three valid storageState files exist: `e2e/.auth/admin.json`, `e2e/.auth/manager.json`, `e2e/.auth/member.json`
- `fixtures.ts` exports `test` and `expect` — all downstream specs can use `import { test, expect } from "./fixtures"`
- Local dev DB queries work correctly (login, session management, all API routes)
- Ready for Phase 28 Plan 02: Core user flow tests

---
*Phase: 28-playwright-e2e-test-suite*
*Completed: 2026-03-13*
