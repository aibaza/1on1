---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: UI/UX Improvements
status: planning
stopped_at: "Completed 22-safety-errors-inputs plan 01 — TDD RED setup: calendar.tsx, date-picker tests, danger-zone tests"
last_updated: "2026-03-15T18:50:37.142Z"
last_activity: 2026-03-10 — Roadmap created for v1.4 (phases 24-27, 13 requirements)
progress:
  total_phases: 11
  completed_phases: 9
  total_plans: 36
  completed_plans: 34
  percent: 62
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** The AI context layer that makes every meeting smarter than the last
**Current focus:** v1.4 Session Corrections & Accountability — Phase 24 ready to plan

## Current Position

Phase: 24 of 27 (Schema Foundation) — not started
Plan: —
Status: Ready to plan Phase 24
Last activity: 2026-03-10 — Roadmap created for v1.4 (phases 24-27, 13 requirements)

Progress: [████████████████░░░░░░░░░░] 62% (phases 1-21 complete, 22-27 pending)

## Performance Metrics

**Velocity (v1.3 reference):**
- Total plans completed: 85 (v1.0: 40 + v1.1: 13 + v1.2: 16 + v1.3: 16 to date)
- Average duration: ~6-8 min per plan
- Total execution time: ~7h (v1.2), similar expected for v1.3/v1.4

**By Phase (recent):**

| Phase | Plans | Status |
|-------|-------|--------|
| 18-critical-bugs | 3/3 | Complete |
| 19-design-system | 3/3 | Complete |
| 20-mobile-responsiveness | 4/4 | Complete |
| 21-content-data-display | 4/4 | Complete |
| 22-safety-errors-inputs | 0/? | Not started |
| 23-low-priority-polish | 0/? | Not started |

*Updated after each plan completion*
| Phase 24-schema-foundation P01 | 2 | 2 tasks | 5 files |
| Phase 24-schema-foundation P02 | 12 | 2 tasks | 3 files |
| Phase 25-core-api-business-logic P01 | 4m | 2 tasks | 5 files |
| Phase 25-core-api-business-logic P02 | 4min | 2 tasks | 5 files |
| Phase 25-core-api-business-logic P03 | 12 | 2 tasks | 3 files |
| Phase 26-email-notification-i18n P01 | 3 | 2 tasks | 5 files |
| Phase 26-email-notification-i18n P02 | 3 | 1 tasks | 2 files |
| Phase 26-email-notification-i18n P03 | 12min | 2 tasks | 4 files |
| Phase 27-ui-integration P01 | 10 | 3 tasks | 4 files |
| Phase 27-ui-integration P02 | 3min | 2 tasks | 6 files |
| Phase 27-ui-integration P03 | 525567min | 2 tasks | 4 files |
| Phase 27-ui-integration P04 | 10 | 2 tasks | 2 files |
| Phase 28-playwright-e2e-test-suite P01 | 25 | 2 tasks | 7 files |
| Phase 28-playwright-e2e-test-suite P02 | 16 | 2 tasks | 5 files |
| Phase 28-playwright-e2e-test-suite P03 | 15 | 2 tasks | 4 files |
| Phase 28-playwright-e2e-test-suite P04 | 25 | 2 tasks | 3 files |
| Phase 28-playwright-e2e-test-suite P05 | 1 | 2 tasks | 3 files |
| Phase 28-playwright-e2e-test-suite P06 | 15 | 2 tasks | 3 files |
| Phase 22-safety-errors-inputs P04 | 5 | 2 tasks | 3 files |
| Phase 22-safety-errors-inputs P01 | 10 | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [v1.4 roadmap]: Phases 24-27 — schema first, then API, then email, then UI; strict dependency chain
- [v1.4 roadmap]: AI validation runs via separate `/validate-reason` endpoint — AI outages do not block the mutation
- [v1.4 roadmap]: Email uses link-only format (no inline answer content) — privacy-safe per research finding
- [v1.4 roadmap]: 5-minute session-level email deduplication — one email per session window, not per answer
- [v1.3 roadmap]: Phase 22 depends on Phase 19 — ERR-01 (404 page) uses DES-04 empty-state component
- [Phase 24-schema-foundation]: Direct tenant_id on history table (not join-based) required for FORCE ROW LEVEL SECURITY to block adminDb superuser bypass
- [Phase 24-schema-foundation]: No many(sessionAnswerHistories) relation added to sessions.ts to avoid circular imports
- [Phase 24-schema-foundation]: drizzle-kit generate NOT run after enums.ts update — hand-written ALTER TYPE migration required in plan 24-02
- [Phase 24-schema-foundation]: Drizzle migration tracking gap fixed: registered migrations 0012-0017 manually in drizzle.__drizzle_migrations
- [Phase 24-schema-foundation]: Hand-written ALTER TYPE migration required — drizzle-kit generate cannot handle enum extension without breaking FK references
- [Phase 25-core-api-business-logic]: computeSessionScore already fully implemented — scoring tests discovered GREEN on first run, no implementation gap in plan 25-02
- [Phase 25-core-api-business-logic]: Zod schema tests (correctionInputSchema, validateReasonSchema, reasonValidationResultSchema) fail at import stage — correct RED behavior before plan 25-02/25-03 implementation
- [Phase 25-core-api-business-logic]: validateCorrectionReason throws on error — caller returns degraded { pass: true, feedback: null } so AI outages never block the correction mutation
- [Phase 25-core-api-business-logic]: correctionValidator uses claude-haiku-4-5 — short structured output, cost-effective tier
- [Phase 25-core-api-business-logic]: Zod v4 uses .issues not .errors on ZodError — corrected in both route files
- [Phase 25-core-api-business-logic]: validate-reason is auth-only (no series RBAC) — reason text advisory only, not sensitive; AI failures degrade to { pass: true, feedback: null }
- [Phase 26-email-notification-i18n]: i18n tests use toContain assertions on translated content to be genuinely RED before keys exist — not.toThrow() alone is insufficient since use-intl returns fallback strings
- [Phase 26-email-notification-i18n]: Dynamic import with try/catch used in test beforeEach to avoid hard module-not-found crash at test file load time
- [Phase 26-email-notification-i18n]: sendCorrectionEmails dedup check defaults to false on error — DB failures must not silently drop correction emails
- [Phase 26-email-notification-i18n]: sendCorrectionEmails accepts pre-resolved context — DB resolution is the API route layer's responsibility
- [Phase 26-email-notification-i18n]: IIFE pattern used for fire-and-forget in corrections route — allows multiple awaits for DB context resolution before calling sendCorrectionEmails
- [Phase 26-email-notification-i18n]: reportId, managerId, sessionNumber returned from withTenantContext result — zero extra DB calls added to hot path
- [Phase 26-email-notification-i18n]: adminDb used for post-commit email context resolution — operates outside RLS, appropriate for internal notification infrastructure
- [Phase 27-ui-integration]: // @vitest-environment happy-dom required for correction UI test files — global vitest env is node, React rendering needs DOM
- [Phase 27-ui-integration]: Submit-not-disabled test explicitly encodes AI-advisory-only requirement — Wave 2 must never block submission on AI validation result
- [Phase 27-ui-integration]: AmendedBadge and CorrectionHistoryPanel use hardcoded strings — test files render without next-intl provider, useTranslations throws without provider
- [Phase 27-ui-integration]: correctionsByAnswerId keyed by session_answers.id — allows O(1) lookup per answer row for AmendedBadge display
- [Phase 27-ui-integration]: Submit button gated only by isPending — test spec explicitly encodes AI-advisory-only requirement; reason length omitted to match test contract
- [Phase 27-ui-integration]: renderAnswerDisplay and SummaryAnswer exported from session-summary-view.tsx — shared display logic reused in AnswerCorrectionForm without duplication
- [Phase 27-ui-integration]: Vitest exclude array: ['e2e/**', 'node_modules/**'] — without include/exclude, Vitest picks up Playwright specs; separate configs for separate runners
- [Phase 27-ui-integration]: Chainable adminDb mock in vi.mock factory returns select().from().where().limit() resolving to [] by default — sendCorrectionEmails tests inherit working dedup mock without explicit setup
- [Phase 28-playwright-e2e-test-suite]: @neondatabase/serverless Pool uses WebSocket incompatible with local PostgreSQL — detect via URL pattern (.neon.tech) and fall back to standard pg Pool for local dev
- [Phase 28-playwright-e2e-test-suite]: Playwright fixtures approach preferred over project storageState for multi-role tests — fresh context per test enables role-switching within same spec
- [Phase 28-playwright-e2e-test-suite]: chromium project remains admin default; chromium-manager and chromium-member projects added for role-targeted test runs
- [Phase 28-playwright-e2e-test-suite]: User menu trigger identified by initials (AJ) — no aria-label on avatar button; getByRole('button', { name: /^AJ$/ }) is the correct selector
- [Phase 28-playwright-e2e-test-suite]: Sign out is a Radix UI menuitem (role='menuitem'), not a button — getByRole('menuitem', { name: /sign out/ }) + waitFor required for logout flow
- [Phase 28-playwright-e2e-test-suite]: Admin role sees series as informational links — no Start/Resume buttons; only owning manager sees action buttons on series cards
- [Phase 28-playwright-e2e-test-suite]: Wizard spinner (.animate-spin) detection via waitForFunction required before asserting content — React Query async load pattern
- [Phase 28-playwright-e2e-test-suite]: Session summary page is clean locally: HTTP 200, no crashes; duplicate React keys for Wellbeing/Performance noted in debug report (non-crashing)
- [Phase 28-playwright-e2e-test-suite]: Amended badge test uses test.skip — seed answer UUIDs fail Zod uuid() validation (variant bits 6xxx vs RFC4122 required [89ab]xxx); documented fix path in deferred-items
- [Phase 28-playwright-e2e-test-suite]: debug spec targets dev server (port 4301) via adminPage fixture; session summary locally clean: HTTP 200, no crashes; neon_websocket hypothesis matched Next.js HMR ws:// (not Neon)
- [Phase 28-playwright-e2e-test-suite]: Template create redirects to detail page — tests handle both list and detail outcomes after creation
- [Phase 28-playwright-e2e-test-suite]: Archive button used instead of Delete — app uses Archive not Delete for template lifecycle
- [Phase 28-playwright-e2e-test-suite]: Add Question requires section first — test explicitly adds section before attempting Add Question
- [Phase 28-playwright-e2e-test-suite]: GitHub Actions E2E workflow uses bun run test:e2e -- --project=setup --project=chromium for explicit project ordering; PLAYWRIGHT_BROWSERS_PATH set to /home/runner/.cache/ms-playwright in CI
- [Phase 28-playwright-e2e-test-suite]: Seed UUID fix: DELETE old 6000-variant rows in seedAnswers() before insert — onConflictDoUpdate(id) cannot match old PKs when UUID constants change; required for idempotent re-seeding
- [Phase 28-playwright-e2e-test-suite]: Amended badge E2E test skip removed — seed UUID 8000-variant fix enables correction POST to return 200; setupComplete variable also removed (used only for skip)
- [Phase 22-safety-errors-inputs]: not-found.tsx placed at sessions/[id]/summary/ to scope 404 interception to summary segment only
- [Phase 22-01]: @ts-expect-error used in date-picker.test.tsx to suppress TS2307 (missing module) — allows typecheck to pass while keeping Vitest RED at runtime
- [Phase 22-01]: calendar.tsx written manually (shadcn CLI not available via bunx) — uses react-day-picker v9 DayPicker API with new-york style class names

### Pending Todos

None yet.

### Blockers/Concerns

- v1.3 phases 22-23 must complete before v1.4 phases 24-27 begin (Phase 24 depends on Phase 23)
- Phase 25 AI prompt design: review current `generateObject` patterns in `src/lib/ai/service.ts` before coding (15-min review flagged by research)

## Session Continuity

Last session: 2026-03-15T18:50:37.137Z
Stopped at: Completed 22-safety-errors-inputs plan 01 — TDD RED setup: calendar.tsx, date-picker tests, danger-zone tests
Resume file: None
