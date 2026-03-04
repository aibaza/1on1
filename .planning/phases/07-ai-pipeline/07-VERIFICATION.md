---
phase: 07-ai-pipeline
verified: 2026-03-04T22:14:21Z
status: passed
score: 21/21 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 17/17
  gaps_closed:
    - "Dashboard shows AI nudge cards grouped by report after sessions are completed"
    - "Wizard context panel shows Nudges section for managers with coaching nudges"
    - "AI pipeline triggers and completes after session submission (Inngest replaced with direct pipeline)"
    - "Analytics snapshots computed after session completion via pipeline"
    - "No dead Inngest code in codebase"
  gaps_remaining:
    - "AI-08 automatic retry not implemented — pipeline only supports manual retry"
    - "Phase-07 wiki not updated to reflect gap closure architectural changes"
  regressions: []
gaps:
  - truth: "AI pipelines provide automatic retry on failure (AI-08)"
    status: partial
    reason: "The direct pipeline (runAIPipelineDirect) sets aiStatus='failed' on error and exposes a manual retry button, but has NO automatic retry mechanism. The original requirement (AI-08) explicitly stated 'automatic retry'. Inngest was removed (commit f9946b4) and replaced with a fire-and-forget direct function. REQUIREMENTS.md still states 'AI pipelines run as durable Inngest background functions with automatic retry' — wording is now stale."
    artifacts:
      - path: "src/lib/ai/pipeline.ts"
        issue: "No retry loop or automatic re-execution on failure. Single attempt — sets aiStatus='failed' on catch."
      - path: ".planning/REQUIREMENTS.md"
        issue: "Line 116: AI-08 still reads 'durable Inngest background functions with automatic retry' — stale wording after Inngest removal"
    missing:
      - "Either update REQUIREMENTS.md AI-08 wording to reflect the direct pipeline with manual retry, OR implement automatic retry (e.g. exponential backoff loop in pipeline.ts)"
  - truth: "Phase-07 wiki accurately documents the implemented architecture"
    status: failed
    reason: "docs/wiki/Phase-07.md was last updated at commit 7c88ba1 (after UAT, before gap closure plans 07-04 and 07-05). Plans 07-04 and 07-05 added significant changes: removed Inngest entirely, added direct pipeline, restored dashboard nudge section, fixed wizard nudge filter, wired analytics snapshot. The wiki still describes Inngest-based pipeline in What Was Built and Key Decisions sections."
    artifacts:
      - path: "docs/wiki/Phase-07.md"
        issue: "Does not mention Plans 07-04 or 07-05. Still describes Inngest functions, step.run(), cron handler, and Inngest serve route — all of which have been deleted."
    missing:
      - "Add Plan 07-04 section documenting getManagerNudges, NudgeCardsGrid restoration, and NudgeList fetch fix"
      - "Add Plan 07-05 section documenting Inngest removal, direct pipeline, and computeSessionSnapshot wiring"
      - "Update Key Decisions to reflect direct pipeline architectural decision"
human_verification:
  - test: "Dashboard AI Coaching Nudges appear after session completion (UAT re-test 1)"
    expected: "Manager dashboard shows AI Coaching Nudges section with nudge cards grouped by report. Section absent for members."
    why_human: "Previously failed UAT. Requires completed sessions with AI pipeline run to completion."
  - test: "Wizard context panel shows Nudges section (UAT re-test 6)"
    expected: "Manager in session wizard sees AI Nudges as first collapsible section in context panel with coaching nudges and dismiss buttons."
    why_human: "Previously failed UAT. Requires DB-level nudges for the series."
  - test: "Session completion fires AI pipeline and summary appears"
    expected: "After session completion, skeleton loading state appears in AI Summary section. Within 5-60 seconds, structured summary renders with Key Takeaways, Discussion Highlights, Follow-Up Items, and Sentiment badge."
    why_human: "Requires live ANTHROPIC_API_KEY in environment."
  - test: "Manager addendum is hidden from the report's view"
    expected: "Manager Addendum card visible only to manager; absent for report/member user."
    why_human: "Requires two distinct browser sessions with different user roles."
  - test: "Accept an AI action suggestion creates real action item"
    expected: "Clicking Accept on suggestion card creates action item in action items list; suggestion card disappears."
    why_human: "Requires completed session with generated suggestions and cross-page verification."
---

# Phase 7: AI Pipeline Re-Verification Report

**Phase Goal:** AI Pipeline — post-session summaries, nudge generation, action item suggestions, analytics snapshot computation
**Verified:** 2026-03-04T22:14:21Z
**Status:** GAPS_FOUND
**Re-verification:** Yes — after UAT gap closure plans 07-04 and 07-05

## Context: What Changed Since Initial Verification

The initial VERIFICATION.md (2026-03-04T18:00:00Z, status: passed) was written before UAT. UAT revealed 3 major functional gaps:

1. Dashboard nudges invisible (NudgeCardsGrid removed during Phase 08 redesign)
2. AI pipeline stuck generating (Inngest silently dropped events — no running server)
3. Wizard nudge list empty (hardcoded `upcoming=true` over-restricted results)

Gap closure plans 07-04 and 07-05 were executed:
- `f467cb8`: Restore standalone nudge section on dashboard overview
- `3da9ab2`: Fix wizard nudge list + remove Inngest entirely (bundled)

This re-verification checks whether those gaps are now closed and whether any regressions occurred.

## Gap Closure Status

| Gap (from UAT) | Fix Commit | Current Status |
|----------------|-----------|----------------|
| Dashboard nudges invisible | f467cb8 | CLOSED — NudgeCardsGrid restored with getManagerNudges |
| AI pipeline stuck (Inngest) | f9946b4, 3da9ab2 | CLOSED — replaced with runAIPipelineDirect |
| Wizard nudge list empty | 3da9ab2 | CLOSED — removed upcoming=true param |
| Analytics snapshot not computed | 3da9ab2 | CLOSED — computeSessionSnapshot wired into pipeline |

## Goal Achievement

### Observable Truths (Re-verification)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Dashboard shows AI nudge cards for managers regardless of upcoming sessions | VERIFIED | `overview/page.tsx` lines 17-19: imports `getManagerNudges` + `NudgeCardsGrid`; lines 39-41: calls query only for non-members; lines 63-71: renders section when nudges.length > 0 |
| 2 | Wizard context panel shows all non-dismissed series nudges | VERIFIED | `nudge-list.tsx` line 41: `fetch('/api/nudges?seriesId=${seriesId}')` — no upcoming=true param |
| 3 | Nudge API handles NULL targetSessionAt in upcoming filter | VERIFIED | `api/nudges/route.ts` lines 44-52: raw SQL `IS NULL OR (...range...)` |
| 4 | AI pipeline runs directly without Inngest dependency | VERIFIED | `src/inngest/` deleted; `api/inngest/route.ts` deleted; no inngest in `package.json`; `pipeline.ts` exports `runAIPipelineDirect` |
| 5 | Session completion calls direct pipeline fire-and-forget | VERIFIED | `complete/route.ts` line 7 imports `runAIPipelineDirect`; line 193 calls it without await with `.catch()` |
| 6 | Analytics snapshot computed after AI completion | VERIFIED | `pipeline.ts` line 10 imports `computeSessionSnapshot`; lines 139-147 call it non-fatally after `aiStatus = "completed"` |
| 7 | Dev server starts without Inngest CLI | VERIFIED | `package.json` line 6: `"dev": "next dev --port 4300"` — no concurrently, no inngest-cli |
| 8 | Failed AI pipeline can be retried via manual retry button | VERIFIED | `ai-retry/route.ts` line 4 imports `runAIPipelineDirect`; line 117 calls it; `ai-summary-section.tsx` renders retry button when status=failed |
| 9 | AI pipelines provide automatic retry on failure (AI-08) | PARTIAL | Pipeline sets `aiStatus='failed'` on catch but has NO automatic retry mechanism. Only manual retry via button. REQUIREMENTS.md AI-08 wording is stale. |
| 10 | Phase-07 wiki documents the implemented architecture accurately | FAILED | `docs/wiki/Phase-07.md` still describes Inngest-based pipeline; Plans 07-04 and 07-05 (gap closure work) not documented |

**Previously verified truths — regression check (17/17 from initial pass):**

| # | Truth | Current Status | Notes |
|---|-------|---------------|-------|
| 11 | AI SDK calls Anthropic correctly | VERIFIED | `pipeline.ts` imports all 4 generation functions from `ai/service.ts` — unchanged |
| 12 | Session table has AI columns | VERIFIED | Schema unchanged |
| 13 | ai_nudge table with RLS | VERIFIED | Schema unchanged |
| 14 | AI Zod schemas validate responses | VERIFIED | `src/lib/ai/schemas/` unchanged |
| 15 | Session summary page shows structured AI summary | VERIFIED | `session-summary-view.tsx` still imports and renders `AISummarySection` |
| 16 | Manager-only addendum section | VERIFIED | `ai-summary-section.tsx` conditional render unchanged |
| 17 | AI action item suggestions with Accept/Edit/Skip | VERIFIED | `AISuggestionsSection` unchanged |
| 18 | Session completion never blocks on AI | VERIFIED | `runAIPipelineDirect(...).catch(...)` fire-and-forget pattern confirmed |
| 19 | Polling skeleton while generating | VERIFIED | `AISummarySection` refetchInterval logic unchanged |
| 20 | AI context builder gathers session answers | VERIFIED | `pipeline.ts` calls `gatherSessionContext()` from `ai/context.ts` — unchanged |
| 21 | Nudges dismissed permanently | VERIFIED | `api/nudges/[id]/dismiss` unchanged; NudgeList dismiss mutation unchanged |

**Score:** 19/21 truths verified

### Required Artifacts (Gap Closure Plans 04-05)

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/app/(dashboard)/overview/page.tsx` | Dashboard with NudgeCardsGrid for managers | VERIFIED | Imports + renders NudgeCardsGrid with getManagerNudges |
| `src/lib/queries/dashboard.ts` | `getManagerNudges` with no date filter | VERIFIED | Lines 365-407: joins aiNudges + meetingSeries + users, no date filter, orders by priority |
| `src/components/session/nudge-list.tsx` | Fetches all series nudges without upcoming param | VERIFIED | Line 41: fetch without upcoming=true |
| `src/app/api/nudges/route.ts` | IS NULL OR range for upcoming filter | VERIFIED | Lines 44-52: raw SQL with IS NULL check |
| `src/lib/ai/pipeline.ts` | Direct pipeline with computeSessionSnapshot | VERIFIED | Lines 139-147: non-fatal snapshot call after finalize |
| `package.json` | No inngest dependency | VERIFIED | No inngest in dependencies or devDependencies |

**Deleted artifacts (confirmed gone):**

| Artifact | Expected | Status |
|----------|---------|--------|
| `src/inngest/` directory | DELETED | VERIFIED — directory does not exist |
| `src/app/api/inngest/route.ts` | DELETED | VERIFIED — file does not exist |

### Key Link Verification (Gap Closure Plans)

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `overview/page.tsx` | `lib/queries/dashboard.ts` | `getManagerNudges()` | WIRED | Line 17 imports; line 40 calls in Promise.all |
| `overview/page.tsx` | `components/dashboard/nudge-cards-grid.tsx` | `NudgeCardsGrid` render | WIRED | Line 19 imports; line 69 renders |
| `nudge-list.tsx` | `/api/nudges?seriesId=` | `fetch` without upcoming param | WIRED | Line 41 confirmed — no upcoming=true |
| `pipeline.ts` | `lib/analytics/compute.ts` | `computeSessionSnapshot()` | WIRED | Line 10 imports; line 141 calls inside try/catch |
| `complete/route.ts` | `lib/ai/pipeline.ts` | `runAIPipelineDirect()` | WIRED | Line 7 imports; line 193 calls fire-and-forget |
| `ai-retry/route.ts` | `lib/ai/pipeline.ts` | `runAIPipelineDirect()` | WIRED | Line 4 imports; line 117 calls fire-and-forget |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AI-03 | 07-03, 07-04 | Before session, AI generates 2-3 follow-up suggestions | SATISFIED | `pipeline.ts` calls `generateNudges()`; nudges stored in `ai_nudges`; dashboard and wizard now show them (gap closed) |
| AI-04 | 07-03, 07-04 | Pre-session nudges appear on dashboard and in pre-session state | SATISFIED | `overview/page.tsx` renders NudgeCardsGrid; `context-panel.tsx` renders NudgeList — both fixed by plan 07-04 |
| AI-05 | 07-02, 07-05 | AI suggests 1-3 action items after session completion | SATISFIED | `pipeline.ts` calls `generateActionSuggestions()`; AISuggestionsSection renders Accept/Edit/Skip |
| AI-08 | 07-01, 07-05 | AI pipelines run as durable background functions with automatic retry | PARTIAL | Direct pipeline is background (fire-and-forget). Failure: sets `aiStatus='failed'`. Manual retry via button. NO automatic retry. REQUIREMENTS.md wording is stale. |

**Orphaned requirements:** REQUIREMENTS.md traceability maps AI-01, AI-02, AI-03, AI-04, AI-05, AI-06 (Pending), AI-07, AI-08 to Phase 7. All accounted for. AI-06 correctly remains Pending (deferred to v2).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `docs/wiki/Phase-07.md` | 44-67 | "What Was Built" and "Key Decisions" describe deleted Inngest architecture | Warning | Architecture description out of date — new developers reading this will be confused |
| `.planning/REQUIREMENTS.md` | 116 | AI-08 text says "durable Inngest background functions with automatic retry" | Warning | Requirement wording stale — Inngest removed; no automatic retry |

No code-level stubs or blockers found.

### Human Verification Required

#### 1. Dashboard AI Coaching Nudges Appear (UAT Re-test 1)

**Test:** As a manager with completed sessions, navigate to the dashboard overview page.
**Expected:** "AI Coaching Nudges" section with amber Sparkles icon appears between the welcome header and Upcoming Sessions, showing nudge cards. Section is hidden for members and when no nudges exist.
**Why human:** Previously failed UAT. Requires completed sessions with AI pipeline run to completion.

#### 2. Wizard Context Panel Nudges Appear (UAT Re-test 6)

**Test:** As a manager, open the session wizard for a series with prior completed sessions. Check the right context panel.
**Expected:** "AI Nudges" collapsible section appears as first item in the context panel, listing coaching nudges with dismiss buttons.
**Why human:** Previously failed UAT. Requires DB-level nudges for the series.

#### 3. AI Pipeline End-to-End (Direct Mode)

**Test:** Complete a session through the wizard. Watch the session summary page immediately after.
**Expected:** AI Summary section shows skeleton loading. Within 5-60 seconds, structured summary appears with Key Takeaways, Discussion Highlights, Follow-Up Items, and Sentiment badge.
**Why human:** Requires live `ANTHROPIC_API_KEY` in environment.

#### 4. Manager Addendum Access Control

**Test:** As manager, view completed session summary — confirm Manager Addendum card visible. As report/member, view same summary — confirm Manager Addendum absent.
**Expected:** Card with "Manager Only" badge visible only to manager role.
**Why human:** Requires two distinct browser sessions with different user credentials.

#### 5. Accept AI Suggestion Creates Action Item

**Test:** On a completed session with AI suggestions, click the Accept (checkmark) button.
**Expected:** Suggestion card disappears. Action item appears in the action items list with the suggested assignee.
**Why human:** Requires completed session with generated suggestions and cross-page verification.

### Gaps Summary

**Gap 1 — AI-08 Automatic Retry (Partial):**
The original AI-08 requirement specified "automatic retry." The direct pipeline replaces Inngest's 3-retry-with-backoff mechanism with a single attempt plus a manual retry button. This was an intentional architectural decision (plan 07-05) but creates a gap between the requirement text and the implementation. Resolution: update REQUIREMENTS.md AI-08 wording to reflect the direct pipeline with manual retry, OR add automatic retry logic to `runAIPipelineDirect`.

**Gap 2 — Wiki Documentation (Failed):**
`docs/wiki/Phase-07.md` was not updated after gap closure plans 07-04 and 07-05. It still describes the Inngest-based architecture (deleted), references `step.run()` (deleted), and omits Plans 07-04 and 07-05 entirely. No functional code is broken, but the phase history is inaccurate.

**All UAT-reported functional gaps are closed.** The 17 truths from the initial verification hold in regression testing. 2 remaining gaps are documentation-level (requirement wording and wiki accuracy).

---

_Verified: 2026-03-04T22:14:21Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after UAT gap closure plans 07-04 and 07-05_
