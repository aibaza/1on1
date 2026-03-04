---
phase: 07-ai-pipeline
plan: 03
subsystem: ai
tags: [inngest, cron, nudges, tanstack-query, dashboard, context-panel, coaching]

# Dependency graph
requires:
  - phase: 07-ai-pipeline
    plan: 01
    provides: AI SDK, Inngest client, AI service layer (generateNudges), context builder, ai_nudge table schema
  - phase: 07-ai-pipeline
    plan: 02
    provides: Post-session pipeline (base nudge generation step), Inngest functions index, context panel
  - phase: 05-meeting-series-session-wizard
    provides: Session wizard shell, context panel, meeting series, session table
provides:
  - Pre-session nudge cron pipeline (6h interval, 24h lookahead)
  - Individual nudge refresh handler (context gather + AI generate + store)
  - Nudge API endpoints (GET /api/nudges, POST /api/nudges/[id]/dismiss)
  - Dashboard nudge cards for managers with upcoming sessions
  - Wizard context panel nudge section (first section, manager-only)
  - NudgeCard and NudgeList client components with optimistic dismiss
affects: [08-dashboard-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [Inngest cron with fan-out events, adminDb cross-tenant queries, optimistic dismiss mutations, Server Component DB queries for dashboard data]

key-files:
  created:
    - src/inngest/functions/pre-session-nudges.ts
    - src/app/api/nudges/route.ts
    - src/app/api/nudges/[id]/dismiss/route.ts
    - src/components/dashboard/nudge-card.tsx
    - src/components/dashboard/nudge-cards-grid.tsx
    - src/components/session/nudge-list.tsx
  modified:
    - src/inngest/functions/index.ts
    - src/app/(dashboard)/overview/page.tsx
    - src/components/session/context-panel.tsx
    - src/components/session/wizard-shell.tsx
    - CHANGELOG.md

key-decisions:
  - "Cron uses adminDb for cross-tenant series scanning, fan-out via individual Inngest events per series"
  - "Nudge refresh deletes non-dismissed nudges and inserts fresh ones (preserves dismissed)"
  - "Dashboard fetches nudges via Server Component direct DB query (not API), following project data flow convention"
  - "NudgeList in context panel uses TanStack Query fetch (client component in existing client component tree)"
  - "Nudge section only rendered for managers (nudges are manager-only per locked decision)"

patterns-established:
  - "Inngest cron fan-out: cron scans cross-tenant via adminDb, dispatches per-item events for parallel processing"
  - "Optimistic dismiss: client removes item immediately, settles with query invalidation"
  - "Dashboard nudge grouping: NudgeCardsGrid groups by seriesId+reportName for clean visual hierarchy"

requirements-completed: [AI-03, AI-04]

# Metrics
duration: 6min
completed: 2026-03-04
---

# Phase 7 Plan 03: Pre-Session Nudge Pipeline Summary

**Cron-based nudge refresh pipeline with 24h lookahead, nudge API endpoints with dismiss support, dashboard nudge cards grouped by report, and wizard context panel nudge integration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-04T17:24:21Z
- **Completed:** 2026-03-04T17:30:28Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Built pre-session nudge cron pipeline: runs every 6 hours, scans all tenants for series with sessions in next 24h, fan-out per-series refresh events for parallel processing
- Created nudge refresh handler: gathers context from last completed session, generates fresh nudges via AI, replaces non-dismissed nudges while preserving dismissed ones
- Built two REST endpoints: GET /api/nudges with filtering (seriesId, upcoming) and priority sorting; POST /api/nudges/[id]/dismiss with manager-only auth
- Rebuilt dashboard overview from stub into full nudge-enabled dashboard with grouped nudge cards per report (managers only) and empty state for members/no-nudges
- Integrated nudge section as first element in wizard context panel via NudgeList component with TanStack Query polling and optimistic dismiss

## Task Commits

Each task was committed atomically:

1. **Task 1: Pre-session nudge cron pipeline and nudge API endpoints** - `9a05219` (feat)
2. **Task 2: Dashboard nudge cards and wizard context panel nudge integration** - `99bb33b` (feat)

## Files Created/Modified
- `src/inngest/functions/pre-session-nudges.ts` - Cron pipeline (6h) + individual refresh handler with context gather and AI generation
- `src/inngest/functions/index.ts` - Added preSessionNudgeRefresh and nudgeRefreshHandler to function exports
- `src/app/api/nudges/route.ts` - GET endpoint for nudges with series filter, upcoming filter, priority sorting, report name joins
- `src/app/api/nudges/[id]/dismiss/route.ts` - POST endpoint for permanent nudge dismissal (manager-only authorization)
- `src/components/dashboard/nudge-card.tsx` - Client component: nudge card with priority dot, relative time, dismiss button, coaching tone display
- `src/components/dashboard/nudge-cards-grid.tsx` - Client component: groups nudges by report, handles optimistic dismiss state
- `src/app/(dashboard)/overview/page.tsx` - Rebuilt from basic stub to full dashboard with nudge section (managers) and account card
- `src/components/session/nudge-list.tsx` - Client component: fetches series-specific nudges via TanStack Query, renders as collapsible section
- `src/components/session/context-panel.tsx` - Added NudgeList as first section (manager-only, before historical data)
- `src/components/session/wizard-shell.tsx` - Passes seriesId, sessionId, isManager to ContextPanel for nudge rendering

## Decisions Made
- Cron function uses `adminDb` (bypasses RLS) for cross-tenant series scanning since it must check all tenants' upcoming sessions. Individual refresh events run with `withTenantContext` for proper tenant isolation.
- Nudge refresh strategy: delete all non-dismissed nudges for the series and insert fresh ones. This ensures content stays current while preserving any nudges the manager has already interacted with.
- Dashboard page fetches nudges via direct DB query in a Server Component (not via API), following the project's data flow convention: reads via Server Components, writes via API routes.
- NudgeList in context panel uses TanStack Query because it lives inside the existing client component tree (wizard-shell) and needs dismiss mutation support.
- Nudge section only rendered when `isManager` is true -- nudges are manager-only coaching content per the locked decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inngest JSON date serialization in nudge refresh handler**
- **Found during:** Task 1 (typecheck)
- **Issue:** Same Inngest step.run() JSON serialization issue as Plan 02 -- SessionContext Date objects become strings between steps
- **Fix:** Added `rehydrateContext()` helper (same pattern as post-session.ts) to reconstruct Date objects after gather-context step
- **Files modified:** `src/inngest/functions/pre-session-nudges.ts`
- **Verification:** `bun run typecheck` passes
- **Committed in:** 9a05219 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard Inngest JSON serialization handling. Same pattern as Plan 02. No scope creep.

## Issues Encountered
- Inngest JSON date serialization required rehydrateContext helper (known pattern from Plan 02, not surprising)

## User Setup Required

None - no additional external service configuration required. The Inngest cron function will start running automatically when the Inngest dev server or cloud is connected.

## Next Phase Readiness
- Phase 7 (AI Pipeline) is now fully complete: foundation (01), post-session pipeline (02), and pre-session nudges (03)
- Two-phase nudge generation complete: base nudges from post-session pipeline + cron refresh 24h before next session
- All AI features integrated into dashboard and wizard UI
- Ready for Phase 8 (Dashboard Analytics) which can leverage AI data for metrics

## Self-Check: PASSED

All 11 files verified present. Both task commits (9a05219, 99bb33b) confirmed in git history. Build passes.

---
*Phase: 07-ai-pipeline*
*Completed: 2026-03-04*
