---
phase: 08-manager-dashboard-analytics
plan: 05
subsystem: analytics
tags: [recharts, csv, area-chart, bar-chart, export, velocity, adherence]

requires:
  - phase: 08-03
    provides: Individual analytics pages with score trend, category breakdown, session comparison
  - phase: 08-01
    provides: Analytics snapshot pipeline and query layer
provides:
  - Action item velocity area chart (avg days to completion per month)
  - Meeting adherence stacked bar chart (completed/cancelled/missed sessions per month)
  - CSV export API endpoint (full and per-view exports)
  - CSV generation utilities with RFC 4180 compliance
  - CsvExportButton component (icon and full variants)
  - Per-chart and full-data export buttons on individual analytics page
affects: [09-notifications-integrations, 10-polish-launch]

tech-stack:
  added: []
  patterns: [csv-export-via-api, per-view-export-buttons, role-based-query-filtering]

key-files:
  created:
    - src/components/analytics/velocity-chart.tsx
    - src/components/analytics/adherence-chart.tsx
    - src/components/analytics/csv-export-button.tsx
    - src/app/api/analytics/export/route.ts
    - src/lib/analytics/csv.ts
  modified:
    - src/lib/analytics/queries.ts
    - src/app/api/analytics/individual/[id]/route.ts
    - src/app/(dashboard)/analytics/individual/[id]/client.tsx
    - src/app/(dashboard)/analytics/individual/[id]/page.tsx

key-decisions:
  - "Velocity query uses EXTRACT(EPOCH) for day calculation -- avoids timezone issues with date subtraction"
  - "Member role used as effectiveRole when viewing specific user's velocity/adherence -- scopes to their data only"
  - "CSV export uses Response (not NextResponse) for streaming text/csv with Content-Disposition"
  - "Per-view export fetches from same /api/analytics/export endpoint with type parameter -- single endpoint for all export types"

patterns-established:
  - "CSV export pattern: single API endpoint with type discriminator, browser download via blob URL"
  - "Per-chart export: icon-sized ghost button in CardHeader for non-intrusive data export"

requirements-completed: [ANLT-06, ANLT-07, ANLT-09]

duration: 5min
completed: 2026-03-04
---

# Phase 8 Plan 5: Velocity, Adherence Charts & CSV Export Summary

**Action item velocity area chart, meeting adherence stacked bar chart, and full/per-view CSV export with RBAC**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T19:48:27Z
- **Completed:** 2026-03-04T19:54:21Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Velocity area chart showing average days from creation to completion per month with gradient fill and 7-day target reference line
- Adherence stacked bar chart showing completed/cancelled/missed sessions per month with adherence percentage in tooltip
- CSV export API supporting 5 export types (full, score-trend, categories, velocity, adherence) with RBAC
- Per-chart export buttons and "Export All Data" button integrated into individual analytics page

## Task Commits

Each task was committed atomically:

1. **Task 1: Velocity and adherence queries, chart components** - `5108793` (feat)
2. **Task 2: CSV export endpoint, utility, and export buttons** - `3ba321b` (feat)

## Files Created/Modified
- `src/components/analytics/velocity-chart.tsx` - Recharts AreaChart with gradient, 7-day reference line
- `src/components/analytics/adherence-chart.tsx` - Recharts stacked BarChart (green/amber/red), legend
- `src/components/analytics/csv-export-button.tsx` - Download button with icon/full variants, blob download
- `src/app/api/analytics/export/route.ts` - CSV export endpoint with type routing and RBAC
- `src/lib/analytics/csv.ts` - generateCSV, escapeCsvField, sessionDataToRows utilities
- `src/lib/analytics/queries.ts` - getActionItemVelocity, getMeetingAdherence query functions
- `src/app/api/analytics/individual/[id]/route.ts` - Extended to return velocity and adherence data
- `src/app/(dashboard)/analytics/individual/[id]/client.tsx` - Added charts, export buttons, new data types
- `src/app/(dashboard)/analytics/individual/[id]/page.tsx` - Added server-side velocity/adherence data fetch

## Decisions Made
- Velocity query uses EXTRACT(EPOCH) division for day calculation instead of date subtraction (timezone-safe)
- When viewing a specific user's analytics, effectiveRole is set to "member" to scope velocity/adherence queries to their data only
- CSV export uses plain Response with text/csv Content-Type (not NextResponse.json) for proper file download
- Single export endpoint handles all export types via query parameter discriminator

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 8 analytics complete: dashboard overview, snapshot pipeline, individual analytics, team analytics, velocity/adherence charts, CSV export
- Ready for Phase 9 (notifications/integrations) or Phase 10 (polish/launch)

---
*Phase: 08-manager-dashboard-analytics*
*Completed: 2026-03-04*
