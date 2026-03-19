---
phase: 24-sessions-access-control-and-pre-meeting-talking-points
plan: 01
subsystem: api
tags: [drizzle, rbac, access-control, series, talking-points]

# Dependency graph
requires:
  - phase: 24-sessions-access-control-and-pre-meeting-talking-points
    plan: 00
    provides: TDD RED contract tests for SeriesCardData fields and role filtering
provides:
  - Extended SeriesCardData with manager field, scheduledAt, talkingPointCount
  - Role-based filtering on getSeriesCardData query (member/manager/admin)
  - Role-based filtering on /api/series GET route
  - Talking points POST accepts scheduled sessions
affects: [24-02, 24-03, sessions-ui, series-card, agenda-sheet]

# Tech tracking
tech-stack:
  added: []
  patterns: [role-based-query-filtering, manager-or-report-visibility]

key-files:
  created: []
  modified:
    - src/lib/queries/series.ts
    - src/app/api/series/route.ts
    - src/app/api/sessions/[id]/talking-points/route.ts
    - src/app/(dashboard)/sessions/page.tsx
    - src/components/series/series-list.tsx
    - src/components/series/series-card.tsx
    - src/lib/queries/__tests__/series.test.ts

key-decisions:
  - "Manager OR-query: managers see series where they are manager OR report (SQL OR condition)"
  - "Talking points status gate relaxed from in_progress-only to in_progress OR scheduled"
  - "Wave 0 @ts-expect-error directives removed — contract tests now GREEN"

patterns-established:
  - "Role-based query filtering: member=reportId, manager=managerId OR reportId, admin=all"
  - "Manager info resolution via managerMap pattern (same as reportMap)"

requirements-completed: [ACC-01, ACC-02, ACC-03, ACC-04, TP-01]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 24 Plan 01: Role-Based Series Filtering Summary

**Role-based access control on series queries and API, manager info enrichment, and scheduled-session talking point support**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T16:31:53Z
- **Completed:** 2026-03-19T16:36:56Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended SeriesCardData with manager field (id, firstName, lastName), scheduledAt, and talkingPointCount on latestSession
- Fixed manager role query to use OR condition (sees series as manager AND as report)
- Applied role-based access control to /api/series GET route (member/manager/admin filtering)
- Relaxed talking points POST to accept both "in_progress" and "scheduled" sessions
- Wave 0 contract tests now pass (removed @ts-expect-error directives)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend getSeriesCardData with manager info, OR query, scheduledAt** - `911e7dd` (feat)
2. **Task 2: Role-based filtering on /api/series GET + relax talking points POST** - `4d02127` (feat)

## Files Created/Modified
- `src/lib/queries/series.ts` - Extended SeriesCardData interface, manager OR-query, managerMap, talkingPointCountMap, scheduledAt
- `src/app/api/series/route.ts` - Role-based filtering, manager info, scheduledAt, talkingPointCount in API response
- `src/app/api/sessions/[id]/talking-points/route.ts` - Relaxed status check to accept scheduled sessions
- `src/app/(dashboard)/sessions/page.tsx` - Passes role and userId to getSeriesCardData, passes userRole to SeriesList
- `src/components/series/series-list.tsx` - Updated Series interface and SeriesListProps with new fields
- `src/components/series/series-card.tsx` - Updated SeriesCardProps with manager, scheduledAt, talkingPointCount
- `src/lib/queries/__tests__/series.test.ts` - Removed @ts-expect-error directives (tests now GREEN)

## Decisions Made
- Manager OR-query uses raw SQL template `(managerId = $1 OR reportId = $1)` for Drizzle compatibility
- Talking points status gate renamed from SESSION_NOT_IN_PROGRESS to SESSION_NOT_ACTIVE for clarity
- Wave 0 @ts-expect-error directives removed since Plan 01 added the fields they were guarding

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated SeriesCard and SeriesList component types**
- **Found during:** Task 1
- **Issue:** SeriesCard and SeriesList had inline type definitions that didn't include the new manager, scheduledAt, talkingPointCount fields, causing type errors
- **Fix:** Updated both component interfaces to include the new fields
- **Files modified:** src/components/series/series-card.tsx, src/components/series/series-list.tsx
- **Verification:** typecheck passes
- **Committed in:** 911e7dd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type alignment necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Series data now includes manager info, scheduledAt, and talkingPointCount for UI consumption
- Role-based filtering active on both SSR and API paths
- Ready for Plan 02 (i18n and UI components)

---
*Phase: 24-sessions-access-control-and-pre-meeting-talking-points*
*Completed: 2026-03-19*
