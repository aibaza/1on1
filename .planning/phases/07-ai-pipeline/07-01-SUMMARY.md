---
phase: 07-ai-pipeline
plan: 01
subsystem: ai
tags: [ai-sdk, anthropic, inngest, zod, structured-output, background-jobs]

# Dependency graph
requires:
  - phase: 05-meeting-series-session-wizard
    provides: Session table, session answers, private notes, talking points, action items, meeting series
  - phase: 06-action-items-session-history
    provides: Full-text search indexes, session history, action item tracking
provides:
  - AI SDK v6 with Anthropic provider configured
  - Inngest client with typed event schemas and serve route
  - AI service layer with 4 generation functions (summary, addendum, nudges, suggestions)
  - Zod schemas for all AI structured outputs
  - Context builder for assembling session data into AI prompts
  - DB schema with AI columns on session table and ai_nudge table
affects: [07-02-post-session-pipeline, 07-03-nudge-pipeline, 08-dashboard-analytics]

# Tech tracking
tech-stack:
  added: [ai@6.0.111, "@ai-sdk/anthropic@3.0.54", inngest@3.52.6]
  patterns: [AI SDK v6 generateText + Output.object, Inngest typed events, token-budget truncation]

key-files:
  created:
    - src/inngest/client.ts
    - src/inngest/functions/index.ts
    - src/app/api/inngest/route.ts
    - src/lib/ai/models.ts
    - src/lib/ai/schemas/summary.ts
    - src/lib/ai/schemas/addendum.ts
    - src/lib/ai/schemas/nudges.ts
    - src/lib/ai/schemas/action-items.ts
    - src/lib/ai/context.ts
    - src/lib/ai/prompts/summary.ts
    - src/lib/ai/prompts/nudges.ts
    - src/lib/ai/prompts/action-items.ts
    - src/lib/ai/service.ts
    - src/lib/db/schema/nudges.ts
    - src/lib/db/migrations/0010_ai_pipeline_schema.sql
  modified:
    - src/lib/db/schema/enums.ts
    - src/lib/db/schema/sessions.ts
    - src/lib/db/schema/index.ts
    - package.json
    - .env.example

key-decisions:
  - "Zod schemas created early in Task 1 to satisfy session type imports (import type from schemas)"
  - "Migration written manually (drizzle-kit generate is interactive) -- consistent with prior phase pattern"
  - "Model tiers: Sonnet for summaries/addendum/suggestions (quality), Haiku for nudges (cost-effective)"
  - "Context builder uses withTenantContext with managerId as userId for RLS-compliant private note access"
  - "Token budget: text answers truncated at 500 chars, notes at 1000 chars, history limited to 3 sessions"

patterns-established:
  - "AI SDK v6 pattern: generateText + Output.object({ schema }) for type-safe structured output"
  - "Inngest typed events pattern: EventSchemas().fromRecord<Events>() for compile-time event type safety"
  - "AI prompt builder pattern: separate system prompt (static) + user prompt (dynamic context assembly)"
  - "AI context assembly: gatherSessionContext() fetches all data in single withTenantContext transaction"

requirements-completed: [AI-07, AI-08]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 7 Plan 01: AI Foundation Summary

**AI SDK v6 + Inngest installed with typed schemas, context builder, prompt templates, and 4 generation functions for session summaries, manager addendum, nudges, and action suggestions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T17:01:47Z
- **Completed:** 2026-03-04T17:10:00Z
- **Tasks:** 2
- **Files modified:** 22

## Accomplishments
- Installed AI SDK v6 (6.0.111), @ai-sdk/anthropic (3.0.54), and Inngest (3.52.6) as core AI pipeline dependencies
- Created typed Inngest client with 3 event schemas (session/completed, session/nudges.refresh, session/ai.retry) and serve route at /api/inngest
- Added 5 AI columns to session table (aiSummary, aiManagerAddendum, aiSuggestions, aiStatus, aiCompletedAt) and created ai_nudge table with RLS tenant isolation
- Built complete AI service layer: model config, 4 Zod schemas, context builder with token-budget truncation, 3 prompt builders, and 4 generation functions using AI SDK v6 generateText + Output.object pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, add DB schema columns, create Inngest client and serve route** - `204d402` (feat)
2. **Task 2: Create AI service layer with Zod schemas, model config, context builder, and prompt templates** - `90b3a53` (feat)

## Files Created/Modified
- `src/inngest/client.ts` - Typed Inngest client with 3 event schemas
- `src/inngest/functions/index.ts` - Placeholder functions array for serve route
- `src/app/api/inngest/route.ts` - Inngest serve route (GET, POST, PUT)
- `src/lib/ai/models.ts` - Model tier configuration (Sonnet/Haiku per task)
- `src/lib/ai/schemas/summary.ts` - Zod schema for AI summary structured output
- `src/lib/ai/schemas/addendum.ts` - Zod schema for manager addendum structured output
- `src/lib/ai/schemas/nudges.ts` - Zod schema for pre-session nudges structured output
- `src/lib/ai/schemas/action-items.ts` - Zod schema for action item suggestions structured output
- `src/lib/ai/context.ts` - Session context assembly with token-budget truncation
- `src/lib/ai/prompts/summary.ts` - System + user prompt builders for summary generation
- `src/lib/ai/prompts/nudges.ts` - System + user prompt builders for nudge generation
- `src/lib/ai/prompts/action-items.ts` - System + user prompt builders for action item suggestions
- `src/lib/ai/service.ts` - Top-level AI service with generateSummary, generateManagerAddendum, generateNudges, generateActionSuggestions
- `src/lib/db/schema/nudges.ts` - ai_nudge table definition with RLS indexes
- `src/lib/db/schema/enums.ts` - Added ai_status enum (pending, generating, completed, failed)
- `src/lib/db/schema/sessions.ts` - Added 5 AI columns to sessions table
- `src/lib/db/schema/index.ts` - Added nudges re-export
- `src/lib/db/migrations/0010_ai_pipeline_schema.sql` - Migration for AI columns and ai_nudge table
- `package.json` - Added ai, @ai-sdk/anthropic, inngest dependencies
- `.env.example` - Added ANTHROPIC_API_KEY, INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY placeholders

## Decisions Made
- Zod schemas created in Task 1 (rather than Task 2) because sessions.ts uses `import type` from them for JSONB column typing
- Migration SQL written manually instead of using `drizzle-kit generate` (interactive prompts not compatible with automation) -- consistent with approach used in prior phases
- Model tiers: Claude Sonnet for summaries, addendum, and action suggestions (need quality/nuance); Claude Haiku for nudges (shorter, simpler content)
- Context builder uses withTenantContext(tenantId, managerId) so the manager's private notes pass RLS author-only policy
- Token budget: individual text answers capped at 500 chars, notes at 1000 chars, history limited to last 3 completed sessions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `drizzle-kit generate` opens an interactive prompt asking about enum rename vs create -- not compatible with automation. Resolved by writing migration SQL manually (same pattern as phases 01-06).

## User Setup Required

None - no external service configuration required. ANTHROPIC_API_KEY will be needed when running AI pipelines in Plan 02, but the foundation layer builds without it.

## Next Phase Readiness
- Inngest client and serve route ready for function registration (Plan 02 and 03)
- AI service layer ready to be called from Inngest step functions
- DB schema supports AI output storage (session columns + nudges table)
- All 4 generation functions exported and ready for integration

---
*Phase: 07-ai-pipeline*
*Completed: 2026-03-04*
