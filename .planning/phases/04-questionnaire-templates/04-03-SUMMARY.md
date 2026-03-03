---
phase: 04-questionnaire-templates
plan: 03
subsystem: ui, api
tags: [dnd-kit, drag-and-drop, conditional-logic, template-editor, zod, validation]

# Dependency graph
requires:
  - phase: 04-questionnaire-templates
    plan: 01
    provides: "Template CRUD API, question CRUD API, Zod validation schemas"
  - phase: 04-questionnaire-templates
    plan: 02
    provides: "Template editor UI, question card/form components, versioning-aware PATCH"
provides:
  - "Drag-and-drop question reordering with @dnd-kit (DndContext + SortableContext)"
  - "PATCH /api/templates/[id]/questions/reorder endpoint with contiguous sort_order"
  - "ConditionalLogicForm component with type-aware operator filtering and adaptive value inputs"
  - "Server-side validateConditionalLogic() utility for conditional reference validation"
  - "operatorsForAnswerType mapping (shared client/server)"
affects: [05-meeting-sessions]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities", "@dnd-kit/modifiers"]
  patterns: ["DndContext + SortableContext with vertical axis restriction", "Optimistic reorder with rollback", "Type-aware conditional operator filtering"]

key-files:
  created:
    - src/app/api/templates/[id]/questions/reorder/route.ts
    - src/components/templates/conditional-logic-form.tsx
  modified:
    - src/components/templates/template-editor.tsx
    - src/components/templates/question-card.tsx
    - src/components/templates/question-form.tsx
    - src/lib/validations/template.ts
    - src/app/api/templates/[id]/route.ts

key-decisions:
  - "@dnd-kit/modifiers used for restrictToVerticalAxis (separate package from @dnd-kit/core)"
  - "PointerSensor activation distance set to 8px to prevent accidental drag on click"
  - "ConditionalLogicForm uses local state with useEffect propagation (not RHF controlled)"
  - "Operators filtered client-side via operatorsForAnswerType map, validated server-side via validateConditionalLogic"

patterns-established:
  - "DnD pattern: DndContext + SortableContext wrapping list, useSortable per item with GripVertical handle"
  - "Conditional logic pattern: only earlier questions as targets (prevents circular by construction)"
  - "Type-adaptive form inputs: switch on answer type to render appropriate value control"

requirements-completed: [TMPL-09, TMPL-10]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 4 Plan 3: Question Reordering & Conditional Logic Summary

**Drag-and-drop question reordering with @dnd-kit and conditional logic configuration with type-aware operator filtering and server-side validation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T20:00:35Z
- **Completed:** 2026-03-03T20:07:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Questions reorderable via drag-and-drop with GripVertical handle, vertical axis constraint, and keyboard accessibility
- Optimistic reorder persists contiguous sort_order (0, 1, 2...) to database with rollback on error
- ConditionalLogicForm with toggle, target question dropdown (only earlier questions), operator select (filtered by answer type), and adaptive value input
- Server-side validateConditionalLogic() prevents circular references, invalid operators, and incomplete conditions
- Question cards show "Shows when Q{n} {operator} {value}" indicator for configured conditions

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @dnd-kit and implement drag-and-drop question reordering** - `7b8a3ac` (feat)
2. **Task 2: Conditional logic configuration and validation** - `985951a` (feat)

## Files Created/Modified
- `src/app/api/templates/[id]/questions/reorder/route.ts` - PATCH handler for question reordering with auth, RBAC, tenant isolation
- `src/components/templates/conditional-logic-form.tsx` - Conditional logic configuration UI with type-aware controls
- `src/components/templates/template-editor.tsx` - DndContext + SortableContext wrapping question list, reorder mutation
- `src/components/templates/question-card.tsx` - Sortable with useSortable, drag handle, conditional indicator text
- `src/components/templates/question-form.tsx` - ConditionalLogicForm integration, new props for question index and list
- `src/lib/validations/template.ts` - operatorsForAnswerType mapping, validateConditionalLogic() utility
- `src/app/api/templates/[id]/route.ts` - Added validateConditionalLogic call in PATCH handler
- `CHANGELOG.md` - Added drag-and-drop and conditional logic entries
- `package.json` / `bun.lock` - @dnd-kit dependencies

## Decisions Made
- Used @dnd-kit/modifiers as a separate package for restrictToVerticalAxis (not bundled in @dnd-kit/core)
- PointerSensor has 8px activation distance to prevent accidental drags when clicking edit/remove buttons
- ConditionalLogicForm manages its own local state and propagates via useEffect rather than being fully RHF-controlled
- Operators filtered both client-side (dropdown) and server-side (validation) using shared operatorsForAnswerType mapping

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in theme-toggle.tsx, people-table.tsx, and auth/actions.ts (out of scope, not from this plan's changes)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 (Questionnaire Templates) is now complete: CRUD, editor, versioning, reordering, conditional logic
- Ready for Phase 5 (Meeting Sessions) which will consume templates for session wizard
- All template features operational: create, edit, reorder questions, configure conditions, publish, set default, duplicate, archive

## Self-Check: PASSED

All 8 files verified present. Both task commits (7b8a3ac, 985951a) verified in git log.

---
*Phase: 04-questionnaire-templates*
*Completed: 2026-03-03*
