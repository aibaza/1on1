# Technology Stack

**Project:** Report Pre-fill Workflow
**Researched:** 2026-03-21

## Recommended Stack

No new dependencies. This feature is built entirely on the existing stack.

### Existing Stack (No Changes)

| Technology | Purpose | Why Sufficient |
|------------|---------|----------------|
| Next.js 16 (App Router) | Prefill pages, API routes | New route group for report-facing prefill wizard |
| Drizzle ORM | Schema migration, queries | Unique index change, new columns, dual-answer queries |
| Auth.js v5 | Report authentication | Report must be logged in to prefill (already has account) |
| React Hook Form + Zod | Prefill form validation | Same answer input components, new validation for prefill window |
| Nodemailer + React Email | Prefill invitation/reminder emails | New email templates, same sending infrastructure |
| TanStack Query | Prefill UI state management | Auto-save, optimistic updates for prefill answers |
| next-intl | i18n for prefill UI | All new strings need EN + RO translations |
| Vercel AI SDK | AI summary adaptation | Update prompts to include both report and manager perspectives |

### Schema Changes Required

| Change | Type | Impact |
|--------|------|--------|
| Drop + recreate unique index on `session_answer` | Migration | `(session_id, question_id)` to `(session_id, question_id, respondent_id)` |
| Add `prefill_visible` to `template_question` | Column add | `BOOLEAN NOT NULL DEFAULT true` |
| Add `prefill_open` and `prefill_submitted` to `session_status` enum | Enum alter | Two new values in the PostgreSQL enum |
| Add `prefill_submitted_at` to `session` | Column add | `TIMESTAMPTZ nullable` |
| Add `prefill_reminder_sent` to `session` | Column add | `BOOLEAN NOT NULL DEFAULT false` |

### New Email Templates

| Template | Trigger | Content |
|----------|---------|---------|
| `prefill-invitation` | Prefill window opens | "Your 1:1 with [Manager] is in 24h. Fill your pre-session check-in." |
| `prefill-reminder` | 6h before meeting, not yet filled | "Reminder: Your pre-session check-in is still open." |
| `prefill-completed` | Report submits prefill | Notify manager: "[Report] has completed their pre-session check-in." |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Data model | Same `session_answers` table | Separate `prefill_answers` table | Unnecessary duplication; `respondent_id` already exists; same answer types/columns |
| Auth for prefill | Require login | Magic link / token-based access | Security risk; report already has an account; keeps audit trail clean |
| Prefill UI | Reuse wizard components | Separate prefill page from scratch | DRY; same question widgets, same auto-save pattern |
| State machine | Extend `session_status` enum | Separate `prefill_status` column | Simpler state machine; one status field to check |

## Sources

- Codebase analysis: `/home/dc/work/1on1/src/lib/db/schema/answers.ts` (unique index discovery)
- Codebase analysis: `/home/dc/work/1on1/src/lib/db/schema/enums.ts` (session status enum)
- Codebase analysis: `/home/dc/work/1on1/src/lib/db/schema/sessions.ts` (session table structure)
