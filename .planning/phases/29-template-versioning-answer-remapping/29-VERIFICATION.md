---
phase: 29-template-versioning-answer-remapping
verified: 2026-03-19T21:30:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 29: Template Versioning & Answer Remapping Verification Report

**Phase Goal:** On publish, snapshot the current template to a template_version table (JSONB). Show version history in the template editor with read-only preview, change list diff, and restore capability. Answers always point to original question_id (no remapping). Prevents answer loss on template edits.
**Verified:** 2026-03-19T21:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Publishing a template creates a version snapshot row in template_version table | VERIFIED | `publish/route.ts` calls `buildTemplateSnapshot` + `tx.insert(templateVersions).values(...)` on `newPublishedState === true` |
| 2 | Version numbers auto-increment per template (1, 2, 3...) | VERIFIED | `coalesce(max(version_number), 0) + 1` pattern in publish route; UNIQUE index enforces race safety |
| 3 | Restoring a past version reproduces exact template content from snapshot | VERIFIED | `restore/route.ts` archives current sections/questions, inserts from snapshot with two-pass conditional remapping, resets labels |
| 4 | Template version number displayed in editor reflects latest published version | VERIFIED | `questionnaireTemplates.version` synced to `nextVersion` in publish route after snapshot insert |
| 5 | GET /api/templates/:id/versions returns compact version list with versionNumber, createdAt, createdByName, questionCount | VERIFIED | `versions/route.ts` joins users table, maps snapshot to extract questionCount without sending full snapshot |
| 6 | GET /api/templates/:id/versions/:versionNumber returns full snapshot JSONB + metadata | VERIFIED | `versions/[versionNumber]/route.ts` returns `{ versionNumber, createdAt, createdByName, snapshot }` |
| 7 | POST /api/templates/:id/versions/:versionNumber/restore archives current content and inserts from snapshot, sets isPublished=false | VERIFIED | `restore/route.ts`: archives sections + questions, deletes label assignments, inserts from snapshot, sets `isPublished: false` |
| 8 | Restore remaps conditionalOnQuestionId references from old question UUIDs to new | VERIFIED | Two-pass insert: first pass `conditionalOnQuestionId: null`, second pass updates using `questionMap` |
| 9 | Diff computation correctly identifies added, removed, and modified sections and questions | VERIFIED | `version-diff.ts` uses Map-based section and question id matching; 8 passing unit tests |
| 10 | Template editor shows a History button/tab that opens version history view | VERIFIED | `template-editor.tsx` imports `VersionHistoryTab`, has `showHistory` state, History button in both desktop header and mobile dropdown |
| 11 | Version preview includes read-only template content and diff toggle | VERIFIED | `version-preview.tsx` renders sections/questions read-only, toggle button for diff display, `VersionDiffList` shown when `showDiff && changes !== null` |
| 12 | Restore confirmation dialog shown before destructive action | VERIFIED | `AlertDialog` in `version-history-tab.tsx` with destructive action button and restore impact description |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema/template-versions.ts` | templateVersions Drizzle table with RLS-ready tenant_id | VERIFIED | Exports `templateVersions` (7 columns, 2 indexes) and `templateVersionsRelations` |
| `src/lib/db/schema/index.ts` | Exports template-versions | VERIFIED | Line: `export * from "./template-versions"` |
| `src/lib/db/migrations/0020_template_versions.sql` | CREATE TABLE with RLS | VERIFIED | Contains `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `CREATE POLICY "tenant_isolation"` |
| `src/lib/db/migrations/meta/_journal.json` | Migration 0020 registered | VERIFIED | Tag `"0020_template_versions"` present |
| `src/lib/templates/snapshot.ts` | buildTemplateSnapshot + TemplateVersionSnapshot | VERIFIED | Exports both; queries sections, questions, label assignments in a single TransactionClient |
| `src/lib/validations/template-version.ts` | Zod schemas for version API | VERIFIED | Exports `templateVersionSnapshotSchema`, `versionListItemSchema`, `restoreVersionSchema` |
| `src/app/api/templates/[id]/publish/route.ts` | Snapshot creation on publish | VERIFIED | Imports `buildTemplateSnapshot` and `templateVersions`; inserts snapshot when `newPublishedState === true` |
| `src/app/api/templates/[id]/versions/route.ts` | GET version list | VERIFIED | Exports `GET`; uses `canManageTemplates`, `withTenantContext`, `innerJoin(users)` |
| `src/app/api/templates/[id]/versions/[versionNumber]/route.ts` | GET single version | VERIFIED | Exports `GET`; parses `parseInt(versionNumber, 10)`; returns full snapshot |
| `src/app/api/templates/[id]/versions/[versionNumber]/restore/route.ts` | POST restore | VERIFIED | Exports `POST`; full archive+insert+remap+unpublish+audit flow |
| `src/lib/templates/version-diff.ts` | computeVersionDiff + VersionChange | VERIFIED | Both exported; section and question change detection with `details` field for modified items |
| `src/components/templates/version-history-tab.tsx` | Version list + restore flow | VERIFIED | TanStack Query for list and detail; `useMutation` for restore; `AlertDialog` for confirmation |
| `src/components/templates/version-preview.tsx` | Read-only version preview | VERIFIED | Exports `VersionPreview`; renders sections/questions read-only; embeds `VersionDiffList` |
| `src/components/templates/version-diff-list.tsx` | Change list display | VERIFIED | Exports `VersionDiffList`; color-coded by type with lucide icons; empty-state message |
| `src/components/templates/version-history-tab.test.tsx` | Component tests | VERIFIED | 7 tests passing (empty state, version list, preview, restore dialog, diff list) |
| `src/lib/templates/__tests__/snapshot.test.ts` | Snapshot builder unit tests | VERIFIED | 5 tests passing |
| `src/lib/templates/version-diff.test.ts` | Diff computation unit tests | VERIFIED | 8 tests passing |
| `messages/en/templates.json` | 25 history i18n keys (EN) | VERIFIED | All 23 keys under `templates.history` present |
| `messages/ro/templates.json` | 25 history i18n keys (RO) | VERIFIED | All 23 keys under `templates.history` present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `publish/route.ts` | `snapshot.ts` | `import buildTemplateSnapshot` | WIRED | Called inside `withTenantContext` when publishing |
| `publish/route.ts` | `template-versions.ts` | `import templateVersions` | WIRED | `tx.insert(templateVersions).values(...)` on publish |
| `restore/route.ts` | `template-versions.ts` | `import templateVersions` | WIRED | Queries version row by templateId + versionNumber |
| `restore/route.ts` | `templates.ts` | `import templateSections, templateQuestions` | WIRED | Archive + insert operations on both tables |
| `template-editor.tsx` | `version-history-tab.tsx` | `import VersionHistoryTab` | WIRED | Rendered at line 778 when `showHistory && !isCreateMode` |
| `version-history-tab.tsx` | `/api/templates/:id/versions` | TanStack Query fetch | WIRED | `fetch(\`/api/templates/${templateId}/versions\`)` in `useQuery` |
| `version-history-tab.tsx` | `/api/templates/:id/versions/:vNum/restore` | `useMutation` POST | WIRED | `fetch(..., { method: "POST" })` in `restoreMutation.mutationFn` |
| `version-preview.tsx` | `version-diff-list.tsx` | `import VersionDiffList` | WIRED | Rendered inside diff toggle when `showDiff && changes` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VER-01 | 29-01 | Publish creates version snapshot row in template_version table | SATISFIED | `publish/route.ts` inserts into `templateVersions` on publish |
| VER-02 | 29-01 | Version numbers auto-increment; template.version synced | SATISFIED | `coalesce(max(version_number), 0) + 1` + sync update in publish route |
| VER-03 | 29-02 | GET /api/templates/:id/versions returns compact version list | SATISFIED | `versions/route.ts` returns `{ versions: [...] }` with 4 fields per entry |
| VER-04 | 29-02 | Diff computation detects added/removed/modified sections and questions | SATISFIED | `computeVersionDiff` in `version-diff.ts` + 8 passing tests |
| VER-05 | 29-02 | POST restore archives current content, inserts from snapshot, sets isPublished=false | SATISFIED | `restore/route.ts` full restore flow with archive + insert + unpublish |
| VER-06 | 29-02 | Restore remaps conditionalOnQuestionId using old→new question id map | SATISFIED | Two-pass insert pattern: first pass null, second pass updates via `questionMap` |
| VER-07 | 29-03 | Template editor History button opens version history view with list, preview, diff | SATISFIED | `template-editor.tsx` History button + `VersionHistoryTab` + `VersionPreview` + `VersionDiffList` |
| VER-08 | 29-03 | Restore confirmation dialog shown with impact summary | SATISFIED | `AlertDialog` in `version-history-tab.tsx` with version number and impact description |

All 8 requirements covered across plans 29-01, 29-02, 29-03. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings detected.

- `compareQuestions` returns `null` (not a stub — legitimate early return meaning "no differences")
- `{/* Right: Preview or placeholder */}` comment is descriptive, not a TODO
- No `console.log` leaks in phase 29 files

---

### Human Verification Required

#### 1. History Tab Visual Layout

**Test:** Open the template editor for an existing published template, click the History button in the header
**Expected:** History view replaces the editor form; version list appears on left, preview panel on right (desktop), stacked on mobile
**Why human:** CSS grid layout and responsive breakpoint behavior cannot be verified by grep

#### 2. Restore Confirmation Dialog

**Test:** In version history, select an older version (not the latest), click "Restore this version", observe dialog
**Expected:** AlertDialog with title "Restore version N?", description mentioning unpublished draft and scheduled sessions, Cancel + Restore (destructive) buttons
**Why human:** Dialog rendering and user interaction flow cannot be verified statically

#### 3. Diff Toggle Behavior

**Test:** Select a version > 1, click "Show changes"
**Expected:** Diff list appears with color-coded entries (green=added, red=removed, amber=modified); "Hide changes" button replaces "Show changes"
**Why human:** Live query execution and conditional rendering requires browser interaction

---

## Gaps Summary

No gaps found. All 12 observable truths are verified, all 8 requirements are satisfied, all key links are wired, and 20 unit tests pass across 3 test files.

---

_Verified: 2026-03-19T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
