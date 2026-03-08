---
phase: 19-design-system
plan: 01
subsystem: testing
tags: [vitest, testing-library, react, tdd, wave-0, design-system]

# Dependency graph
requires: []
provides:
  - "Failing tests (RED) for DES-02 badge variant semantics (in_progress→default, completed→outline)"
  - "Failing tests (RED) for DES-03 SectionLabel no-uppercase contract"
  - "Failing tests (RED) for DES-04 EmptyState component interface"
affects:
  - 19-02
  - 19-03
  - 19-04

# Tech tracking
tech-stack:
  added:
    - "@testing-library/react@16.3.2 — component rendering in Vitest"
    - "@testing-library/jest-dom@6.9.1 — DOM matchers"
  patterns:
    - "// @vitest-environment happy-dom annotation for component tests requiring DOM"
    - "Wave 0 / RED-first TDD: test files created before implementation files"
    - "categoryStepTestHelpers export pattern for testing internal helpers"

key-files:
  created:
    - "src/components/ui/__tests__/empty-state.test.tsx"
    - "src/components/session/__tests__/section-label.test.tsx"
    - "src/components/series/__tests__/session-timeline-badge.test.tsx"
  modified:
    - "CHANGELOG.md"
    - "package.json"
    - "bun.lock"

key-decisions:
  - "Install @testing-library/react now (Wave 0) rather than deferring to Wave 1 — avoids blocking the GREEN phase with missing infrastructure"
  - "section-label test uses categoryStepTestHelpers.getSectionLabelClassName() helper — Wave 1 must export this from category-step.tsx"
  - "session-timeline-badge test imports statusVariant as named export — Wave 1 must add `export` keyword to the const"

patterns-established:
  - "Wave 0 tests: import from files that do not yet exist to guarantee RED state"
  - "Test helpers exported as categoryStepTestHelpers object for testing internal component logic"

requirements-completed: [DES-02, DES-03, DES-04]

# Metrics
duration: 8min
completed: 2026-03-08
---

# Phase 19 Plan 01: Design System Wave 0 — Failing Tests Summary

**Three RED test files establishing behavioral contracts for DES-02 badge semantics, DES-03 section casing, and DES-04 EmptyState — Wave 1 plans make them GREEN**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-08T07:42:00Z
- **Completed:** 2026-03-08T07:50:00Z
- **Tasks:** 1
- **Files modified:** 6

## Accomplishments

- Created three failing test files (RED/Wave 0) that define the behavioral contracts for all Phase 19 design system changes
- Installed `@testing-library/react` and `@testing-library/jest-dom` so Wave 1 component tests can pass without infra gaps
- Confirmed `bun run test` exits non-zero with all three new test files listed as failing

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for DES-04 EmptyState, DES-03 SectionLabel, DES-02 badge variants** - `e3148d7` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/ui/__tests__/empty-state.test.tsx` — 5 failing tests for DES-04 EmptyState component (heading, description, icon, action slot, no-crash)
- `src/components/session/__tests__/section-label.test.tsx` — 2 failing tests for DES-03: asserts SectionLabel className has no 'uppercase' or 'tracking-wide'
- `src/components/series/__tests__/session-timeline-badge.test.tsx` — 4 failing tests for DES-02: in_progress→default, completed→outline, scheduled→outline, cancelled→destructive
- `package.json` / `bun.lock` — added @testing-library/react and @testing-library/jest-dom dev dependencies
- `CHANGELOG.md` — documented new test files and dev dependencies

## Decisions Made

- **@testing-library/react installed in Wave 0:** Wave 1 will need it to render components; installing now prevents a blocking issue deviation.
- **SectionLabel test uses exported helper:** Since `SectionLabel` is a private local function in `category-step.tsx`, Wave 1 must export `categoryStepTestHelpers.getSectionLabelClassName()` to make the test work without a full component render (which would require i18n mocking and many deps).
- **statusVariant import:** The simplest contract — Wave 1 adds `export` to the existing `const statusVariant` declaration and fixes the values.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @testing-library/react before writing tests**
- **Found during:** Task 1 (writing empty-state.test.tsx)
- **Issue:** `@testing-library/react` was not installed; empty-state test uses `render` and `screen` from it; without it Wave 1 GREEN tests would fail on missing module
- **Fix:** `bun add -d @testing-library/react @testing-library/jest-dom`
- **Files modified:** package.json, bun.lock
- **Verification:** Import resolves; happy-dom environment picks up JSDOM-compatible APIs
- **Committed in:** e3148d7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential infrastructure install. No scope creep.

## Issues Encountered

None — plan executed cleanly after dev dependency install.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 contract complete: three RED test files define what Wave 1 must build
- Wave 1 (19-02) must: export `statusVariant` from session-timeline.tsx and fix values; export `categoryStepTestHelpers` from category-step.tsx; create `src/components/ui/empty-state.tsx`
- All test infrastructure (happy-dom, @testing-library/react) is installed and ready

## Self-Check: PASSED

- `src/components/ui/__tests__/empty-state.test.tsx` — FOUND
- `src/components/session/__tests__/section-label.test.tsx` — FOUND
- `src/components/series/__tests__/session-timeline-badge.test.tsx` — FOUND
- Commit `e3148d7` — FOUND

---
*Phase: 19-design-system*
*Completed: 2026-03-08*
