# Sprint 08 — Session Wizard — Core

**Duration**: 2 weeks
**Dependencies**: Sprint 07

## Goals

Build the core session wizard: session state machine, step-by-step question flow grouped by category, all 6 answer input widgets, progress indicator, navigation, auto-save, and session score computation.

## Deliverables

1. **Session state machine**: scheduled → in_progress (on start) → completed (on confirm) / cancelled / missed
2. **Session wizard page** (`/sessions/[id]`):
   - Category-grouped steps (all questions in one category = one step)
   - Progress indicator (dots + step label)
   - Navigation: Previous / Next buttons + direct step jump
3. **Answer input widgets** (6 types):
   - `text`: multi-line textarea, expandable
   - `rating_1_5`: 5 clickable circles with labels on select
   - `rating_1_10`: 10 numbered buttons or slider with endpoint labels
   - `yes_no`: two large Yes/No buttons
   - `multiple_choice`: radio buttons (single) or checkboxes (multi)
   - `mood`: 5 emoji buttons with highlight ring
4. **Auto-save**: debounced 500ms save on every answer change via API
5. **Session score computation**: calculated on completion from all numeric answers (normalized to 1-5)
6. **Start session action**: transitions from scheduled → in_progress, records `started_at`
7. **Complete session action**: transitions to completed, records `completed_at`, computes `duration_minutes` and `session_score`
8. **API routes**: `PUT /api/sessions/[id]/start`, `PUT /api/sessions/[id]/complete`, `POST /api/sessions/[id]/answers`

## Acceptance Criteria

- [ ] Starting a session changes status to in_progress and records started_at
- [ ] Wizard displays questions grouped by category (one step per category)
- [ ] Progress indicator shows current step and total steps
- [ ] Navigation (prev/next) works correctly, including first/last step boundaries
- [ ] Direct jump to any step via progress dots works
- [ ] Each of the 6 answer widgets renders correctly and captures input
- [ ] `rating_1_5` shows labels on selection, stores numeric value
- [ ] `multiple_choice` respects single-select vs multi-select config
- [ ] `mood` emoji buttons highlight on selection
- [ ] All answers auto-save (500ms debounce) — verified by refreshing page and seeing saved values
- [ ] Required questions must be answered before completing (validation on complete)
- [ ] Completing a session computes session_score correctly
- [ ] Session duration_minutes is computed from started_at to completed_at
- [ ] Cancelled session does not compute score
- [ ] Session page shows appropriate state for scheduled / in_progress / completed

## Key Files

```
src/app/(dashboard)/sessions/page.tsx            # Session list (upcoming + past)
src/app/(dashboard)/sessions/[id]/page.tsx       # Session wizard
src/app/api/sessions/[id]/route.ts               # Get session
src/app/api/sessions/[id]/start/route.ts
src/app/api/sessions/[id]/complete/route.ts
src/app/api/sessions/[id]/answers/route.ts       # Save answers (auto-save)
src/components/session/session-wizard.tsx         # Main wizard controller
src/components/session/question-card.tsx          # Renders question by type
src/components/session/progress-bar.tsx           # Wizard progress
src/lib/validations/session.ts
src/lib/validations/answer.ts
src/lib/utils/scoring.ts                         # Score computation
```
