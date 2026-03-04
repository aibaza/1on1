---
phase: 07-ai-pipeline
plan: 02
subsystem: ai
tags: [inngest, ai-pipeline, polling, tanstack-query, structured-output, action-items]

# Dependency graph
requires:
  - phase: 07-ai-pipeline
    plan: 01
    provides: AI SDK, Inngest client, AI service layer, context builder, schemas, DB columns
  - phase: 05-meeting-series-session-wizard
    provides: Session completion endpoint, session table, session answers
  - phase: 06-action-items-session-history
    provides: Action items table, session summary page with AI placeholder
provides:
  - Post-session AI pipeline (Inngest multi-step function with 9 isolated retry steps)
  - AI retry handler for failed pipelines
  - AI summary polling endpoint (GET /api/sessions/[id]/ai-summary)
  - AI suggestions polling + accept/skip endpoint (GET/POST /api/sessions/[id]/ai-suggestions)
  - AI retry endpoint (POST /api/sessions/[id]/ai-retry)
  - AI summary UI component with skeleton loading, sentiment badge, manager addendum
  - AI suggestions UI component with Accept/Edit+Accept/Skip controls
  - Session completion fires Inngest event for AI pipeline (fire-and-forget)
affects: [07-03-nudge-pipeline, 08-dashboard-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [Inngest multi-step pipeline with isolated retry per step, Inngest JSON date rehydration, TanStack Query polling with refetchInterval, fire-and-forget Inngest event dispatch]

key-files:
  created:
    - src/inngest/functions/post-session.ts
    - src/app/api/sessions/[id]/ai-retry/route.ts
    - src/app/api/sessions/[id]/ai-summary/route.ts
    - src/app/api/sessions/[id]/ai-suggestions/route.ts
    - src/components/session/ai-summary-section.tsx
    - src/components/session/ai-suggestions-section.tsx
  modified:
    - src/inngest/functions/index.ts
    - src/app/api/sessions/[id]/complete/route.ts
    - src/components/session/session-summary-view.tsx
    - src/app/(dashboard)/sessions/[id]/summary/page.tsx
    - CHANGELOG.md

key-decisions:
  - "Inngest step.run() serializes return values as JSON, requiring date rehydration helper for SessionContext"
  - "onFailure callback on Inngest functions sets aiStatus to 'failed' when all retries exhausted"
  - "AI retry handler fetches session record to reconstruct seriesId/reportId rather than requiring them in event data"
  - "Accepted AI suggestions create real action items via insert into action_items table"
  - "Skipped suggestions permanently removed from aiSuggestions JSONB array (no undo per locked decision)"

patterns-established:
  - "Inngest date rehydration: step.run() returns are JSON-serialized; use rehydrateContext() for Date objects"
  - "Fire-and-forget Inngest pattern: inngest.send().catch() after transaction success, never blocks response"
  - "AI polling pattern: TanStack Query refetchInterval returns 3000 while pending/generating, false when done"
  - "Manager-only data: addendum returned only when session user is series manager (server-side check)"

requirements-completed: [AI-01, AI-02, AI-05]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 7 Plan 02: Post-Session AI Pipeline Summary

**Multi-step Inngest pipeline generates session summaries, manager addendum, and action suggestions after completion, with async polling UI and accept/skip workflow for AI-suggested action items**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T17:13:56Z
- **Completed:** 2026-03-04T17:20:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Built 9-step Inngest post-session pipeline: set status, gather context, generate summary, generate addendum, store, generate suggestions, store, generate nudges, finalize -- each step independently retryable
- Created AI retry handler that reconstructs full context from session record and re-runs the complete pipeline
- Session completion endpoint fires fire-and-forget Inngest event (never blocks the user)
- Built polling-based AI summary UI with skeleton loading, structured summary display (key takeaways, discussion highlights, follow-up items, sentiment badge), and manager addendum section
- Built AI suggestions UI with Accept (creates action item), Edit+Accept (inline form), and Skip (permanent removal) controls

## Task Commits

Each task was committed atomically:

1. **Task 1: Inngest post-session pipeline, AI retry handler, and completion endpoint integration** - `ebbe7a9` (feat)
2. **Task 2: AI summary/suggestions API endpoints and summary page UI integration** - `c4a6a68` (feat)

## Files Created/Modified
- `src/inngest/functions/post-session.ts` - Post-session pipeline (9 steps) + AI retry handler with onFailure callbacks
- `src/inngest/functions/index.ts` - Updated to export postSessionPipeline and aiRetryHandler
- `src/app/api/sessions/[id]/complete/route.ts` - Added Inngest event dispatch and aiStatus: "pending"
- `src/app/api/sessions/[id]/ai-retry/route.ts` - POST endpoint for manager to retry failed AI pipeline
- `src/app/api/sessions/[id]/ai-summary/route.ts` - GET endpoint for AI summary polling with manager addendum
- `src/app/api/sessions/[id]/ai-suggestions/route.ts` - GET/POST for suggestions polling and accept/skip
- `src/components/session/ai-summary-section.tsx` - Client component with TanStack Query polling, skeleton, retry
- `src/components/session/ai-suggestions-section.tsx` - Client component with suggestion cards, inline edit, accept/skip
- `src/components/session/session-summary-view.tsx` - Replaced AI placeholder with real AI summary and suggestions sections
- `src/app/(dashboard)/sessions/[id]/summary/page.tsx` - Fetches AI columns and participant names for components

## Decisions Made
- Inngest `step.run()` serializes return values as JSON, converting Date objects to strings. Added `rehydrateContext()` helper to reconstruct proper Date objects from serialized SessionContext. This is an inherent Inngest SDK behavior.
- `onFailure` callback on both pipeline functions sets `aiStatus: "failed"` so the UI can display the retry button. This runs after all 3 retries are exhausted.
- AI retry handler fetches session to get `seriesId` and series to get `reportId`, rather than requiring these in the `session/ai.retry` event data. This keeps the retry event payload minimal.
- Accepted suggestions create action items with the manager as `createdById`, preserving audit trail.
- Skipped suggestions are permanently removed from the `aiSuggestions` JSONB array, per the locked decision that skipped suggestions don't resurface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inngest JSON serialization of Date objects**
- **Found during:** Task 1 (typecheck)
- **Issue:** Inngest `step.run()` serializes return values to JSON between steps, converting `Date` to `string`. TypeScript caught the incompatibility: `SessionContext.scheduledAt` is `Date` but Inngest returns `string`.
- **Fix:** Added `rehydrateContext()` helper that reconstructs Date objects from JSON-serialized SessionContext, applied after both pipeline's `gather-context` step.
- **Files modified:** `src/inngest/functions/post-session.ts`
- **Verification:** `bun run typecheck` passes
- **Committed in:** ebbe7a9 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard fix for Inngest's step serialization behavior. No scope creep.

## Issues Encountered
- Inngest JSON serialization of complex objects (Date, nested arrays) required a rehydration layer. This is a well-known Inngest pattern -- all step.run() return values pass through JSON.stringify/parse between steps for durability.

## User Setup Required

None - no additional external service configuration required beyond what was set up in Plan 01. The `ANTHROPIC_API_KEY` from Plan 01 is used by the AI service layer called from the pipeline.

## Next Phase Readiness
- Post-session AI pipeline fully functional: generates summaries, addendum, suggestions, and base nudges
- AI retry mechanism handles failed pipelines with manual re-trigger
- Session summary page displays AI content with async polling
- Ready for Plan 03: pre-session nudge pipeline, nudge refresh scheduling, and dashboard/wizard nudge display

---
*Phase: 07-ai-pipeline*
*Completed: 2026-03-04*
