---
phase: 29-template-versioning-answer-remapping
plan: 02
subsystem: api
tags: [drizzle, versioning, diff, restore, snapshot, api-routes]

# Dependency graph
requires:
  - phase: 29-01
    provides: template_version schema, buildTemplateSnapshot, Zod schemas
provides:
  - GET /api/templates/:id/versions (version list with question counts)
  - GET /api/templates/:id/versions/:versionNumber (full snapshot detail)
  - POST /api/templates/:id/versions/:versionNumber/restore (restore with conditional remapping)
  - computeVersionDiff utility for snapshot comparison
affects: [29-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [two-pass question insert for conditional remapping on restore, diff computation by section/question id matching]

key-files:
  created:
    - src/app/api/templates/[id]/versions/route.ts
    - src/app/api/templates/[id]/versions/[versionNumber]/route.ts
    - src/app/api/templates/[id]/versions/[versionNumber]/restore/route.ts
    - src/lib/templates/version-diff.ts
    - src/lib/templates/version-diff.test.ts
  modified:
    - CHANGELOG.md

key-decisions:
  - "answerType/conditionalOperator cast to actual Drizzle enum literals — snapshot stores string, insert requires union type"

patterns-established:
  - "Version restore pattern: archive current content, insert from snapshot, two-pass conditional remapping, unpublish template"

requirements-completed: [VER-03, VER-04, VER-05, VER-06]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 29 Plan 02: Version History API Summary

**Version list/detail/restore API routes with diff utility — restore archives current content and rebuilds from snapshot with conditional question remapping**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T21:03:35Z
- **Completed:** 2026-03-19T21:07:24Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Version list API returns compact entries (versionNumber, createdAt, createdByName, questionCount) without sending full snapshots
- Version detail API returns full JSONB snapshot + metadata for a specific version number
- Restore endpoint archives all current sections/questions, inserts from snapshot with two-pass conditional remapping, resets labels, sets template as unpublished draft
- computeVersionDiff detects added/removed/modified sections and questions with 8 passing tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Version list API + single version API + diff utility (TDD)** - `d5aec4e` (feat)
2. **Task 2: Restore version API route** - `ac28a3b` (feat)

## Files Created/Modified
- `src/lib/templates/version-diff.ts` - computeVersionDiff and VersionChange type
- `src/lib/templates/version-diff.test.ts` - 8 unit tests for diff computation
- `src/app/api/templates/[id]/versions/route.ts` - GET handler for version list
- `src/app/api/templates/[id]/versions/[versionNumber]/route.ts` - GET handler for single version
- `src/app/api/templates/[id]/versions/[versionNumber]/restore/route.ts` - POST handler for version restore
- `CHANGELOG.md` - Added version API entries

## Decisions Made
- answerType and conditionalOperator require explicit cast to Drizzle enum union types when inserting from JSONB snapshot (snapshot stores plain strings)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed enum type casts for answerType and conditionalOperator**
- **Found during:** Task 2 (Restore version API)
- **Issue:** Snapshot stores answerType/conditionalOperator as plain strings; Drizzle insert expects exact enum union types
- **Fix:** Cast to actual enum literals from enums.ts (e.g., "text" | "rating_1_5" | ... not "text" | "rating" | ...)
- **Files modified:** src/app/api/templates/[id]/versions/[versionNumber]/restore/route.ts
- **Verification:** bun run typecheck passes
- **Committed in:** ac28a3b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type cast necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 3 API routes ready for UI integration (version history tab, diff viewer, restore button)
- Plan 03 can build the version history UI tab consuming these endpoints

---
*Phase: 29-template-versioning-answer-remapping*
*Completed: 2026-03-19*
