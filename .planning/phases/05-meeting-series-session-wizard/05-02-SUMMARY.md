---
phase: 05-meeting-series-session-wizard
plan: 02
subsystem: ui
tags: [wizard, session, auto-save, debounce, widgets, react, tanstack-query]

# Dependency graph
requires:
  - phase: 05-meeting-series-session-wizard
    provides: Meeting series CRUD, session start API, per-category schema migration
provides:
  - Full-page session wizard with category-based step navigation
  - 6 question type input widgets (text, rating 1-5, rating 1-10, yes/no, multiple choice, mood)
  - Session data API returning comprehensive wizard payload
  - Answer upsert API with auto-save via debounce
  - Recap screen showing previous session data and open action items
  - useDebounce hook for auto-save pattern
affects: [05-03-context-panel, 05-04-notes-action-items, 05-05-summary-completion]

# Tech tracking
tech-stack:
  added: []
  patterns: [wizard-shell-state-management, category-grouping, debounced-auto-save, conditional-question-evaluation]

key-files:
  created:
    - src/app/(session-wizard)/layout.tsx
    - src/app/(session-wizard)/wizard/[sessionId]/page.tsx
    - src/app/api/sessions/[id]/route.ts
    - src/app/api/sessions/[id]/answers/route.ts
    - src/components/session/wizard-shell.tsx
    - src/components/session/wizard-top-bar.tsx
    - src/components/session/wizard-navigation.tsx
    - src/components/session/category-step.tsx
    - src/components/session/recap-screen.tsx
    - src/components/session/question-widget.tsx
    - src/components/session/widgets/text-widget.tsx
    - src/components/session/widgets/rating-1-5-widget.tsx
    - src/components/session/widgets/rating-1-10-widget.tsx
    - src/components/session/widgets/yes-no-widget.tsx
    - src/components/session/widgets/multiple-choice-widget.tsx
    - src/components/session/widgets/mood-widget.tsx
    - src/lib/hooks/use-debounce.ts
    - src/lib/validations/session.ts
  modified:
    - proxy.ts
    - CHANGELOG.md

key-decisions:
  - "Wizard state managed via single useReducer at shell level -- enables cross-category conditional logic and centralized answer tracking"
  - "navigator.sendBeacon used for beforeunload save -- reliable on page close without auth header limitations"
  - "Category order derived from first question sortOrder appearance -- canonical ordering prevents display inconsistencies"

patterns-established:
  - "Wizard shell pattern: useReducer + useQuery + useMutation for multi-step wizard with auto-save"
  - "Answer auto-save: local state update immediate, debounced PUT via useDebounce + useMutation"
  - "Conditional question evaluation: cross-category conditions evaluated at wizard level, not per-step"

requirements-completed: [SESS-02, SESS-06, SESS-11, SESS-12]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 5 Plan 02: Session Wizard Core Summary

**Immersive full-page wizard with 6 question widgets, category navigation, recap screen, and 500ms debounced auto-save via answer upsert API**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T08:00:29Z
- **Completed:** 2026-03-04T08:08:44Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- Full-page wizard layout (separate route group, no sidebar) at /wizard/[sessionId]
- Comprehensive session data API returning session, series, template questions, answers, previous sessions, and open action items in a single request
- Answer upsert API with onConflictDoUpdate on unique(session_id, question_id) index
- Wizard shell orchestrating state via useReducer with category grouping, conditional question evaluation, and debounced auto-save
- All 6 question type widgets: text (auto-resize textarea), rating 1-5 (stars), rating 1-10 (numbered buttons), yes/no (toggle buttons), multiple choice (radio buttons), mood (emoji buttons)
- Category navigation with pill tabs, prev/next buttons, and keyboard arrow shortcuts
- Recap screen showing last session summary or first-session empty state, plus open action items
- beforeunload handler saves pending answers via navigator.sendBeacon

## Task Commits

Each task was committed atomically:

1. **Task 1: Wizard layout, session API, answer upsert, debounce hook, and proxy route** - `23b043c` (feat)
2. **Task 2: Wizard shell, question widgets (6 types), category navigation, recap screen, and wizard page** - `cf10e32` (feat)

## Files Created/Modified
- `src/app/(session-wizard)/layout.tsx` - Full-page wizard layout without sidebar
- `src/app/(session-wizard)/wizard/[sessionId]/page.tsx` - Wizard page (Server Component delegating to WizardShell)
- `src/app/api/sessions/[id]/route.ts` - GET endpoint returning comprehensive wizard payload
- `src/app/api/sessions/[id]/answers/route.ts` - PUT endpoint for answer upsert (auto-save)
- `src/components/session/wizard-shell.tsx` - Core wizard orchestrator with useReducer state management
- `src/components/session/wizard-top-bar.tsx` - Exit button, session info, save status indicator
- `src/components/session/wizard-navigation.tsx` - Category pill tabs + prev/next buttons
- `src/components/session/category-step.tsx` - Renders questions for one category with required badges
- `src/components/session/recap-screen.tsx` - Last meeting recap or first-session empty state
- `src/components/session/question-widget.tsx` - Dispatcher routing answerType to correct widget
- `src/components/session/widgets/text-widget.tsx` - Auto-resizing textarea widget
- `src/components/session/widgets/rating-1-5-widget.tsx` - Star rating widget with configurable labels
- `src/components/session/widgets/rating-1-10-widget.tsx` - 10 numbered button widget
- `src/components/session/widgets/yes-no-widget.tsx` - Two large toggle buttons (1=yes, 0=no)
- `src/components/session/widgets/multiple-choice-widget.tsx` - Radio-style buttons from answerConfig.options
- `src/components/session/widgets/mood-widget.tsx` - 5 emoji buttons with configurable labels
- `src/lib/hooks/use-debounce.ts` - Generic useDebounce<T> hook (500ms default)
- `src/lib/validations/session.ts` - Zod answerUpsertSchema + AnswerUpsertInput type
- `proxy.ts` - Comment noting wizard routes are protected
- `CHANGELOG.md` - Session wizard entries

## Decisions Made
- Wizard state managed via single useReducer at shell level -- enables cross-category conditional logic and centralized answer tracking
- navigator.sendBeacon used for beforeunload save -- reliable on page close without requiring auth headers in fetch
- Category order derived from first question's sortOrder appearance -- canonical ordering prevents display inconsistencies (Pitfall 5 from RESEARCH.md)
- answerNumeric stored as string in DB (decimal column) but exposed as number in API responses

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wizard renders at /wizard/[sessionId] with full data loading and auto-save
- Category step has placeholder slots for notes and action items (Plan 04)
- Summary step placeholder in place (Plan 05)
- Context panel integration point ready (Plan 03)
- Score trend sparkline placeholder in recap screen (Plan 03)

---
*Phase: 05-meeting-series-session-wizard*
*Completed: 2026-03-04*
