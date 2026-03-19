---
phase: 24-sessions-access-control-and-pre-meeting-talking-points
plan: 02
subsystem: ui
tags: [react, next-intl, tanstack-query, shadcn, series, agenda, talking-points, rbac]

requires:
  - phase: 24-sessions-access-control-and-pre-meeting-talking-points
    plan: 01
    provides: "SeriesCardData with manager info, talkingPointCount, scheduledAt; role-based API filtering"
provides:
  - "Role-based series grouping UI (admin/manager/member views)"
  - "AgendaSheet component for pre-meeting talking points"
  - "Agenda button with count badge on SeriesCard"
  - "i18n keys for sections, agenda, and talkingPoints in EN + RO"
affects: [wizard, sessions-page, context-panel]

tech-stack:
  added: []
  patterns:
    - "Role-based conditional rendering with extracted view components (AdminGroupedView, ManagerSectionView)"
    - "Sheet-based pre-meeting agenda with category-grouped collapsible sections"

key-files:
  created:
    - src/components/series/agenda-sheet.tsx
  modified:
    - src/components/series/series-list.tsx
    - src/components/series/series-card.tsx
    - messages/en/sessions.json
    - messages/ro/sessions.json

key-decisions:
  - "Tasks 1 and 2 merged into single commit — AgendaSheet required by SeriesCard imports"
  - "Admin groups separated by Separator component with my-6 margin"
  - "Single conditional branch for empty state (EmptyState + TalkingPointList together)"

patterns-established:
  - "Role-based view pattern: extract per-role JSX into named components (AdminGroupedView, ManagerSectionView)"
  - "Sheet-as-agenda: right-side sheet with category collapsibles wrapping existing TalkingPointList"

requirements-completed: [ACC-01, ACC-02, ACC-03, ACC-04, TP-02, TP-03, I18N-01]

duration: 3min
completed: 2026-03-19
---

# Phase 24 Plan 02: Sessions Page UI Summary

**Role-based series grouping (admin/manager/member) with AgendaSheet for pre-meeting talking points via right-side sheet**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T16:40:15Z
- **Completed:** 2026-03-19T16:43:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Admin view groups series by manager name (own group first with "(You)" suffix, rest alphabetical)
- Manager view splits series into "My Team" and "My 1:1s" sections with manager name on 1:1 cards
- Member view shows flat list (existing behavior preserved)
- Agenda button with ListTodo icon and count badge appears on scheduled session cards
- AgendaSheet opens from right with category-grouped TalkingPointList components
- All new UI strings added in both EN and RO

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Role-based grouping + AgendaSheet + i18n** - `051a84a` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src/components/series/agenda-sheet.tsx` - New AgendaSheet component with category collapsibles and TalkingPointList integration
- `src/components/series/series-list.tsx` - Role-based grouping: AdminGroupedView, ManagerSectionView, flat member view
- `src/components/series/series-card.tsx` - Agenda button with count badge, optional manager name display
- `messages/en/sessions.json` - Added sections, agenda, talkingPoints.saveError keys
- `messages/ro/sessions.json` - Romanian translations for all new keys

## Decisions Made
- Tasks 1 and 2 merged into single commit because AgendaSheet import was required by SeriesCard in Task 1
- Admin groups use Separator component (not raw HR) with my-6 vertical margin for consistency
- Empty state renders both EmptyState message and TalkingPointList in a single conditional branch (prevents dual-render bug)

## Deviations from Plan

None - plan executed exactly as written. Tasks were combined into a single commit due to import dependency (AgendaSheet needed by SeriesCard).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sessions page fully renders role-based views with pre-meeting agenda access
- Plan 03 can build on this foundation for any remaining phase work
- All typecheck and 201 tests pass

---
*Phase: 24-sessions-access-control-and-pre-meeting-talking-points*
*Completed: 2026-03-19*
