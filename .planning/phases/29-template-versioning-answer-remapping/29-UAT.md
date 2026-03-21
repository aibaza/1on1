---
status: testing
phase: 29-template-versioning-answer-remapping
source: 29-01-SUMMARY.md, 29-02-SUMMARY.md, 29-03-SUMMARY.md
started: 2026-03-19T21:30:00Z
updated: 2026-03-19T21:30:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running dev server. Run `bunx drizzle-kit migrate` to apply migration 0020_template_versions. Start with `bun run dev`. Server boots without errors on port 4300. Navigate to https://1on1.surmont.co/ — app loads normally.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `bunx drizzle-kit migrate` to apply migration 0020_template_versions. Start with `bun run dev`. Server boots without errors on port 4300. Navigate to https://1on1.surmont.co/ — app loads normally.
result: [pending]

### 2. Publish Creates Version Snapshot
expected: Go to Templates → open any template → make a small edit (add or change a question) → click Publish. Then click the History button in the editor header. You should see a version entry (e.g., "v1 — Mar 19, 2026 — [your name] — N questions").
result: [pending]

### 3. Version List Shows Multiple Versions
expected: Publish the same template a second time (make another small change first). History tab should now show two version entries in descending order (newest first), each with version number, date, author name, and question count.
result: [pending]

### 4. Version Preview (Read-Only)
expected: Click a version entry in the History tab. A read-only preview appears showing the template as it was at that version — sections with their questions, answer type badges. Content is not editable.
result: [pending]

### 5. Diff Toggle Shows Change List
expected: While viewing a version preview, toggle "Show changes". A color-coded change list appears: green for added questions/sections, red for removed, amber for modified. Each entry has an icon and description.
result: [pending]

### 6. Restore Confirmation Dialog
expected: Click "Restore this version" on a past version. A confirmation dialog appears with: the version number being restored, question count, and a destructive-styled "Restore" button. Cancel dismisses the dialog.
result: [pending]

### 7. Restore Creates Unpublished Draft
expected: Confirm the restore. The template goes back to the editor view (not History). The template is now unpublished (draft state). The content matches the restored version's sections and questions.
result: [pending]

### 8. History Button on Mobile
expected: On a narrow viewport (or mobile device), the History button should be accessible from the overflow/menu dropdown in the template editor header.
result: [pending]

### 9. i18n: Romanian Labels
expected: Switch language to Romanian (user menu → language). Navigate to template editor → History tab. All labels should be in Romanian (e.g., "Istoric versiuni", "Restaurare", etc.), not English.
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
