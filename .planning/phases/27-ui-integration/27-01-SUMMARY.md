---
phase: 27-ui-integration
plan: "01"
subsystem: testing
tags: [vitest, react, testing-library, happy-dom, tdd, correction-ui]

# Dependency graph
requires:
  - phase: 26-email-notification-i18n
    provides: correction email pipeline operational — UI components can now close the loop
provides:
  - Failing RED tests for AmendedBadge, CorrectionHistoryPanel, AnswerCorrectionForm
  - Behavioral contracts for all three correction UI components
  - TDD foundation for Wave 2 (component implementation) and Wave 3 (integration)
affects:
  - 27-02 (AmendedBadge implementation must satisfy these tests)
  - 27-03 (CorrectionHistoryPanel + AnswerCorrectionForm implementation must satisfy these tests)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED phase: test files import non-existent components to create module-not-found failures"
    - "// @vitest-environment happy-dom directive required for React component tests (global env is node)"
    - "vi.mock for TanStack Query useQuery/useMutation to control AI validation state in tests"
    - "vi.mock for next-intl useTranslations to avoid i18n setup in unit tests"
    - "vi.mock for use-debounce to eliminate timing complexity in correction form tests"

key-files:
  created:
    - src/components/session/__tests__/amended-badge.test.tsx
    - src/components/session/__tests__/correction-history-panel.test.tsx
    - src/components/session/__tests__/answer-correction-form.test.tsx
  modified:
    - CHANGELOG.md

key-decisions:
  - "// @vitest-environment happy-dom required for all correction UI test files — global vitest env is node, React component rendering needs DOM"
  - "CorrectionHistoryPanel empty state test checks that 'Jane Smith' is not in the document (content not expanded) rather than checking for a specific trigger element — implementation-agnostic"
  - "AnswerCorrectionForm loading test uses querySelectorAll with multiple selectors (aria-label, role, class) to stay implementation-agnostic about spinner approach"
  - "Submit-not-disabled test asserts AI is advisory only — Wave 2 implementation must never block on AI validation result"

patterns-established:
  - "Inline type definitions in test files when importing from non-existent modules (avoids circular type import issues)"
  - "TDD RED for UI components: import from target path that does not exist, confirm module-not-found error before committing"

requirements-completed:
  - CORR-01
  - CORR-03
  - WFLOW-04
  - WFLOW-05

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 27 Plan 01: UI Integration Summary

**Three TDD RED test files for correction UI: AmendedBadge (3 tests), CorrectionHistoryPanel (5 tests), AnswerCorrectionForm (9 tests) — all fail with module-not-found, documenting behavioral contracts for Wave 2 implementation**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-13T07:30:00Z
- **Completed:** 2026-03-13T07:38:39Z
- **Tasks:** 3
- **Files modified:** 4 (3 test files created + CHANGELOG.md)

## Accomplishments
- Created failing test suite for `AmendedBadge` — 3 tests covering renders/not-renders, amber styling, accessible text
- Created failing test suite for `CorrectionHistoryPanel` — 5 tests covering empty/non-empty state, full name display, manager-only reason visibility, entry count badge
- Created failing test suite for `AnswerCorrectionForm` — 9 tests covering original answer display, textarea, cancel callback, AI validation states (loading/pass/fail/null), advisory-only submit button

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for AmendedBadge (CORR-01)** - `56445f1` (test)
2. **Task 2: Write failing tests for CorrectionHistoryPanel (CORR-03)** - `6421600` (test)
3. **Task 3: Write failing tests for AnswerCorrectionForm (WFLOW-04, WFLOW-05)** - `0c5153c` (test)

_Note: TDD RED phase — all commits are test-only; no implementation files created._

## Files Created/Modified
- `src/components/session/__tests__/amended-badge.test.tsx` - 3 failing tests for AmendedBadge behavioral contract
- `src/components/session/__tests__/correction-history-panel.test.tsx` - 5 failing tests for CorrectionHistoryPanel behavioral contract
- `src/components/session/__tests__/answer-correction-form.test.tsx` - 9 failing tests for AnswerCorrectionForm behavioral contract
- `CHANGELOG.md` - Added TDD RED entries for all three test files

## Decisions Made
- `// @vitest-environment happy-dom` directive required at top of each test file — the global vitest environment is `node`, React component rendering requires a DOM environment
- CorrectionHistoryPanel empty-state test asserts `Jane Smith` is NOT in the document (implementation-agnostic — doesn't depend on Collapsible specifics)
- AnswerCorrectionForm loading test uses `querySelectorAll` with multiple selectors to remain implementation-agnostic about the spinner element used
- Submit-not-disabled test explicitly encodes the "AI is advisory only" requirement from the design spec

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three RED test files exist and fail with module-not-found errors
- Existing `section-label.test.tsx` still passes (no regressions — 1 test file, 2 tests passing)
- Wave 2 (plan 27-02) can now implement `AmendedBadge`, `CorrectionHistoryPanel`, and `AnswerCorrectionForm` against these contracts
- Wave 3 (plan 27-03) integration tests and session-summary-view wiring can proceed after Wave 2 turns GREEN

---
*Phase: 27-ui-integration*
*Completed: 2026-03-13*
