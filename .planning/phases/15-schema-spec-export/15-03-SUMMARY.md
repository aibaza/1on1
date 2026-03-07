---
phase: 15-schema-spec-export
plan: "03"
subsystem: ui
tags: [templates, export, i18n, role-gating, react]

# Dependency graph
requires:
  - phase: 15-02
    provides: Export API route at /api/templates/[id]/export that returns Content-Disposition header for filename extraction
provides:
  - ExportButton reusable client component (icon and full variants, blob download, loading state, toast feedback)
  - Export icon button on template cards in template-list (admin/manager only, hover-revealed)
  - Export full button in template editor toolbar (admin/manager only, before Publish)
  - Schema Docs link in template list header (all roles)
  - export.* translation keys in en/templates.json and ro/templates.json
affects:
  - Phase 16 (IMP) — export UX is now user-facing; import UX should match

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ExportButton follows csv-export-button.tsx blob download pattern (fetch → Content-Disposition → createObjectURL → anchor click → revoke)"
    - "canManageTemplates(role) gate on client-side rendering for role-gated UI elements"
    - "Hover-reveal export button on cards using group/group-hover Tailwind classes with relative wrapper div"

key-files:
  created:
    - src/components/templates/export-button.tsx
  modified:
    - src/components/templates/template-list.tsx
    - src/components/templates/template-editor.tsx
    - messages/en/templates.json
    - messages/ro/templates.json

key-decisions:
  - "ExportButton variant='icon' placed inside relative wrapper div alongside Link-wrapped Card to avoid nested interactive elements — card stays fully clickable, export button reveals on hover"
  - "Schema Docs link visible to all roles (not gated) — documentation is always useful regardless of role"
  - "ExportButton placed before Publish button in editor toolbar — export is a read action, should precede state-changing actions visually"

patterns-established:
  - "Hover-revealed action buttons on cards: wrap card in relative div with group class, position button absolutely with opacity-0 group-hover:opacity-100"

requirements-completed: [EXP-01, EXP-02, EXP-03, EXP-04, EXP-05]

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 15 Plan 03: Export Button UI Summary

**Reusable ExportButton component (icon + full variants) wired into template list cards and editor toolbar with role-gated rendering via canManageTemplates**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-07T07:48:00Z
- **Completed:** 2026-03-07T07:52:25Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `ExportButton` client component following the existing `csv-export-button.tsx` blob download pattern exactly — fetch, Content-Disposition header parsing, createObjectURL, anchor click, revoke
- Wired export icon button (hover-revealed) onto template list cards for admin/manager users only
- Wired export full button into template editor toolbar (before Publish) for admin/manager users only
- Added Schema Docs link in template list header, visible to all roles, navigates to `/templates/schema`
- Added `export.*` translation keys to both `en/templates.json` and `ro/templates.json` with parity

## Task Commits

Each task was committed atomically:

1. **Task 1: ExportButton component and translation keys** - `df3a1a9` (feat)
2. **Task 2: Wire ExportButton into template-list.tsx and template-editor.tsx** - `1a7e195` (feat)

## Files Created/Modified
- `src/components/templates/export-button.tsx` - Reusable ExportButton with icon/full variants, loading spinner, toast feedback, blob download
- `src/components/templates/template-list.tsx` - Schema Docs link added to header; Export icon button hover-revealed on cards (admin/manager only)
- `src/components/templates/template-editor.tsx` - ExportButton (full) added to toolbar before Publish (admin/manager only)
- `messages/en/templates.json` - export.button, export.exporting, export.downloaded, export.failed, export.schemaLink keys
- `messages/ro/templates.json` - Romanian equivalents with identical key structure

## Decisions Made
- **Card Export button placement:** The template card was previously entirely wrapped in a `<Link>`. To add a clickable button alongside it, the card was restructured with a relative wrapper `<div>` and the Export button positioned absolutely using Tailwind's `group`/`group-hover` pattern. This preserves the full card click area while revealing the export button on hover.
- **Schema Docs link:** Placed to the left of the Create Template button, visible to all roles (not role-gated). Documentation is universally useful.
- **Editor toolbar position:** ExportButton placed before Publish — export reads state, publish changes it. Visual left-to-right ordering reflects action impact.

## Deviations from Plan

None - plan executed exactly as written. The only structural decision was how to position the export button on the Link-wrapped card, which was resolved with a relative wrapper + absolute positioning pattern (clean, no nesting of interactive elements inside the Link).

## Issues Encountered
- Pre-existing lint error in `template-editor.tsx:268` (React Hook Form `watch()` in mutation callback) — confirmed pre-existing via git stash check, not caused by this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 complete: schema spec, export API route, schema docs page, and export UI all delivered
- Phase 16 (IMP - import) can begin: the export format is defined, the API is live, and the UX pattern is established
- Import UI should mirror the export UX for consistency

---
*Phase: 15-schema-spec-export*
*Completed: 2026-03-07*
