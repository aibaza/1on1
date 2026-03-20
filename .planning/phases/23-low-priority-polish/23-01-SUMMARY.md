---
phase: 23-low-priority-polish
plan: 01
subsystem: ui
tags: [i18n, next-intl, tailwind, polish]

# Dependency graph
requires:
  - phase: 19-design-system
    provides: Badge component, design tokens
provides:
  - "Registration placeholder fix (Acme Corp)"
  - "Audit log acronym-aware title case (AI, RLS, API)"
  - "Shortened history search placeholder"
  - "Active users hide status badge"
  - "COMPLETED divider 13px font size"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ACRONYMS set for title-case formatting of known abbreviations"

key-files:
  created: []
  modified:
    - messages/en/auth.json
    - messages/en/history.json
    - messages/ro/history.json
    - src/app/(dashboard)/settings/audit-log/audit-log-client.tsx
    - src/components/people/people-table-columns.tsx
    - src/components/action-items/action-items-page.tsx

key-decisions:
  - "Forgot-password centering already handled by shared auth layout -- no code change needed"
  - "ACRONYMS set uses ReadonlySet<string> for immutable lookup"

patterns-established:
  - "Acronym-aware title case: maintain ACRONYMS set for audit log action labels"

requirements-completed: [POL-01, POL-02, POL-03, POL-04, POL-05, POL-08, POL-09]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 23 Plan 01: Copy and Styling Polish Summary

**Six independent copy/styling fixes: registration placeholder, audit log acronym casing, history search placeholder, active badge removal, and COMPLETED divider sizing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T17:25:36Z
- **Completed:** 2026-03-20T17:31:36Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Registration placeholder updated from "Acme Inc" to "Acme Corp" (EN)
- Audit log acronym-aware title case: "ai_pipeline_completed" renders as "AI Pipeline Completed"
- History search placeholder shortened to "Search..." / "Cauta..." to prevent UI truncation
- People list hides badge for active users (only pending/deactivated shown)
- Action items COMPLETED divider enlarged from text-[10px] to text-[13px]
- Forgot-password page centering verified (shared auth layout already handles it)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix i18n placeholders and audit log acronym casing** - `046ba4b` (fix)
2. **Task 2: Fix forgot-password centering, active badge, and action items divider** - `f7d0a06` (fix)

## Files Created/Modified
- `messages/en/auth.json` - Registration placeholder "Acme Corp"
- `messages/en/history.json` - Shortened search placeholder "Search..."
- `messages/ro/history.json` - Shortened search placeholder "Cauta..."
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx` - ACRONYMS set for title case
- `src/components/people/people-table-columns.tsx` - Return null for active status badge
- `src/components/action-items/action-items-page.tsx` - COMPLETED divider text-[13px]

## Decisions Made
- Forgot-password centering already handled by shared auth layout -- verified by reading both login and forgot-password pages (both render bare Card inside centered layout). No code change needed.
- ACRONYMS set placed inside component function (alongside existing ACTION_LABEL_MAP) rather than module-level, following existing code style.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing typecheck error in series-card.tsx (syntax error unrelated to this plan) -- not in scope, not fixed.
- Pre-existing lint warnings in action-items-page.tsx (useMemo deps) -- not in scope, not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All POL-01 through POL-09 requirements from this plan completed
- Ready for 23-02 plan execution

---
*Phase: 23-low-priority-polish*
*Completed: 2026-03-20*
