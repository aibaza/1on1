---
phase: 19-design-system
plan: 02
subsystem: ui
tags: [react, component, empty-state, design-system, refactor]

# Dependency graph
requires:
  - phase: 19-01
    provides: RED test files for DES-04 (empty-state.test.tsx already written)
provides:
  - EmptyState shared component at src/components/ui/empty-state.tsx
  - All 10 inline border-dashed empty-state patterns replaced with EmptyState
affects:
  - phase-22 (ERR-01 404 page reuses EmptyState component)
  - any new feature that needs an empty-state pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EmptyState component API: icon (optional ComponentType), heading (required), description (optional), action (optional ReactNode), className (optional) — merged via cn()"
    - "Conditional CTA in EmptyState: pass undefined to action prop when no action should render"

key-files:
  created:
    - src/components/ui/empty-state.tsx
  modified:
    - src/components/series/series-list.tsx
    - src/components/dashboard/recent-sessions.tsx
    - src/components/dashboard/upcoming-series-cards.tsx
    - src/components/dashboard/upcoming-sessions.tsx
    - src/components/templates/template-list.tsx
    - src/components/action-items/action-items-page.tsx
    - src/app/(dashboard)/teams/teams-grid.tsx
    - src/app/(dashboard)/settings/audit-log/audit-log-client.tsx
    - src/components/series/session-timeline.tsx
    - src/components/history/history-page.tsx

key-decisions:
  - "action prop accepts undefined — conditional CTAs pass `canCreate ? <Button>...</Button> : undefined` so EmptyState renders no action div when undefined"
  - "session-timeline.tsx bare <p> empty state converted to EmptyState with className='py-0' to avoid double-padding"
  - "history-page.tsx empty state uses conditional heading/description/action (filter vs no-session branch) — all passed inline as ternary expressions"

patterns-established:
  - "EmptyState: single reusable component for all empty-state UX patterns across the app — import from @/components/ui/empty-state"

requirements-completed:
  - DES-04

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 19 Plan 02: EmptyState Component + 10 Call-Site Replacements Summary

**Shared EmptyState component (DES-04) replacing all inline border-dashed empty-state patterns across 10 files — single source of truth for empty-state UI**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-08T07:46:31Z
- **Completed:** 2026-03-08T07:51:00Z
- **Tasks:** 2
- **Files modified:** 11 (1 created + 10 call sites)

## Accomplishments
- Created `EmptyState` component at `src/components/ui/empty-state.tsx` with typed props: icon, heading, description, action, className
- All 5 DES-04 unit tests pass green (heading render, description render, icon SVG, action slot, no-crash)
- All 10 inline `border-dashed` empty-state patterns replaced with `<EmptyState>` — no inline patterns remain in modified files
- Typecheck passes 0 errors; pre-existing lint errors in unrelated files are out of scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EmptyState component** - `eba92b3` (feat)
2. **Task 2: Replace all inline empty-state patterns** - `0a727ca` (feat)

**Plan metadata:** (created after this summary)

## Files Created/Modified
- `src/components/ui/empty-state.tsx` - New shared EmptyState component (DES-04)
- `src/components/series/series-list.tsx` - CalendarDays icon + Button CTA via EmptyState
- `src/components/dashboard/recent-sessions.tsx` - FileText icon via EmptyState
- `src/components/dashboard/upcoming-series-cards.tsx` - Calendar icon + Button CTA via EmptyState
- `src/components/dashboard/upcoming-sessions.tsx` - Calendar icon + Button CTA via EmptyState
- `src/components/templates/template-list.tsx` - FileText icon + conditional CTA via EmptyState
- `src/components/action-items/action-items-page.tsx` - ListChecks icon + Button CTA via EmptyState
- `src/app/(dashboard)/teams/teams-grid.tsx` - Users icon + conditional CTA via EmptyState
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx` - heading-only EmptyState (text-only)
- `src/components/series/session-timeline.tsx` - heading-only EmptyState (replaced bare `<p>`)
- `src/components/history/history-page.tsx` - ClipboardList icon + conditional CTA (filter vs no-session)

## Decisions Made
- `action` prop accepts `undefined` — enables `canCreate ? <CTA /> : undefined` pattern for conditional CTAs without any extra logic in the component
- `session-timeline.tsx` used `className="py-0"` on EmptyState to avoid double-padding from the surrounding container
- `history-page.tsx` empty state uses inline ternaries for heading/description/action (filter vs no-session case) — keeps logic co-located with the render condition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing translation parity test failure (`analytics.chart.sessionHistory` missing from RO locale) — confirmed pre-existing via `git stash` verification, out of scope for this plan. Logged to deferred items.

## Next Phase Readiness
- DES-04 complete — EmptyState ready for Phase 22 ERR-01 (404 page)
- Phase 22 can now import `{ EmptyState }` from `@/components/ui/empty-state` for the 404 page

## Self-Check: PASSED
- `src/components/ui/empty-state.tsx` — FOUND
- `.planning/phases/19-design-system/19-02-SUMMARY.md` — FOUND
- Commit `eba92b3` (Task 1) — FOUND
- Commit `0a727ca` (Task 2) — FOUND

---
*Phase: 19-design-system*
*Completed: 2026-03-08*
