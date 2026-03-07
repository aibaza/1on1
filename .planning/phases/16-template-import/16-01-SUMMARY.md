---
phase: 16-template-import
plan: "01"
subsystem: testing
tags: [vitest, zod, import-schema, rbac, tdd]

# Dependency graph
requires:
  - phase: 15-schema-spec-export
    provides: buildExportPayload, TemplateExport interface, export-schema.ts fixtures
provides:
  - Failing test contracts for templateImportSchema, formatImportErrors, derivePreviewStats (RED)
  - Passing RBAC tests for canManageTemplates (GREEN)
affects: [16-02-PLAN.md, 16-03-PLAN.md, 16-04-PLAN.md, 16-05-PLAN.md]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD Wave 0 — test contracts written before implementation]

key-files:
  created:
    - src/lib/templates/__tests__/import-schema.test.ts
    - src/lib/auth/__tests__/rbac.test.ts
  modified:
    - CHANGELOG.md

key-decisions:
  - "Fixture helpers (makeQuestion/makeSection/makeTemplate) copied inline from export-schema.test.ts — Vitest test files are not modules designed for cross-import"
  - "ZodError constructed via new z.ZodError([...issues]) for formatImportErrors tests — real ZodError, no mocking"
  - "rbac.test.ts is GREEN immediately — canManageTemplates already implemented in rbac.ts"

patterns-established:
  - "TDD Wave 0: write test contracts before implementation files exist; module-not-found errors are the expected RED signal"
  - "Fixture helpers copied inline per test file for isolation; no cross-test-file imports"

requirements-completed: [IMP-01, IMP-02, IMP-03, IMP-04, IMP-05]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 16 Plan 01: Test Scaffolds for Import Schema and RBAC Summary

**11 Vitest unit tests (RED) for import-schema contracts and 5 RBAC tests (GREEN) establishing Wave 0 test scaffold for template import**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07T08:30:00Z
- **Completed:** 2026-03-07T08:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `import-schema.test.ts` with 11 tests: schema validation, error formatting, preview stats, round-trip with buildExportPayload — all RED (module-not-found)
- Created `rbac.test.ts` with 5 tests for `canManageTemplates` — all GREEN immediately since implementation already exists
- Documented `scale_custom` pitfall (must be accepted), language mismatch detection, and copy suffix convention in test comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Write import-schema.test.ts (RED)** - `bc1abfb` (test)
2. **Task 2: Write rbac.test.ts (GREEN)** - `805a671` (test)

**Plan metadata:** _(to be added after final commit)_

## Files Created/Modified
- `src/lib/templates/__tests__/import-schema.test.ts` — 11 failing tests for Wave 1 implementation contracts
- `src/lib/auth/__tests__/rbac.test.ts` — 5 passing tests for canManageTemplates RBAC guard
- `CHANGELOG.md` — updated with both new test files

## Decisions Made
- Fixture helpers copied inline (not imported across test files) — Vitest test files are not importable modules
- ZodError constructed via `new z.ZodError([...issues])` for formatImportErrors tests — real objects, no mocking
- rbac.test.ts GREEN on first run (implementation already present) — acceptable per plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Wave 0 test scaffold complete; RED state confirmed for import-schema.test.ts
- Plan 16-02 can now implement `src/lib/templates/import-schema.ts` to turn tests GREEN
- RBAC test baseline established for validation strategy sampling

## Self-Check: PASSED

- FOUND: src/lib/templates/__tests__/import-schema.test.ts
- FOUND: src/lib/auth/__tests__/rbac.test.ts
- FOUND commit: bc1abfb (test: import-schema RED)
- FOUND commit: 805a671 (test: rbac GREEN)

---
*Phase: 16-template-import*
*Completed: 2026-03-07*
