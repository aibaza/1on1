---
phase: 23-low-priority-polish
plan: 02
subsystem: ui
tags: [tailwind, dark-mode, i18n, series-card, team-card]

# Dependency graph
requires:
  - phase: 23-low-priority-polish
    provides: UI-SPEC and research for POL-06/POL-07
provides:
  - Dark mode border on team cards
  - Manager-only "Start first session" link on empty series cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [fragment-wrapper-for-ternary-multi-element]

key-files:
  created: []
  modified:
    - src/components/people/team-card.tsx
    - src/components/series/series-card.tsx
    - messages/en/sessions.json
    - messages/ro/sessions.json

key-decisions:
  - "Fragment wrapper needed for ternary branch with multiple JSX elements (Tooltip + conditional button)"

patterns-established:
  - "dark:border-border for subtle dark mode card borders"
  - "relative z-10 pointer-events-auto pattern for interactive elements inside card Link overlay"

requirements-completed: [POL-06, POL-07]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 23 Plan 02: Team Card Dark Border & Empty Series Start Link Summary

**Dark mode border on team cards via dark:border-border, plus manager-only "Start first session" CTA on empty series cards with EN/RO i18n**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T17:25:46Z
- **Completed:** 2026-03-20T17:29:46Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Team cards now have visible border definition in dark mode
- Series cards with no sessions show a "Start first session" link visible only to managers
- Link triggers existing startSession mutation with proper click propagation handling
- Both EN and RO translations added for the new key

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dark mode border to team cards** - `b19990d` (feat)
2. **Task 2: Add "Start first session" link on empty series cards** - `0972b9b` (feat)

## Files Created/Modified
- `src/components/people/team-card.tsx` - Added dark:border-border class to Card element
- `src/components/series/series-card.tsx` - Added conditional start-first button for managers with no sessions
- `messages/en/sessions.json` - Added startFirst translation key
- `messages/ro/sessions.json` - Added startFirst Romanian translation

## Decisions Made
- Fragment wrapper (`<>...</>`) needed around ternary else-branch to contain both Tooltip and conditional button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSX ternary branch needed Fragment wrapper**
- **Found during:** Task 2 (Start first session link)
- **Issue:** Ternary `) : (` branch had two sibling JSX elements (Tooltip + button), causing TS1005 parse error
- **Fix:** Wrapped both elements in a React Fragment (`<>...</>`)
- **Files modified:** src/components/series/series-card.tsx
- **Verification:** typecheck passes clean
- **Committed in:** 0972b9b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor JSX structural fix. No scope creep.

## Issues Encountered
- `bun run build` fails with transient ENOENT on .next/static temp file -- environment issue unrelated to code changes. Typecheck passes clean confirming correctness.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 23 complete (both plans executed)
- Ready for v1.4 phases (24-27)

---
*Phase: 23-low-priority-polish*
*Completed: 2026-03-20*
