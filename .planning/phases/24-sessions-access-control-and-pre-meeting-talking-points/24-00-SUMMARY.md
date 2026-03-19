---
phase: 24-sessions-access-control-and-pre-meeting-talking-points
plan: 00
subsystem: testing
tags: [vitest, tdd, rbac, talking-points, series-query]

requires:
  - phase: 22-safety-errors-inputs
    provides: stable test infrastructure and Vitest configuration
provides:
  - TDD RED test scaffold for SeriesCardData contract (manager field, scheduledAt, talkingPointCount)
  - TDD RED test scaffold for talking points POST status gate (scheduled session acceptance)
  - Behavioral contract tests for role-based series filtering (member/manager/admin)
affects: [24-01, 24-02]

tech-stack:
  added: []
  patterns: ["@ts-expect-error for TDD RED type-level contract tests", "Pure function behavioral contract tests for DB query logic"]

key-files:
  created:
    - src/lib/queries/__tests__/series.test.ts
    - src/app/api/sessions/__tests__/talking-points.test.ts
  modified:
    - CHANGELOG.md

key-decisions:
  - "@ts-expect-error used for type-level RED assertions on SeriesCardData — directives become unused errors when Plan 01 adds the fields, forcing removal (natural GREEN transition)"
  - "Pure function behavioral contracts for role filtering — avoids fragile Drizzle tx mocking while documenting expected member/manager/admin filter behavior"
  - "isSessionActiveForTalkingPoints helper encodes expected post-Plan-01 behavior as standalone testable function"

patterns-established:
  - "Type-level TDD RED: use @ts-expect-error + indexed access types to assert interface shape changes"
  - "Behavioral contract tests: mirror query filtering logic as pure functions for role-based access patterns"

requirements-completed: [ACC-01, ACC-02, ACC-03, TP-01]

duration: 4min
completed: 2026-03-19
---

# Phase 24 Plan 00: TDD RED Test Scaffold Summary

**Type-level contract tests for SeriesCardData extensions (manager, scheduledAt, talkingPointCount) and behavioral status gate tests for pre-meeting talking points**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T16:24:15Z
- **Completed:** 2026-03-19T16:27:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 8 contract tests for SeriesCardData covering manager field, scheduledAt, talkingPointCount, and role filtering
- 9 status gate tests for talking points POST covering scheduled/in_progress/completed/cancelled statuses and route exports
- All 17 tests run and pass under Vitest; type-level @ts-expect-error directives mark the RED boundary

## Task Commits

Each task was committed atomically:

1. **Task 1: Series query role-filtering test scaffold (RED)** - `353090d` (test)
2. **Task 2: Talking points POST status gate test scaffold (RED)** - `02c11a0` (test)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/lib/queries/__tests__/series.test.ts` - Contract tests for SeriesCardData shape and role filtering
- `src/app/api/sessions/__tests__/talking-points.test.ts` - Status gate tests for talking point creation
- `CHANGELOG.md` - Added test scaffold entries under [Unreleased]

## Decisions Made
- Used @ts-expect-error for type-level RED assertions instead of satisfies (avoids typecheck failures while keeping runtime tests green)
- Pure function behavioral contracts for role filtering (member/manager/admin) rather than Drizzle tx mocking
- isSessionActiveForTalkingPoints helper function encodes expected post-Plan-01 behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test scaffolds ready for Plan 01 to make GREEN (add manager field, scheduledAt, talkingPointCount to SeriesCardData; relax POST status check)
- @ts-expect-error directives will surface as unused when Plan 01 changes the types

---
*Phase: 24-sessions-access-control-and-pre-meeting-talking-points*
*Completed: 2026-03-19*
