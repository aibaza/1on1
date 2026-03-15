---
phase: 22-safety-errors-inputs
plan: "01"
subsystem: testing/ui-foundations
tags: [tdd, red-phase, calendar, date-picker, danger-zone, react-day-picker]
dependency_graph:
  requires: []
  provides: [INP-01-test-contract, SAFE-01-test-contract, calendar-component]
  affects: [22-02-PLAN, 22-03-PLAN]
tech_stack:
  added: [react-day-picker@9.14.0, date-fns@4.1.0]
  patterns: [tdd-red-phase, vitest-happy-dom, ts-expect-error-for-missing-module]
key_files:
  created:
    - src/components/ui/calendar.tsx
    - src/components/ui/__tests__/date-picker.test.tsx
    - src/components/teams/__tests__/team-detail-danger-zone.test.tsx
  modified:
    - package.json
    - bun.lock
    - CHANGELOG.md
decisions:
  - "@ts-expect-error used in date-picker.test.tsx to suppress TS2307 (missing module) — allows typecheck to pass while keeping Vitest RED at runtime"
  - "calendar.tsx written manually (shadcn CLI not available via bunx) — uses react-day-picker v9 DayPicker API with new-york style class names matching project conventions"
  - "Danger Zone test imports existing team-detail-client.tsx — assertions fail because component not yet refactored, confirming correct RED state"
metrics:
  duration_minutes: 10
  completed_date: "2026-03-15"
  tasks_completed: 3
  files_created: 3
  files_modified: 3
requirements_addressed: [SAFE-01, INP-01]
---

# Phase 22 Plan 01: TDD Setup — Dependencies, Calendar, and RED Tests Summary

**One-liner:** Installed react-day-picker v9 + date-fns v4, wrote calendar.tsx manually (shadcn CLI unavailable), and created two RED test files defining behavioral contracts for SAFE-01 (Danger Zone AlertDialog) and INP-01 (DatePicker string conversion).

## What Was Built

### Task 1: Dependencies and calendar.tsx

- `bun add react-day-picker@9.14.0 date-fns@4.1.0` — both packages installed
- `src/components/ui/calendar.tsx` written manually using react-day-picker v9 `DayPicker` API
  - New-york shadcn style, uses `buttonVariants` for nav buttons, `Chevron` component override
  - Exports `Calendar` and `CalendarProps` — ready for use in `date-picker.tsx` (plan 22-02/22-03)

### Task 2: DatePicker RED test (INP-01)

`src/components/ui/__tests__/date-picker.test.tsx` — 4 failing tests:

1. Renders a `role="button"` trigger, not `<input type="date">`
2. Shows placeholder text when `value=""`
3. Shows formatted date (not raw YYYY-MM-DD) when value is provided
4. `onChange` called with YYYY-MM-DD string when date selected

Fails at import: `@/components/ui/date-picker` does not exist. `@ts-expect-error` added so `bun run typecheck` passes cleanly.

### Task 3: Danger Zone RED test (SAFE-01)

`src/components/teams/__tests__/team-detail-danger-zone.test.tsx` — 4 failing assertion tests:

1. DOM contains heading text "dangerZone" (i18n key) — FAILS: no such heading
2. Delete button has `border-destructive text-destructive` classes — FAILS: current button is `variant="destructive"` (filled)
3. AlertDialog wraps delete action (data-slot="alert-dialog-trigger") — FAILS: current code uses `window.confirm()`
4. Danger Zone section appears after "addMembers" button — FAILS: no Danger Zone section exists

All mocks in place: next-intl, @tanstack/react-query, next/navigation, sonner, MemberPicker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI not available via `bunx shadcn@latest`**
- **Found during:** Task 1
- **Issue:** `bunx shadcn@latest add calendar` exits with "Script not found"
- **Fix:** Wrote `calendar.tsx` manually using react-day-picker v9 `DayPicker` API and new-york shadcn class names from RESEARCH.md code examples
- **Files modified:** `src/components/ui/calendar.tsx`
- **Commit:** 221d8c0

**2. [Rule 1 - Bug] TypeScript typecheck failed due to missing module import**
- **Found during:** Post-task verification
- **Issue:** `bun run typecheck` failed with TS2307 for `@/components/ui/date-picker` import in test file
- **Fix:** Added `// @ts-expect-error` before the import — suppresses TS error while Vitest still fails at runtime (correct RED behavior)
- **Files modified:** `src/components/ui/__tests__/date-picker.test.tsx`
- **Commit:** bb5079f

## Verification Results

| Criterion | Status |
|-----------|--------|
| `react-day-picker@9.14.0` in package.json | PASS |
| `date-fns@4.1.0` in package.json | PASS |
| `src/components/ui/calendar.tsx` exists | PASS |
| `date-picker.test.tsx` fails (RED) | PASS — import error |
| `team-detail-danger-zone.test.tsx` fails (RED) | PASS — 4 assertion failures |
| `bun run typecheck` passes | PASS |

## Commits

| Hash | Message |
|------|---------|
| 221d8c0 | chore(22-01): install react-day-picker v9, date-fns v4, add calendar.tsx |
| b56f758 | test(22-01): RED — DatePicker string↔Date conversion contract (INP-01) |
| e481e07 | test(22-01): RED — Danger Zone AlertDialog UI contract (SAFE-01) |
| bb5079f | test(22-01): add ts-expect-error to date-picker.test.tsx for typecheck compliance |

## Self-Check: PASSED
