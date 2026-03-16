# Phase 27: UI Integration

**Status**: Complete
**Milestone**: v1.4 Session Corrections & Accountability
**Depends on**: Phase 26
**Completed**: 2026-03-13

## Goal

Users can initiate, review, and track session answer corrections entirely within the session detail page — inline before/after form, AI feedback on the reason field, Amended badges on modified answers, and a correction history panel accessible without navigation.

## Success Criteria

1. CORR-01: Every corrected answer row on the session detail page shows an "Amended" badge
2. CORR-03: A correction history panel at the bottom of the session detail page lists all amendments with timestamp, actor name, and reason — collapsed when empty, expanded by default when corrections are present
3. WFLOW-04: The correction reason field shows AI feedback (pass/fail + one-sentence note) after the manager stops typing, without leaving the session detail page
4. WFLOW-05: A manager (or admin) clicking the edit icon on an answer row sees the original and new answer values side by side inline — no separate page navigation occurs

## What Was Built

- **TDD RED scaffold** (Plan 01): Failing tests for `AmendedBadge` (renders "Amended" text), `CorrectionHistoryPanel` (renders timestamps, actor names, reasons), and `AnswerCorrectionForm` (submit not disabled on AI validation result — advisory-only requirement). All tests use `// @vitest-environment happy-dom`.
- **`AmendedBadge` component** (`src/components/session/amended-badge.tsx`): shadcn `Badge variant="secondary"` with hardcoded "Amended" string (tests render without next-intl provider). Shown on corrected answer rows via `correctionsByAnswerId: Map<string, Correction[]>` O(1) lookup.
- **`CorrectionHistoryPanel` component** (`src/components/session/correction-history-panel.tsx`): Collapsible panel at the bottom of session detail. Shows all amendments with timestamp, actor name, and reason. Collapsed when no corrections exist, expanded by default when corrections are present.
- **Server data join**: `src/app/(dashboard)/sessions/[id]/summary/page.tsx` fetches correction history alongside session data; joins actor names from users table.
- **`AnswerCorrectionForm` component** (Plan 03): Inline before/after display using `renderAnswerDisplay` (exported from `session-summary-view.tsx`). Debounced AI validation feedback via `/corrections/validate-reason` endpoint. Submit button gated only by `isPending` — AI result is advisory, never blocks submission.
- **Edit icon integration**: Edit icons wired into `SessionSummaryView` answer rows for managers and admins. `correctionsByAnswerId` passed down for `AmendedBadge` display.
- **Phase gate** (Plan 04): Full quality gate — typecheck, lint, Vitest, build all passing. Vitest `exclude: ['e2e/**']` added to prevent Playwright spec pickup.

## Key Decisions

- Submit button gated only by `isPending` — test spec explicitly encodes AI-advisory-only requirement; reason length validation omitted to match test contract
- `correctionsByAnswerId` keyed by `session_answers.id` — O(1) lookup per answer row for AmendedBadge display
- `renderAnswerDisplay` and `SummaryAnswer` exported from `session-summary-view.tsx` — shared display logic reused in `AnswerCorrectionForm` without duplication
- `// @vitest-environment happy-dom` required for correction UI test files — global vitest env is node; React rendering needs DOM
- Chainable `adminDb` mock in `vi.mock` factory returns `select().from().where().limit()` resolving to `[]` by default — sendCorrectionEmails tests inherit working dedup mock without explicit setup
- `vitest.config.ts` exclude `['e2e/**', 'node_modules/**']` — prevents Playwright specs from being picked up by Vitest

## Key Files

- `src/components/session/amended-badge.tsx` (new)
- `src/components/session/correction-history-panel.tsx` (new)
- `src/components/session/answer-correction-form.tsx` (new)
- `src/components/session/__tests__/amended-badge.test.tsx` (new)
- `src/components/session/__tests__/correction-history-panel.test.tsx` (new)
- `src/components/session/__tests__/answer-correction-form.test.tsx` (new)
- `src/components/session/session-summary-view.tsx`
- `src/app/(dashboard)/sessions/[id]/summary/page.tsx`
- `vitest.config.ts`
