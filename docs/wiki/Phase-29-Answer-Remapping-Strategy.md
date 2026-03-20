# Phase 29: Answer Remapping Strategy

**Date:** 2026-03-20
**Status:** Diagnostic complete, strategy proposed
**Author:** Claude (diagnostic tests) + Ciprian (requirements)

## Problem Statement

When a template is modified after sessions have been completed using it, what happens to the historical answers? Are they orphaned, mismatched, or lost?

## Diagnostic Findings

We ran 8 diagnostic E2E tests against UAT with the Acme Corp seed data. The tests modified the Weekly Check-in template (added questions, unpublished/republished) and checked completed session integrity at each step.

### What Works (after Phase 29 fixes)

| Scenario | Result | Details |
|----------|--------|---------|
| **Adding questions** | Answers preserved | Old answers stay linked to their original question IDs. New questions simply have no answers for old sessions. |
| **Archiving questions** | Answers preserved | The PATCH route archives old questions (`isArchived=true`) and creates new ones with new UUIDs. Old answers keep their FK to the archived question. |
| **Answer-to-question type mapping** | Intact | Archived questions retain `answerType` and `scoreWeight`. The API loads archived questions when they have answers, so display works correctly. |
| **Previous session context** | Matched | Previous sessions shown in the wizard context panel load their answers correctly — 0 orphaned answers across 3 previous sessions. |
| **Score preservation** | Preserved | Session scores computed at completion time are stored on the session row and don't change when templates are edited later. |
| **Version snapshots** | Working | Each publish creates a complete JSONB snapshot in `template_version`. 30 versions accumulated during testing. |

### What Was Broken (fixed during Phase 29)

| Issue | Root Cause | Fix Applied |
|-------|-----------|-------------|
| **Answers appeared as "skipped"** | `GET /api/sessions/[id]` filtered questions by `isArchived=false`, so archived questions with answers were excluded from the response. The UI had no question to display for those answers. | Added logic to load archived questions that have answers in the current session, plus their archived sections. Commit `524f6d9`. |
| **Zod UUID validation rejected seed IDs** | Zod 4's `.uuid()` enforces strict RFC 4122 variant nibbles `[89ab]`. Seed data used `e`, `d`, `5`, etc. | Created lenient UUID validation (`src/lib/validations/uuid.ts`) that accepts any 8-4-4-4-12 hex format. Commit `fe4f873`. |

### Remaining Observations

| Finding | Severity | Notes |
|---------|----------|-------|
| **Summary page 404 for session IDs** | Low | `/sessions/[id]` treats the ID as a series ID, not session ID. `/sessions/[id]/summary` also 404s for seed session UUIDs. Sessions are viewed via series detail or history page. This is a routing design choice, not a bug. |
| **"Skipped" count on history page** | Informational | The history page shows 38-40 occurrences of "skipped" — these are from sessions where questions were legitimately skipped by the user (not from template changes). |
| **Version count grows on every test run** | Low | Each diagnostic run creates ~2 versions (unpublish + republish). 30 versions accumulated. Not a problem — version history is append-only by design. |
| **DIAG-Q questions accumulate** | Low | Diagnostic tests add questions to Weekly Check-in but don't delete them (UI interaction is fragile in E2E). Manual cleanup needed. |

## Current Architecture

```
TEMPLATE (v1, v2, v3...)
  ├── SECTION (current, non-archived)
  │     └── QUESTION (current, non-archived)
  ├── SECTION (archived from v1)
  │     └── QUESTION (archived from v1, answers still reference these)
  └── TEMPLATE_VERSION (JSONB snapshot per publish)

SESSION
  └── SESSION_ANSWER
        └── question_id FK → TEMPLATE_QUESTION (archived or current)
```

**Key invariant:** `session_answer.question_id` always points to the original `template_question` row that existed when the answer was given. That row is never deleted — only marked `isArchived=true`.

## Resolution Strategy

### Tier 1: Already Done (Phase 29)

1. **Version snapshots on publish** — Every publish creates a `template_version` row with a complete JSONB snapshot of the template state (sections, questions, answer types, configs). This provides a historical record of what the template looked like at each publish point.

2. **Archived question loading in session API** — The `GET /api/sessions/[id]` route now loads archived questions that have answers, preventing the "skipped" display bug.

3. **History tab with restore** — Users can view any previous version and restore it (creates an unpublished draft with the old content).

### Tier 2: Recommended Improvements (Future Phases)

#### 2a. Store `template_version_id` on Sessions

**What:** Add `template_version_id` FK to the `session` table. When a session is created or started, record which template version it uses.

**Why:** Currently, we reconstruct what template a session used by following `session.templateId → template_questions (filtered by isArchived + answer existence)`. With an explicit version reference, we can load the exact snapshot from `template_version.snapshot` instead.

**Benefit:** Deterministic display — no need to load archived questions heuristically. The snapshot has the exact state.

**Effort:** Low — schema change + populate on session creation.

#### 2b. Session Summary from Version Snapshot

**What:** When displaying a completed session, render question text and structure from the `template_version.snapshot` rather than from live `template_question` rows.

**Why:** Even with archived question loading, the current approach queries individual rows and merges them. Using the snapshot is simpler and guaranteed correct.

**Prerequisite:** 2a (need to know which version the session used).

**Effort:** Medium — change session display components to accept snapshot data.

#### 2c. Analytics Continuity Across Template Versions

**What:** Allow admins to "link" questions across versions for trend continuity. E.g., "Q1 in v1 is the same question as Q3 in v2 (it was reordered)."

**Why:** Currently, each template edit that archives questions breaks trend lines — analytics tracks by `question_id`, so a reworded question appears as a new time series.

**Decision from context gathering:** "Track by question_id — no false continuity." This is the correct default. Manual linking should be opt-in for power users who want to maintain trends across template restructures.

**Effort:** High — new UI, question-mapping table, analytics query changes.

### Tier 3: Not Needed

| Approach | Why Not |
|----------|---------|
| **Automatic answer remapping** | Answers should always reference their original question. Remapping changes the meaning of historical data. |
| **Copy-on-write sessions** | Duplicating all questions per session would be expensive and redundant with version snapshots. |
| **AI-based question matching** | Risk of false matches. Manual linking (2c) is more reliable. |

## Test Coverage

| Test File | Tests | Purpose |
|-----------|-------|---------|
| `e2e/template-versioning.spec.ts` | 9 | Phase 29 feature tests: publish, history, preview, diff, restore, mobile, empty state |
| `e2e/template-answer-remapping.spec.ts` | 9 | Diagnostic tests: answer preservation, type mapping, previous sessions, scores, UI display |
| `src/lib/templates/__tests__/snapshot.test.ts` | 5 | Unit: `buildTemplateSnapshot` |
| `src/lib/templates/version-diff.test.ts` | 8 | Unit: `computeVersionDiff` |
| `src/components/templates/version-history-tab.test.tsx` | 7 | Component: history tab rendering |

## Conclusion

The answer remapping problem is **resolved at the data layer** — answers are never orphaned or lost because archived questions are preserved indefinitely and loaded on demand. The version snapshot system provides a complete historical record.

The main remaining improvement opportunity is **Tier 2a** (store version ID on sessions) which would make the system more deterministic and enable rendering from snapshots instead of archived row queries. This should be considered for a future phase after the current backlog.

---

*Phase: 29-template-versioning-answer-remapping*
*Diagnostics run: 2026-03-20*
