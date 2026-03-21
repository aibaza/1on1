# Domain Pitfalls

**Domain:** Report Pre-fill Workflow for 1:1 Sessions
**Researched:** 2026-03-21

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Breaking the Unique Index Migration
**What goes wrong:** The current unique index `(session_id, question_id)` must be replaced with `(session_id, question_id, respondent_id)`. If done incorrectly, existing data with NULL or incorrect respondent_id values will violate the new constraint.
**Why it happens:** Existing session_answers may have been inserted without explicit respondent_id, or all answers default to the manager.
**Consequences:** Migration fails in production, or data integrity issues with duplicate answers.
**Prevention:** Before migration, audit all existing `session_answer` rows to confirm every row has a valid `respondent_id`. Write a data migration that backfills any missing respondent_ids from the session's series manager_id.
**Detection:** Run `SELECT count(*) FROM session_answer WHERE respondent_id IS NULL` before migration.

### Pitfall 2: Analytics Regression from Dual Answers
**What goes wrong:** Session score computation currently does `AVG(answer_numeric) WHERE session_id = X`. With dual answers, this suddenly averages BOTH the report's and manager's answers, silently changing historical score comparisons.
**Why it happens:** Existing queries don't filter by respondent_id because there was only ever one answer per question.
**Consequences:** All session scores change retroactively if queries are not updated. Analytics trends break. AI summaries reference wrong scores.
**Prevention:** Audit EVERY query that reads from `session_answer` and add a `respondent_id` filter where appropriate. The session score computation must explicitly use manager's answers only.
**Detection:** Run the full test suite after migration. Add a regression test that computes session scores with and without dual answers.

### Pitfall 3: Prefill Window Race Condition
**What goes wrong:** Report is mid-prefill when the manager starts the session, which transitions status from `prefill_open` to `in_progress`. Report's unsaved work is lost or subsequent save attempts fail.
**Why it happens:** The status transition doesn't account for concurrent access.
**Consequences:** Report loses partially filled answers, bad UX, frustrated user.
**Prevention:** When manager starts the session, the report's current auto-saved answers are preserved (they are already in `session_answer`). The status change just closes the write window -- it does NOT delete anything. The API should return a clear "prefill window closed" message if the report tries to save after transition.
**Detection:** E2E test where report is filling while manager starts.

### Pitfall 4: Exposing Manager-Only Questions to Report
**What goes wrong:** Questions marked `prefill_visible = false` are accidentally sent to the report's prefill API response.
**Why it happens:** Developer forgets the filter, or the filter is client-side only.
**Consequences:** Report sees questions they shouldn't (e.g., "Rate this person's growth trajectory"), breaking trust.
**Prevention:** Filter `prefill_visible` in the server-side query, never in client-side rendering. Add a Vitest test that verifies the API response excludes hidden questions.
**Detection:** API integration test with a template that has mixed visibility.

## Moderate Pitfalls

### Pitfall 5: Email Spam from Multiple Reminders
**What goes wrong:** Cron job sends multiple reminder emails because it doesn't track whether a reminder was already sent.
**Prevention:** The `prefill_reminder_sent` boolean on the session table acts as a guard. Cron checks this before sending.

### Pitfall 6: Timezone Confusion for Prefill Window
**What goes wrong:** Prefill window opens at "24h before scheduled_at" in UTC, but the report expects their local timezone.
**Prevention:** `scheduled_at` is stored as `TIMESTAMPTZ` (UTC). The 24h calculation is timezone-agnostic (simple timestamp subtraction). Emails should display times in the tenant's configured timezone.

### Pitfall 7: Report Submits Empty Prefill
**What goes wrong:** Report opens prefill, skips all questions, hits submit. Manager sees "prefill completed" but there is nothing useful.
**Prevention:** Two approaches: (a) require at least N answers before submit, or (b) allow empty submit but show "0 of 8 questions answered" to manager. Recommendation: option (b) -- do not block submission, but make the completeness visible.

### Pitfall 8: Stale Prefill After Template Change
**What goes wrong:** Template is updated between when prefill opens and when the session happens. Report filled against old questions.
**Prevention:** Session is already pinned to a `template_id` at creation time. Template versioning is already in place. Prefill questions come from the session's template snapshot, not the live template.

### Pitfall 9: Existing Queries Assume Single Answer Per Question
**What goes wrong:** Code like `session_answers.find(a => a.questionId === qId)` (without checking respondentId) returns the wrong answer when two exist.
**Why it happens:** Every existing query was written when only one answer per question existed.
**Prevention:** grep the entire codebase for session_answer queries and update them all to be respondent-aware. Prefer explicit joins or filters over generic `.find()`.
**Detection:** TypeScript won't catch this -- it requires manual code audit. Add a lint rule or code review checklist item.

## Minor Pitfalls

### Pitfall 10: Mobile Keyboard Pushes Prefill UI Off-Screen
**What goes wrong:** Report fills text answers on mobile; virtual keyboard obscures the input field.
**Prevention:** Use `scroll-margin-bottom` or `scrollIntoView()` when input is focused. Test on actual mobile devices.

### Pitfall 11: Prefill Notifications When Series is Paused
**What goes wrong:** A meeting series is paused but the scheduled session still triggers a prefill email.
**Prevention:** Prefill trigger logic must check `series.status = 'active'` before opening the window.

### Pitfall 12: i18n for New Email Templates
**What goes wrong:** Prefill invitation email goes out in English even though the report's locale is Romanian.
**Prevention:** Use the same locale-aware email rendering pattern as existing email templates. Check `user.notification_preferences` or tenant locale.

### Pitfall 13: Prefill UI Accessible After Session Complete
**What goes wrong:** Report bookmarks the prefill URL and accesses it after the session is completed.
**Prevention:** API route must check session status. Return 403/410 if status is not `prefill_open`. UI should show a "This prefill window has closed" message.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema migration | Unique index change breaks existing data | Audit + backfill respondent_id before migration |
| Schema migration | Enum alter on production | Use `ALTER TYPE ... ADD VALUE` which is safe in PostgreSQL |
| Report prefill UI | Mobile UX issues | Test on real devices; use existing responsive patterns |
| Email triggers | Duplicate sends, timezone confusion | Guard booleans, TIMESTAMPTZ arithmetic |
| Manager review integration | Showing wrong respondent's answers | Always filter by respondent_id in queries |
| Manager review integration | Existing `.find()` calls break | Full codebase audit of session_answer reads |
| Analytics adaptation | Score regression from dual answers | Explicit respondent_id filter in ALL score queries |
| AI pipeline | AI prompt doesn't know about dual answers | Update AI system prompt to reference both perspectives |

## Sources

- Codebase: `src/lib/db/schema/answers.ts` -- unique index constraint, respondent_id column
- Codebase: `src/lib/db/schema/sessions.ts` -- session schema
- [15Five Review Workflow](https://success.15five.com/hc/en-us/articles/360002681112-Review-a-Check-in)
- [Lattice 1:1 Pre-Meeting Email](https://help.lattice.com/hc/en-us/articles/360059920054-Navigate-1-1s-as-a-Manager)
