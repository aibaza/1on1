---
phase: 21-content-data-display
plan: 03
subsystem: ui
tags: [heatmap, analytics, i18n, session-summary, score]

# Dependency graph
requires: []
provides:
  - Team heatmap contributor threshold guard (CON-05) — shows message for <3 contributors
  - Session summary score label fix (SCORE-01) — "out of 5" instead of "out of 5.0"
affects: [analytics, session-summary]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Threshold guard pattern: check computed rows after useMemo, before SVG render, return early with message"
    - "i18n key convention: analytics.chart.heatmapThreshold for chart-level messages"

key-files:
  created: []
  modified:
    - src/components/analytics/team-heatmap.tsx
    - messages/en/analytics.json
    - messages/ro/analytics.json
    - messages/en/sessions.json
    - messages/ro/sessions.json

key-decisions:
  - "Threshold guard placed after useMemo (rows computed), before SVG render — zero-contributor case still handled by existing empty guard"
  - "heatmapThreshold guard checks rows.length > 0 && rows.length < 3 to distinguish from the zero-data case"

patterns-established:
  - "Two-layer empty/threshold guard pattern: first check data.length === 0 (no data), then rows.length < 3 (insufficient contributors)"

requirements-completed:
  - CON-05
  - SCORE-01

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 21 Plan 03: Content & Data Display Summary

**Team heatmap shows ≥3 contributor threshold message for small teams; session summary score label corrected from "out of 5.0" to "out of 5"**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-08T09:10:00Z
- **Completed:** 2026-03-08T09:15:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added contributor threshold guard to team-heatmap: 1-2 contributors shows "Requires ≥3 contributors to display heatmap" message; ≥3 renders normally; 0 uses existing "No heatmap data" message
- Added `heatmapThreshold` i18n key to both en and ro analytics.json
- Fixed `summary.outOf` i18n key in en/sessions.json from "out of 5.0" → "out of 5" and ro/sessions.json from "din 5.0" → "din 5"

## Task Commits

Each task was committed atomically:

1. **Task 1: Add heatmap contributor threshold guard** - `e8d784d` (feat)
2. **Task 2: Fix session summary score label to "out of 5"** - `c47bb16` (fix)

## Files Created/Modified
- `src/components/analytics/team-heatmap.tsx` — threshold guard block after useMemo, before SVG render
- `messages/en/analytics.json` — added `analytics.chart.heatmapThreshold`
- `messages/ro/analytics.json` — added `analytics.chart.heatmapThreshold` (Romanian)
- `messages/en/sessions.json` — `summary.outOf` changed from "out of 5.0" to "out of 5"
- `messages/ro/sessions.json` — `summary.outOf` changed from "din 5.0" to "din 5"

## Decisions Made
- Threshold guard uses `rows.length > 0 && rows.length < 3` — keeps existing zero-data guard separate from low-contributor guard; each handles its own case clearly

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CON-05 and SCORE-01 requirements satisfied
- Remaining Phase 21 plans can proceed: plan 04 onward

---
*Phase: 21-content-data-display*
*Completed: 2026-03-08*
