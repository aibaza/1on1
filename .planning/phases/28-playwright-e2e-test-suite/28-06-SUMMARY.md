---
phase: 28-playwright-e2e-test-suite
plan: "06"
subsystem: testing
tags: [playwright, e2e, uuid, seed, corrections]

# Dependency graph
requires:
  - phase: 28-playwright-e2e-test-suite
    provides: corrections.spec.ts with Amended badge test (skipped due to UUID bug)
  - phase: 27-ui-integration
    provides: AmendedBadge component and corrections API accepting Zod uuid()

provides:
  - RFC4122-compliant ANSWER_* UUID constants in seed.ts (8000 variant bits)
  - Amended badge E2E test fully enabled — no conditional skip
  - Debug spec with DIAGNOSIS CONCLUSION block documenting UAT crash root cause

affects: [28-playwright-e2e-test-suite, corrections-feature, seed-data]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seed UUID pattern: all ANSWER_* constants use 66666666-XXXX-4000-8000-XXXXXXXXXXXX (RFC4122 variant 8xxx)"
    - "Idempotent seed: DELETE of old-variant rows before insert enables UUID migration without constraint errors"

key-files:
  created: []
  modified:
    - src/lib/db/seed.ts
    - e2e/corrections.spec.ts
    - e2e/debug-session-summary.spec.ts

key-decisions:
  - "Seed UUID fix: replace 6000 with 8000 in all 45 ANSWER_* constants — RFC4122 requires clock_seq_hi_res high bits to be 10xx (hex 8, 9, a, b)"
  - "Idempotent re-seed: add DELETE WHERE id::text LIKE '66666666-%-4000-6%' before insert loop — onConflictDoUpdate(id) cannot match old IDs when constants changed"
  - "setupComplete variable removed from corrections.spec.ts — only used for the now-removed test.skip; beforeAll correction creation is unconditional"
  - "Diagnosis conclusion embedded in debug spec as doc block — crash root cause is neon_websocket (CONFIRMED), hydration_error and error_event_object NOT PRESENT post-fix"

patterns-established:
  - "When seed deterministic UUIDs change, add a DELETE of old-pattern rows before the insert loop to maintain idempotency"

requirements-completed: [E2E-04, E2E-05]

# Metrics
duration: 15min
completed: 2026-03-13
---

# Phase 28 Plan 06: Gap Closure — UUID Fix + Diagnosis Conclusion Summary

**RFC4122-compliant seed UUIDs enable Amended badge E2E test to run end-to-end; UAT crash root cause documented in debug spec**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-13T11:30:00Z
- **Completed:** 2026-03-13T11:45:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed all 45 ANSWER_* UUID constants in seed.ts from non-RFC4122 `6000` variant to compliant `8000` variant
- Removed `test.skip` from Amended badge test — correction API POST now returns 200 with valid UUID; all 9 correction tests pass
- Added DIAGNOSIS CONCLUSION doc block to debug spec confirming neon_websocket as confirmed root cause of UAT crash and Plan 01 as the fix
- E2E-04 (Corrections UI) and E2E-05 (debug spec) gaps from VERIFICATION.md fully closed

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix seed.ts answer UUID variant bits** - `cad9bda` (fix)
2. **Task 2: Enable Amended badge test + update debug spec diagnosis** - `36c0de3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/db/seed.ts` - All 45 ANSWER_* UUID constants changed from 6000 to 8000 variant bits; DELETE of old-pattern rows added to seedAnswers() for idempotency
- `e2e/corrections.spec.ts` - Removed test.skip and setupComplete variable from Amended badge test group
- `e2e/debug-session-summary.spec.ts` - Added DIAGNOSIS CONCLUSION doc block before SESSION_IDS declaration

## Decisions Made
- Seed UUID fix targets only ANSWER_* constants (66666666 prefix, 6000 variant) — SESSION_* constants already use valid 9000 variant and are unchanged
- Added DELETE of old 6000-variant rows in seedAnswers() to maintain idempotency after UUID change — without this, re-seeding fails with unique constraint violation on (session_id, question_id)
- setupComplete variable removed entirely from corrections.spec.ts — it was only used for the conditional skip; beforeAll block still creates the correction and logs the result

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added DELETE of old 6000-variant rows to seedAnswers()**
- **Found during:** Task 1 (Fix seed.ts UUID variant bits)
- **Issue:** After changing UUID constants from 6000 to 8000, `bun run db:seed` failed with `duplicate key value violates unique constraint "session_answer_session_question_unique_idx"` — old rows with 6000-variant IDs still existed, and inserting new 8000-variant IDs conflicted on the (session_id, question_id) unique index
- **Fix:** Added `DELETE FROM session_answer WHERE id::text LIKE '66666666-%-4000-6%'` before the insert loop in seedAnswers()
- **Files modified:** src/lib/db/seed.ts
- **Verification:** `bun run db:seed` exits 0; all 45 answers inserted with 8000-variant UUIDs
- **Committed in:** cad9bda (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking)
**Impact on plan:** Required to make bun run db:seed succeed after UUID change. No scope creep.

## Issues Encountered
- Re-seeding after UUID constant change triggered unique constraint violation on (session_id, question_id) — the onConflictDoUpdate(id) target doesn't match old rows when PKs change. Resolved by deleting old-variant rows first.

## Next Phase Readiness
- Phase 28 fully complete: all 6 plans done, all E2E specs verified, CI pipeline in place
- E2E-04 and E2E-05 requirements confirmed closed
- v1.3 milestone (Playwright Testing) complete — ready to proceed to v1.4

---
*Phase: 28-playwright-e2e-test-suite*
*Completed: 2026-03-13*
