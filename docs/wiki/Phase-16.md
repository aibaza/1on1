# Phase 16: Template Import

**Status**: Complete
**Milestone**: v1.2 AI-Ready Templates
**Depends on**: Phase 15
**Completed**: 2026-03-07

## Goal

Users can import a template from a portable JSON file with full visibility into what they are importing, warnings about mismatches, and actionable error messages if the file is invalid.

## Success Criteria

1. An admin or manager uploads a `.json` file from the template list and sees a preview — template name, section count, question count, and question type breakdown — before any data is written
2. When the imported file's `language` field does not match the company's content language, the user sees a warning (naming both languages) and must explicitly confirm before proceeding
3. When a template with the same name already exists, the user is offered three choices — rename, create as copy, or cancel — and the import only proceeds after an explicit choice
4. When the uploaded file fails schema validation, the user sees field-specific error messages (e.g., "Section 1, Question 2, field answerType: invalid value") — not a generic "invalid file" error
5. A successfully imported template appears in the template list immediately and is fully functional

## What Was Built

### Import API (`POST /api/templates/import`)

- Role-gated: returns 401 (unauthenticated), 403 (member role), 422 (schema validation errors), 409 (name conflict), 201 (success)
- `formatImportErrors()` from `import-schema.ts` generates `Section N, Question M, field X` scoped error messages from Zod issues
- Name conflict returns `ConflictError` with 409 — client handles rename and "create as copy" flows client-side then re-submits
- All DB writes wrapped in `withTenantContext` for tenant isolation; audit log entry recorded on successful import

### Import Dialog (multi-step flow)

5-step dialog:
1. **Select** — file input (`.json` only), drag-and-drop
2. **Preview** — template name, section count, question count, question type breakdown badges
3. **Language warning** (conditional) — yellow Alert naming source and target language; "Proceed anyway" gate
4. **Name conflict** (conditional) — inline rename input + "Create as copy" button
5. **Success / Error** — success shows "View Template" link; error shows field-specific messages with "Close" only

### Translation Keys

- `messages/en/templates.json` and `messages/ro/templates.json` — `import.*` block with all dialog strings (EN + RO)

### Entry Point

- "Import" button in template list header (upload icon + label) — `canManageTemplates()` guard, admin/manager only

## Key Decisions

- **Client-side state management for conflict resolution** — client handles the rename/copy decision, then re-POSTs with the resolved name rather than a server-side round-trip session
- **422 with structured errors** — Zod issue paths serialized into human-readable `Section N / Question M / field X` strings at the API layer; no raw Zod output to the client
- **Atomic DB insert** — all sections and questions inserted in a single `withTenantContext` transaction; partial imports are impossible

## Key Files

- `src/app/api/templates/import/route.ts` — import API route
- `src/lib/templates/import-schema.ts` — Zod schema, error formatter, preview stats
- `src/components/templates/import-dialog.tsx` — multi-step import dialog
- `src/components/templates/template-list.tsx` — Import button entry point
- `messages/en/templates.json`, `messages/ro/templates.json` — import translation keys
