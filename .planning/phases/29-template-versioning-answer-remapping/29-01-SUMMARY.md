---
phase: 29-template-versioning-answer-remapping
plan: 01
subsystem: database, api
tags: [drizzle, jsonb, snapshot, versioning, rls, zod]

# Dependency graph
requires: []
provides:
  - template_version Drizzle schema with RLS
  - buildTemplateSnapshot utility for JSONB snapshots
  - Zod validation schemas for version API payloads
  - Publish endpoint creates version snapshot on publish
affects: [29-02, 29-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [immutable version snapshot on publish, coalesce max+1 version numbering]

key-files:
  created:
    - src/lib/db/schema/template-versions.ts
    - src/lib/templates/snapshot.ts
    - src/lib/validations/template-version.ts
    - src/lib/db/migrations/0020_template_versions.sql
    - src/lib/templates/__tests__/snapshot.test.ts
  modified:
    - src/lib/db/schema/index.ts
    - src/app/api/templates/[id]/publish/route.ts
    - src/lib/db/migrations/meta/_journal.json

key-decisions:
  - "Thenable mock pattern for DB chain tests — supports both .where() and .orderBy() terminal calls"
  - "Hand-written migration 0020 with RLS ENABLE + FORCE + tenant_isolation policy"

patterns-established:
  - "Version snapshot pattern: buildTemplateSnapshot captures full template state as self-contained JSONB"

requirements-completed: [VER-01, VER-02]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 29 Plan 01: Schema & Snapshot Foundation Summary

**template_version table with RLS, buildTemplateSnapshot JSONB utility, and publish endpoint hooks version creation with auto-incrementing version numbers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T20:56:37Z
- **Completed:** 2026-03-19T21:00:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- template_version Drizzle schema with unique index on (template_id, version_number) and RLS tenant isolation
- buildTemplateSnapshot utility producing self-contained JSONB with sections, questions, and label IDs
- Publish endpoint creates immutable version snapshot and syncs questionnaireTemplates.version number
- 5 unit tests covering snapshot structure, question fields, section ordering, grouping, and empty templates

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, snapshot utility, and Zod validations (TDD)**
   - `8c58fa4` (test) — failing tests for buildTemplateSnapshot
   - `70f08fe` (feat) — schema, snapshot builder, Zod schemas, migration
2. **Task 2: Hook snapshot creation into publish endpoint** - `72eed44` (feat)

## Files Created/Modified
- `src/lib/db/schema/template-versions.ts` - templateVersions table and relations
- `src/lib/templates/snapshot.ts` - buildTemplateSnapshot and TemplateVersionSnapshot type
- `src/lib/validations/template-version.ts` - Zod schemas for version payloads
- `src/lib/db/migrations/0020_template_versions.sql` - CREATE TABLE with RLS policy
- `src/lib/templates/__tests__/snapshot.test.ts` - 5 unit tests for snapshot builder
- `src/lib/db/schema/index.ts` - Added template-versions export
- `src/app/api/templates/[id]/publish/route.ts` - Snapshot creation on publish
- `src/lib/db/migrations/meta/_journal.json` - Registered migration 0020

## Decisions Made
- Thenable mock pattern for DB query chains in tests — supports both `.where()` and `.orderBy()` as terminal calls without separate mock configs
- Hand-written migration 0020 (not drizzle-kit generate) — consistent with project pattern for RLS policies

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

None - no external service configuration required. Migration must be applied to database (`bunx drizzle-kit migrate`).

## Next Phase Readiness
- Version history API endpoints (list versions, get version, restore) ready to build on this foundation
- Version history UI tab can query templateVersions table via new API routes

---
*Phase: 29-template-versioning-answer-remapping*
*Completed: 2026-03-19*
