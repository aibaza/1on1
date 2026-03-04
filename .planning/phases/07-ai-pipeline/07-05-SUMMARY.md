---
phase: 07-ai-pipeline
plan: 05
subsystem: infra
tags: [inngest, analytics, pipeline, dead-code-removal]

# Dependency graph
requires:
  - phase: 07-ai-pipeline
    provides: "Direct AI pipeline (runAIPipelineDirect) and analytics compute engine"
provides:
  - "Clean codebase with no Inngest dependency"
  - "Analytics snapshot computation wired into direct AI pipeline"
  - "Simplified dev script (no concurrently/inngest-cli)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct pipeline with analytics snapshot as non-fatal post-step"

key-files:
  created: []
  modified:
    - src/lib/ai/pipeline.ts
    - package.json
    - .env.example
    - bun.lock

key-decisions:
  - "Analytics snapshot is non-fatal: failure logs error but does not block AI pipeline completion"
  - "concurrently removed since it was only used for Inngest parallel dev command"
  - "trustedDependencies emptied after inngest-cli removal"

patterns-established:
  - "Non-fatal post-pipeline steps: wrap in try/catch, log, continue"

requirements-completed: [AI-05, AI-08]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 07 Plan 05: Inngest Cleanup & Analytics Pipeline Integration Summary

**Removed all dead Inngest code and wired computeSessionSnapshot() into the direct AI pipeline as a non-fatal post-completion step**

## Performance

- **Duration:** 8 min (effective task time; build retries added overhead)
- **Started:** 2026-03-04T21:33:45Z
- **Completed:** 2026-03-04T22:07:00Z
- **Tasks:** 1
- **Files modified:** 13

## Accomplishments
- Removed entire `src/inngest/` directory (5 files: client, 3 function modules, index)
- Removed Inngest serve route (`src/app/api/inngest/route.ts`)
- Wired `computeSessionSnapshot()` into `runAIPipelineDirect()` after AI completion
- Removed `inngest`, `inngest-cli`, `concurrently` from package.json
- Simplified `dev` script to plain `next dev --port 4300`
- Removed `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` from `.env.example`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire analytics snapshot into direct pipeline and remove Inngest** - `3da9ab2` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/lib/ai/pipeline.ts` - Added computeSessionSnapshot import and non-fatal call after AI finalize block
- `package.json` - Removed inngest, inngest-cli, concurrently; simplified dev script
- `.env.example` - Removed Inngest section (EVENT_KEY, SIGNING_KEY)
- `bun.lock` - Updated lockfile (3 packages removed)
- `src/app/api/inngest/route.ts` - Deleted (serve route)
- `src/inngest/client.ts` - Deleted (Inngest client with typed event schemas)
- `src/inngest/functions/index.ts` - Deleted (function registry)
- `src/inngest/functions/post-session.ts` - Deleted (9-step post-session pipeline)
- `src/inngest/functions/pre-session-nudges.ts` - Deleted (cron + refresh handler)
- `src/inngest/functions/analytics-snapshot.ts` - Deleted (snapshot compute + daily sweep)

## Decisions Made
- Analytics snapshot placed AFTER aiStatus = "completed" so snapshot failures never block AI completion status
- Snapshot errors are logged but non-fatal -- a daily sweep can be added later to catch misses
- `concurrently` removed entirely since it was only used for the Inngest parallel dev command
- `trustedDependencies` array emptied (only contained inngest-cli)

## Deviations from Plan

None -- the work was already executed as part of commit 3da9ab2 during plan 07-04 execution. This plan verified and documented the completed work.

## Issues Encountered
- Build process required multiple retries due to stale `.next` cache and zombie `next build` processes from prior runs
- Resolved by killing zombie processes and removing `.next` directory

## User Setup Required

None - no external service configuration required. The removal of Inngest simplifies the setup by eliminating two environment variables.

## Next Phase Readiness
- AI pipeline is fully self-contained with no external job queue dependency
- Analytics snapshots are computed inline after session completion
- Codebase is clean of all Inngest references (verified via grep)

## Self-Check: PASSED

All 6 verification criteria passed:
- src/inngest/ deleted
- src/app/api/inngest/ deleted
- computeSessionSnapshot in pipeline.ts
- inngest not in package.json
- Commit 3da9ab2 exists
- SUMMARY.md exists

---
*Phase: 07-ai-pipeline*
*Completed: 2026-03-04*
