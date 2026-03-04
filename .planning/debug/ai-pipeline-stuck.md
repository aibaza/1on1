---
status: diagnosed
trigger: "AI pipeline stuck on Generating after session completion"
created: 2026-03-04T21:30:00Z
updated: 2026-03-04T21:35:00Z
---

## Current Focus

hypothesis: CONFIRMED - Inngest dependency was the root cause; fix already applied
test: Verified DB state, container code, and data integrity
expecting: All completed sessions should have ai_status=completed
next_action: Return diagnosis

## Symptoms

expected: After session completion, AI summary section shows loading briefly then completes with generated content. Dashboard shows nudge cards.
actual: Session summary page showed "Generating..." indefinitely (10+ minutes). Dashboard showed "No AI nudges yet".
errors: None visible to user (silent failure)
reproduction: Complete any session through the wizard
started: Present during Phase 07 UAT

## Eliminated

(none - first hypothesis confirmed)

## Evidence

- timestamp: 2026-03-04T21:30:00Z
  checked: Git history - commit f9946b4
  found: Session completion route previously used `inngest.send({ name: "session/completed" })` to fire-and-forget trigger AI pipeline. This required a running Inngest dev server to receive and execute the event.
  implication: Without Inngest dev server, events were sent to nowhere, pipeline never executed.

- timestamp: 2026-03-04T21:31:00Z
  checked: docker-compose.yml
  found: `INNGEST_DEV: "http://host.docker.internal:8288"` set in env but no Inngest container defined in docker-compose. The Inngest dev server was expected to run separately.
  implication: In the Docker production-like deployment, Inngest dev server was never started, so all pipeline events were silently dropped.

- timestamp: 2026-03-04T21:32:00Z
  checked: Database session table
  found: All 7 completed sessions now have ai_status='completed' with valid AI content (summary, addendum, suggestions). Only 2 sessions have pending status, both are in_progress (not yet completed through wizard).
  implication: The backfill in commit f9946b4 successfully processed all stuck sessions.

- timestamp: 2026-03-04T21:33:00Z
  checked: Database ai_nudge table
  found: 10+ nudges exist, generated for multiple series with proper content, priorities, and source session references.
  implication: Nudge generation is working after the fix was applied.

- timestamp: 2026-03-04T21:34:00Z
  checked: Running Docker container built code
  found: `runAIPipelineDirect` function exists in the container's compiled JavaScript bundles (2 chunks). The complete route calls it directly instead of via Inngest.
  implication: The fix IS deployed in the running container. New session completions will trigger the pipeline directly.

- timestamp: 2026-03-04T21:35:00Z
  checked: Inngest files still in codebase
  found: `src/inngest/client.ts`, `src/inngest/functions/post-session.ts`, `src/app/api/inngest/route.ts` all still exist. The Inngest serve route is still registered but will return 404 if inngest package has issues or dev server not connected.
  implication: Inngest is dead code now. The route files remain but are no longer used for the AI pipeline. Should be cleaned up.

## Resolution

root_cause: |
  The AI pipeline was originally implemented using Inngest (event-driven background function system).
  The session completion endpoint (`POST /api/sessions/[id]/complete`) fired an Inngest event
  `session/completed` which was supposed to trigger the `postSessionPipeline` Inngest function.

  However, Inngest requires a running dev server (or cloud connection) to receive and execute events.
  The Docker deployment had `INNGEST_DEV: "http://host.docker.internal:8288"` configured but no
  Inngest dev server was running. As a result:

  1. Session completion set `aiStatus: "pending"` in the DB
  2. `inngest.send()` silently failed or sent to an unreachable endpoint
  3. The pipeline function never executed
  4. `aiStatus` remained "pending" forever (no error handler to catch this)
  5. UI showed "Generating..." indefinitely based on the pending/generating status

  This was an architectural dependency issue: the app depended on an external service (Inngest dev
  server) that was never started in the deployment environment.

fix: |
  Commit f9946b4 replaced Inngest with direct async execution:
  - Created `src/lib/ai/pipeline.ts` with `runAIPipelineDirect()`
  - Changed session completion route to call `runAIPipelineDirect()` fire-and-forget instead of `inngest.send()`
  - Changed AI retry route similarly
  - Backfilled all stuck sessions by running pipeline against them

  The fix is already deployed in the running Docker container and verified working
  (all completed sessions have AI content).

verification: |
  - All 7 completed sessions have ai_status='completed' with valid ai_summary, ai_suggestions, ai_manager_addendum
  - 10+ nudges exist in ai_nudge table
  - Running container has runAIPipelineDirect in compiled bundles
  - Complete route calls pipeline directly (no Inngest dependency)

files_changed:
  - src/lib/ai/pipeline.ts (new - direct pipeline runner)
  - src/app/api/sessions/[id]/complete/route.ts (changed - Inngest to direct)
  - src/app/api/sessions/[id]/ai-retry/route.ts (changed - Inngest to direct)
