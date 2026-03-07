---
phase: 16-template-import
plan: "02"
subsystem: template-import
tags: [zod, validation, i18n, import-schema]
dependency_graph:
  requires: [16-01]
  provides: [templateImportSchema, formatImportErrors, derivePreviewStats, import-i18n-keys]
  affects: [16-03, 16-04]
tech_stack:
  added: []
  patterns: [zod-schema-validation, icu-plural-forms, tdd-red-to-green]
key_files:
  created:
    - src/lib/templates/import-schema.ts
  modified:
    - messages/en/templates.json
    - messages/ro/templates.json
    - src/lib/templates/__tests__/import-schema.test.ts
    - vitest.config.ts
decisions:
  - "zod CJS alias in vitest.config.ts: zod v4 ESM re-exports `z` as a namespace binding (import * as z then export { z }) which Vite SSR cannot resolve via named destructuring; aliasing to index.cjs fixes the runtime and test-time resolution"
  - "import-schema.ts uses `import { z } from 'zod'` (not zod/v4) — consistent with all other project validation files, and zod alias routes to CJS anyway"
  - "as-any casts on ZodError issue objects in test file — zod v4 issue shapes dropped `received` and `type` fields that zod v3 had; tests pass at runtime but TypeScript strict mode flagged the object literals"
  - "vitest.config.ts gains pool: forks + server.deps.inline: [/^zod/] to ensure full zod module is available in SSR worker context"
metrics:
  duration: 14min
  completed: "2026-03-07"
  tasks_completed: 2
  files_created: 1
  files_modified: 4
---

# Phase 16 Plan 02: Import Schema and Translation Keys Summary

Zod validation schema for template import with human-readable error formatter, preview stats utility, and full EN/RO translation key sets.

## What Was Built

**src/lib/templates/import-schema.ts** — Complete import validation contract:
- `templateImportSchema`: Zod schema mirroring `TemplateExport` interface; enforces `schemaVersion: 1` literal, all 7 `answerType` values (including `scale_custom`), max lengths, nullable fields, and `sections.min(1)`
- `TemplateImportPayload`: TypeScript type inferred from the schema
- `formatImportErrors(error: ZodError)`: Converts Zod issues to `ImportError[]` with human-readable paths: `"Section 1, Question 3, field \`answerType\`"`
- `derivePreviewStats(payload)`: Returns `{ sectionCount, questionCount, typeCounts, name, description }` for UI preview step

**messages/en/templates.json** and **messages/ro/templates.json** — Added `import.*` key blocks covering all 5 dialog steps (select file, preview, language mismatch, rename/conflict, success) plus error states.

## Test Results

All 11 import-schema tests GREEN. Full unit suite: 51/51 tests pass across 5 test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 ESM namespace binding breaks Vitest SSR transform**
- **Found during:** Task 1 — first test run attempt
- **Issue:** `zod/index.js` does `import * as z from "./v4/classic/external.js"` then `export { z }`. Vite SSR transforms `import { z } from 'zod'` to `const z = module.z` but the resulting SSR module proxy has `.z` as `undefined` because it can't resolve a namespace-binding re-export in SSR context.
- **Fix:** Added `resolve.alias: { 'zod': path.resolve('node_modules/zod/index.cjs') }` in vitest.config.ts so all zod imports resolve to the CJS build, which does not use the namespace-binding pattern.
- **Files modified:** vitest.config.ts
- **Commit:** 5a281ca

**2. [Rule 1 - Bug] Test file used zod v3 ZodError issue shapes**
- **Found during:** Task 1 — typecheck after tests passed
- **Issue:** Wave 0 test file used `received: 'number'` and `type: 'string'` in manually constructed ZodError issue objects — these fields were removed in zod v4, causing TS2353 type errors under strict mode.
- **Fix:** Added `as any` casts on the issue object literals in formatImportErrors tests.
- **Files modified:** src/lib/templates/__tests__/import-schema.test.ts
- **Commit:** 5a281ca

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/templates/import-schema.ts
- FOUND: messages/en/templates.json (contains "import":)
- FOUND: messages/ro/templates.json (contains "import":)

Commits exist:
- FOUND: 5a281ca — feat(16-02): implement templateImportSchema
- FOUND: 8560ea5 — feat(16-02): add import.* translation keys
