---
phase: 04-questionnaire-templates
plan: 02
subsystem: api, ui
tags: [drizzle, zod, next-api-routes, rbac, react-hook-form, tanstack-query, shadcn, template-editor, versioning]

# Dependency graph
requires:
  - phase: 04-questionnaire-templates
    plan: 01
    provides: "Template CRUD API, question CRUD API, Zod validation schemas, template list page"
provides:
  - "Template editor UI at /templates/[id] with full question CRUD"
  - "New template page at /templates/new for creating templates"
  - "Versioning-aware PATCH with session usage detection and question archival"
  - "Template duplication with deep copy and conditional reference remapping"
  - "Atomic set-default API (admin-only, single default per tenant)"
  - "Publish/Unpublish toggle with question count validation"
  - "Per-answer-type configuration forms (rating labels, multiple choice, mood)"
  - "Read-only mode for member role"
affects: [04-questionnaire-templates, 05-meeting-sessions]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Versioning-aware batch save with session detection", "Server Component + Client editor pattern", "Local state for question array with batch save"]

key-files:
  created:
    - src/app/(dashboard)/templates/[id]/page.tsx
    - src/app/(dashboard)/templates/new/page.tsx
    - src/components/templates/template-editor.tsx
    - src/components/templates/question-card.tsx
    - src/components/templates/question-form.tsx
    - src/components/templates/answer-config-form.tsx
    - src/app/api/templates/[id]/duplicate/route.ts
    - src/app/api/templates/[id]/default/route.ts
    - src/app/api/templates/[id]/publish/route.ts
    - src/components/ui/switch.tsx
    - src/components/ui/alert-dialog.tsx
  modified:
    - src/app/api/templates/[id]/route.ts
    - src/lib/validations/template.ts

key-decisions:
  - "Versioning increments version and archives old questions only when template has sessions referencing it"
  - "Duplicate uses two-pass approach: insert all questions first, then remap conditional references"
  - "Questions managed in local React state, saved in batch via PATCH (not individual API calls)"
  - "zodResolver cast to any for react-hook-form v7 / @hookform/resolvers v5 type mismatch"

patterns-established:
  - "Versioning pattern: check session count, archive old questions, insert new with incremented version"
  - "Deep copy with ID remapping: oldId->newId map for conditional references"
  - "Answer config form pattern: switch on answerType, render per-type configuration"

requirements-completed: [TMPL-05, TMPL-06, TMPL-07, TMPL-08]

# Metrics
duration: 7min
completed: 2026-03-03
---

# Phase 4 Plan 2: Template Editor & Versioning Summary

**Full template editor at /templates/[id] with question CRUD for all 6 answer types, versioning-aware saves, deep-copy duplication with conditional remapping, and atomic default/publish lifecycle operations**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-03T19:49:15Z
- **Completed:** 2026-03-03T19:56:50Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Versioning-aware PATCH endpoint that detects session usage and preserves historical data by archiving old questions
- Full template editor UI with question add/edit/remove, per-answer-type configuration forms, and batch save
- Template lifecycle operations: publish toggle, set default (admin-only), duplicate with UUID remapping, archive with confirmation
- Read-only mode for member role hides all edit controls

## Task Commits

Each task was committed atomically:

1. **Task 1: Versioning, duplication, default, and publish API routes** - `2c51181` (feat)
2. **Task 2: Template editor pages and question management components** - `1650a7e` (feat)

## Files Created/Modified
- `src/app/api/templates/[id]/route.ts` - Enhanced PATCH with versioning-aware batch save (session detection, version increment, question archival)
- `src/app/api/templates/[id]/duplicate/route.ts` - POST handler: deep-copies template + questions with new UUIDs, remaps conditional references
- `src/app/api/templates/[id]/default/route.ts` - PUT handler: atomically sets one default per tenant (admin-only)
- `src/app/api/templates/[id]/publish/route.ts` - PUT handler: toggles published status, validates at least 1 question exists
- `src/lib/validations/template.ts` - Added saveQuestionSchema with optional id field
- `src/app/(dashboard)/templates/[id]/page.tsx` - Server Component loads template data, passes to TemplateEditor
- `src/app/(dashboard)/templates/new/page.tsx` - Thin wrapper rendering TemplateEditor in create mode
- `src/components/templates/template-editor.tsx` - Main editor with metadata form, questions list, actions toolbar
- `src/components/templates/question-card.tsx` - Question display with answer type, category, required, conditional badges
- `src/components/templates/question-form.tsx` - Dialog form with all 6 answer types and per-type config
- `src/components/templates/answer-config-form.tsx` - Per-type config: rating labels, multiple choice options, mood emoji labels
- `src/components/ui/switch.tsx` - shadcn/ui switch component
- `src/components/ui/alert-dialog.tsx` - shadcn/ui alert-dialog component

## Decisions Made
- Versioning only triggers when template has sessions AND questions changed -- unused templates update in place
- Duplicate uses two-pass approach: first insert all questions to get new IDs, then remap conditional references
- Questions managed in local React state (not RHF field arrays) for flexible CRUD, saved in batch via single PATCH
- zodResolver cast needed for react-hook-form v7 / @hookform/resolvers v5 type mismatch with complex Zod schemas

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- TypeScript type mismatch: DB answerType enum includes `scale_custom` but client validation schema only has 6 types. Fixed by adding a `ServerQuestionData` interface and `toQuestionData` mapping function.
- Pre-existing lint errors in theme-toggle.tsx, people-table.tsx, template-list.tsx, auth/actions.ts (out of scope)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Template editor complete, ready for Plan 03 (drag-and-drop reordering, conditional logic UI)
- All 6 answer types have working configuration forms
- Versioning infrastructure in place for session-aware template editing

## Self-Check: PASSED

All 13 files verified present. Both task commits (2c51181, 1650a7e) verified in git log.

---
*Phase: 04-questionnaire-templates*
*Completed: 2026-03-03*
