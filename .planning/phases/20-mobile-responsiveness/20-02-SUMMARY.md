---
phase: 20-mobile-responsiveness
plan: "02"
subsystem: dashboard-nudges, templates
tags: [mobile, touch-target, responsive, overflow-menu, dialog]
dependency_graph:
  requires: [20-01]
  provides: [MOB-01, MOB-03]
  affects: [nudge-card, template-list, import-dialog]
tech_stack:
  added: []
  patterns:
    - Tailwind dual-layout: hidden md:flex / flex md:hidden for responsive action bars
    - Controlled dialog pattern: optional open/onOpenChange props with internal fallback
    - DropdownMenu for secondary actions overflow on mobile
key_files:
  created: []
  modified:
    - src/components/dashboard/nudge-card.tsx
    - src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx
    - src/components/templates/import-dialog.tsx
    - src/components/templates/template-list.tsx
    - CHANGELOG.md
decisions:
  - "Use size-11 (44px) base with md:size-7 override — single class change, no media query JS needed"
  - "ImportDialog controlled props are optional — uncontrolled (desktop trigger button) still works unchanged"
  - "Mobile overflow DropdownMenuItem uses onSelect + state instead of DialogTrigger inside menu item (avoids nested portal conflicts)"
  - "import.button key used for overflow menu label (import.triggerLabel does not exist in en.json)"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-08"
  tasks_completed: 3
  files_modified: 4
---

# Phase 20 Plan 02: Nudge Touch Target and Template List Mobile Overflow Summary

**One-liner:** 44px dismiss button touch target on nudge cards (MOB-03) and dual-layout action bar with DropdownMenu overflow on template list (MOB-01).

## What Was Built

### Task 1: Fix nudge dismiss button touch target (MOB-03)

Updated `nudge-card.tsx` dismiss button className from `size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity` to `size-11 shrink-0 opacity-100 md:size-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity`.

- Mobile (default): 44×44px (`size-11`), always visible (`opacity-100`)
- Desktop (md+): 28×28px (`md:size-7`), hover-only (`md:opacity-0 md:group-hover:opacity-100`)
- X icon size unchanged at `size-3.5`

The RED test planted in Plan 01 now passes GREEN. The pre-fix "not.toHaveClass" assertion was removed from the test file (it was a state-verification that became stale post-fix).

### Task 2: Template list mobile overflow menu and ImportDialog controlled props (MOB-01)

**import-dialog.tsx** — Added optional `open?: boolean` and `onOpenChange?: (open: boolean) => void` props. When `open` is provided, the component enters controlled mode; otherwise `internalOpen` state is used unchanged. The existing trigger button still works for the desktop uncontrolled use case.

**template-list.tsx** — Replaced single action `<div>` with a dual-layout pattern:
- `hidden md:flex` desktop layout: full button row (Generate with AI, Import, Create Template)
- `flex md:hidden` mobile layout: Create Template button + `DropdownMenu` overflow (`MoreHorizontal` trigger)
- Mobile overflow contains: Generate with AI (link), Import (opens controlled `ImportDialog` via `importOpen` state)
- `ImportDialog` rendered outside `DropdownMenuContent` to avoid portal/trigger conflicts

### Task 3: Human verification (auto-approved)

⚡ Auto-approved: auto_advance=true. TypeCheck passes clean. MOB-03 unit test GREEN.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed stale RED assertion from nudge-card test**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `expect(btn).not.toHaveClass("size-11")` was the pre-fix RED confirmation test. After adding `size-11`, this test failed, blocking the suite.
- **Fix:** Removed the pre-fix assertion from the test file; the requirement test `expect(btn).toHaveClass("size-11")` now stands alone.
- **Files modified:** `src/components/dashboard/__tests__/nudge-card-touch-target.test.tsx`
- **Commit:** 64c0e04

**2. [Observation] import.triggerLabel key does not exist**
- **Found during:** Task 2 — plan suggested `t("import.triggerLabel")` for the overflow menu item
- **Resolution:** Used existing `t("import.button")` key instead (value: "Import") — no new i18n key needed
- **Impact:** None — same user-visible text, existing key

## Pre-existing Failures (Out of Scope)

- `analytics.json` translation parity: `analytics.chart.sessionHistory` missing from `ro/analytics.json` — confirmed pre-existing before any changes in this plan
- `e2e/*.spec.ts` — Playwright tests picked up by Vitest runner (configuration issue, pre-existing)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 64c0e04 | fix(20-02): raise nudge dismiss button touch target to 44px on mobile (MOB-03) |
| 2 | cc595f7 | feat(20-02): add mobile overflow menu to template list and controlled import dialog (MOB-01) |

## Self-Check: PASSED

- `src/components/dashboard/nudge-card.tsx` — FOUND, size-11 class present
- `src/components/templates/template-list.tsx` — FOUND, hidden md:flex + flex md:hidden dual layout present
- `src/components/templates/import-dialog.tsx` — FOUND, controlledOpen + internalOpen pattern present
- Commits 64c0e04 and cc595f7 — FOUND in git log
- TypeCheck — PASSES clean
- MOB-03 unit test — PASSES GREEN
