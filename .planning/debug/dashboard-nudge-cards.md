---
status: diagnosed
trigger: "Dashboard shows AI nudge cards grouped by report after sessions are completed but user sees empty state"
created: 2026-03-04T20:30:00Z
updated: 2026-03-04T20:40:00Z
---

## Current Focus

hypothesis: CONFIRMED - NudgeCardsGrid was removed from dashboard in Phase 08-02. Nudges moved inline into UpcomingSessions cards, but no upcoming sessions exist so nudges are invisible.
test: Verified database state + codebase integration
expecting: N/A - root cause confirmed
next_action: Return diagnosis

## Symptoms

expected: Dashboard overview shows AI nudge cards grouped by report name with priority dots, coaching text, and dismiss buttons after sessions are completed
actual: Dashboard shows "No AI nudges yet -- they appear after your first completed session" despite completed sessions
errors: None visible (also: AI Suggestions on session page stuck at "Generating..." for 10+ minutes, /api/ingest returns 404)
reproduction: Complete sessions, navigate to dashboard overview
started: Discovered during UAT, likely since Phase 08-02 rebuild

## Eliminated

- hypothesis: "AI pipeline not generating nudges"
  evidence: "Database has 5 nudges in ai_nudge table, all non-dismissed, for series ffffffff-0001-4000-f000-000000000001. All 3 completed sessions have ai_status='completed'."
  timestamp: 2026-03-04T20:38:00Z

- hypothesis: "Nudge query is broken"
  evidence: "The /api/nudges GET endpoint and the dashboard query both correctly query ai_nudges. The issue is not the query but that the component rendering them was removed from the page."
  timestamp: 2026-03-04T20:35:00Z

## Evidence

- timestamp: 2026-03-04T20:31:00Z
  checked: "src/app/(dashboard)/overview/page.tsx"
  found: "Overview page imports and renders: UpcomingSessions, QuickStats, OverdueItems, RecentSessions. NO import of NudgeCardsGrid."
  implication: "NudgeCardsGrid component exists but is never rendered on the dashboard"

- timestamp: 2026-03-04T20:31:30Z
  checked: "Grep for NudgeCardsGrid imports across entire src/"
  found: "Only 1 file references it: nudge-cards-grid.tsx (its own definition). Zero imports anywhere."
  implication: "Component is orphan dead code"

- timestamp: 2026-03-04T20:34:00Z
  checked: "CHANGELOG.md and .planning/phases/08-manager-dashboard-analytics/08-02-SUMMARY.md"
  found: "CHANGELOG: 'Dashboard overview page rebuilt: replaced stub Account card and separate NudgeCardsGrid with full 4-section manager briefing layout'. 08-02-SUMMARY: 'Removed old Account card and separate NudgeCardsGrid -- nudges now integrated directly into session cards per locked decision'"
  implication: "NudgeCardsGrid was intentionally removed in Phase 08-02 as a design decision. Nudges were moved inline into UpcomingSessions cards."

- timestamp: 2026-03-04T20:35:00Z
  checked: "src/lib/queries/dashboard.ts - getUpcomingSessions()"
  found: "Nudges are batch-fetched only for sessions matching: status IN ('scheduled','in_progress') AND scheduledAt within next 7 days. Completed sessions excluded."
  implication: "Nudges only visible when attached to future/upcoming sessions"

- timestamp: 2026-03-04T20:36:00Z
  checked: "src/components/dashboard/upcoming-sessions.tsx"
  found: "UpcomingSessions renders nudges inline via InlineNudge component within each session card. First nudge shown, rest expandable. This is NOT the grouped-by-report layout described in the truth statement."
  implication: "Current implementation shows nudges per-session, not grouped by report"

- timestamp: 2026-03-04T20:38:00Z
  checked: "Database: oneonone_dev - session and ai_nudge tables"
  found: "3 completed sessions all with ai_status='completed'. 5 nudges in ai_nudge table, all non-dismissed. 0 scheduled/in_progress sessions exist."
  implication: "Data is present and correct. AI pipeline works. But with 0 upcoming sessions, nudges are invisible because they only render inline with upcoming session cards."

- timestamp: 2026-03-04T20:39:00Z
  checked: "Cross-referencing user report text with codebase"
  found: "User says they see 'No AI nudges yet -- they appear after your first completed session'. This exact text only exists in NudgeCardsGrid component. Since NudgeCardsGrid is not rendered on the current page, user may have been on a cached/stale version, or this text was visible before Phase 08-02 changes were deployed."
  implication: "The user's report likely reflects the pre-08-02 state or a cached page"

## Resolution

root_cause: |
  The standalone NudgeCardsGrid component was intentionally removed from the dashboard overview page
  during Phase 08-02 (commit in the 08-02 sprint). The design decision was to integrate nudges inline
  within upcoming session cards instead of showing them as a separate grouped section.

  However, this design creates a visibility gap: nudges are ONLY visible when there are upcoming
  sessions (scheduled/in_progress within the next 7 days). When all sessions are completed and no
  future sessions exist, the nudges are invisible -- they exist in the database but have no UI
  surface to appear on.

  The specific chain of failure:
  1. User completes sessions -> AI pipeline runs successfully -> nudges are generated and stored
  2. Dashboard overview page has no standalone nudge section (removed in Phase 08-02)
  3. Nudges only show inline within UpcomingSessions cards
  4. getUpcomingSessions() only fetches sessions with status IN ('scheduled','in_progress') in next 7 days
  5. No upcoming sessions exist (all are completed) -> UpcomingSessions shows empty state
  6. Nudges exist in DB but have no rendering path

  Files involved:
  - src/app/(dashboard)/overview/page.tsx: Does not import or render NudgeCardsGrid
  - src/components/dashboard/nudge-cards-grid.tsx: Orphan component (dead code, never imported)
  - src/lib/queries/dashboard.ts: getUpcomingSessions() only fetches nudges for upcoming sessions
  - src/components/dashboard/upcoming-sessions.tsx: Renders nudges inline per session card

fix:
verification:
files_changed: []
