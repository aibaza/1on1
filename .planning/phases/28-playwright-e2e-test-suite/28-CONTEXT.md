# Phase 28: Playwright E2E Test Suite - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning
**Source:** PRD Express Path (user-provided invocation context)

<domain>
## Phase Boundary

Build and ship a comprehensive, maintainable Playwright E2E test suite for the 1on1 application that:
1. Fixes the broken auth setup so tests can authenticate against the dev server
2. Covers all critical user flows end-to-end
3. Diagnoses and documents the session summary page crash ([object ErrorEvent])

This phase does NOT migrate the dev server to a new port, does NOT add new app features, and does NOT modify production code unless strictly necessary to fix the auth callback.

</domain>

<decisions>
## Implementation Decisions

### Locked: Test Target & Environment
- Tests target the dev server on port 4301 (local `oneonone_dev` PostgreSQL DB)
- Docker UAT runs on port 4300 — NOT the test target
- `PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright` must be set for Chromium to work
- System Chromium symlink fix (libnspr4.so) is already in place
- Run command: `PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node node_modules/.bin/playwright test`

### Locked: Seed Credentials
- alice@acme.example.com — admin role (primary auth setup user)
- bob@acme.example.com — manager role
- carol@acme.example.com — manager role
- dave@acme.example.com — member role
- eve@acme.example.com — member role
- All passwords: `password123`

### Locked: Auth Setup Fix
- `e2e/auth.setup.ts` currently fails with `CallbackRouteError` — the authorize function throws in dev
- Root cause unknown; must be diagnosed and fixed before any other tests can run
- Auth state must be saved per role and reused by all specs (no re-login per test)
- Use Playwright's `storageState` to persist auth per role

### Locked: Test Coverage Requirements
The following flows MUST have E2E test coverage:
1. Login / logout (as admin, as manager, as member)
2. Dashboard overview loads (correct heading, stats visible)
3. Sessions list (sessions appear, filters work)
4. Start session flow — complete the wizard end-to-end (every step, submit)
5. Session summary page — must load without crash (or crash must be captured)
6. Templates CRUD — create template, add question, delete question, delete template
7. People management — invite user, list shows new user, change role
8. RBAC: manager sees correction edit icon; member does NOT see it
9. Correction form: Amended badge visible, inline form opens/closes, AI validation feedback visible after typing

### Locked: Debug Spec Requirements
- A dedicated debug spec navigates to the session summary page
- Captures ALL console errors, page errors (`pageerror` event), and network failures (response.status >= 400)
- Writes a structured JSON report to a file for offline analysis
- Must reproduce the `[object ErrorEvent]` crash and include: error type, message, stack trace, URL, timestamp
- Hypothesis to test: client hydration error OR Neon serverless WebSocket failing on local PostgreSQL

### Locked: Selector Strategy
- Use semantic selectors ONLY: `getByRole`, `getByLabel`, `getByText`, `getByTestId`
- NO CSS class selectors, NO XPath, NO element index selectors
- Add `data-testid` attributes to app components ONLY when no semantic selector exists
- Every locator must survive a CSS refactor

### Claude's Discretion
- File structure within `e2e/` directory (organize by feature vs by role vs flat)
- Whether to use Playwright fixtures for common setup (recommended)
- Page Object Model usage (recommended for wizard and complex flows)
- Whether to add a `playwright.config.ts` project for "debug" vs "full suite"
- Timeout and retry configuration
- Whether CI config goes in a new GitHub Actions workflow file or extends existing
- How to handle async loading states in selectors (prefer `waitFor` over `expect.toBeVisible`)

</decisions>

<specifics>
## Specific Ideas

### Auth Fix Investigation Points
- Check if `authorize` function in `src/auth.ts` reads env vars that are undefined in dev
- Check if `NEXTAUTH_URL` is set correctly for port 4301
- Check if the credential provider's authorize function does a DB call that fails on cold start
- Consider using direct cookie injection instead of UI login if authorize is fundamentally broken

### Debug Spec Capture Pattern
```ts
const errors: Array<{type: string, message: string, url: string}> = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(...) })
page.on('pageerror', err => errors.push(...))
page.on('response', res => { if (res.status() >= 400) errors.push(...) })
```

### Existing Files to Reuse
- `playwright.config.ts` — already configured, check existing project setup
- `e2e/auth.setup.ts` — fix in place, don't replace
- `e2e/debug-session-summary.spec.ts` — already exists (may need updates)
- `e2e/screenshot-tour.spec.ts` — already exists

### Session Summary Page Crash Context
- Error: digest `1473904854@E394` — `[object ErrorEvent]`
- Occurs on EVERY request to session summary in Docker
- Likely candidates: Neon serverless WebSocket trying to connect locally, or client component error during hydration
- If it's a Neon WebSocket issue: `ws://` URLs in browser console will be the smoking gun

</specifics>

<deferred>
## Deferred Ideas

- GitHub Actions CI integration (Wave 3 — nice to have, not blocking)
- Visual regression tests (screenshot diffing) — v2 concern
- Performance/load testing — out of scope
- Testing against Docker UAT (port 4300) — out of scope for this phase; only dev server (4301)
- Cross-browser testing (Firefox, WebKit) — Phase 28 targets Chromium only

</deferred>

---

*Phase: 28-playwright-e2e-test-suite*
*Context gathered: 2026-03-13 via PRD Express Path*
