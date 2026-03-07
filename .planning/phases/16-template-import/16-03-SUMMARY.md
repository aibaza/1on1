---
phase: 16-template-import
plan: "03"
subsystem: api
tags: [import, api-route, rbac, validation, atomic-insert]
dependency_graph:
  requires: [16-02]
  provides: [POST /api/templates/import]
  affects: [templates, template_sections, template_questions, audit_log]
tech_stack:
  added: []
  patterns: [withTenantContext atomic transaction, ConflictError local class, z.ZodError instanceof]
key_files:
  created:
    - src/app/api/templates/import/route.ts
  modified: []
decisions:
  - logAuditEvent called inside withTenantContext callback — audit entry rolls back if insert fails
  - ConflictError local class (not string name check) enables clean instanceof separation
  - templateQuestions has no tenantId column — omitted from insert (discovered via typecheck)
  - z.ZodError instanceof used (not error.name === "ZodError") — fixes known codebase pattern
metrics:
  duration: 8min
  completed: "2026-03-07"
  tasks: 1
  files: 1
---

# Phase 16 Plan 03: Import API Route Summary

POST /api/templates/import with auth gate, RBAC, Zod validation, atomic insert, and audit log.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement POST /api/templates/import | 3779d28 | src/app/api/templates/import/route.ts |

## What Was Built

`src/app/api/templates/import/route.ts` — the authoritative server-side import handler.

**Request shape:** `{ payload: unknown, importName: string }`

**Response contracts:**
- `401` — unauthenticated
- `403` — member role (canManageTemplates fails)
- `400` — missing/empty importName, or unparseable JSON body
- `422 { errors: ImportError[] }` — schemaVersion mismatch or Zod validation failure
- `409 { conflict: true, name }` — importName already exists in tenant's non-archived templates
- `201 { templateId, name }` — success

**Atomic insert flow (inside withTenantContext):**
1. Name conflict check against non-archived templates
2. Insert template header (isPublished: false, isDefault: false)
3. Insert sections — build `sortOrder → sectionId` Map
4. Flatten questions across sections, sort by global sortOrder, insert sequentially, build `sortOrder → questionId` Map for conditional resolution
5. logAuditEvent inside same transaction (action: "template_imported")

## Deviations from Plan

**1. [Rule 1 - Bug] templateQuestions has no tenantId column**
- **Found during:** Task 1 (typecheck)
- **Issue:** Plan's interface spec listed `tenantId` in the templateQuestions insert — the actual DB schema (`template_question` table) has no tenant_id column
- **Fix:** Removed `tenantId` from the templateQuestions `.values({...})` call
- **Files modified:** src/app/api/templates/import/route.ts
- **Commit:** 3779d28

**2. [Rule 2 - Missing critical functionality] logAuditEvent called inside transaction**
- **Found during:** Task 1 (reading audit/log.ts signature)
- **Issue:** Plan suggested calling logAuditEvent after the withTenantContext block, but the function signature requires a TransactionClient as first arg — it must be called inside the callback
- **Fix:** Moved logAuditEvent call to end of withTenantContext callback
- **Files modified:** src/app/api/templates/import/route.ts
- **Commit:** 3779d28

## Self-Check: PASSED

- [x] src/app/api/templates/import/route.ts exists
- [x] Commit 3779d28 exists
- [x] bun run typecheck passes (0 errors)
