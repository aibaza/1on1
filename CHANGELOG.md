# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.3.8] - 2026-03-16

### Fixed
- `src/lib/ai/pipeline.ts`: add `await Sentry.flush(3000)` in `finally` block — without this, all Sentry events captured inside `waitUntil` background tasks were silently discarded (HTTP response already sent, normal flush-on-response never fired)
- `src/lib/ai/pipeline.ts`: add `Sentry.captureMessage` at pipeline start as diagnostic signal to confirm server-side Sentry is working and the pipeline function is invoked
- `src/app/api/sessions/[id]/ai-summary/route.ts`: extend stuck detection to cover `pending` status (not just `generating`) — sessions where the pipeline never started (e.g. `waitUntil` killed) now auto-reset to `failed` after 5 minutes, showing the retry button instead of spinning forever

## [1.3.7] - 2026-03-16

### Added
- `src/lib/ai/pipeline.ts`: Sentry breadcrumbs at every pipeline step (status→generating, context gather, language resolve, generateSummary, generateManagerAddendum, generateActionSuggestions, completed) — enables pinpointing exact failure point in production
- `src/lib/ai/pipeline.ts`: `Sentry.captureException` on main pipeline failure with `anthropicKeyPresent` flag, and on non-fatal snapshot/email errors with `pipeline_step` tag
- `src/lib/ai/service.ts`: `Sentry.captureException` in `generateSummary`, `generateManagerAddendum`, `generateActionSuggestions` — captures raw Anthropic error (401/429/etc.) with `ai_operation`, `model`, `sessionId`, `tenantId`, `anthropicKeyPresent` context

### Fixed
- `POST /api/sessions/[id]/complete`: wrap AI pipeline in `waitUntil()` so Vercel keeps the function alive after HTTP response — fire-and-forget was killed before AI could run
- `POST /api/sessions/[id]/ai-retry`: same `waitUntil()` fix; also accept `pending` status so stuck sessions can be retried
- `POST /api/invites/resend`: create invite token on the fly for seeded/imported users who have no existing token — previously returned 400 for all such users

## [1.3.6] - 2026-03-16

### Added
- `src/app/(dashboard)/sessions/[id]/summary/not-found.tsx`: contextual 404 page for non-existent session summary URLs — shown inside dashboard layout with "Back to Sessions" link (ERR-01)
- `messages/en/sessions.json` + `messages/ro/sessions.json`: added `notFound` i18n keys for session summary 404 page (ERR-01)
- `src/components/ui/calendar.tsx`: shadcn Calendar component (react-day-picker v9, new-york style)
- `src/components/ui/date-picker.tsx`: shared DatePicker component (Calendar + Popover composition, string↔Date boundary, INP-01)
- `react-day-picker@9.14.0` and `date-fns@4.1.0` as dependencies for DatePicker

### Changed
- `src/app/(dashboard)/teams/[id]/team-detail-client.tsx`: Delete Team moved into a Danger Zone section — `window.confirm()` replaced with accessible AlertDialog, red outlined button styling (SAFE-01)
- `messages/en/teams.json` + `messages/ro/teams.json`: added `dangerZone`, `dangerZoneDesc`, `deleteConfirmTitle`, `cancel` i18n keys (SAFE-01)
- `src/components/history/history-page.tsx`: replace native `<input type="date">` with shared DatePicker (INP-01)
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx`: replace native `<input type="date">` with shared DatePicker (INP-01)

## [1.3.5] - 2026-03-15

### Added
- Sentry SDK (`@sentry/nextjs@10.43.0`) — Error Monitoring, Tracing, Session Replay, and AI Monitoring (Vercel AI SDK + Anthropic)
- `instrumentation-client.ts`: browser Sentry init with Session Replay integration
- `sentry.server.config.ts`: Node.js server Sentry init with Vercel AI SDK integration (`force: true` for Vercel production)
- `sentry.edge.config.ts`: Edge runtime Sentry init
- `instrumentation.ts`: server-side registration hook with `onRequestError = Sentry.captureRequestError`
- `src/app/global-error.tsx`: App Router root error boundary
- `next.config.ts`: wrapped with `withSentryConfig()` — source map upload, ad-blocker tunnel via `/monitoring`
- Environment-based configuration: single `NEXT_PUBLIC_SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_ENVIRONMENT` for all runtimes; UAT Docker hardcoded to `staging`, Vercel to `production`, local/tests to `development`

## [1.3.4] - 2026-03-14

### Added
- `src/components/session/__tests__/correction-history-panel.test.tsx`: 14 new unit tests covering revert confirm/cancel/loading/success/error/dismiss interaction flows and `formatAnswerValue` logic for yes_no, mood, and skipped answer types (176 unit tests total)
- `e2e/corrections.spec.ts`: Groups 5+6 — history before/after display assertions (italic question text, → arrow, line-through before pill, green after pill) and admin revert RBAC+flow (confirm dialog, cancel, POST /corrections/revert, page refresh)
- `e2e/uat-corrections.spec.ts`: Groups 7+8 — equivalent UAT coverage for history before/after display and admin revert flow targeting https://1on1.surmont.co/
- `src/app/(dashboard)/sessions/[id]/summary/loading.tsx`: dedicated Suspense fallback skeleton for session summary page — prevents session-grid skeleton from appearing below summary content on hard refresh

### Fixed
- `src/components/session/session-summary-view.tsx`: remove stale `AISuggestionsSection` import path that was incorrectly removed; restore to correct state with both AI sections present

### Fixed
- `e2e/audit-log.spec.ts`: fix description and breadcrumb text to match actual UI strings — "View all administrative actions in your organization" and "Organization Settings > Audit Log"
- `e2e/invite.spec.ts`: replace unauthenticated `page` fixture with `adminPage` from fixtures.ts; update all "Invite people" button selectors to match actual button text "Invite"
- `e2e/rbac.spec.ts`: fix invite button selector from "Invite people" to "Invite"; fix admin Settings navigation tests to open the Settings dropdown before asserting on menu items
- `e2e/teams.spec.ts`: fix edit pencil button test to target the heading sibling button directly (`h1 ~ button`) instead of broad `div.filter().button` which resolved to a hidden sheet trigger
- `e2e/critical-path.spec.ts`: add `exact: true` to "Upcoming Sessions" heading assertion to avoid strict-mode violation with partial match on "No upcoming sessions this week"; replace hidden carousel heading check with a URL + body content assertion
- `e2e/screenshot-tour.spec.ts`: use pre-built stored auth state files (admin.json, manager.json) instead of manual login to avoid login timeouts during 25-minute test run; restructure analytics-team fallback to avoid uncaught nav errors; add nav() retry logic with 45s timeout to handle dev server compilation delays on later config iterations
- `src/lib/db/seed.ts`: fix all 45 ANSWER_* UUID constants to use RFC4122-compliant variant bits (`8000` instead of `6000`); add DELETE of old 6000-variant rows so re-seeding is idempotent (phase 28-06)
- `e2e/corrections.spec.ts`: remove `test.skip` conditional from Amended badge test — seed UUID fix enables the correction API call to succeed so the test now runs end-to-end (phase 28-06)
- `e2e/debug-session-summary.spec.ts`: add DIAGNOSIS CONCLUSION doc block documenting the confirmed root cause ([object ErrorEvent] UAT crash = Neon WebSocket vs local pg Pool) and the Plan 01 fix (phase 28-06)

### Added
- `.github/workflows/e2e.yml`: GitHub Actions CI job — Playwright E2E on push/PR to main; installs Chromium, seeds DB, runs test:e2e with setup+chromium projects, uploads report artifact on failure (phase 28-05)
- `package.json`: add `test:e2e` script — single-command Playwright E2E suite entry point via `PLAYWRIGHT_BROWSERS_PATH=~/.cache/ms-playwright node node_modules/.bin/playwright test` (phase 28-05)
- `e2e/corrections.spec.ts`: RBAC corrections E2E spec — manager sees edit icon on completed sessions, member does not; inline form opens/closes; AI feedback appears with submit always enabled; Amended badge and correction history panel coverage (phase 28-03)
- `e2e/debug-session-summary.spec.ts`: enhanced debug spec targeting dev server (port 4301) via adminPage fixture; captures console errors, page errors, network failures, WebSocket events; writes structured JSON report to e2e/reports/session-summary-debug-dev.json with hypothesis flags (phase 28-03)
- `e2e/reports/session-summary-debug-dev.json`: structured debug report from session summary page — HTTP 200, no crashes, no page errors (phase 28-03)
- `e2e/auth.spec.ts`: login tests for admin, manager, member roles; invalid credentials stays on /login; logout via user menu redirects to /login with protected route check (phase 28-02)
- `e2e/dashboard.spec.ts`: /overview load tests for admin (upcoming/recent sessions headings), manager, and member roles (phase 28-02)
- `e2e/sessions.spec.ts`: sessions list, wizard start/complete, session summary crash capture with debug report, and session detail page load tests (phase 28-02)
- `e2e/fixtures.ts`: Playwright fixture extensions — `adminPage`, `managerPage`, `memberPage` pre-authenticated page contexts via storageState (phase 28-01)
- `playwright.config.ts`: add `chromium-manager` and `chromium-member` projects with per-role storageState (phase 28-01)
- `e2e/auth.setup.ts`: multi-role auth setup — saves storageState for admin (alice), manager (bob), and member (dave) roles (phase 28-01)
- `e2e/.auth/.gitkeep`: ensure auth state directory is tracked in git (phase 28-01)

### Fixed
- `src/lib/db/index.ts`: detect Neon cloud vs local PostgreSQL URL — use `pg` Pool for local dev (TCP), `@neondatabase/serverless` Pool for Neon cloud (WebSocket); fixes auth failure and all DB queries in local dev/test environment (phase 28-01)
- `.gitignore`: add `!e2e/.auth/.gitkeep` exception so the auth state directory is tracked (phase 28-01)

### Added
- `src/components/session/session-summary-view.tsx`: edit icon (Pencil) per answer row for managers on completed sessions; single `editingAnswerId` state ensures only one correction form open at a time; `AnswerCorrectionForm` renders inline on row click (phase 27-03)
- `src/components/session/answer-correction-form.tsx`: `AnswerCorrectionForm` — inline correction form with debounced AI reason validation, original answer display, and advisory-only AI feedback (phase 27-03)
- `src/components/session/session-summary-view.tsx`: export `SummaryAnswer` type and `renderAnswerDisplay` function for reuse in `AnswerCorrectionForm` (phase 27-03)

### Fixed
- `src/components/session/__tests__/answer-correction-form.test.tsx`: add missing `next/navigation` mock and fix `getByText(/original/i)` ambiguity with `getAllByText` (phase 27-03)

### Added
- TDD RED: failing tests for `AmendedBadge` in `src/components/session/__tests__/amended-badge.test.tsx` — 3 tests fail (module not found: amended-badge.tsx does not exist yet) (phase 27-01)
- TDD RED: failing tests for `CorrectionHistoryPanel` in `src/components/session/__tests__/correction-history-panel.test.tsx` — 5 tests fail (module not found: correction-history-panel.tsx does not exist yet) (phase 27-01)
- TDD RED: failing tests for `AnswerCorrectionForm` in `src/components/session/__tests__/answer-correction-form.test.tsx` — 9 tests fail (module not found: answer-correction-form.tsx does not exist yet) (phase 27-01)

### Fixed
- `messages/ro/analytics.json`: add missing `analytics.chart.sessionHistory` key — translation parity with EN (phase 26-03)
- `src/components/layout/user-menu.tsx`: suppress `react-hooks/immutability` lint error on `document.cookie` assignment — intentional browser API usage (phase 26-03)
- `src/lib/templates/__tests__/import-schema.test.ts`: suppress `@typescript-eslint/no-explicit-any` lint errors on ZodError test fixtures — intentional partial mock objects (phase 26-03)

### Added
- `src/app/api/sessions/[id]/corrections/route.ts`: fire-and-forget `sendCorrectionEmails` hook wired after `withTenantContext` — resolves report/manager/admin context via adminDb then calls correction email sender (phase 26-03)
- `src/lib/notifications/correction-email.ts`: `sendCorrectionEmails` and `wasRecentlySent` — correction email sender with 5-minute dedup, tenant locale, report+admin fan-out, inactive admin exclusion, report-also-admin dedup (phase 26-02)
- `src/lib/email/templates/correction-notification.tsx`: `CorrectionNotificationEmail` React Email template — follows pre-meeting-reminder.tsx pattern, accepts pre-interpolated string props (phase 26-01)
- `messages/en/emails.json` + `messages/ro/emails.json`: `sessionCorrection` block with 6 keys (subject, heading, greeting, body, buttonLabel, footer) — translation parity enforced (phase 26-01)
- TDD RED: failing tests for `sendCorrectionEmails` recipient assembly, `wasRecentlySent` deduplication, and i18n key resolution in `src/lib/notifications/__tests__/correction-email.test.ts` — 8 tests fail (module not found + missing i18n keys) (phase 26-01)
- `src/app/api/sessions/[id]/corrections/validate-reason/route.ts`: AI-only POST endpoint — validates correction reason via `validateCorrectionReason`; graceful degradation returns `{ pass: true, feedback: null }` on AI outage (phase 25-03)
- `src/app/api/sessions/[id]/corrections/route.ts`: atomic POST endpoint — snapshots answer history, updates answer, recomputes score, nullifies `analyticsIngestedAt`, writes audit log — all in one `withTenantContext` transaction (phase 25-03)
- `src/lib/ai/schemas/correction.ts`: `reasonValidationResultSchema` Zod schema + `ReasonValidationResult` type for AI output validation (phase 25-02)
- `src/lib/ai/models.ts`: `correctionValidator` model entry pointing to `claude-haiku-4-5` (phase 25-02)
- `src/lib/ai/service.ts`: `validateCorrectionReason` async function — calls `generateObject` with `reasonValidationResultSchema`; caller handles degraded response on error (phase 25-02)
- `src/lib/validations/correction.ts`: `correctionInputSchema` and `validateReasonSchema` Zod exports with UUID + length validation (phase 25-02)
- `canCorrectSession` RBAC helper in `src/lib/auth/rbac.ts` — admin bypass + own-series manager check (phase 25-02)
- TDD RED: failing tests for `correctionInputSchema` and `validateReasonSchema` Zod validation in `src/lib/validations/__tests__/correction.test.ts` (phase 25-01)
- TDD RED: failing tests for `reasonValidationResultSchema` AI result schema shape in `src/lib/ai/schemas/__tests__/correction.test.ts` (phase 25-01)
- TDD RED: `canCorrectSession` RBAC tests added to `src/lib/auth/__tests__/rbac.test.ts` — 4 tests fail (function does not exist yet), existing 5 tests remain passing (phase 25-01)
- TDD GREEN: scoring tests in `src/lib/utils/__tests__/scoring.test.ts` — `computeSessionScore` implementation already complete; 10 tests pass (phase 25-01)
- `src/lib/db/migrations/0018_session_answer_history.sql`: hand-written migration — ALTER TYPE notification_type ADD VALUE 'session_correction', CREATE TABLE session_answer_history (11 cols, 3 indexes), FORCE RLS with SELECT + INSERT policies, GRANT to app_user (phase 24-02)
- TDD RED: failing schema shape tests for `sessionAnswerHistory` table and `notificationTypeEnum` enum extension (phase 24-01)
- `src/lib/db/schema/answer-history.ts`: `sessionAnswerHistory` Drizzle table with 11 typed columns + 3 indexes + `sessionAnswerHistoryRelations` (4 FK relations)
- `src/lib/db/schema/enums.ts`: `notificationTypeEnum` extended with `session_correction` value
- `src/lib/db/schema/index.ts`: barrel export for `./answer-history` module

### Fixed
- Circular manager assignment error now shows the full management loop chain (e.g. "Aurel Filip → Cora P → Ciprian Dobrea → Aurel Filip") instead of a generic message

### Fixed
- AI summary/suggestions polling now auto-detects sessions stuck in "generating" status (e.g. after server restart) and resets them to "failed" after 5 minutes, preventing infinite polling loops
- Series creation page now invalidates the `["series"]` query cache before navigating back, so the new series appears immediately on the sessions page without requiring a manual refresh
- Partial unique index on `meeting_series` now correctly allows creating a new series when a previous series for the same manager-report pair is archived

## [1.3.5] - 2026-03-09

### Changed
- `src/components/series/series-list.tsx` — archived series are now hidden by default; a "Show archived (N)" ghost button at the bottom reveals them; active and paused series always shown

### Added
- `messages/en/sessions.json` + `messages/ro/sessions.json` — added `series.showArchived` and `series.hideArchived` translation keys

## [1.3.4] - 2026-03-09

### Removed
- AI nudges feature entirely: deleted schema (`src/lib/db/schema/nudges.ts`), AI service functions (`generateNudges`), prompts, API routes (`/api/nudges`), dashboard components (`nudge-card`, `nudge-cards-grid`, `nudges-modal`), session components (`nudge-list`), email template nudge section, and all nudge i18n keys from `en/dashboard.json`, `ro/dashboard.json`, `en/sessions.json`, `ro/sessions.json`
- DB migration `0016_drop_ai_nudge.sql` — drops `ai_nudge` table

### Changed
- `src/lib/ai/prompts/summary.ts` — added `## Previous Sessions` section with full per-answer detail from up to 3 prior sessions, giving the summary model cross-session trend context
- `src/lib/ai/prompts/action-items.ts` — added previous session answers and full series action item history to prompt; AI now avoids duplicating items from all past sessions, not just the current one
- `src/lib/ai/service.ts` `generateManagerAddendum` — expanded previous sessions block from scores-only to full answer detail per session
- `src/lib/ai/context.ts` — added `allSeriesActionItems` field to `SessionContext` with a new query that fetches all action items across all sessions for the series

## [1.3.3] - 2026-03-09

### Changed
- `src/lib/ai/models.ts` — downgraded `managerAddendum` and `actionSuggestions` from Sonnet 4.5 to Haiku 4.5; both are short structured-output tasks that don't require Sonnet quality (~70% cost reduction per session)

## [1.3.2] - 2026-03-09

### Fixed
- `src/lib/ai/schemas/addendum.ts` — removed `.min(1).max(100)` from `assessmentScore` integer field; Anthropic structured output rejects JSON Schema `minimum`/`maximum` on integer types, causing every AI summary retry to fail silently

## [1.3.1] - 2026-03-08

### Added
- `docs/wiki/Phase-18.md` — Phase 18 (Critical Bugs) documentation: goal, success criteria, what was built, key decisions, key files
- `docs/wiki/Phase-19.md` — Phase 19 (Design System) documentation
- `docs/wiki/Phase-20.md` — Phase 20 (Mobile Responsiveness) documentation
- `docs/wiki/Phase-21.md` — Phase 21 (Content & Data Display) documentation

### Changed
- `CLAUDE.md` — updated project status, tech stack (Next.js 15→16, removed Inngest, added Tiptap/dnd-kit/i18n/AI/Vitest), switched all commands from `npm`/`npx` to `bun`/`bunx`, corrected async jobs description
- `docs/data-model.md` — expanded ERD diagram with full entity relationships: OAuth adapter tables, `TEMPLATE_SECTION`, `TEMPLATE_LABEL_ASSIGNMENT`, `TEMPLATE_LABEL`, `AI_NUDGE`, `AUDIT_LOG`, `INVITE_TOKEN`
- `docs/architecture.md` — added `star-rating.tsx` and `empty-state.tsx` to shared UI components, added `tiptap-render.ts` to lib/session, updated Testing row to include Testing Library and `happy-dom`
- `docs/features.md` — added v1.3 UI/UX Improvements milestone section (design system, mobile responsiveness, content & data display, critical bug fixes); updated Feature Priority Matrix to mark v1.3 shipped and add v1.4 Playwright row
- `docs/wiki/Phase-17.md` — marked Status Complete, Completed 2026-03-07; filled "What Was Built" and "Key Files" sections
- `docs/wiki/Phase-Log.md` — updated total to 23 phases (added v1.3 phases 18–23), marked v1.2 released, added v1.3 milestone table and execution order diagram
- `docs/wiki/_Sidebar.md` — added links for Phase-18 through Phase-23
- `docs/wiki/Home.md` — corrected tech stack (Next.js 15→16, removed Inngest/Supabase, added AI/Testing rows, updated deployment)
- `docs/wiki/Features-Roadmap.md`, `docs/wiki/Architecture.md`, `docs/wiki/Data-Model.md` — wiki mirrors updated to match source docs
- `.planning/config.json` — disabled research agent (`research: false`)

### Fixed
- `src/lib/db/scripts/backfill-card-blurb.ts` — use tenant `contentLanguage` (joined from tenants table) instead of hardcoded `"Romanian"`; add `LANGUAGE_NAMES` code→name mapping for prompt clarity

## [1.3.0] - 2026-03-08

### Added
- `src/components/ui/star-rating.tsx` — reusable `StarRating` component (sm/md/lg sizes); filled amber stars for scored sessions, grayed hollow stars when no score; used throughout the app wherever session ratings are displayed
- `src/app/(dashboard)/analytics/page.tsx` — aggregate stat cards (Sessions Completed, Avg Score, Action Item Rate) above team/individual directories; scoped by role (admin=all, manager=direct reports only); shows "—" when no data (CON-01)
- `src/components/analytics/team-heatmap.tsx` — contributor threshold guard: shows "Requires ≥3 contributors" message when 1-2 unique users have heatmap data (CON-05)
- `src/components/templates/template-editor.tsx` — dual-layout header: desktop full button row (`hidden md:flex`) and mobile overflow `DropdownMenu` (`flex md:hidden`) with controlled `AlertDialog` for archive action (MOB-02)
- `src/components/people/people-table-columns.tsx` — add `meta: { className: "hidden md:table-cell" }` to email, teams, manager, status columns; add ColumnMeta module augmentation (MOB-04)
- `src/components/templates/template-list.tsx` — mobile overflow menu (`DropdownMenu` with `MoreHorizontal` trigger) collapses secondary actions on screens below md (MOB-01)
- `src/components/templates/import-dialog.tsx` — optional `open`/`onOpenChange` controlled props for external trigger support
- `src/components/ui/empty-state.tsx` — shared `EmptyState` component replacing inline empty-state patterns across 10 call sites (DES-04)
- `src/lib/session/tiptap-render.ts` — `contentToHtml()` helper that type-guards Tiptap JSON vs HTML string (BUG-01)
- Test infrastructure: `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`; `src/test-setup.ts`; `vitest.config.ts` setupFiles

### Changed
- `src/components/series/series-card.tsx` — grayed hollow stars always visible; filled amber stars + hover numeric for completed sessions with a score (CON-02, CON-03)
- `src/components/series/session-timeline.tsx` — star rating (sm) replaces numeric score span; always visible including hollow when no score
- `src/components/dashboard/recent-sessions.tsx` — star rating (sm) replaces colored numeric badge on session list rows
- `src/components/session/session-summary-view.tsx` — dedicated score card removed; stars (md) and numeric moved into header right-aligned; title now includes other person's name in bold + team name in parentheses; status badge translated via i18n
- `src/components/session/summary-screen.tsx` — dedicated score card replaced with stars (lg) + numeric label
- `src/components/session/recap-screen.tsx` — star rating (sm) replaces score badge on previous session
- `src/components/session/category-step.tsx` — Talking Points and Action Items sections wrapped in `Collapsible` with count badge and chevron (CON-04)
- `src/app/(dashboard)/sessions/[id]/summary/page.tsx` — fetches first team for manager and report via `teamMembers` join; passes `managerTeam`/`reportTeam` to `SessionSummaryView`

### Fixed
- `src/components/session/ai-summary-section.tsx` — sentiment badge (`positive/neutral/mixed/concerning`) and follow-up priority badge (`low/medium/high`) now translated via i18n instead of rendering raw English enum values
- `src/components/session/session-summary-view.tsx` — status badge uses `sessions.timeline` i18n keys instead of `status.replace("_", " ")`
- `messages/en/sessions.json`, `messages/ro/sessions.json` — score label `"out of 5.0"` → `"out of 5"`; added sentiment and priority translation keys (SCORE-01)
- `src/components/dashboard/nudge-card.tsx` — dismiss button touch target raised to 44×44px on mobile (MOB-03)
- `src/components/people/people-table.tsx` — reads `meta?.className` for responsive column visibility (MOB-04)
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx` — Target column and actor email hidden on mobile (MOB-05)
- `src/components/series/session-timeline.tsx` — badge variant semantics: `in_progress` → `"default"`, `completed` → `"outline"` (DES-02)
- `src/components/session/category-step.tsx`, `summary-screen.tsx`, `session-summary-view.tsx` — removed `uppercase`/`tracking-wide` from section headers (DES-03)
- `src/components/session/recap-screen.tsx` — fixed `[object Object]` display for Tiptap JSON notes; uses `contentToHtml()` (BUG-01)
- `src/i18n/request.ts` — added missing `spec.json` namespace (BUG-03)
- `src/components/templates/ai-editor/ai-editor-shell.tsx` — responsive mobile tab layout for viewports below 1024px (BUG-02)

## [1.2.1] - 2026-03-07

### Added
- Layered sparklines on series cards: overlay one faded `<Area>` per numeric question with `scoreWeight > 0.5` on top of the main AI assessment sparkline; colors deterministically assigned by hashing question text against a 10-color palette; opacity scales with weight via `((w-0.5)/1.5)*0.18+0.02`
- `backfill-card-blurb.ts` script: generates missing `cardBlurb` for sessions where AI summary predates the field, using existing `keyTakeaways` + `discussionHighlights`

### Fixed
- Numeric question answers (rating_1_5, mood) now normalized to 1–100 scale (×20) before rendering in sparkline, matching the AI assessment axis; `rating_1_10` uses ×10
- Session cards for Catalin Prodan (SoftexCo) now display AI summary blurbs — backfilled 7 sessions on stable DB

## [1.2.0] - 2026-03-07

### Added
- Phase 17 (AI Generator & DIY Kit) verified complete — all 7 verification scenarios confirmed; v1.2 milestone (AI-Ready Templates) delivered
- `src/app/(dashboard)/templates/ai-editor/page.tsx` — server page for new template AI editor; auth + RBAC guard (admin/manager only); passes contentLanguage and userRole from session to AiEditorShell
- `src/app/(dashboard)/templates/[id]/ai-editor/page.tsx` — server page for existing template AI editor; fetches template from DB via withTenantContext; converts to TemplateExport via buildExportPayload; passes initialTemplate and templateId to AiEditorShell
- `src/components/templates/ai-editor/chat-input.tsx` — controlled Textarea + Send button; submits on button click or Ctrl+Enter; disabled and shows "Thinking..." when AI is loading
- `src/components/templates/ai-editor/chat-panel.tsx` — scrolling message list with right-aligned user bubbles and left-aligned assistant messages; animated three-dot typing indicator when loading; auto-scrolls to bottom on new messages
- `src/components/templates/ai-editor/template-preview-panel.tsx` — read-only live template preview; renders name, description, sections, and question cards with answer type badges; empty state placeholder when no template exists
- `src/components/templates/ai-editor/ai-editor-shell.tsx` — full-page split-screen AI editor; manages messages/template/loading state; triggers AI greeting on mount; handleSend appends user turn and POSTs to /api/templates/ai-chat; Save uses /api/templates/import; Reset confirmation clears both panels
- `src/components/templates/template-list.tsx` — added "Generate with AI" button (Wand2) in template list header; visible to admin and manager only via `canManageTemplates`; navigates to `/templates/ai-editor`
- `src/components/templates/template-editor.tsx` — added "Edit with AI" button (Wand2) in template editor header; visible to admin and manager only via `canManageTemplates`; navigates to `/templates/[id]/ai-editor`
- `src/app/(dashboard)/templates/schema/page.tsx` — added 4th "Prompt Kit" tab with `PROMPT_KIT_EXAMPLE` constant (Engineering 1:1 worked example), `promptKitBlock` assembled server-side (section headers translated, JSON content always English), `PromptKitActions` copy button component
- `src/app/(dashboard)/templates/schema/schema-actions.tsx` — added `PromptKitActions` export: clipboard copy button with 2-second toggle to "Copied!" label
- `src/app/api/templates/ai-chat/route.ts` — `POST /api/templates/ai-chat` handler; RBAC-gated (admin/manager only), validates request body with Zod, resolves tenant content language from session, calls `generateTemplateChatTurn`, returns `{ chatMessage, templateJson }`; returns 401/403/400/500 on failure
- `src/lib/ai/prompts/template-editor.ts` — `buildTemplateEditorSystemPrompt(existingTemplate?)` builder with 4 sections (Role & Persona, JSON schema Spec, 1:1 Methodology Principles, Score Weight System); embeds existing template as JSON when provided; exports `TEMPLATE_EDITOR_SYSTEM` constant
- `src/lib/ai/models.ts` — added `templateEditor: anthropic("claude-sonnet-4-6")` model entry for AI template editor
- `src/lib/ai/service.ts` — exported `withLanguageInstruction` (previously private); added `generateTemplateChatTurn(messages, currentTemplate, language)` that calls the template editor model with structured output via `templateChatResponseSchema`
- `src/lib/ai/schemas/template-chat.ts` — `templateChatResponseSchema` Zod schema with required `chatMessage` (min 1 char) and nullable `templateJson` (full TemplateExport-shaped object); exports `ChatTurnResponse` TypeScript type; turns Wave 0 template-chat tests GREEN
- `messages/en/spec.json` — added `spec.tabs.promptKit` and `spec.promptKit.*` keys (title, intro, copy, copied, sections.schema/methodology/weights/example) for DIY Prompt Kit tab
- `messages/ro/spec.json` — Romanian translations of all `spec.promptKit.*` keys with correct diacritics; key parity with EN maintained
- `messages/en/templates.json` — added `templates.aiEditor.*` keys covering page title, header actions, reset confirm dialog, preview panel, chat UI, save success toast, and entry point labels
- `messages/ro/templates.json` — Romanian translations of all `templates.aiEditor.*` keys; ICU three-form plurals (one/few/other) for sectionCount and questionCount; key parity with EN maintained
- `src/lib/ai/schemas/__tests__/template-chat.test.ts` — Wave 0 RED test stub for `templateChatResponseSchema` and `ChatTurnResponse` type; 5 tests covering valid/invalid parse cases; fails with module-not-found until Wave 1 (17-02) creates the implementation
- `src/lib/ai/prompts/__tests__/template-editor.test.ts` — Wave 0 RED test stub for `buildTemplateEditorSystemPrompt`; 5 tests covering schema spec, methodology, scoreWeight sections, and optional existingTemplate embedding; fails with module-not-found until Wave 1
- `src/lib/ai/__tests__/service.test.ts` — Wave 0 RED test stub for `withLanguageInstruction`; 4 tests covering ro/de language injection and en/undefined passthrough; fails because function is not yet exported from service.ts
- `src/lib/templates/__tests__/import-schema.test.ts` — extended with `DIY kit worked example` describe block (4 tests); 9-question realistic Engineering 1:1 template covering 3 sections, mixed answer types (text, rating_1_5, yes_no), and scoreWeight variety (0,1,2,3); validates against existing `templateImportSchema` (GREEN from Wave 0)
- `src/lib/auth/__tests__/rbac.test.ts` — 5 Vitest unit tests for `canManageTemplates`; all pass GREEN (rbac.ts already implemented)
- `src/global.d.ts` — added `spec.json` to Messages type union for next-intl type safety
- `src/lib/templates/export-schema.ts` — `TemplateExport` interface, `SCHEMA_VERSION` constant, and `buildExportPayload()` function; converts Drizzle decimal scoreWeight to JS number, strips all UUIDs, remaps conditional references to sortOrder integers
- `src/lib/templates/__tests__/export-schema.test.ts` — 7 Vitest unit tests covering EXP-02 through EXP-05 (schemaVersion, language, UUID-free output, scoreWeight type, answerConfig fallback, conditional portability)
- `src/app/api/templates/[id]/export/route.ts` — `GET /api/templates/[id]/export` returns tenant-neutral JSON with `Content-Disposition: attachment`; auth-gated 401/403, RBAC via `canManageTemplates()`
- `messages/en/spec.json` — English translations for spec page (pageTitle, tabs, schema, methodology with 4 principles, weights with examples)
- `messages/ro/spec.json` — Romanian translations with identical key structure; translation parity test passes
- `src/app/(dashboard)/templates/schema/page.tsx` — Server Component with three-tab layout (JSON Schema, Methodology, Score Weights) using `getTranslations` for all user-facing strings
- `src/app/(dashboard)/templates/schema/schema-actions.tsx` — Client Component for copy-to-clipboard and JSON download buttons

## [1.1.5] - 2026-03-07

### Added
- `src/lib/i18n/__tests__/translation-parity.test.ts` — Vitest test enforcing en/ro key parity for all 16 translation namespaces; CI fails if any key is added to en.json but not ro.json or vice versa
- `messages/en/sessions.json` — added `wizard.loadError` and `wizard.exitWizard` keys for newly translated strings
- `messages/ro/sessions.json` — added Romanian translations: `wizard.loadError` = "Sesiunea nu a putut fi încărcată", `wizard.exitWizard` = "Ieși din wizard"
- `messages/en/analytics.json` — added `categoryAverages` and `teamHeatmap` keys
- `messages/ro/analytics.json` — added Romanian translations: `categoryAverages` = "Medii pe categorii", `teamHeatmap` = "Harta echipei"
- `createEmailTranslator` utility in `src/lib/email/translator.ts` — standalone email translator using `use-intl/core`, no Next.js request context required, falls back to `en` for unsupported locales
- `messages/en/emails.json` — English email translation keys for all 6 email types (invite, verification, passwordReset, sessionSummary, preMeeting, agendaPrep)
- `messages/ro/emails.json` — Romanian email translation keys mirroring en structure

### Fixed
- `src/components/session/wizard-shell.tsx` — replaced hardcoded "Failed to load session" heading with `t("wizard.loadError")`; queryFn now throws generic HTTP status error instead of hardcoded English message
- `src/components/session/wizard-top-bar.tsx` — replaced hardcoded "Exit wizard" sr-only text with `t("wizard.exitWizard")`
- `src/app/(dashboard)/analytics/team/[id]/client.tsx` — replaced hardcoded "Category Averages" and "Team Heatmap" with `t("categoryAverages")` and `t("teamHeatmap")` via `useTranslations("analytics")`

### Changed
- `messages/ro/analytics.json` — fixed 16 diacritic errors (acțiune, acțiuni, eșantion, eșantioane, întâlniri, Tendința, aderență, diferență, comparație, necesită, opțiune, etc.); added `few` form to 4 ICU plural keys (memberCount, sessionCount, itemsCompleted, sampleCount)
- `messages/ro/sessions.json` — added `few` form to 2 ICU plural keys (questionCount, answersRecorded); Romanian counts 0/2/5/19 now render correct plural surface forms
- `messages/ro/templates.json` — fixed 39 diacritic errors (Creează, Adaugă, Elimină, Selectează, Anulează and related forms); also fixed Înapoi, Șablon, Secțiuni, Opțiuni, Dispoziție, Condiționat and more
- `messages/ro/teams.json` — fixed 24 diacritic errors (Creează, Adaugă, Șterge, ștearsă, Fără, Înapoi, asignează, găsit, etc.)
- `messages/ro/people.json` — fixed 18 diacritic errors (Adaugă, Anulează, Selectează, Caută, găsit, Înregistrat, Înapoi, etc.)
- `messages/ro/auth.json` — fixed 2 diacritic errors (nouă parolă — two occurrences in resetPassword section)
- `sendVerificationEmail` resolves `users.language`, calls `createEmailTranslator`, passes translated props and subject — no hardcoded English strings
- `sendPasswordResetEmail` resolves `users.language`, calls `createEmailTranslator`, passes translated props and subject — no hardcoded English strings
- `POST /api/invites` and `POST /api/invites/resend` resolve `tenants.contentLanguage`, call `createEmailTranslator`, pass translated props and subject to `InviteEmail`
- `sendPostSessionSummaryEmails` resolves `tenants.contentLanguage`, builds per-recipient `labels` bags with translated strings for `SessionSummaryEmail`
- `processPreMeeting` in sender.ts resolves `tenants.contentLanguage`, passes translated heading/greeting/body/button/footer/subject to `PreMeetingReminderEmail`
- `processAgendaPrep` in sender.ts resolves `tenants.contentLanguage`, uses variant-specific translation keys for body and button label
- Email templates (invite, verification, password-reset) accept translated string props (`heading`, `body`, `buttonLabel`, `footer`) — hardcoded English strings removed from JSX
- `EmailLayout` default `footerText` changed from hardcoded English to empty string — callers always pass translated footer
- `SessionSummaryEmail` accepts `labels` prop bag and extended `ActionItem` with `assignedToLabel`/`dueLabel` for pre-interpolated strings
- `PreMeetingReminderEmail` accepts `heading`, `greeting`, `body`, `buttonLabel`, `footer` translated props
- `AgendaPrepEmail` accepts `heading`, `greeting`, `body`, `aiNudgesLabel`, `buttonLabel`, `footer` translated props — variant selection logic moved to call site

## [1.1.4] - 2026-03-06

### Added
- Admin impersonation: admins can impersonate any active non-admin user in their tenant via the People table actions menu
- Sticky amber banner displays "Impersonating [Name]" with a "Return to admin" button while in impersonation mode
- Impersonation uses an HttpOnly cookie (`1on1_impersonate`) — the entire session is overlaid server-side in the Auth.js session callback
- API routes `POST /api/admin/impersonate` (start) and `DELETE /api/admin/impersonate` (stop) with same-tenant, active-user, no-admin-to-admin guards

## [1.1.3] - 2026-03-06

### Changed
- Action items page: toggle (done/undone) and edit are now restricted to the assignee only — disabled/hidden for other participants
- Completed items are now visible below active items in each group, greyed out with strikethrough title, and can be unchecked to reopen
- Description is now shown inline in the list (below the title) for every item that has one
- Group badge shows count of active (open/in_progress) items only

## [1.1.2] - 2026-03-06

### Changed
- Session summary and question history dialog now display star ratings (⭐) for rating_1_5, emoji faces for mood, and a segmented bar for rating_1_10 — instead of numeric text like "4/5"
- Applied visual ratings to the completed session summary page (`/sessions/[id]/summary`) as well

### Fixed
- Invite acceptance now handles pre-existing users (admin pre-created accounts): updates the existing record instead of failing with a unique constraint error

## [1.1.1] - 2026-03-06

### Changed
- Color themes updated to shadcn/ui v4 oklch palette values
- Orange: vivid traffic orange (`oklch(0.76 0.20 50)`) with warm amber chart palette
- Green: pistachio (`oklch(0.76 0.13 145)`) — light, yellowish-green with matching charts
- Rose renamed to **Yellow**: sunny golden (`oklch(0.795 0.184 86.047)`) with golden chart ramp
- Blue: indigo-blue (`oklch(0.51 0.23 277)`) — deeper and more modern than previous cobalt
- Zinc, Slate, Stone primaries now use official shadcn/ui v4 near-black/near-white values
- All chart palettes are now per-theme hue ranges instead of monochromatic opacity ramps
- `colorThemeValues` validation updated: `rose` → `yellow`

## [1.1.0] - 2026-03-06

### Added
- SVG logo component (`Logo`, `LogoIcon`) with theme-reactive `--logo-color` CSS variable
- Logo replaces plain "1on1" text in top nav, mobile sheet, sidebar, and auth layout
- Favicon (ICO), apple-icon (PNG), and icon (SVG) generated from vectorized logo
- `--logo-color` defaults to dark olive green, switches to lighter olive in dark mode, and matches `--primary` when a color theme is active
- Edit series dialog on series detail page — change cadence, preferred day/time, duration, and next session date directly
- `nextSessionAt` field added to series update API for direct date override
- Dashboard upcoming sessions now reuses `SeriesCard` component (same cards as sessions page), limited to next 3 active series
- Star rating display on series cards — amber filled stars for scored sessions, gray empty stars when no rating; numeric score appears on hover
- Score history sparkline area chart as subtle background on series cards (bottom 30% of card)
- AI session summary on series cards — `cardBlurb` (1-2 sentence plain-language blurb) with colored sentiment dot: green for positive, amber for neutral/mixed, red for concerning; grayed italic placeholder before first session completes
- Human-readable schedule label in bottom-right of series cards (e.g. "Weekly on Mondays at 11:30" / "Săptămânal, lunea la 11:30")
- Shared `getSeriesCardData()` query in `src/lib/queries/series.ts` used by sessions page, dashboard, and API route
- `cardBlurb` field added to `AISummary` schema — generated alongside session summary at pipeline completion
- `latestSummary` field (blurb + sentiment) in series API response and series card data, extracted from latest completed session's `aiSummary`
- Translation key `summaryPlaceholder` in EN/RO for series cards with no completed session yet
- Translation keys for schedule labels and schedule-context day names in EN/RO
- Translation keys for edit series dialog in EN/RO
- Translation keys for people management: `managerSelect`, `memberPicker`, `profileForm` namespaces in EN/RO
- Translation keys for team creation dialog: `teams.create` namespace in EN/RO
- Translation keys for template builder: `questionCard`, `answerConfig`, `conditionalLogic` namespaces in EN/RO

### Fixed
- Session-started toast in series-card and upcoming-sessions now uses translated text instead of hardcoded English
- summary-screen error toast now uses `showApiError()` for translated API errors instead of raw `error.message`
- Score display in five session components (summary-screen, context-panel, recap-screen, floating-context-widgets, session-summary-view) now uses locale-aware `format.number()` instead of `.toFixed(1)`
- Quick stats sparkline charts nearly invisible in dark mode — increased opacity from 8% to 25%

### Changed
- Dashboard page width now matches all other pages (removed `max-w-5xl` constraint)
- Series cards: preferred day/time and cadence merged into single human-readable schedule line in bottom-right
- Series cards: start/resume button aligned flush with card edge via negative margins compensating ghost button padding
- Session wizard context panel, recap screen, talking points, action items inline, nudge list, AI suggestions, and AI summary sections now use `useTranslations` for all visible strings
- All session date formatting replaced with locale-aware `useFormatter().dateTime()` across wizard-top-bar, context-panel, floating-context-widgets, summary-screen, session-summary-view, question-history-dialog (no hardcoded `toLocaleDateString("en-US")` remains)
- People management components (manager-select, member-picker, team-card, team-create-dialog, profile-edit-form) now use `useTranslations` for all visible strings
- Profile page uses `getTranslations`/`getFormatter` for locale-aware dates and translated labels
- Team detail page uses `useFormatter` for locale-aware joined dates instead of `toLocaleDateString("en-US")`
- Template builder components (question-card, answer-config-form, conditional-logic-form) now use `useTranslations` for all visible strings
- Team create dialog and profile edit form call `useZodI18nErrors()` for translated validation
- All analytics chart components (score-trend, velocity, adherence, session-comparison, team-heatmap, category-breakdown, team-overview) use locale-aware `useFormatter()` for dates and numbers instead of hardcoded `toLocaleDateString("en-US")` and `.toFixed()`
- Audit log page and client use `getTranslations`/`useFormatter` for fully translated settings UI
- Analytics page uses `getFormatter` from next-intl/server for locale-aware number display

### Added
- `useZodI18nErrors` hook for translated Zod validation error messages (EN + RO)
- `useApiErrorToast` hook for translated API error toast messages (EN + RO)
- `validation.json` namespace with common form validation messages (required, email, min/max length, password rules)
- Error keys in `common.json` for API responses (unauthorized, forbidden, not found, rate limited, server error)
- Full i18n for auth pages: reset-password, verify-email, invite flow, email-verification-banner
- Audit and fix partial auth pages: register (added useZodI18nErrors + error fallback), forgot-password (confirmed complete)

### Changed
- All `toast.error()` calls with hardcoded English strings across 13 components now use `useApiErrorToast` for locale-aware error display
- Dashboard layout: Quick Stats cards now appear above Upcoming Sessions for better visual hierarchy

### Added
- Background sparkline charts on Quick Stats cards showing 6-month trends (reports, sessions, avg score)
- `getStatsTrends()` query for monthly aggregated dashboard metrics

### Added
- i18n translations for wizard components: category-step, summary-screen, question-history-dialog, yes-no/mood/rating widgets (EN + RO)
- i18n translations for people role-select and status badges (EN + RO)
- i18n translations for template question-form dialog — labels, placeholders, answer types, buttons (EN + RO)

### Fixed
- Language switcher in user menu now reads NEXT_LOCALE cookie as source of truth, fixing checkmark showing English when Romanian is active

### Added
- Nudges modal: clicking an upcoming session card opens a dialog with coaching nudges for that person's series, sorted by priority
- Nudge dismiss with optimistic UI update inside the modal
- EN + RO translations for nudges modal (`dashboard.nudgesModal.*`)

### Changed
- Removed standalone AI Coaching Nudges grid from dashboard overview
- Removed inline nudge pills from session cards — nudges now only accessible via modal
- Session card click opens nudges modal; Start/Resume button still navigates to wizard (stopPropagation)

### Added
- Mobile wizard carousel: full-height vertical card columns replacing horizontal pill strip on mobile
- Swipe left/right support with 50px threshold for mobile wizard navigation
- Active card expanded with content, inactive cards compressed as dark columns with vertical labels
- next-intl v4 i18n infrastructure with non-routing setup (cookie-based locale resolution)
- Translation files for EN and RO locales with namespace structure (`messages/{locale}/{namespace}.json`)
- TypeScript compile-time translation key validation via `AppConfig` augmentation in `global.d.ts`
- `i18n/request.ts` request config with locale resolution from `NEXT_LOCALE` cookie
- `language` column on users table (UI language per-user, default `en`)
- `content_language` column on tenants table (content language per-company, default `en`)
- JWT carries `uiLanguage` and `contentLanguage` claims after sign-in
- Proxy locale detection from JWT (authenticated) or Accept-Language header (unauthenticated)
- `NEXT_LOCALE` cookie set on all proxy response paths (redirects and pass-through)
- `NextIntlClientProvider` in root layout with dynamic `html lang` attribute
- Login page fully translated via `useTranslations()` -- zero hardcoded English strings
- Language preference API endpoint (`PATCH /api/user/language`) with Zod validation and cookie persistence
- `updateLanguageSchema` Zod schema in `src/lib/validations/user.ts`
- Date/number formatting pipeline proof via `useFormatter()` on login page
- Language switcher in user menu dropdown (English / Romana) with visual checkmark for active language
- Language switch persists to DB, updates JWT via session refresh, and reloads page for new translations

## [1.0.0] - 2026-03-05

### Added
- Critical path E2E test (`e2e/critical-path.spec.ts`): admin journey (dashboard, templates, sessions) and manager journey (start session, wizard, complete)
- Dark mode E2E test (`e2e/dark-mode.spec.ts`): toggle verification, persistence across reload, key screen rendering with screenshots
- Global test timeout of 60s in `playwright.config.ts` (120s for critical path tests)
- Docker deployment verification script (`scripts/verify-docker.sh`): build, start, HTTP check, DB check, cleanup
- Docker E2E test (`e2e/docker.spec.ts`): verifies Docker image builds and verification script exists
- Healthcheck for app service in `docker-compose.yml` (wget-based, 30s start period)

- Wizard step sidebar (`WizardStepSidebar`): vertical left sidebar showing all categories with step numbers, checkmarks for completed sections, and answer counts
- Floating context widgets (`FloatingContextWidgets`): collapsible card-based context information replacing fixed sidebar panel (score trends, action items, previous notes/answers, AI nudges)
- Slide transitions between wizard category steps using CSS `translateX` + opacity animation
- Inline Prev/Next navigation buttons below form content (replaces distant bottom bar)
- Mobile: horizontal scrollable step strip at top, bottom Sheet for context widgets
- Tablet: floating action button to open context widgets in right Sheet
- Skeleton loading states (`loading.tsx`) for all dashboard routes: overview, sessions, action items, history, analytics, people, teams, templates, settings
- Global `animate-fade-in` CSS animation utility (subtle opacity + translateY) for page transitions
- Descriptive empty state with icon and CTA for history page when no sessions exist
- Two-state theme toggle (light/dark) replacing three-state dropdown, using `resolvedTheme` for system preference detection
- Theme toggle added to wizard top bar for session accessibility
- Org color theme infrastructure: 8 presets (neutral, zinc, slate, stone, blue, green, rose, orange)
- `ThemeColorProvider` client component applying `data-color-theme` attribute to HTML element
- Color theme picker (radio card grid with swatches) in company settings page
- CSS variable overrides for each color theme preset in both light and dark modes
- Semantic chart CSS variables (`--color-success`, `--color-warning`, `--color-danger`) for theme-aware status colors
- Tiptap editor dark mode CSS overrides for ProseMirror
- `colorTheme` field in organization settings validation schema and API endpoint

### Changed
- Wizard layout restructured: three-column layout (step sidebar | form content | context widgets) replacing two-column (form | fixed context panel)
- Wizard navigation moved from bottom tab bar to left step sidebar with inline prev/next buttons below form
- Context panel data displayed as individually collapsible Card widgets instead of single scrolling sidebar
- Dashboard layout responsive padding: `px-4 py-6 sm:px-6 lg:px-8` with fade-in animation on content wrapper
- Consistent `font-semibold` typography on all page titles (settings page was `font-bold`)
- Subtle hover shadow (`hover:shadow-md`) added to all interactive cards (series, analytics, team, quick stats, upcoming sessions)
- History page filters responsive: grid layout on mobile, flex wrap on desktop with full-width inputs on small screens
- Recent sessions hover effect upgraded to `transition-all duration-200` with shadow
- All analytics chart components now use CSS variable-based monochrome palette instead of hardcoded HSL colors
- `category-breakdown.tsx`: 5 hardcoded HSL colors replaced with `var(--chart-1)` through `var(--chart-5)`
- `adherence-chart.tsx`: hardcoded green/amber/red replaced with `var(--color-success/warning/danger)`
- `velocity-chart.tsx`: hardcoded green reference line replaced with `var(--color-success)`
- `team-heatmap.tsx` and `team-overview.tsx`: hardcoded score-to-color mapping replaced with semantic CSS variables
- `score-sparkline.tsx`: fixed `hsl(var(--primary))` to `var(--primary)` for oklch compatibility
- Horizontal top navigation bar (`TopNav`) replacing sidebar as primary navigation
- Standalone `UserMenu` dropdown component with avatar, role badge, and sign out
- Mobile responsive hamburger menu (Sheet slide-in) for small screens
- Settings dropdown in top nav grouping admin/manager navigation items

### Changed
- Dashboard layout restructured from sidebar to top nav with full-width content area (max-w-7xl)
- Sidebar marked as legacy fallback (preserved but no longer used in default layout)

### Added
- Post-session summary email sender (`summary-email.ts`) triggered by AI pipeline completion
- Organization language setting in company settings (supports en, ro, de, fr, es, pt)
- AI language injection: all AI-generated content uses the org's preferred language
- Notification scheduling on session completion: pre-meeting and agenda-prep for next session
- Notification scheduling on series creation when nextSessionAt is set
- Notification cancellation on series pause/archive and rescheduling on cadence changes
- `reminderHoursBefore` field in series update validation for configurable reminder timing
- Sample notification records in seed data for manual testing
- Shared email styles module (`src/lib/email/styles.ts`) with consistent Apple-style design constants
- Reusable email layout component (`EmailLayout`) wrapping brand, content, and footer
- Pre-meeting reminder email template with recipient, meeting date/time, and CTA
- Agenda prep email template with manager/report variants and AI coaching nudges section (manager-only)
- Session summary email template with score badge, AI summary, action items, and manager insights
- `reminderHoursBefore` column on `meeting_series` with default 24 for configurable reminder timing
- Notification queries module (`queries.ts`): claim-based pending fetch, mark sent/failed, cancel by series
- Notification scheduler (`scheduler.ts`): schedules pre-meeting and agenda-prep notifications for series participants
- Notification sender (`sender.ts`): processes notifications by type, renders templates, sends via SMTP
- Cron endpoint (`/api/cron/notifications`): CRON_SECRET-authenticated GET that atomically claims and processes pending notifications
- Vercel cron config (`vercel.json`): 5-minute schedule for notification processing
- Per-question score weighting (`score_weight` column) — template authors can control each question's impact on session score (0 = excluded, 1 = normal, 2 = double impact, up to 10)
- Score weight UI in template editor question form — shown only for scorable answer types (rating, mood, yes/no)
- SoftexCo "1:1 Check-in (2 săptămâni)" template with 4 sections, 10 questions, and calibrated weights
- Direct AI pipeline execution (`src/lib/ai/pipeline.ts`) — runs AI generation without Inngest dependency
- Analytics snapshot computation wired into direct AI pipeline — `computeSessionSnapshot()` called after AI completion (non-fatal on failure)

### Changed
- Existing email templates (invite, verification, password-reset) refactored to use shared EmailLayout and styles
- SMTP transport consolidated: invite routes now import `getTransport`/`getEmailFrom` from `send.ts` (removed duplicate transport code)
- `send.ts` removed `"use server"` directive and exports transport functions for cross-module use
- Session scoring now uses weighted averages instead of simple averages — backward compatible (default weight 1.0)
- Analytics per-category scores now weighted by `score_weight`
- Session completion and AI retry now use direct pipeline instead of Inngest events (more reliable in dev)
- AI summary/suggestions polling timeout after 2 minutes — shows retry UI instead of infinite "Generating..." state
- Dev server starts with plain `next dev` — no Inngest CLI or concurrently dependency

### Removed
- `inngest`, `inngest-cli`, `concurrently` packages removed from dependencies
- `src/inngest/` directory (client, post-session, pre-session-nudges, analytics-snapshot functions) — replaced by direct pipeline
- `src/app/api/inngest/route.ts` serve route removed
- `dev:inngest` and `dev:next` scripts removed from package.json
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` from `.env.example`

### Fixed
- Series creation report dropdown showing all org users — now restricted to direct reports only (both UI and API)
- Series report select now groups people by team instead of flat list with emails
- Team analytics page showing no data — added live fallback queries for team averages and heatmap when analytics_snapshots is empty
- Velocity chart empty for managers — fixed raw SQL with wrong table names (`session` instead of Drizzle table reference) in manager roleFilter
- Team anonymization filter too aggressive — memberCount>=3 filter now only applies when anonymize=true
- Seed data missing completed action items for velocity chart — added 3 completed items for Dave spread across 3 months
- Dashboard nudge section missing for managers — restored standalone `getManagerNudges` query and `NudgeCardsGrid` rendering on overview page (no date filter, shows all non-dismissed nudges)
- Wizard NudgeList over-filtering nudges — removed `upcoming=true` parameter so all non-dismissed series nudges are shown in context panel
- Nudge API `upcoming=true` filter silently dropping NULL targetSessionAt nudges — replaced with IS NULL OR range check
- Analytics overview page crash caused by ungrouped column in correlated subquery — replaced with DISTINCT ON query for latest scores
- Score trend chart NaN values caused by parseFloat on Drizzle decimal strings — replaced with Number() and added NaN filtering across all analytics queries
- Hardcoded CATEGORY_METRICS (6 English names) silently dropping 7 of 13 template sections — categories now derived dynamically from template section names
- CSV export encoding for non-ASCII characters — added UTF-8 BOM prefix for correct display in Excel
- AI pipeline never completing due to Inngest dev server not running — direct execution path resolves this
- Infinite "Generating..." spinner on session summary page when AI pipeline fails to start
- CSV export API endpoint (`GET /api/analytics/export`) supporting full, score-trend, categories, velocity, and adherence export types with RBAC
- CSV generation utilities (`generateCSV`, `escapeCsvField`, `sessionDataToRows`) with RFC 4180 escaping
- CsvExportButton component with icon and full variants, browser download trigger, and toast notifications
- Per-chart CSV export buttons on individual analytics page (score trend, categories, velocity, adherence)
- "Export All Data" button on individual analytics page header
- Velocity and adherence charts integrated into individual analytics page with initial server-side data
- Team analytics page with aggregated category scores and SVG dot matrix heatmap (size=sample count, color=score)
- Team analytics API route (`GET /api/analytics/team/[id]`) with RBAC (members blocked, managers need team lead role)
- TeamOverview component showing category score cards with green/amber/red bar visualization and limited-data footnotes
- TeamHeatmap SVG component: dot matrix with size+color encoding, hollow circles for insufficient data (<3 samples), hover tooltips
- Anonymization toggle on team analytics: replaces names with "Member N" in heatmap
- Teams section on analytics overview page linking to team-level analytics
- Action item velocity area chart showing average days from creation to completion per month with 7-day target reference line
- Meeting adherence stacked bar chart showing completed/cancelled/missed sessions per month with adherence percentage
- Velocity and adherence query functions with role-based filtering (admin org-wide, manager their reports, member own data)
- Period selector component with 30d/3mo/6mo/1yr presets and custom date range picker
- Analytics overview page listing reports with latest scores and session counts (RBAC: members auto-redirect to own analytics)
- Analytics nav item in sidebar (BarChart3 icon, visible to all roles)
- Score trend line chart (Recharts) with date-formatted X axis, 1-5 Y domain, custom tooltips
- Category breakdown horizontal bar chart with HSL color rotation and limited-data visual treatment
- Session comparison delta table with dual session selectors and green/red/gray delta indicators
- Individual analytics API route (`GET /api/analytics/individual/[id]`) with RBAC enforcement and period/comparison params
- Individual analytics page (Server Component + Client wrapper) with TanStack Query for period changes
- Dashboard query layer (`src/lib/queries/dashboard.ts`): getUpcomingSessions, getOverdueActionItems, getQuickStats, getRecentSessions with role-based filtering
- Dashboard overview rebuild: upcoming sessions with inline AI nudges, quick stats cards, overdue items grouped by report, recent sessions with score badges
- Start Session button on today's sessions with Resume for in-progress sessions
- Upcoming sessions cards integrate AI nudges inline with expandable "+N more" pattern
- Analytics snapshot compute engine (`computeSessionSnapshot`): per-category averages with rating normalization, delete-then-insert for NULL-safe unique index handling
- Analytics query layer (`src/lib/analytics/queries.ts`): getScoreTrend, getCategoryAverages, getSessionComparison, getTeamAverages, getTeamHeatmapData with snapshot-first and live fallback
- Inngest analytics snapshot function (`computeAnalyticsSnapshot`): triggered by session/completed event with 3 retries
- Inngest analytics sweep cron (`analyticsSnapshotSweep`): daily 3 AM safety net for un-ingested completed sessions
- Analytics ingestion tracking: `analytics_ingested_at` column on session table with migration
- Analytics metric name constants (`METRIC_NAMES`): session_score, per-category scores, operational metrics
- Pre-session nudge cron pipeline (`preSessionNudgeRefresh`): runs every 6 hours, finds series with sessions in next 24h, fires refresh events
- Individual nudge refresh handler (`nudgeRefreshHandler`): gathers context from last completed session, generates fresh nudges, replaces non-dismissed ones
- Nudge API endpoint (`GET /api/nudges`): returns upcoming non-dismissed nudges with report names, sorted by priority
- Nudge dismiss endpoint (`POST /api/nudges/[id]/dismiss`): marks a nudge as permanently dismissed (manager-only)
- Dashboard nudge cards: overview page shows AI nudge cards grouped by report for upcoming sessions (managers only)
- Wizard context panel nudge section: NudgeList rendered as first section in context panel for managers
- NudgeCard component: minimalistic card with coaching suggestion, dismiss button, priority indicator, report name and relative time
- Post-session AI pipeline (`postSessionPipeline`): 9-step Inngest function generating summary, manager addendum, action suggestions, and base nudges after session completion
- AI retry handler (`aiRetryHandler`): re-runs the full AI pipeline for sessions with failed AI generation
- AI retry API endpoint (`POST /api/sessions/[id]/ai-retry`): allows managers to re-trigger failed AI pipelines
- Session completion endpoint fires `session/completed` Inngest event as fire-and-forget (never blocks session completion)
- AI status transitions: `pending` (on completion) -> `generating` (pipeline starts) -> `completed`/`failed`
- AI summary polling API (`GET /api/sessions/[id]/ai-summary`): returns AI summary status/content, manager addendum only for the series manager
- AI suggestions API (`GET/POST /api/sessions/[id]/ai-suggestions`): polling for suggestions + accept/skip actions that create real action items
- AI summary section component: renders structured summary (key takeaways, discussion highlights, follow-up items, sentiment badge) with skeleton loading and retry
- AI suggestions section component: renders suggestion cards with Accept/Edit+Accept/Skip controls, inline edit form with assignee dropdown
- Manager addendum section on session summary: sentiment analysis, patterns, coaching suggestions, follow-up priority (manager-only, behind lock badge)

### Changed
- Dashboard overview page rebuilt: replaced stub Account card and separate NudgeCardsGrid with full 4-section manager briefing layout
- Session summary page passes AI columns and participant info to summary view component
- Session summary view replaces AI placeholder with live AI summary and suggestions sections
- Session completion endpoint now sets `aiStatus: "pending"` when completing a session

### Added
- AI SDK v6 (`ai@6.0.111`) and Anthropic provider (`@ai-sdk/anthropic@3.0.54`) for structured AI generation
- Inngest (`inngest@3.52.6`) for durable background job pipelines with typed event schemas
- Inngest serve route at `/api/inngest` with typed client exporting `session/completed`, `session/nudges.refresh`, `session/ai.retry` events
- AI status enum (`pending`, `generating`, `completed`, `failed`) for tracking AI pipeline progress
- Session table AI columns: `ai_summary`, `ai_manager_addendum`, `ai_suggestions` (JSONB), `ai_status`, `ai_completed_at`
- `ai_nudge` table with tenant isolation RLS policy, indexes on `(series_id, target_session_at)` and `(tenant_id, is_dismissed)`
- Zod schemas for AI structured output: `summarySchema`, `managerAddendumSchema`, `nudgesSchema`, `actionSuggestionsSchema`
- AI model configuration (`src/lib/ai/models.ts`) mapping tasks to Claude model tiers (Sonnet for summaries/addendum/suggestions, Haiku for nudges)
- AI context builder (`src/lib/ai/context.ts`) assembling session data with token-budget truncation for AI prompts
- AI prompt templates for summary, nudges, and action item suggestion generation
- AI service layer (`src/lib/ai/service.ts`) with `generateSummary`, `generateManagerAddendum`, `generateNudges`, `generateActionSuggestions` using AI SDK v6 `generateText` + `Output.object` pattern
- `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` placeholders in `.env.example`
- Full-text search API (`GET /api/search`) with PostgreSQL tsvector/GIN indexes across sessions, action items, templates, and people
- GIN expression indexes on action_item, talking_point, and session_answer tables for fast full-text search
- Global Cmd+K command palette for universal search across sessions, action items, templates, and people
- Search trigger button in dashboard header with keyboard shortcut hint
- History page inline search bar with debounced session content search
- Standalone action items API: GET `/api/action-items` (cross-series, grouped), PATCH `/api/action-items/[id]` (full edit)
- Sidebar navigation for Action Items and History pages
- Zod validation schema for standalone action item updates
- Action Items page at `/action-items` with grouped items, status toggle, inline edit sheet
- Overdue badge and age indicator on action items in context panel
- Session summary page (`/sessions/[id]/summary`) with read-only view of all session data grouped by section
- Session summary view component with collapsible sections, answers, notes, talking points, action items with live status
- AI summary placeholder section on session summary page (ready for Phase 7)
- Private notes displayed on summary page only for the note author (server-side decrypted)
- In-progress sessions redirect from summary page to wizard
- Enhanced session timeline: completed sessions link to summary, in-progress sessions show Resume button
- History page at `/history` showing sessions grouped by series with score sparklines
- History API endpoint (`GET /api/history`) with cursor-based pagination and filters (status, date range, series)
- History page filters: status, date range, series/report with URL-based state
- Load more button for paginated history results

### Changed
- Replace hardcoded category enums with user-defined sections and labels
- Template questions now belong to sections (wizard steps) instead of fixed categories
- Templates use a many-to-many label system (tenant-wide taxonomy) instead of a single category enum
- Wizard steps display section names directly instead of looking up from a hardcoded map
- Context panel and summary screen use "section" terminology instead of "category"
- Template list shows colored label badges instead of category badge
- Create template dialog simplified (no more category picker)

### Added
- Template sections table (`template_section`) — user-defined groups that become wizard steps
- Template labels table (`template_label`) — tenant-wide taxonomy with optional color
- Template label assignments table (`template_label_assignment`) — many-to-many
- Labels CRUD API (`GET/POST /api/labels`, `PATCH/DELETE /api/labels/[id]`)
- Migration `0008_sections_labels` with automatic data migration from categories to sections

### Removed
- `template_category` and `question_category` database enums
- `category` column from `questionnaire_template` and `template_question` tables
- Hardcoded `CATEGORY_LABELS` / `categoryLabels` maps from all components

### Fixed
- Reword inverted rating questions (blockers/capacity) to positive framing so higher = better across all ratings
- Conditional question operator dropdown disabled for unsaved questions — fallback ID matching now consistent between select and lookup
- Conditional question "Add Question" button silently failing — Zod schema required UUID for `conditionalOnQuestionId` but unsaved questions use temporary IDs
- Conditional question references causing 500 on save — temporary `q-{index}` refs nulled during DB insert, then resolved to real UUIDs in a second pass

### Added
- Session summary screen: read-only recap of all answers, notes, talking points, and action items grouped by category
- Session score computation: normalizes all numeric answer types (rating_1_5, rating_1_10, yes_no, mood) to 1-5 scale and averages
- Session completion API (`POST /api/sessions/[id]/complete`): computes score, marks session completed with duration, updates `next_session_at` on series
- Summary step as final wizard tab with score card, per-category review, and "Complete Session" button for managers
- Save status component for wizard top bar (saved/saving/error states with icon transitions)
- Series cards navigate to wizard on "Start" and "Resume" (direct `/wizard/[sessionId]` navigation)
- Series detail "Resume Session" button navigates to wizard for in-progress sessions
- Session score displayed on series cards for completed sessions
- In-progress session number shown on series cards ("Session #N in progress")
- Tiptap rich text editor for session notes with formatting toolbar (bold, italic, lists, links)
- Shared notes tab with auto-save per category via debounced PUT to `/api/sessions/[id]/notes`
- Private notes tab with "Only you can see this" indicator, server-side AES-256-GCM encryption
- Shared notes API (`PUT /api/sessions/[id]/notes`) updates session JSONB per-category key
- Private notes API (`GET/PUT /api/sessions/[id]/notes/private`) with encrypt-on-write, decrypt-on-read
- Talking points list per category with add (Enter to submit), check-off, delete, and carried-from session badge
- Talking points API (`GET/POST/PATCH/DELETE /api/sessions/[id]/talking-points`) with category filtering
- Inline action item creation per category with title, assignee select, optional due date
- Action items API (`GET/POST/PATCH /api/sessions/[id]/action-items`) with assignee name resolution
- Context panel integrated into wizard shell layout (right sidebar on desktop, mobile slide-in overlay)
- Question history dialog wired into wizard shell for per-question answer timeline
- Aggregate save status indicator: tracks all pending mutations (answers, notes, talking points, action items)
- `visibilitychange` event handler in wizard to flush pending debounced saves on tab switch
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link` dependencies
- Zod schemas: `sharedNotesUpsertSchema`, `privateNoteUpsertSchema`, `createTalkingPointSchema`, `toggleTalkingPointSchema`, `createActionItemSchema`, `updateActionItemSchema`
- Session wizard: full-page immersive layout without sidebar for focused 1:1 experience
- Session data API (`GET /api/sessions/[id]`) returns comprehensive wizard payload: session, series, template questions, existing answers, previous sessions, and open action items
- Answer upsert API (`PUT /api/sessions/[id]/answers`) with `onConflictDoUpdate` for 500ms debounced auto-save
- Wizard shell (`wizard-shell.tsx`) orchestrates wizard state via `useReducer`: step navigation, answer management, conditional question logic, and auto-save
- Wizard top bar with exit button (with unsaved changes confirmation), session info, and live save status indicator
- Wizard navigation with category pill tabs, prev/next buttons, and keyboard arrow key shortcuts
- Category step component renders questions grouped by category on scrollable screens with required badges and help text
- Recap screen shows last meeting summary (session score, notes by category, answer count) and open action items with status/due date
- Question widget dispatcher maps `answerType` to correct input widget
- Text widget: auto-resizing textarea
- Rating 1-5 widget: clickable star icons with configurable labels
- Rating 1-10 widget: 10 numbered buttons in responsive grid
- Yes/No widget: two large toggle buttons (1 = yes, 0 = no)
- Multiple choice widget: radio-style buttons from `answerConfig.options`
- Mood widget: 5 emoji buttons with configurable labels
- `useDebounce<T>` hook for auto-save pattern
- Zod `answerUpsertSchema` for answer validation
- `beforeunload` handler triggers immediate save of pending debounced answers via `navigator.sendBeacon`
- Conditional question evaluation across all categories (cross-category conditionals work correctly)
- Context panel sidebar (`context-panel.tsx`): always-visible right sidebar with session history context, category-scoped data, and mobile slide-in overlay
- Question history dialog (`question-history-dialog.tsx`): per-question answer timeline across previous sessions with formatted values per answer type
- Score sparkline component (`score-sparkline.tsx`): Recharts mini line chart for score trends with hidden axes
- `recharts` dependency for score trend sparklines and chart components
- `shadcn/ui` collapsible component for context panel sections
- Meeting series CRUD: create, update, archive series with cadence, preferred day/time, and default template
- Series list API (`GET /api/series`) with report info, latest session status, sorted by next meeting date (soonest first)
- Series detail API (`GET /api/series/[id]`) with session history, manager/report info
- Start session API (`POST /api/series/[id]/start`) creates in_progress session record
- Series card grid page (`/sessions`) with responsive grid layout and empty state
- Series card component with report avatar, cadence, next session date, status badge, Start/Resume button
- Create series form (`/sessions/new`) with report selector, cadence radio group, preferred day/time, template selector, duration input
- Series detail page (`/sessions/[id]`) with settings overview, session history timeline, Pause/Resume/Archive actions
- Session timeline component showing session history with scores and status badges
- `computeNextSessionDate` utility for cadence-based scheduling (weekly, biweekly, monthly, custom + preferred day alignment)
- Zod validation schemas for series CRUD: `createSeriesSchema`, `updateSeriesSchema` with custom cadence refinement
- RBAC helpers: `canManageSeries` (admin/manager), `isSeriesParticipant` (manager or report on series)
- Sidebar navigation: "Sessions" item after "Templates" with CalendarDays icon
- Schema migration: `shared_notes` from TEXT to JSONB for per-category storage
- Schema migration: `category` column added to `private_note`, `talking_point`, `action_item` tables
- Schema migration: unique index on `session_answer(session_id, question_id)` for answer upsert support
- Schema migration: updated unique index on `private_note` to include `category`

### Changed
- Seed data updated: `shared_notes` uses JSONB format, action items and private notes have category values

### Added
- Drag-and-drop question reordering in template editor using @dnd-kit with vertical axis constraint
- GripVertical drag handle on question cards with visual drag feedback (shadow + opacity)
- Keyboard accessibility for question reordering via KeyboardSensor
- Optimistic reorder with server persistence and rollback on error
- Reorder API endpoint (`PATCH /api/templates/[id]/questions/reorder`) with contiguous sort_order assignment
- Conditional logic configuration form (`ConditionalLogicForm`) with type-aware operator filtering and adaptive value inputs
- Conditional logic indicator on question cards showing "Shows when Q{n} {operator} {value}"
- Server-side conditional logic validation (`validateConditionalLogic`): prevents circular references, validates operator/type compatibility
- `operatorsForAnswerType` mapping for filtering operators by answer type (text: eq/neq only, ratings/mood: all 6 operators)
- Template editor page (`/templates/[id]`) with full question management: add, edit, remove questions with all 6 answer types
- New template page (`/templates/new`) for creating templates from scratch (admin/manager only)
- Template editor component with metadata form (name, description, category), questions list, and actions toolbar
- Question card component showing question text, answer type badge, category badge, required indicator, and conditional logic badge
- Question form dialog with answer type selection, per-type configuration, and required toggle
- Answer config form with per-type configuration: rating labels, multiple choice options with add/remove, mood emoji labels
- Template actions toolbar: Publish/Unpublish toggle, Set as Default (admin-only), Duplicate, Archive with confirmation
- Read-only mode for member role (no edit controls visible)
- Template versioning-aware PATCH endpoint: detects session usage, increments version, archives old questions when template is in use
- Template duplicate API (`POST /api/templates/[id]/duplicate`): deep-copies template + questions with new UUIDs, remaps conditional references
- Template set-default API (`PUT /api/templates/[id]/default`): atomically sets one default per tenant (admin-only)
- Template publish toggle API (`PUT /api/templates/[id]/publish`): toggles published status with question count validation
- `saveQuestionSchema` Zod schema with optional `id` field for batch save operations
- shadcn/ui `switch` and `alert-dialog` components
- Template schema migration: `is_archived` column on `questionnaire_template` table for soft-delete/archive
- Template CRUD API: `GET/POST /api/templates` for listing and creating templates with question counts
- Template detail API: `GET/PATCH/DELETE /api/templates/[id]` for viewing, updating, and archiving templates
- Template question CRUD API: `POST /api/templates/[id]/questions` and `PATCH/DELETE /api/templates/[id]/questions/[questionId]`
- Zod validation schemas for template CRUD: `createTemplateSchema`, `updateTemplateSchema`, `questionSchema`, `saveTemplateSchema`, `reorderQuestionsSchema`
- Answer config validation: `validateAnswerConfig()` ensures multiple_choice has min 2 options
- RBAC helper: `canManageTemplates()` for admin/manager role check
- Template list page (`/templates`) with responsive card grid showing name, description, category, question count, version, and status badges
- Template create dialog with React Hook Form + Zod validation for name, description, and category
- Sidebar navigation: "Templates" item added after "People" (visible to all roles)

### Fixed
- Security: cross-tenant IDOR in team manager verification (missing tenant_id filter)
- Security: host header injection in invite email URLs — now uses NEXT_PUBLIC_APP_URL only
- Security: LIKE wildcard injection in audit log search
- Security: avatarUrl validation now requires HTTPS URLs
- Bug: Create Team dialog sent `managerId: null` failing Zod validation (now sends `undefined`)
- Dead code: unreachable `acceptedAt` check in invite resend route removed
- React key warning: Fragment in audit log table now has proper key
- Teams page lead picker now filters out deactivated users

### Added
- Playwright E2E test suite: 63 tests across 5 files (people, teams, invite, audit-log, RBAC)
- Invite button on People page header (admin-only) wiring the invite dialog into the UI
- Audit log API: `GET /api/audit-log` with server-side pagination, action type filter, date range filter, and search (admin-only)
- Audit log page (`/settings/audit-log`) with expandable detail rows, pagination, and filters
- Sidebar updated with role-based navigation: Settings section (Company, Audit Log) visible to admins only
- Team CRUD API: `GET/POST /api/teams` for listing and creating teams with member counts and manager info
- Team detail API: `GET/PATCH/DELETE /api/teams/[id]` for viewing, updating, and deleting teams (admin-only delete)
- Team members API: `POST/DELETE /api/teams/[id]/members` for adding and removing team members
- Team card component (`src/components/people/team-card.tsx`) with name, description, lead avatar, member count
- Team create dialog (`src/components/people/team-create-dialog.tsx`) with name, description, and searchable team lead picker
- Member picker dialog (`src/components/people/member-picker.tsx`) with searchable multi-select and checkbox UI
- Teams page (`/teams`) with responsive card grid, create button (admin/manager), empty state
- Team detail page (`/teams/[id]`) with inline name/description editing, member table, add/remove members
- RBAC enforcement on team mutations: admin/manager can create and manage, admin-only delete
- Audit logging for all team mutations: `team_created`, `team_updated`, `team_deleted`, `team_lead_changed`, `member_added_to_team`, `member_removed_from_team`
- Invite API: `POST /api/invites` sends bulk email invitations with role assignment (admin-only)
- Invite acceptance API: `POST /api/invites/accept` creates user account from invite token (public endpoint)
- Invite resend API: `POST /api/invites/resend` generates new token and resends invite email (admin-only)
- Invite email template (`src/lib/email/templates/invite.tsx`) matching existing email design system
- Invite dialog component (`src/components/people/invite-dialog.tsx`) with multi-email textarea and role selector
- Invite acceptance page (`/invite/[token]`) with 2-step onboarding: password setup, then profile info
- Auto-sign-in after invite acceptance: new users land directly in the dashboard
- User management API: `GET /api/users` returns all users with team memberships and pending invites merged
- User detail API: `GET /api/users/[id]` fetches single user with manager name and team memberships
- User update API: `PATCH /api/users/[id]` handles role changes (admin-only), manager assignment (admin-only), profile updates (self or admin), and reactivation (admin-only)
- User deactivation API: `DELETE /api/users/[id]` soft-deactivates users (admin-only) with last-admin protection
- Circular manager assignment prevention: walks up manager chain (max 10 levels) before allowing assignment
- Last-admin guard: prevents demoting or deactivating the last admin in an organization
- Audit logging for all user mutations: `role_changed`, `manager_assigned`, `profile_updated`, `user_deactivated`, `user_reactivated`
- People directory page (`/people`) with sortable/filterable TanStack Table showing all organization users
- People table columns: name (with avatar), email, role (inline editing), teams (badges), manager (combobox), status (badge), actions (kebab menu)
- Inline role editing via `RoleSelect` component with optimistic updates (admin-only)
- Inline manager assignment via `ManagerSelect` combobox with search (admin-only)
- User actions kebab menu: view profile, deactivate, reactivate, resend invite (role-conditional)
- Profile sheet (slide-in panel) opens on table row click with user summary and "View Full Profile" link
- Profile detail page (`/people/[id]`) with user info, team badges, and edit form (self or admin)
- Profile edit form with React Hook Form + Zod validation for firstName, lastName, jobTitle
- People/Teams tab navigation component using URL-based routing
- Search filter: filters table by name, email, or job title
- Role, team, and status dropdown filters with client-side filtering
- Table pagination (20 rows per page) with Previous/Next controls
- Pending invites appear in the people table with "Pending" status badge
- `audit_log` Drizzle schema with tenant/action and tenant/actor composite indexes
- `invite_token` Drizzle schema with tenant+email unique index and 7-day expiry support
- RLS policies for `audit_log` (SELECT/INSERT only, immutable) and `invite_token` (SELECT/INSERT/UPDATE)
- Zod validation schemas for user management: `inviteUsersSchema`, `acceptInviteSchema`, `updateProfileSchema`, `updateUserRoleSchema`, `assignManagerSchema`
- Zod validation schemas for team management: `createTeamSchema`, `updateTeamSchema`, `addTeamMembersSchema`, `removeTeamMemberSchema`
- npm packages: `@tanstack/react-table`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`
- 15 shadcn/ui components: table, dialog, dropdown-menu, tabs, avatar, sonner, sheet, textarea, checkbox, command, popover, tooltip, skeleton, form, pagination
- RBAC helper (`src/lib/auth/rbac.ts`) with `requireRole`, `canManageTeams`, `isAdmin` utilities
- Audit log helper (`src/lib/audit/log.ts`) with transactional `logAuditEvent` function
- TanStack Query provider (`src/providers/query-provider.tsx`) wrapping dashboard layout
- Sidebar navigation with Overview, People, and Settings links
- Toast notifications (Sonner) in dashboard layout

### Changed
- Sidebar navigation restructured: main section (Overview, People) and Settings section (Company, Audit Log) with role-based visibility
- Dashboard layout now includes sidebar navigation and TanStack Query provider
- `proxy.ts` allows unauthenticated access to `/invite/*` paths for invite acceptance flow
- `TransactionClient` type exported from `tenant-context.ts` for use by audit log helper

### Changed
- Wiki overhauled: replaced 15-sprint tracking with 10-phase roadmap matching GSD workflow
- `CLAUDE.md` updated: project status, email tech stack (Nodemailer), sprint references replaced with phase references
- `ROADMAP.md` updated: Phase 2 marked complete with all plan checkboxes checked

### Removed
- 16 sprint wiki pages (`Sprint-01.md` through `Sprint-15.md` and `Sprint-Log.md`) replaced by phase-based tracking

### Added
- `docs/wiki/Phase-Log.md` — master implementation tracking with phase summary table and dependency graph
- `docs/wiki/Phase-01.md` through `Phase-10.md` — per-phase wiki pages with goals, success criteria, and build details
- Phase progress cross-reference in `Features-Roadmap.md`
- PostToolUse hook (`scripts/wiki-phase-hook.sh`) that auto-detects phase completion commits and instructs Claude to update wiki

### Changed
- Database connection module (`src/lib/db/index.ts`) switched from Neon serverless driver to `node-postgres` (pg) for local development compatibility
- Email infrastructure switched from Resend to Nodemailer (SMTP-based) for self-hosted flexibility
- Auth flows (`auth/config.ts`, `auth/actions.ts`, `email/send.ts`) now use `adminDb` (superuser connection) to bypass RLS for registration, login, password reset, and email verification
- Environment variables: replaced `RESEND_API_KEY` with SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`)

### Fixed
- Auth.js redirect detection in `registerAction` and `logoutAction` now uses digest-based check for Next.js compatibility

### Added
- `adminDb` export in `src/lib/db/index.ts` -- superuser database connection for auth flows that operate outside tenant context
- `DATABASE_ADMIN_URL` environment variable for admin database connection
- `nodemailer` and `@react-email/render` dependencies for SMTP-based email sending
- Organization type (`org_type`) enum and column on tenant table: `for_profit` and `non_profit`
- Organization type selector (radio buttons) on registration page between company name and personal info
- `orgType` field in registration schema and action -- tenants created with correct org type
- Organization settings page at `/settings/company` (admin-only, redirects non-admins to `/overview`)
- Company settings API route (`/api/settings/company`) with GET and PUT handlers, Zod validation, tenant-scoped access
- Settings form with timezone selector (26 timezones), cadence radio group, duration dropdown
- Organization details section showing name (editable), type (read-only badge), slug (read-only)
- Zod validation schema for organization settings (`orgSettingsSchema`)
- shadcn/ui components: Select, RadioGroup, Badge, Separator
- Seed data updated with `orgType`: Acme Corp (for_profit), Beta Inc (non_profit)
- Route protection via `proxy.ts` (Next.js 16 convention) -- unauthenticated users redirect to `/login`, authenticated users redirect away from auth pages to `/overview`
- Dashboard layout with `SessionProvider` and server-side session validation (defense-in-depth against CVE-2025-29927)
- Overview page with user info (name, email, role, organization) and email verification banner
- Logout button client component using `signOut()` from `next-auth/react`
- Root page (`/`) redirects to `/overview`
- `emailVerified` field added to JWT token and session for verification status display
- Google and Microsoft OAuth buttons with branded SVG icons on login page
- OAuth error messages: AccessDenied (no account found) and OAuthAccountNotLinked (different sign-in method)
- Auth.js v5 (next-auth@beta) with Credentials provider, Google OAuth, and Microsoft Entra ID
- Drizzle adapter integration with custom user table mapping (`@auth/drizzle-adapter`)
- JWT session strategy with `tenantId`, `role`, and `userId` on session token
- Auth schema tables: `account`, `auth_session`, `verification_token`, `email_verification_token`, `password_reset_token`
- User table extended with `name`, `email_verified`, `image`, and `password_hash` columns
- TypeScript type augmentation for Auth.js session/JWT custom fields (`src/types/next-auth.d.ts`)
- Zod validation schemas for sign-in, register, forgot-password, reset-password (`src/lib/validations/auth.ts`)
- Auth.js route handler at `/api/auth/[...nextauth]`
- OAuth sign-in callback blocks users without existing records (must be invited or register org first)
- Environment variables for AUTH_SECRET, OAuth providers, and Resend email in `.env.example`
- Email sending infrastructure with Resend API and lazy-initialized client (`src/lib/email/send.ts`)
- React Email templates for verification and password reset emails
- Server actions: `registerAction`, `verifyEmailAction`, `forgotPasswordAction`, `resetPasswordAction`, `logoutAction`
- Registration creates tenant + admin user in single DB transaction, then auto-signs-in
- Forgot-password prevents email enumeration (always returns success)
- Auth pages with shadcn/ui: login, register, verify-email, forgot-password, reset-password
- Auth layout with centered card design and authenticated-user redirect
- OAuth buttons (Google, Microsoft) on login page
- shadcn/ui components: Button, Input, Label, Card
- Drizzle migration for auth tables and user schema changes (`0002_clear_la_nuit.sql`)
- RLS policies on `account` and `auth_session` tables (tenant isolation via user JOIN)
- Token tables (`verification_token`, `email_verification_token`, `password_reset_token`) accessible without tenant context
- `app_user` role grants for all new auth tables
- Next.js 15 project scaffolded with Bun, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui
- Drizzle ORM configuration with Neon serverless driver and WebSocket fallback
- Package scripts: `dev` (port 4300), `build`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- Environment variable templates (`.env.example`, `.env.local`)
- Docker Compose with PostgreSQL 16 (blue-green: `oneonone_stable` + `oneonone_dev` databases)
- Dedicated `app_user` database role without BYPASSRLS for RLS enforcement
- Multi-stage Dockerfile (Bun for deps/build, Node.js 22 for production runtime)
- Database init script (`scripts/init-db.sh`) with default privileges for app_user
- Project documentation: architecture, data model, features roadmap, UX flows, questionnaires, analytics, and security docs
- Phase-based implementation plan with dependency graph (`docs/wiki/Phase-01.md` through `Phase-10.md`)
- GitHub Wiki with auto-sync from `docs/wiki/` via GitHub Actions workflow
- Wiki sync scripts (`scripts/push-wiki.sh`, `scripts/push-wiki-hook.sh`)
- Claude Code PostToolUse hooks for automatic wiki sync on file edits
- `CLAUDE.md` with project conventions, architecture overview, and phase tracking instructions
- Complete Drizzle ORM schema for all database tables matching `docs/data-model.md`
- Centralized pgEnum definitions for all 16 enum types (`src/lib/db/schema/enums.ts`)
- Schema files for: tenant, user, team, team_member, questionnaire_template, template_question, meeting_series, session, session_answer, private_note, talking_point, action_item, notification, analytics_snapshot
- All tenant-scoped tables include `tenant_id` foreign key column
- `key_version` column on `private_note` table for encryption key rotation tracking
- Drizzle relations for all foreign key relationships including self-references
- Database indexes per data-model.md specification (unique constraints, composite indexes)
- SQL migrations: initial schema DDL and RLS policies (`src/lib/db/migrations/`)
- Row-Level Security (RLS) enabled on all 14 tables with tenant isolation policies
- Restrictive tenant isolation + author-only policies on `private_note` (FORCE ROW LEVEL SECURITY)
- RLS policies for junction tables (team_member, template_question, session_answer, talking_point) via parent JOIN
- `withTenantContext()` wrapper for tenant-scoped database queries using `set_config` with SET LOCAL
- `app_user` role granted CRUD privileges on all tables with default privileges for future tables
- Vitest test framework with coverage support and path alias configuration
- AES-256-GCM encryption infrastructure for private notes (`src/lib/encryption/`)
- HKDF key derivation from master key to per-tenant encryption keys (`deriveTenantKey`)
- Encrypt/decrypt functions with key versioning for rotation support (`encryptNote`, `decryptNote`)
- 11 encryption unit tests covering round-trips, key isolation, unicode, and tampering detection
- Idempotent seed script with two tenants: Acme Corp (7 users, 2 teams, 2 templates, 3 series, 3 sessions) and Beta Inc (3 users, 1 template, 1 series)
- Seed data includes realistic session answers, action items, and encrypted private notes
- `SEED_DATABASE_URL` environment variable for superuser seed connection (bypasses RLS)
- `pg` (node-postgres) driver for seed script local PostgreSQL connection
