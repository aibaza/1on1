---
phase: 28-playwright-e2e-test-suite
plan: 05
subsystem: infra
tags: [playwright, github-actions, ci, e2e, chromium]

# Dependency graph
requires:
  - phase: 28-playwright-e2e-test-suite
    provides: Playwright config, fixtures, auth setup, and all E2E specs (plans 01-04)

provides:
  - test:e2e npm script — single-command local E2E runner
  - .github/workflows/e2e.yml — CI job triggering Playwright on every push/PR to main
  - Full CI pipeline integration closing the Phase 28 gap identified in VERIFICATION.md

affects: [future-feature-development, ci-pipeline, pull-request-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub Actions CI: ubuntu-latest + oven-sh/setup-bun@v2 + bun install --frozen-lockfile (matches existing migrate.yml pattern)"
    - "Playwright CI: npx playwright install --with-deps chromium (Chromium-only scope)"
    - "E2E run command: bun run test:e2e -- --project=setup --project=chromium (setup runs first as dependency)"

key-files:
  created:
    - .github/workflows/e2e.yml
  modified:
    - package.json
    - CHANGELOG.md

key-decisions:
  - "CI uses bun run test:e2e -- --project=setup --project=chromium to explicitly specify project order, matching playwright.config.ts dependency chain"
  - "PLAYWRIGHT_BROWSERS_PATH set to /home/runner/.cache/ms-playwright in CI env (runner-specific path after npx playwright install)"
  - "ANTHROPIC_API_KEY included in CI secrets — corrections spec triggers AI validation endpoint"
  - "Playwright report uploaded on failure only (if: failure()) with 7-day retention"

patterns-established:
  - "CI E2E pattern: checkout → bun setup → install → playwright install chromium → seed DB → run tests → upload artifact on failure"
  - "test:e2e script uses PLAYWRIGHT_BROWSERS_PATH env var for cross-environment browser location"

requirements-completed: [E2E-01, E2E-02, E2E-03, E2E-04, E2E-05]

# Metrics
duration: 1min
completed: 2026-03-13
---

# Phase 28 Plan 05: CI Pipeline Integration Summary

**GitHub Actions E2E workflow and test:e2e npm script — closes the CI gap so every push/PR to main automatically runs the full Playwright Chromium suite**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-13T11:27:05Z
- **Completed:** 2026-03-13T11:28:17Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `package.json` gains `test:e2e` script as the single-command local E2E entry point
- `.github/workflows/e2e.yml` created — Playwright E2E CI job triggering on push and pull_request to main
- Phase 28 CI integration gap fully closed — the core value of the test suite (catching regressions on every PR) is now operational

## Task Commits

Each task was committed atomically:

1. **Task 1: Add test:e2e script to package.json** - `51ec989` (chore)
2. **Task 2: Create .github/workflows/e2e.yml CI workflow** - `c35ff48` (feat)

## Files Created/Modified

- `.github/workflows/e2e.yml` — GitHub Actions job: ubuntu-latest, Bun setup, Chromium install, DB seed, Playwright run, artifact upload on failure
- `package.json` — scripts.test:e2e added with PLAYWRIGHT_BROWSERS_PATH env var
- `CHANGELOG.md` — documented both additions under [Unreleased]

## Decisions Made

- Used `bun run test:e2e -- --project=setup --project=chromium` in CI rather than `bun run test:e2e` alone — makes project order explicit; `chromium` project's `dependencies: ["setup"]` means setup runs automatically, but specifying both ensures consistent ordering
- `PLAYWRIGHT_BROWSERS_PATH=/home/runner/.cache/ms-playwright` set in CI env — GitHub runner path after `npx playwright install --with-deps chromium`
- `ANTHROPIC_API_KEY` included in CI env — the corrections spec triggers the AI validation endpoint; missing key would cause spec failures

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

GitHub Actions secrets must be configured in repository settings before the CI workflow can run successfully:

- `DATABASE_URL` — already used by migrate.yml (same secret)
- `NEXTAUTH_SECRET` — for Auth.js session token signing during auth setup
- `AUTH_SECRET` — Auth.js v5 uses this name (same value as NEXTAUTH_SECRET)
- `ANTHROPIC_API_KEY` — for AI validation endpoint in corrections spec

Without these secrets, the CI job will fail at the seed DB step or during auth setup.

## Next Phase Readiness

- Phase 28 is now fully complete — all 5 plans executed, CI integrated
- The Playwright suite will automatically catch E2E regressions on every PR to main
- To expand coverage for new features: add specs to `e2e/` using existing fixtures from `e2e/fixtures.ts`

## Self-Check: PASSED

- package.json: FOUND
- .github/workflows/e2e.yml: FOUND
- 28-05-SUMMARY.md: FOUND
- commit 51ec989 (chore: test:e2e script): FOUND
- commit c35ff48 (feat: e2e.yml workflow): FOUND

---

*Phase: 28-playwright-e2e-test-suite*
*Completed: 2026-03-13*
