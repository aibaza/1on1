---
phase: 16-template-import
plan: "04"
subsystem: templates/import-ui
tags: [import, dialog, ui, multi-step, template-list]
dependency_graph:
  requires: [16-02, 16-03]
  provides: [import-dialog-component, template-list-import-button]
  affects: [templates-page]
tech_stack:
  added: []
  patterns: [multi-step-dialog, tanstack-query-cache-check, file-reader-api]
key_files:
  created:
    - src/components/templates/import-dialog.tsx
  modified:
    - src/components/templates/template-list.tsx
    - src/app/(dashboard)/templates/page.tsx
decisions:
  - Alert component absent from shadcn/ui install — used inline div with Tailwind yellow classes instead
  - DialogTrigger pattern avoided — Button opens dialog via setOpen(true) to keep file input outside DialogTrigger (avoids nested interactive element pitfall from plan)
  - useQuery enabled:false for templates cache — conflict check reads existing cache without triggering a new fetch
  - contentLanguage falls back to "en" at the page level if session value is null
metrics:
  duration: 8min
  completed_date: "2026-03-07"
  tasks: 2
  files: 3
---

# Phase 16 Plan 04: ImportDialog UI Summary

**One-liner:** Multi-step import dialog (select→preview→conflict→success) wired into template list header with language mismatch warning and client+server conflict handling.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ImportDialog component | d148d6f | src/components/templates/import-dialog.tsx |
| 2 | Wire ImportDialog into template-list.tsx | e624812 | src/components/templates/template-list.tsx, src/app/(dashboard)/templates/page.tsx |

## What Was Built

### ImportDialog (src/components/templates/import-dialog.tsx)

A `"use client"` 5-state dialog (select / preview / error / conflict / success):

- **select step:** Hidden `<input type="file" accept=".json">` with a Browse button that calls `fileInputRef.current?.click()` — avoids nested interactive element pitfall.
- **File parsing:** FileReader reads the file as text, JSON.parse catches malformed JSON, schemaVersion early check rejects unsupported versions, `templateImportSchema.safeParse()` validates structure, `formatImportErrors()` formats Zod issues into `{ path, message }` pairs.
- **preview step:** Renders `derivePreviewStats()` output — name, description, section count, question count, and answer type badges. Language mismatch shows a yellow warning div with Proceed/Cancel; Import button disabled until confirmed.
- **error step:** Scrollable list of up to 10 validation errors with overflow count; Close only.
- **conflict step:** Inline rename input + "Import as '...'" button + "Create as copy" button. Triggered by client-side cache check OR server 409 response.
- **success step:** Confirmation message + "View Template" Link to new template page.
- **Import mutation:** POST `/api/templates/import` with `Content-Type: application/json`. Handles 422 (back to error step), 409 (back to conflict step), generic errors (toast).
- **handleClose:** Resets all state including file input value.

### template-list.tsx changes

- Added `contentLanguage: string` to `TemplateListProps`
- Imported `ImportDialog`
- Placed `<ImportDialog>` inside `canCreate` guard, wrapped with the existing New Template button in a `flex gap-2` div
- Import button appears before New Template button

### templates/page.tsx changes

- Passes `contentLanguage={session.user.contentLanguage ?? "en"}` to `<TemplateList>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Alert component not installed**
- **Found during:** Task 1 typecheck
- **Issue:** `@/components/ui/alert` does not exist; only `alert-dialog.tsx` is present in the shadcn install
- **Fix:** Replaced `<Alert>/<AlertTitle>/<AlertDescription>` with inline `<div>` using Tailwind classes `border-yellow-500 bg-yellow-50 text-yellow-800`
- **Files modified:** src/components/templates/import-dialog.tsx
- **Commit:** d148d6f

**2. [Rule 2 - Pattern] DialogTrigger avoided by design**
- **Found during:** Task 1 implementation
- **Issue:** Plan's dialog wrapper used `<DialogTrigger asChild>` wrapping a Button, but the file input must be rendered outside the DialogTrigger to avoid nested interactive element issues
- **Fix:** Button calls `setOpen(true)` directly; `<input type="file">` rendered as sibling before the Dialog wrapper; Dialog uses `open={open}` controlled state
- **Impact:** Functionally identical; avoids browser warnings about nested button elements

## Self-Check: PASSED

- `src/components/templates/import-dialog.tsx` exists
- `src/components/templates/template-list.tsx` updated with ImportDialog + contentLanguage prop
- `src/app/(dashboard)/templates/page.tsx` passes contentLanguage
- Commits d148d6f and e624812 exist
- `bun run typecheck` passes (exit 0)
- `bun run build` passes
