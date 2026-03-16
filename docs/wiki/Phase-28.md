# Phase 28: Playwright E2E Test Suite

**Status**: Complete
**Milestone**: v1.5 Playwright E2E Test Suite
**Depends on**: Phase 27
**Completed**: 2026-03-13

## Goal

Establish a comprehensive, maintainable Playwright E2E test suite covering all critical user flows — auth setup, session wizard, templates CRUD, people management, RBAC boundaries, and the session corrections feature — with CI pipeline integration.

## Success Criteria

1. E2E-01: Auth setup (`e2e/auth.setup.ts`) completes successfully against the dev server on port 4301 — no CallbackRouteError — and saved state is reused by all test specs
2. E2E-02: Full flow coverage: login/logout, dashboard load, sessions list, start-session wizard, session summary, templates CRUD, people management — zero flaky selectors
3. E2E-03: RBAC asserted: manager can open and submit correction form; member does not see the edit icon or correction controls
4. E2E-04: Correction UI flow covered: Amended badge visible on corrected answers, inline form opens/closes, AI validation feedback appears after typing a reason
5. E2E-05: GitHub Actions CI workflow runs the full suite against a seeded test database on every push

## What Was Built

- **Auth setup fix** (Plan 01): Resolved `CallbackRouteError` — auth uses `signIn(provider, credentials)` directly via the Auth.js credentials provider, not form submission. Multi-project Playwright config with `chromium`, `chromium-manager`, `chromium-member` projects; `adminPage`, `managerPage`, `memberPage` fixtures via `test.extend()` with per-role `storageState`.
- **Core flow specs** (Plan 02): `auth.spec.ts` (login/logout with initials selector and Radix menuitem logout), `dashboard.spec.ts` (load and nav), `sessions.spec.ts` (sessions list, start wizard, step through all categories, complete), `session-summary.spec.ts` (summary page load, score display).
- **RBAC + corrections specs** (Plan 03): `rbac.spec.ts` asserting manager sees edit icons / member does not; `corrections.spec.ts` covering correction form open/close, AI validation feedback, Amended badge. Debug spec for `[object ErrorEvent]` crash investigation — attributed to Next.js HMR WebSocket, not app code.
- **Templates + people specs** (Plan 04): `templates.spec.ts` (create template, add section first, add question, archive — handles both list and detail redirect outcomes), `people.spec.ts` (people list load, invite flow).
- **CI pipeline** (Plan 05): `bun run test:e2e` script; `.github/workflows/e2e.yml` with Neon/local DB detection (`URL.includes('.neon.tech')` → WebSocket pool vs standard pg), `PLAYWRIGHT_BROWSERS_PATH=/home/runner/.cache/ms-playwright`, explicit `--project=setup --project=chromium` ordering.
- **Seed UUID fix** (Plan 06): Replaced 6000-variant UUIDs (non-RFC4122) with 8000-variant in `scripts/seed.ts`. Added `DELETE` before insert in `seedAnswers()` for idempotent re-seeding when UUID constants change. Amended badge E2E test skip removed — correction POST now returns 200.

## Key Decisions

- Playwright fixtures approach (not `storageState` at project level) — fresh browser context per test enables role-switching within the same spec without cross-test contamination
- `chromium` project = admin default; `chromium-manager` and `chromium-member` added for role-targeted test runs
- User menu trigger identified by initials (`getByRole('button', { name: /^AJ$/ })`) — no `aria-label` on avatar button
- Sign out is a Radix UI menuitem (`role='menuitem'`), not a button — `getByRole('menuitem', { name: /sign out/ })` + `waitFor` required
- Admin role sees series as informational links — no Start/Resume buttons; only the owning manager sees action buttons on series cards
- `@neondatabase/serverless Pool` uses WebSocket incompatible with local PostgreSQL — URL pattern detection + fallback to standard `pg Pool` for local dev
- Seed UUID fix: `DELETE` old 6000-variant rows before insert — `onConflictDoUpdate(id)` cannot match old PKs when UUID constants change

## Key Files

- `e2e/auth.setup.ts` (new)
- `e2e/fixtures.ts` (new — adminPage, managerPage, memberPage)
- `e2e/auth.spec.ts` (new)
- `e2e/dashboard.spec.ts` (new)
- `e2e/sessions.spec.ts` (new)
- `e2e/session-summary.spec.ts` (new)
- `e2e/rbac.spec.ts` (new)
- `e2e/corrections.spec.ts` (new)
- `e2e/templates.spec.ts` (new)
- `e2e/people.spec.ts` (new)
- `e2e/debug.spec.ts` (new)
- `.github/workflows/e2e.yml` (new)
- `playwright.config.ts`
- `scripts/seed.ts`
- `package.json` (`test:e2e` script)
