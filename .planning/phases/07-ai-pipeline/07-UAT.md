---
status: diagnosed
phase: 07-ai-pipeline
source: 07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md
started: 2026-03-04T18:00:00Z
updated: 2026-03-04T19:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Overview — Nudge Cards (Manager)
expected: Navigate to dashboard overview. As a manager with upcoming sessions, nudge cards should appear grouped by report name with priority dots, coaching text, and dismiss buttons. Empty state if no nudges generated yet.
result: issue
reported: "i have completed a few sessions, however, on the dashboard i get this: No AI nudges yet -- they appear after your first completed session"
severity: major

### 2. Session Completion Triggers AI Pipeline
expected: Complete a session through the wizard. After submission, you're redirected to the session summary page. The AI summary section should immediately show a loading skeleton/spinner state (aiStatus = "pending"), indicating the background pipeline was triggered.
result: issue
reported: "i just finished a session, and now, the view session page is showing AI Suggestions and other content as 'Generating...' even though it's been about 10 minutes. On the dashboard, i still get the same message: No AI nudges yet -- they appear after your first completed session"
severity: major

### 3. AI Summary Section on Session Summary
expected: On a completed session's summary page, the AI summary section renders with structured content: key takeaways, discussion highlights, follow-up items, and a sentiment badge. If AI hasn't completed yet, a skeleton loading state shows. If AI failed, a "Retry" button appears.
result: pass

### 4. AI Manager Addendum (Manager View)
expected: As the manager on a completed session, the summary page shows an additional "Manager Addendum" section below the AI summary. This section contains AI-generated private coaching insights visible only to the manager. Members/reports should NOT see this section.
result: pass

### 5. AI Action Item Suggestions
expected: On a completed session's summary page, an AI suggestions section shows suggested action items. Each suggestion has three controls: "Accept" (creates real action item), "Edit + Accept" (opens inline edit form then creates), and "Skip" (permanently removes the suggestion).
result: pass

### 6. Wizard Context Panel — Nudge Section (Manager)
expected: Open the session wizard as a manager. The context panel (right sidebar) should show a "Nudges" section as its first element, listing coaching nudges relevant to this series. Each nudge can be dismissed. Members/reports should NOT see the nudge section.
result: issue
reported: "i see no nudges section for any session, even though on the dashboard, they show up"
severity: major

### 7. Inngest Serve Route
expected: Navigate to /api/inngest in the browser. The endpoint should respond (Inngest UI or JSON response), confirming the serve route is active and functions are registered.
result: false-positive
reported: "https://1on1.surmont.co/api/ingest returns 404"
note: User typo — /api/ingest (missing 'n') vs correct /api/inngest. Route confirmed working via curl.

## Summary

total: 7
passed: 3
issues: 3
pending: 0
skipped: 0
false-positive: 1

## Gaps

- truth: "Dashboard shows AI nudge cards grouped by report after sessions are completed"
  status: failed
  reason: "User reported: i have completed a few sessions, however, on the dashboard i get this: No AI nudges yet -- they appear after your first completed session"
  severity: major
  test: 1
  root_cause: "NudgeCardsGrid component was removed from dashboard overview during Phase 08-02 redesign. Nudges integrated inline into upcoming session cards only — when no upcoming sessions exist, nudges are invisible despite existing in DB."
  artifacts:
    - path: "src/app/(dashboard)/overview/page.tsx"
      issue: "Missing standalone nudge section — only renders UpcomingSessions, QuickStats, OverdueItems, RecentSessions"
    - path: "src/components/dashboard/nudge-cards-grid.tsx"
      issue: "Orphan dead code — fully implemented but never imported anywhere"
    - path: "src/lib/queries/dashboard.ts"
      issue: "getUpcomingSessions() only fetches nudges for sessions with status IN ('scheduled','in_progress') within 7 days"
  missing:
    - "Re-add dedicated nudge section to overview page or ensure nudges visible without upcoming sessions"
    - "Add standalone nudge query that fetches all non-dismissed nudges for manager"
  debug_session: ".planning/debug/dashboard-nudge-cards.md"

- truth: "AI pipeline triggers and completes after session submission"
  status: already-fixed
  reason: "User reported: stuck on Generating for 10+ minutes. Root cause was Inngest events silently dropped (no Inngest dev server running). Already fixed by commit f9946b4 which replaced Inngest with direct pipeline execution."
  severity: major
  test: 2
  root_cause: "Inngest send() required running Inngest dev server. Docker had INNGEST_DEV pointing to host.docker.internal:8288 but no server running. Events silently dropped. Fixed by commit f9946b4 replacing Inngest with runAIPipelineDirect()."
  artifacts:
    - path: "src/app/api/sessions/[id]/complete/route.ts"
      issue: "Previously used inngest.send() — now fixed to use runAIPipelineDirect()"
    - path: "src/lib/ai/pipeline.ts"
      issue: "New direct pipeline runner (replacement for Inngest function)"
    - path: "src/inngest/"
      issue: "Entire directory is dead code — Inngest client, functions, serve route no longer used"
  missing:
    - "Remove dead Inngest code (src/inngest/, INNGEST_DEV env var, inngest npm dependency)"
    - "Verify pipeline works end-to-end by completing a new session"
  debug_session: ".planning/debug/ai-pipeline-stuck.md"

- truth: "Wizard context panel shows Nudges section for managers with coaching nudges"
  status: failed
  reason: "User reported: i see no nudges section for any session, even though on the dashboard, they show up"
  severity: major
  test: 6
  root_cause: "NudgeList component hardcodes upcoming=true in fetch URL (line 41). API's upcoming handler applies targetSessionAt >= NOW() AND <= NOW()+7d, excluding NULL and past-dated nudges. Dashboard query has no date filter — that's why nudges show there but not in wizard."
  artifacts:
    - path: "src/components/session/nudge-list.tsx"
      issue: "Line 41 hardcodes upcoming=true in fetch URL"
    - path: "src/app/api/nudges/route.ts"
      issue: "Lines 44-55: upcoming=true handler over-restricts — excludes NULL targetSessionAt and past dates"
  missing:
    - "Remove upcoming=true from NudgeList fetch or change API to include NULLs and current-session nudges"
    - "Ensure wizard shows all non-dismissed nudges for the series"
  debug_session: ".planning/debug/wizard-nudges-missing.md"
