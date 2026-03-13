---
phase: 28-playwright-e2e-test-suite
plan: 04
subsystem: e2e-testing
tags: [playwright, e2e, templates, people, rbac]
dependency_graph:
  requires: [28-02, 28-03]
  provides: [templates-crud-e2e, people-rbac-e2e]
  affects: [e2e-suite-completeness]
tech_stack:
  added: []
  patterns: [fixture-based-multi-role-tests, post-creation-redirect-handling, collapsible-section-interaction]
key_files:
  created:
    - e2e/templates.spec.ts
  modified:
    - e2e/people.spec.ts
    - .gitignore
decisions:
  - "Template create redirects to detail page — tests handle both list and detail outcomes after creation"
  - "Archive button used instead of Delete — app uses Archive not Delete for template lifecycle"
  - "Add Question requires a section first — test explicitly adds section and waits for it before adding question"
  - "Invite button label is 'Invite' not 'Invite people' — fixed existing test selector bug (Rule 1)"
  - "people.spec.ts updated to import from ./fixtures — enables multi-role fixture tests in same file"
metrics:
  duration: 25
  completed_date: "2026-03-13"
  tasks: 2
  files: 3
---

# Phase 28 Plan 04: Templates/People E2E Specs Summary

**One-liner:** Templates CRUD (4 tests: list, create, add question, archive) and People RBAC (6 fixture-based tests: invite button visibility per role, role dropdowns) completing the Phase 28 E2E suite.

## What Was Built

### Task 1: Templates CRUD spec (`e2e/templates.spec.ts`)

4 tests using `adminPage` fixture:

1. **templates list loads with seeded template visible** — navigates to `/templates`, verifies heading, template card links, and Create Template button
2. **admin can create a new template** — opens dialog, fills name/description, submits, verifies template name visible post-creation
3. **admin can navigate to template detail and add a question** — navigates to template, adds a section, then adds a question via dialog
4. **admin can archive a template** — creates a template, navigates to detail, clicks Archive, confirms, verifies template no longer in active list

Key behaviors discovered and handled:
- After template creation, app redirects to template detail page — not back to list
- "Add Question" button only appears inside an expanded section — test explicitly adds a section first
- No "Delete Template" button exists — app uses Archive for template lifecycle management

### Task 2: People management spec + typecheck (`e2e/people.spec.ts`)

Updated `people.spec.ts` to:
- Import from `./fixtures` (extends `@playwright/test`, preserves `page` fixture for existing tests)
- Fix existing "Invite button" test — button label is "Invite" not "Invite people"
- Add `People Management RBAC` describe block with 6 fixture-based tests:

  1. **admin sees people list with all seeded users** — verifies alice, bob, dave visible
  2. **admin sees Invite button** — admin gets `+ Invite` action
  3. **admin can see role dropdown** — combobox visible in Bob's row for admin
  4. **manager does NOT see Invite button** — RBAC: invite is admin-only
  5. **member does NOT see Invite button** — RBAC: invite is admin-only
  6. **manager sees role badges (not dropdowns)** — manager cannot change roles

Also added `e2e/reports/` and `screenshots/` to `.gitignore`.

### Coverage Complete

All 5 E2E requirement areas now covered:
- E2E-01 (auth) — `auth.spec.ts`
- E2E-02 (core flows + templates/people) — `critical-path.spec.ts` + `templates.spec.ts` + `people.spec.ts`
- E2E-03 (RBAC) — `rbac.spec.ts` + `people.spec.ts` (RBAC block)
- E2E-04 (corrections UI) — `corrections.spec.ts`
- E2E-05 (debug spec) — `debug-session-summary.spec.ts`

## Test Results

- `e2e/templates.spec.ts`: 4/4 passed (chromium)
- `e2e/people.spec.ts`: 23/23 passed (17 existing + 6 new RBAC)
- `bun run typecheck`: exit 0
- `bun run test`: 163/163 Vitest unit tests passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect Invite button selector in existing people.spec.ts**
- **Found during:** Task 2 baseline run
- **Issue:** Existing test used `getByRole("button", { name: /Invite people/i })` but button label is "Invite" (dialog title is "Invite people")
- **Fix:** Changed to `getByRole("button", { name: /^invite$/i })` in both existing and new RBAC tests
- **Files modified:** `e2e/people.spec.ts`
- **Commit:** 11f30d6

**2. [Rule 1 - Bug] Template "delete" test replaced with Archive**
- **Found during:** Task 1 first run
- **Issue:** Plan specified "delete template" test but app uses Archive (no Delete button)
- **Fix:** Renamed test to "admin can archive a template" using `getByRole("button", { name: /^archive$/i })`
- **Files modified:** `e2e/templates.spec.ts`
- **Commit:** 0e1fd08

**3. [Rule 1 - Bug] Add Question test requires section first**
- **Found during:** Task 1 — test timed out waiting for Add Question button
- **Issue:** "Add Question" button only exists inside a section's CollapsibleContent; new templates have 0 sections
- **Fix:** Added explicit "Add Section" click with `expect(addSectionBtn).toBeVisible()` wait before attempting to add question
- **Files modified:** `e2e/templates.spec.ts`
- **Commit:** 0e1fd08

**4. [Rule 1 - Bug] Post-creation redirect ambiguity**
- **Found during:** Task 1 — template creation sometimes redirects to detail, sometimes stays on list
- **Fix:** Tests wait for template name to be visible regardless of URL, then explicitly navigate to template detail when needed
- **Files modified:** `e2e/templates.spec.ts`
- **Commit:** 0e1fd08

## Self-Check: PASSED

- FOUND: `e2e/templates.spec.ts`
- FOUND: `e2e/people.spec.ts`
- FOUND: `.planning/phases/28-playwright-e2e-test-suite/28-04-SUMMARY.md`
- FOUND: commit `0e1fd08` — Templates CRUD E2E spec
- FOUND: commit `11f30d6` — People management RBAC spec
