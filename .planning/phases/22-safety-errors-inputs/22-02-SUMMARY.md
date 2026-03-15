---
phase: 22-safety-errors-inputs
plan: "02"
subsystem: ui
tags: [alert-dialog, i18n, shadcn, accessibility, danger-zone, radix-ui]

# Dependency graph
requires:
  - phase: 22-01
    provides: TDD RED tests for Danger Zone AlertDialog UI contract (team-detail-danger-zone.test.tsx)
provides:
  - Danger Zone section in team-detail-client.tsx with AlertDialog confirmation for delete
  - EN + RO i18n keys: dangerZone, dangerZoneDesc, deleteConfirmTitle, cancel
  - SAFE-01 Danger Zone tests GREEN
affects: [future team management UI, any other destructive action patterns]

# Tech tracking
tech-stack:
  added: []
  patterns: [AlertDialog wrapping destructive actions, Danger Zone visual separation pattern with border-destructive/20 separator, outlined destructive button styling instead of filled]

key-files:
  created: []
  modified:
    - src/app/(dashboard)/teams/[id]/team-detail-client.tsx
    - messages/en/teams.json
    - messages/ro/teams.json

key-decisions:
  - "AlertDialog open state controlled via useState(deleteDialogOpen) — allows programmatic control and proper animation"
  - "Delete trigger uses variant=outline + border-destructive text-destructive classes — visually communicates danger without filled red that could be confused with a primary action"
  - "Top-level cancel key added to teams.json — AlertDialog cancel cannot reach into create.cancel nesting"
  - "Danger Zone placed between actions row and members table — keeps destructive action accessible but visually separated from non-destructive addMembers"

patterns-established:
  - "Danger Zone pattern: mt-8 pt-8 border-t border-destructive/20 with h3 text-destructive heading and outlined delete trigger"
  - "AlertDialog for destructive mutations: always use AlertDialog over window.confirm() for accessibility and non-blocking UX"

requirements-completed: [SAFE-01]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 22 Plan 02: Safety Errors Inputs Summary

**Danger Zone section replaces window.confirm() in team-detail-client.tsx — delete action gated behind accessible AlertDialog with outlined red trigger and i18n-ready EN/RO copy**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T18:53:22Z
- **Completed:** 2026-03-15T18:58:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Delete Team button moved into visually distinct Danger Zone section (red heading, border separator)
- window.confirm() replaced with accessible Radix UI AlertDialog — non-blocking, keyboard-navigable, screen-reader compatible
- Delete button now uses outlined destructive styling (border-destructive text-destructive), not filled destructive
- EN and RO i18n keys added: dangerZone, dangerZoneDesc, deleteConfirmTitle, cancel
- All 4 Danger Zone unit tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Add i18n keys for Danger Zone in EN and RO** - `0df8269` (feat)
2. **Task 2: Refactor team-detail-client.tsx — Danger Zone with AlertDialog** - `b60bfca` (feat)

## Files Created/Modified
- `src/app/(dashboard)/teams/[id]/team-detail-client.tsx` - Added AlertDialog import, deleteDialogOpen state, Danger Zone section; removed window.confirm() destructive button
- `messages/en/teams.json` - Added dangerZone, dangerZoneDesc, deleteConfirmTitle, cancel keys
- `messages/ro/teams.json` - Added Romanian equivalents of Danger Zone keys

## Decisions Made
- AlertDialog open state is controlled via `deleteDialogOpen` useState — enables programmatic control and smooth Radix animation
- Top-level `cancel` key added at teams namespace level (not re-using `create.cancel`) — flat key access required by useTranslations('teams')
- Delete trigger uses `variant="outline"` with className overrides rather than `variant="destructive"` — test contract explicitly checks for border-destructive/text-destructive classes without filled bg

## Deviations from Plan

None - plan executed exactly as written. The `cancel` key addition was noted in the plan task description as a conditional step ("if top-level cancel key doesn't exist, add it") — it was needed and added inline.

## Issues Encountered
- Pre-existing typecheck error in `src/components/ui/__tests__/date-picker.test.tsx` (unused @ts-expect-error from plan 22-01) — out of scope, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SAFE-01 complete: Danger Zone pattern established for destructive actions
- Pattern can be reused for other destructive flows (session delete, series delete, etc.)
- Phase 22 plans 03+ can proceed (input validation, error display, etc.)

---
*Phase: 22-safety-errors-inputs*
*Completed: 2026-03-15*
