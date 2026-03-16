---
phase: 28-playwright-e2e-test-suite
plan: 02
subsystem: testing
tags: [playwright, e2e, auth, dashboard, sessions, wizard, session-summary]

# Dependency graph
requires:
  - phase: 28-01
    provides: fixtures.ts with adminPage/managerPage/memberPage, auth storageState files
provides:
  - e2e/auth.spec.ts — login for all 3 roles, invalid login, logout with protected route check
  - e2e/dashboard.spec.ts — /overview load tests for admin, manager, member
  - e2e/sessions.spec.ts — sessions list, wizard completion, session summary crash capture, detail page
  - e2e/reports/session-summary-debug.json — captured errors from session summary page
affects:
  - 28-03-rbac-corrections
  - 28-04-templates-people

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Login flow: fresh browser context (empty storageState) → fill form → waitForURL /overview"
    - "Logout flow: click avatar button with initials (AJ) → waitFor menuitem Sign out → click → waitForURL /login"
    - "Wizard loading: waitForFunction (no .animate-spin) before asserting content"
    - "Session summary crash capture: listen to console/pageerror/response events, write debug JSON to e2e/reports/"
    - "Admin vs manager series visibility: admin sees series as links (no Start/Resume buttons); manager owns series and sees buttons"

key-files:
  created:
    - e2e/auth.spec.ts
    - e2e/dashboard.spec.ts
    - e2e/sessions.spec.ts
    - e2e/reports/session-summary-debug.json
  modified:
    - CHANGELOG.md

key-decisions:
  - "User menu trigger has no aria-label — identified by button with initials text (AJ for Alice Johnson)"
  - "Sign out is a Radix UI DropdownMenuItem — use getByRole('menuitem') not getByRole('button')"
  - "Upcoming Sessions heading strict-mode conflict — use exact: true to avoid matching 'No upcoming sessions this week' h3"
  - "Admin does not own series so no Start/Resume buttons in sessions list — verify via series links instead"
  - "Wizard spinner (.animate-spin) must disappear before asserting content — waitForFunction used for detection"
  - "Session summary page clean: HTTP 200, no error page, 0 page errors — only duplicate React keys for Wellbeing/Performance categories (console warnings, not crashes)"

patterns-established:
  - "Pattern: waitForFunction(spinner gone) + waitForTimeout buffer before wizard content assertions"
  - "Pattern: session summary error capture — fs.mkdirSync + writeFileSync in test body for diagnostic JSON"
  - "Pattern: use exact: true for headings when page has related sub-headings with similar text"

requirements-completed: [E2E-02, E2E-05]

# Metrics
duration: 16min
completed: 2026-03-13
---

# Phase 28 Plan 02: Core Flows Summary

**Login/logout, dashboard, sessions list, wizard completion, and session summary crash capture — 17 tests all green; session summary loads clean (HTTP 200, 0 crashes, duplicate-key warnings noted)**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-03-13T09:41:07Z
- **Completed:** 2026-03-13T09:57:35Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `e2e/auth.spec.ts` with 5 tests: valid login for admin, manager, and member; invalid password stays on /login; logout navigates to /login and verifies /overview is protected
- Created `e2e/dashboard.spec.ts` with 3 tests: /overview loads for all three roles with welcome heading visible
- Created `e2e/sessions.spec.ts` with 9 tests across 4 groups:
  - Sessions list (admin): heading, seeded names visible, series links present
  - Wizard (manager bob): Start → /wizard/ → wait for load → advance steps → assert completion
  - Session summary: captures console/page/network errors, writes `e2e/reports/session-summary-debug.json`, asserts HTTP 200 and no error page
  - Session detail: /sessions/:id loads HTTP 200 without error page

## Task Commits

1. **Task 1: Auth spec (login/logout all roles)** - `7f0bab3` (feat)
2. **Task 2: Dashboard spec + Sessions list + Wizard + Session summary** - `03b8466` (feat)

## Files Created/Modified

- `e2e/auth.spec.ts` — 5 auth tests; fresh browser context for login, adminPage fixture for logout
- `e2e/dashboard.spec.ts` — 3 dashboard load tests using role fixtures
- `e2e/sessions.spec.ts` — 9 session tests: list, wizard, summary crash capture, detail
- `e2e/reports/session-summary-debug.json` — debug artifact from session summary test run
- `CHANGELOG.md` — updated with new specs

## Decisions Made

- **User menu trigger identified by initials**: The avatar button has no aria-label attribute. The AvatarFallback text "AJ" (Alice Johnson) is the accessible name. `getByRole("button", { name: /^AJ$/i })` is the correct selector.
- **Sign out is a menuitem not a button**: Radix UI DropdownMenuItem renders with `role="menuitem"`. Initial attempt with `getByRole("button", { name: /sign out/i })` failed. Using `getByRole("menuitem", { name: /sign out/i })` with `waitFor` works correctly.
- **Upcoming Sessions heading exact match**: `getByRole("heading", { name: /upcoming sessions/i })` matches both the h2 "Upcoming Sessions" and the h3 "No upcoming sessions this week" — strict mode violation. Fixed with `exact: true`.
- **Admin has no Start/Resume on series cards**: Admins view series as informational cards (links to `/sessions/:seriesId`). Only the manager who owns a series sees Start/Resume buttons. Test changed to assert series links are present.
- **Wizard needs spinner detection**: The wizard shell shows `<Loader2 className="animate-spin">` while fetching session data. `waitForFunction` checking for absence of `.animate-spin` class gives a reliable signal that data has loaded.
- **Session summary is clean locally**: HTTP 200, no application error page, no page errors. Two duplicate React key warnings ("Wellbeing", "Performance") in console — non-crashing, noted for future fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed logout selector — getByRole("menuitem") required, not getByRole("button")**
- **Found during:** Task 1 (auth spec logout test)
- **Issue:** Plan template used `getByRole("menuitem", ...)` but intermediate draft used `getByRole("button", { name: /sign out/i })`. The Radix UI DropdownMenuItem renders as `role="menuitem"`, not `role="button"`. The button selector found no elements.
- **Fix:** Reverted to `getByRole("menuitem", { name: /sign out/i })` plus `waitFor({ state: "visible" })` before clicking
- **Files modified:** `e2e/auth.spec.ts`
- **Verification:** Logout test passes; menuitem "Sign out" is visible in the dropdown ARIA tree
- **Committed in:** `7f0bab3` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed dashboard heading strict-mode conflict with exact: true**
- **Found during:** Task 2 (dashboard spec)
- **Issue:** `getByRole("heading", { name: /upcoming sessions/i })` matched both `<h2>Upcoming Sessions</h2>` and `<h3>No upcoming sessions this week</h3>` — Playwright strict mode rejects multiple matches
- **Fix:** Changed to `{ name: "Upcoming Sessions", exact: true }.first()` to target the h2 precisely
- **Files modified:** `e2e/dashboard.spec.ts`
- **Verification:** Dashboard test passes, no strict mode violation
- **Committed in:** `03b8466` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed sessions list Start/Resume assertion — admin view has no buttons**
- **Found during:** Task 2 (sessions list test)
- **Issue:** Plan spec expected Start/Resume buttons visible to admin on sessions list. Admin role does not own any meeting series in seed data — the series cards render as informational links without action buttons. Only the owning manager sees Start/Resume.
- **Fix:** Changed assertion to verify series links (`a[href^='/sessions/ffffffff']`) are visible instead
- **Files modified:** `e2e/sessions.spec.ts`
- **Verification:** Test passes; 2+ series links visible in admin view
- **Committed in:** `03b8466` (Task 2 commit)

**4. [Rule 1 - Bug] Fixed wizard content assertion — added spinner-gone waitForFunction**
- **Found during:** Task 2 (wizard test)
- **Issue:** After clicking Start and reaching `/wizard/:id`, the page shows a loading spinner (Loader2 with `animate-spin` class) while fetching session data via React Query. Content assertions fired before data loaded, finding only the spinner.
- **Fix:** Added `waitForFunction(() => !document.querySelector('.animate-spin'))` before asserting wizard content or Next button visibility
- **Files modified:** `e2e/sessions.spec.ts`
- **Verification:** Wizard test passes; content visible after spinner disappears
- **Committed in:** `03b8466` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 - bugs in selectors/timing)
**Impact on plan:** All fixes required for test correctness — no scope creep. Selector bugs discovered by running against real UI. Timing fix is standard Playwright pattern for SPAs with async data loading.

## Issues Encountered

- Duplicate React key warnings on session summary page ("Wellbeing" and "Performance" category keys appear twice in component tree) — captured in debug report. Non-crashing. Logged for future investigation but out of scope for this plan.

## Self-Check: PASSED

All created files verified:
- FOUND: e2e/auth.spec.ts
- FOUND: e2e/dashboard.spec.ts
- FOUND: e2e/sessions.spec.ts
- FOUND: e2e/reports/session-summary-debug.json
- FOUND: .planning/phases/28-playwright-e2e-test-suite/28-02-SUMMARY.md

Commits verified:
- FOUND: 7f0bab3 (Task 1: auth spec)
- FOUND: 03b8466 (Task 2: dashboard + sessions specs)
- FOUND: eb177ef (metadata commit)

## Next Phase Readiness

- All 17 core flow tests green on chromium project
- `e2e/reports/session-summary-debug.json` documents session summary page health
- Auth, dashboard, and sessions flows verified — ready for Phase 28-03 RBAC corrections testing

---
*Phase: 28-playwright-e2e-test-suite*
*Completed: 2026-03-13*
