---
phase: 20-mobile-responsiveness
plan: "01"
subsystem: testing
tags: [vitest, testing-library, react, mobile, tdd, wave-0]

# Dependency graph
requires:
  - phase: 19-design-system
    provides: "@testing-library/react and @testing-library/jest-dom installed as dev dependencies"
provides:
  - "3 failing RED unit tests for MOB-03 (nudge dismiss button touch target), MOB-04 (people table column meta), MOB-05 (audit log target column hide class)"
  - "Global jest-dom setup via src/test-setup.ts — toHaveClass and other DOM matchers available in all test files"
affects:
  - 20-02-mobile-responsiveness (Wave 1 — must make these 3 tests GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: write failing tests before implementing mobile fixes — ensures regression safety net"
    - "Global vitest setupFiles pattern for jest-dom matchers (src/test-setup.ts)"
    - "Inline vi.mock for next-intl and @tanstack/react-query without provider wrappers"

key-files:
  created:
    - src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx
    - src/components/people/__tests__/people-table-columns-mobile.test.tsx
    - src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx
    - src/test-setup.ts
  modified:
    - vitest.config.ts
    - CHANGELOG.md

key-decisions:
  - "jest-dom setupFiles added globally to vitest.config.ts (not per-file import) to ensure consistent DOM matcher availability across all test files"
  - "AuditLogClient test requires one mock entry (not empty array) because the table only renders when entries.length > 0"
  - "People table column test uses pure JS (no DOM render) — calls createColumns() factory directly and inspects ColumnDef meta"

patterns-established:
  - "Wave 0 test pattern: RED test + companion 'does not yet have X' test documents current state while asserting future state"

requirements-completed:
  - MOB-03
  - MOB-04
  - MOB-05

# Metrics
duration: 15min
completed: 2026-03-08
---

# Phase 20 Plan 01: Mobile Responsiveness Wave 0 Summary

**Three failing RED unit tests establish the regression safety net for mobile fixes: nudge dismiss button touch target (MOB-03), people table column visibility meta (MOB-04), and audit log target column hide class (MOB-05)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-08T08:12:00Z
- **Completed:** 2026-03-08T08:27:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created 3 failing (RED) test files that document exactly what the Wave 1 fixes must produce
- Added global `@testing-library/jest-dom` setup so `toHaveClass` and other DOM matchers work without per-file imports
- All 3 RED tests fail for the correct semantic reason (wrong class, missing meta, no hidden attribute) — not infrastructure errors

## Task Commits

1. **Tasks 1-3: All three RED test files** - `c3dfd5e` (test) — combined since all are Wave 0 scaffolding delivered as a single atomic unit

## Files Created/Modified

- `src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx` — RED test: dismiss button must have size-11; currently size-7 (MOB-03)
- `src/components/people/__tests__/people-table-columns-mobile.test.tsx` — RED test: secondary columns must have `hidden md:table-cell` meta; currently undefined (MOB-04)
- `src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx` — RED test: Target `<th>` must have `hidden` class; currently no such class (MOB-05)
- `src/test-setup.ts` — global Vitest setup: imports `@testing-library/jest-dom` for DOM matchers
- `vitest.config.ts` — added `setupFiles: ['./src/test-setup.ts']` to activate jest-dom globally
- `CHANGELOG.md` — documented all new test files and config change

## Decisions Made

- Added global jest-dom setup via `vitest.config.ts` rather than per-file imports — avoids repetition and ensures all future tests get DOM matchers automatically (Rule 3 deviation: blocking issue since `toHaveClass` failed without this)
- Mocked `useQuery` to return one entry for the audit-log test because `AuditLogClient` only renders the table body (and headers) when `entries.length > 0`
- People table test uses no DOM render — calls `createColumns()` factory directly and checks `ColumnDef.meta.className`, keeping it fast and environment-agnostic

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @testing-library/jest-dom global setup**
- **Found during:** Task 1 (nudge-card-touch-target test)
- **Issue:** `toHaveClass` threw "Invalid Chai property" — jest-dom matchers not registered; no setup file existed
- **Fix:** Created `src/test-setup.ts` importing `@testing-library/jest-dom`; added `setupFiles` to `vitest.config.ts`
- **Files modified:** `src/test-setup.ts` (created), `vitest.config.ts` (modified)
- **Verification:** All DOM matchers work; `bun run typecheck` passes
- **Committed in:** `c3dfd5e` (combined task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking infrastructure fix)
**Impact on plan:** Required to make `toHaveClass` assertions work at all. No scope creep — jest-dom was already installed, just not wired up.

## Issues Encountered

- AuditLogClient mock initially returned empty entries array, which prevented the table from rendering (the component shows EmptyState when no entries). Fixed by including one mock entry — the table then renders with all headers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 3 RED tests are in place with correct failure semantics
- Wave 1 (plan 20-02) must apply mobile fixes to make these 3 RED tests turn GREEN:
  - `nudge-card.tsx`: change `size-7` to `size-11` on dismiss button
  - `people-table-columns.tsx`: add `meta: { className: "hidden md:table-cell" }` to secondary columns
  - `audit-log-client.tsx`: add `className="hidden md:table-cell"` to Target `<TableHead>`
- No blockers

---
*Phase: 20-mobile-responsiveness*
*Completed: 2026-03-08*

## Self-Check: PASSED

- FOUND: src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx
- FOUND: src/components/people/__tests__/people-table-columns-mobile.test.tsx
- FOUND: src/app/(dashboard)/settings/audit-log/__tests__/audit-log-columns-mobile.test.tsx
- FOUND: src/test-setup.ts
- FOUND: .planning/phases/20-mobile-responsiveness/20-01-SUMMARY.md
- FOUND: commit c3dfd5e
