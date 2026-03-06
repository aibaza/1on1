---
phase: 12-ui-translation
plan: 02
subsystem: ui
tags: [next-intl, useFormatter, dateTime, number-formatting, i18n]

# Dependency graph
requires:
  - phase: 11-i18n-foundation
    provides: next-intl setup, useTranslations, useFormatter available
  - phase: 12-01
    provides: validation and auth translation patterns
provides:
  - Locale-aware date formatting across dashboard, history, action-items, series
  - Locale-aware number formatting (scores, decimals) across all components
  - Translated session status badges in history page
affects: [12-03, 12-04, 12-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [useFormatter().dateTime() for all date rendering, useFormatter().number() for scores]

key-files:
  created: []
  modified:
    - src/components/dashboard/recent-sessions.tsx
    - src/components/dashboard/upcoming-sessions.tsx
    - src/components/dashboard/quick-stats.tsx
    - src/components/history/history-page.tsx
    - src/components/action-items/action-items-page.tsx
    - src/components/series/series-card.tsx
    - src/components/series/series-detail.tsx
    - src/components/series/session-timeline.tsx
    - messages/en/history.json
    - messages/ro/history.json
    - messages/en/actionItems.json
    - messages/ro/actionItems.json
    - messages/en/sessions.json
    - messages/ro/sessions.json

key-decisions:
  - "nudge-card.tsx already fully locale-aware via t() keys -- no changes needed"
  - "Passed useFormatter as parameter to helper functions that live outside component scope (formatRelativeDate in series-card)"

patterns-established:
  - "useFormatter().dateTime(new Date(value), opts) replaces all toLocaleDateString calls"
  - "useFormatter().number(value, { maximumFractionDigits: N, minimumFractionDigits: N }) replaces .toFixed(N)"
  - "Status badge text uses translation keys (status_completed, status_in_progress) instead of raw DB values"

requirements-completed: [UITR-04, FMT-01, FMT-02, FMT-03]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 12 Plan 02: Dashboard & Series Locale Formatting Summary

**Replaced all hardcoded date/number formatting with next-intl useFormatter() across 8 components (dashboard, history, action-items, series)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T10:58:39Z
- **Completed:** 2026-03-06T11:03:25Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Eliminated all `toLocaleDateString("en-US")` calls from dashboard, history, action-items, and series components
- Replaced `.toFixed()` number formatting with locale-aware `format.number()` for score displays
- Added translated status badges in history page (replacing raw `s.status.replace("_", " ")`)
- Added translation keys for session duration in timeline and session badge in action items

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace date formatting in dashboard and history components** - `48614fd` (feat)
2. **Task 2: Replace date formatting in series components** - `3767e9b` (feat)

## Files Created/Modified
- `src/components/dashboard/recent-sessions.tsx` - useFormatter for dates and scores
- `src/components/dashboard/upcoming-sessions.tsx` - useFormatter for session date/time
- `src/components/dashboard/quick-stats.tsx` - useFormatter for average score
- `src/components/history/history-page.tsx` - useFormatter for dates/scores, translated status badges
- `src/components/action-items/action-items-page.tsx` - useFormatter for due dates, translated session badge
- `src/components/series/series-card.tsx` - useFormatter for dates/scores, passed to helper
- `src/components/series/series-detail.tsx` - useFormatter for next session date
- `src/components/series/session-timeline.tsx` - useFormatter for dates/scores, translated duration
- `messages/en/history.json` - Added status translation keys
- `messages/ro/history.json` - Added status translation keys
- `messages/en/actionItems.json` - Added sessionBadge key
- `messages/ro/actionItems.json` - Added sessionBadge key
- `messages/en/sessions.json` - Added timeline.duration key
- `messages/ro/sessions.json` - Added timeline.duration key

## Decisions Made
- nudge-card.tsx was already fully locale-aware (uses t() for relative time) -- no changes needed
- Passed useFormatter as parameter to formatRelativeDate helper in series-card since hooks cannot be called outside components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added translated status badges in history page**
- **Found during:** Task 1 (history-page.tsx)
- **Issue:** `s.status.replace("_", " ")` displayed raw English DB values
- **Fix:** Replaced with `t('status_${s.status}')` and added 5 status keys to history.json (en + ro)
- **Files modified:** history-page.tsx, messages/en/history.json, messages/ro/history.json
- **Committed in:** 48614fd

**2. [Rule 2 - Missing Critical] Added translated "Session #" badge in action items**
- **Found during:** Task 1 (action-items-page.tsx)
- **Issue:** Hardcoded `Session #{item.sessionNumber}` string
- **Fix:** Added `sessionBadge` translation key and used `t("sessionBadge", { number })`
- **Files modified:** action-items-page.tsx, messages/en/actionItems.json, messages/ro/actionItems.json
- **Committed in:** 48614fd

**3. [Rule 2 - Missing Critical] Added translated duration text in session timeline**
- **Found during:** Task 2 (session-timeline.tsx)
- **Issue:** Hardcoded `({s.durationMinutes} min)` string
- **Fix:** Added `duration` translation key and used `t("duration", { count })`
- **Files modified:** session-timeline.tsx, messages/en/sessions.json, messages/ro/sessions.json
- **Committed in:** 3767e9b

---

**Total deviations:** 3 auto-fixed (3 missing critical i18n strings)
**Impact on plan:** All auto-fixes directly align with the plan's objective of eliminating hardcoded English. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All dashboard, history, action-items, and series components are now fully locale-aware
- Ready for plan 12-03 (remaining UI component translations)

---
*Phase: 12-ui-translation*
*Completed: 2026-03-06*
