# Phase 7: AI Pipeline

**Status**: Complete
**Depends on**: Phase 5

## Goal

AI generates session summaries and pre-meeting nudges, proving the "AI-first" positioning with reliable background pipelines.

## Success Criteria

1. After session completion, AI generates a narrative summary from answers and notes, stored and viewable in history
2. Before a session, AI generates 2-3 specific follow-up suggestions based on previous session data
3. Pre-session nudges appear on the dashboard and in the pre-session state
4. After completion, AI suggests 1-3 action items based on session content
5. All AI pipelines run as durable Inngest background functions with retry, using Vercel AI SDK with provider-agnostic routing

## Planned Scope

- **Plan 07-01**: AI service layer, tenant guard, and Vercel AI SDK configuration
- **Plan 07-02**: Post-session pipeline (summary generation, action item suggestions)
- **Plan 07-03**: Pre-session nudge pipeline and dashboard/session integration

## Context Decisions (from discuss-phase)

- **Summary format**: Structured sections (Key Takeaways, Discussion Highlights, Follow-Up)
- **Audience**: Shared summary for both parties + manager-only addendum (fed by manager's private notes)
- **Trends**: Cross-session trend comparisons included in summaries
- **Nudges**: Dashboard cards + context panel sidebar, gentle coaching tone, dismissible
- **Nudge timing**: Post-session base generation + pre-session refresh 24h before
- **Action items**: Suggestion cards on summary screen (Accept/Edit/Skip), AI suggests assignee
- **Provider**: Anthropic Claude via `@ai-sdk/anthropic`
- **Embeddings**: Deferred to v2 — full-text search (Phase 6) sufficient for v1
- **Resilience**: Graceful degradation — session completion never blocked by AI

## Requirements

AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08

> **Note**: This phase can execute in parallel with Phases 6 and 9 (all depend only on Phase 5). AI is a core v1 feature, not a v3 add-on. pgvector embeddings deferred to v2.

## What Was Built

### Plan 07-01: AI Foundation
- AI SDK v6 with Anthropic provider, Inngest client with typed event schemas
- AI service layer: 4 generation functions (summary, addendum, nudges, suggestions)
- Context builder with token-budget truncation, prompt templates
- DB schema: AI columns on session table, ai_nudge table with RLS

### Plan 07-02: Post-Session Pipeline
- 9-step Inngest pipeline: summary, addendum, suggestions, base nudges
- AI retry handler for failed pipelines
- Polling-based AI summary and suggestions UI on session summary page
- Accept/Edit/Skip workflow for AI-suggested action items

### Plan 07-03: Pre-Session Nudge Pipeline
- Cron-based nudge refresh (6h interval, 24h lookahead)
- Individual nudge refresh handler with context gathering and AI generation
- Dashboard nudge cards grouped by report (manager-only)
- Wizard context panel nudge section as first collapsible item
- Dismiss endpoint with permanent dismissal (nudges never reappear)

## Key Decisions
- Model tiers: Sonnet for summaries/addendum/suggestions, Haiku for nudges
- Two-phase nudge generation: base after completion + cron refresh 24h before
- Inngest step.run() requires date rehydration (JSON serialization)
- Dashboard nudges via Server Component DB query, context panel via TanStack Query
