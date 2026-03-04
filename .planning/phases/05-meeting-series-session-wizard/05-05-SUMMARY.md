---
phase: 05-meeting-series-session-wizard
plan: 05
subsystem: ui, api
tags: [scoring, session-completion, summary-screen, wizard, series-lifecycle]

# Dependency graph
requires:
  - phase: 05-meeting-series-session-wizard
    provides: "Wizard shell, category steps, notes, talking points, action items, context panel"
provides:
  - "Session scoring utility (normalizeAnswer, computeSessionScore)"
  - "Session completion API (POST /api/sessions/[id]/complete)"
  - "Summary screen component with per-category recap"
  - "Save status component"
  - "End-to-end wizard flow: start -> fill -> review -> complete"
  - "Series card Resume/Start navigation to wizard"
affects: [phase-06-action-items, phase-07-ai, phase-09-notifications, phase-10-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Score normalization to 1-5 scale", "Session completion with audit logging and series lifecycle update"]

key-files:
  created:
    - src/lib/utils/scoring.ts
    - src/app/api/sessions/[id]/complete/route.ts
    - src/components/session/summary-screen.tsx
    - src/components/session/save-status.tsx
  modified:
    - src/components/session/wizard-shell.tsx
    - src/components/session/wizard-navigation.tsx
    - src/components/series/series-card.tsx
    - src/components/series/series-detail.tsx
    - src/components/series/series-list.tsx
    - src/app/api/series/route.ts
    - src/app/(dashboard)/sessions/page.tsx
    - CHANGELOG.md

key-decisions:
  - "Score normalization uses SCORABLE_TYPES set to filter non-numeric types (text, multiple_choice excluded)"
  - "Completion API computes duration from startedAt to now in minutes"
  - "Summary screen computes score client-side for immediate display, server re-computes on completion"
  - "isManager determined via useSession hook comparing session.user.id with series.managerId"
  - "Navigation hides Next button on summary step, shows 'Review' on last category step"

patterns-established:
  - "Score normalization: all numeric types normalized to 1-5 before averaging"
  - "Completion flow: single POST endpoint handles score computation, status update, series lifecycle, and audit logging in one transaction"

requirements-completed: [SESS-13, SESS-14, SESS-15, MEET-05]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 5 Plan 5: Session Summary, Scoring, and Completion Flow Summary

**Session summary screen with score computation, completion API with next-session scheduling, and series card Start/Resume wizard navigation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T08:25:24Z
- **Completed:** 2026-03-04T08:34:11Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Scoring utility normalizes rating_1_5, rating_1_10, yes_no, mood to 1-5 scale and computes average session score
- Completion API (POST /api/sessions/[id]/complete) computes score, marks session completed with duration, updates next_session_at on series, and logs audit event in a single transaction
- Summary screen shows full read-only recap of all answers, notes, talking points, and action items grouped by category with computed score at top
- End-to-end wizard flow complete: create series -> start session -> fill answers/notes -> review summary -> complete -> back to series detail
- Series cards and detail page navigate directly to wizard on Start and Resume

## Task Commits

Each task was committed atomically:

1. **Task 1: Scoring utility, completion API, and summary screen** - `8d4d1be` (feat)
2. **Task 2: Wire summary into wizard, update series cards** - `4e7409b` (feat)

## Files Created/Modified
- `src/lib/utils/scoring.ts` - normalizeAnswer and computeSessionScore functions
- `src/app/api/sessions/[id]/complete/route.ts` - POST endpoint for session completion with score, duration, next_session_at
- `src/components/session/summary-screen.tsx` - Read-only recap screen with score card, per-category review, Complete Session button
- `src/components/session/save-status.tsx` - Small status indicator component (saved/saving/error)
- `src/components/session/wizard-shell.tsx` - Added SummaryScreen as final step, isManager check via useSession
- `src/components/session/wizard-navigation.tsx` - Summary tab, hidden Next on summary step, "Review" on last category
- `src/components/series/series-card.tsx` - Resume navigates to /wizard/[sessionId], Start navigates after creation, shows score and in-progress info
- `src/components/series/series-detail.tsx` - Resume Session button navigates to wizard
- `src/components/series/series-list.tsx` - Updated latestSession type to include id and sessionScore
- `src/app/api/series/route.ts` - Returns latestSession.id and latestSession.sessionScore
- `src/app/(dashboard)/sessions/page.tsx` - Passes complete latestSession data
- `CHANGELOG.md` - Session summary, scoring, and completion entries

## Decisions Made
- Score normalization uses a SCORABLE_TYPES set to explicitly filter out text and multiple_choice types, returning null if no scorable answers exist
- Completion API computes duration as difference between startedAt and now in minutes (rounded)
- Summary screen computes score client-side for immediate display; server re-computes authoritatively on completion
- isManager determined via useSession() hook comparing user ID with series.managerId
- Wizard navigation hides the Next button entirely on the summary step (Complete Session button in summary screen handles the final action)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated series-list.tsx and sessions page.tsx to match new latestSession shape**
- **Found during:** Task 2 (typecheck after updating series-card.tsx)
- **Issue:** SeriesCard now requires latestSession.id and latestSession.sessionScore, but the upstream data providers did not include these fields
- **Fix:** Updated series-list.tsx interface, series API route, and sessions page server component to include id and sessionScore in latestSession data
- **Files modified:** src/components/series/series-list.tsx, src/app/api/series/route.ts, src/app/(dashboard)/sessions/page.tsx
- **Verification:** typecheck and build pass
- **Committed in:** 4e7409b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for type consistency across the data pipeline. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 is now complete: meeting series CRUD, session wizard with all features, summary and completion flow
- Ready for Phase 6 (Action Items), Phase 7 (AI), Phase 9 (Notifications) -- all can proceed in parallel
- Session scoring data is available for Phase 10 (Analytics) dashboards

## Self-Check: PASSED

All created files verified present. Both task commits (8d4d1be, 4e7409b) confirmed in git log.

---
*Phase: 05-meeting-series-session-wizard*
*Completed: 2026-03-04*
