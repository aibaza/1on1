---
phase: 21-content-data-display
plan: "04"
subsystem: ui
tags: [analytics, drizzle, sql, i18n, server-components]

# Dependency graph
requires:
  - phase: 21-content-data-display-03
    provides: heatmapThreshold i18n key in analytics namespace (must not overwrite)
provides:
  - Aggregate stat cards (Sessions Completed, Avg Score, Action Item Rate) on analytics overview page
affects: [analytics, reporting, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Aggregate SQL with CASE WHEN inside COUNT/AVG inside Drizzle .select() for conditional aggregation"
    - "Role-scoped aggregate query: seriesConditionForAgg = manager ? eq(managerId, userId) : undefined"

key-files:
  created: []
  modified:
    - src/app/(dashboard)/analytics/page.tsx
    - messages/en/analytics.json
    - messages/ro/analytics.json

key-decisions:
  - "Empty-state for stat cards uses '—' (noData key) rather than '0' — distinguishes no-data from zero-data"
  - "Avg score computed client-side via parseFloat(avgScoreRaw) from SQL AVG returning string"
  - "Action item rate: Math.round((completed/total)*100) — returns null when total=0 to trigger noData display"

patterns-established:
  - "Conditional WHERE clause for role-scoped aggregates: undefined skips the condition entirely in Drizzle and()"

requirements-completed: [CON-01]

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 21 Plan 04: Analytics Aggregate Stat Cards Summary

**Three SQL aggregate stat cards (Sessions Completed, Avg Score, Action Item Rate) added above team/individual directories on the analytics overview page, scoped by role with graceful empty-state**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-08T09:08:21Z
- **Completed:** 2026-03-08T09:13:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Added Drizzle aggregate queries (CASE WHEN COUNT/AVG) for sessions and action items inside existing `withTenantContext` callback
- Role-scoping: admin sees all tenant sessions; manager sees only their direct reports' series
- Three stat cards rendered above team/individual directory using 3-col responsive grid
- Empty-state: "—" displayed when no data (no crash, no zero), per-card granularity
- i18n keys added to `en/analytics.json` and `ro/analytics.json` as `aggregate` object without overwriting plan 21-03's `chart.heatmapThreshold` key

## Task Commits

Each task was committed atomically:

1. **Task 1: Add aggregate query and stat cards to analytics overview page** - `0ab720b` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/app/(dashboard)/analytics/page.tsx` - Added `actionItems` schema import, two aggregate Drizzle queries, destructures `aggregates` from context result, stat card grid UI before team section
- `messages/en/analytics.json` - Added `aggregate` object with sessionsCompleted, avgScore, actionItemRate, noData keys
- `messages/ro/analytics.json` - Added Romanian equivalents of aggregate keys
- `CHANGELOG.md` - Added CON-01 entry under Added

## Decisions Made
- Empty-state for each card independently: `sessionsCompletedCount > 0`, `avgScore !== null`, `actionItemRate !== null` — fine-grained rather than a single "no data" card for the section
- `and()` with `undefined` as second argument in Drizzle gracefully skips the condition for admin role

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing lint errors in `import-schema.test.ts` (unrelated file) were noted as out of scope.

## Self-Check: PASSED
- `src/app/(dashboard)/analytics/page.tsx` — FOUND
- `messages/en/analytics.json` — FOUND
- `messages/ro/analytics.json` — FOUND
- Commit `0ab720b` — FOUND
- `bun run typecheck` — PASSED (no output)
- Lint errors in modified files — NONE (pre-existing errors in unrelated files only)

## Next Phase Readiness
- Analytics overview page now shows meaningful company-wide health metrics at a glance
- CON-01 satisfied — ready to proceed to phase 21-05 or next planned work

---
*Phase: 21-content-data-display*
*Completed: 2026-03-08*
