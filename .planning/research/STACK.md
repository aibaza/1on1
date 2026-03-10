# Stack Research

**Domain:** Session correction / versioning / AI validation / multi-recipient email — additive to existing 1on1 SaaS (v1.4)
**Researched:** 2026-03-10
**Confidence:** HIGH (all conclusions drawn from live codebase reads, not training assumptions)

---

## Verdict: No New Libraries Required

Every capability needed for v1.4 is already present in the installed dependency set. This milestone is entirely about adding new schema tables, new AI service functions, new email templates, and new API routes — using the stack that already ships and works in production.

---

## What Each Capability Needs

### 1. Session Answer History / Versioning

**Requirement:** Store before/after snapshots when a manager edits a completed session answer.

**Decision: Add a dedicated `session_answer_correction` table. Do NOT mutate `session_answer` in place.**

Rationale:
- `session_answer` has a `uniqueIndex` on `(session_id, question_id)` (confirmed in `src/lib/db/schema/answers.ts`). An in-place update destroys the original value with no recovery path.
- The audit requirement ("stored with timestamp, actor, reason, and original values") demands an immutable ledger, not a single mutable row.
- A dedicated table provides a clean query path — "show all corrections for session X" — without scanning the generic `audit_log` with string-matched action filters.
- Drizzle ORM handles this trivially: `pgTable` declaration + `drizzle-kit generate` + `drizzle-kit migrate`. No new ORM, no extension, no separate versioning library.

**Schema shape (informational — not a new library decision):**

Column mirroring (`original_*` / `new_*`) matches the typed-column pattern already used by `session_answer` (`answer_text`, `answer_numeric`, `answer_json`). This keeps analytics queries sane and avoids JSONB diff blobs.

```
session_answer_correction
  id                        uuid PK
  tenant_id                 uuid FK → tenant (RLS guard)
  session_id                uuid FK → session
  question_id               uuid FK → template_question
  corrected_by_id           uuid FK → user
  original_answer_text      text
  original_answer_numeric   decimal(6,2)
  original_answer_json      jsonb
  original_skipped          boolean
  new_answer_text           text
  new_answer_numeric        decimal(6,2)
  new_answer_json           jsonb
  new_skipped               boolean
  reason                    text NOT NULL
  ai_validation_status      varchar(20)  -- 'approved' | 'flagged' | 'skipped'
  ai_validation_note        text
  corrected_at              timestamptz NOT NULL DEFAULT now()
```

**Does Drizzle handle this?** Yes. `drizzle-orm ^0.38.4` (installed) supports all required column types. `drizzle-kit ^0.30.4` (installed) generates the migration. No upgrade needed.

### 2. AI-Based Reason Validation

**Requirement:** Before saving a correction, validate the manager's free-text reason for quality, relevance, and company-language compliance.

**Decision: Add a `validateCorrectionReason` function in `src/lib/ai/service.ts` using `generateObject` from the existing Vercel AI SDK (`ai ^6.0.111`).**

Rationale:
- The existing service already uses `generateObject` (via `generateTemplateChatTurn`) and `generateText` with `Output.object` (via `generateSummary`, `generateManagerAddendum`) — confirmed in `src/lib/ai/service.ts`. The correction validation is the same pattern.
- The existing `withLanguageInstruction` utility (also in `service.ts`) already handles Romanian / English enforcement for AI output. The same function applies here.
- `generateObject` returns a typed Zod-validated object in one call — no streaming needed for a binary validation check.
- **Model tier:** Use `claude-haiku-4-5` (already mapped in `src/lib/ai/models.ts` for `managerAddendum` and `actionSuggestions`). Reason validation is a short classification task — is the reason substantive and in the right language? Haiku keeps cost low and latency under 1 second. Sonnet is unnecessary.

**New Zod schema** (`src/lib/ai/schemas/correction-validation.ts`):

```typescript
z.object({
  valid: z.boolean(),
  feedback: z.string().describe("One sentence: why valid, or what is missing/wrong"),
  languageCompliant: z.boolean(),
})
```

The API route calls `validateCorrectionReason(reason, tenantLanguage)` before writing to the DB. If `valid: false`, return HTTP 422 with `feedback` so the UI can display it inline. The manager revises and resubmits — no DB write occurs until validation passes.

**Does the AI SDK support this?** Yes. `ai ^6.0.111` + `@ai-sdk/anthropic ^3.0.54` (both installed) support `generateObject`. The pattern is identical to `generateTemplateChatTurn` already in production.

### 3. Correction Email Notifications

**Requirement:** Notify report + all tenant admins when a session answer is corrected, showing before/after context.

**Decision: Add a new React Email template `correction-notification.tsx` in `src/lib/email/templates/` and a new notification sender function in `src/lib/notifications/`.**

Rationale:
- `@react-email/components ^1.0.8` and `@react-email/render ^2.0.4` are already installed. New templates are TSX files — no install step.
- The existing `sendPostSessionSummaryEmails` in `src/lib/notifications/summary-email.ts` provides the exact pattern: fetch context, loop recipients, render per-recipient HTML, call `getTransport().sendMail()`. The correction notification follows this pattern unchanged.
- The notification is **event-driven**, not cron-scheduled — fires directly from the correction API route after successful DB write and AI validation. Same "fire and forget" (non-fatal try/catch) pattern used in `runAIPipelineDirect` in `src/lib/ai/pipeline.ts`.
- **Multi-recipient loop:** The existing `summary-email.ts` already sends to two recipients by calling `sendMail` twice with different rendered HTML. For admins, query `users` where `role = 'admin'` and `tenant_id = tenantId`, then loop. No broadcast library needed.
- **i18n:** Use the existing `createEmailTranslator(locale)` from `src/lib/email/translator.ts` with new keys added to `messages/en/emails.json` and `messages/ro/emails.json`. Pattern is established.
- **Notification enum:** `notificationTypeEnum` in `src/lib/db/schema/enums.ts` needs `'session_correction'` added. This is a one-line schema change + migration, not a new dependency.

### 4. Audit Trail Storage

**Requirement:** Store correction with timestamp, actor, reason, and original values.

**Decision: Use `session_answer_correction` table as the primary immutable record, plus call the existing `logAuditEvent` utility inside the same transaction.**

Rationale:
- `session_answer_correction` IS the correction audit trail. It is immutable by design — no UPDATE/DELETE is exposed through any API route.
- `logAuditEvent` in `src/lib/audit/log.ts` adds a second, cross-resource searchable entry to `audit_log` with `action: 'session_answer_corrected'` and metadata `{ questionId, sessionId, correctionId }`. This enables the existing admin audit log UI to surface corrections without joining the corrections table.
- Both writes happen inside a single `withTenantContext` transaction — if either fails, neither is committed. Identical to the pattern in `runAIPipelineDirect`.

---

## Core Technologies (Unchanged — All Already Installed)

| Technology | Version in use | Role in v1.4 |
|------------|---------------|--------------|
| Drizzle ORM | ^0.38.4 | New `session_answer_correction` table schema |
| drizzle-kit | ^0.30.4 | `generate` + `migrate` for new table and enum value |
| PostgreSQL 16 | managed via Neon | Stores correction rows; RLS enforced via `tenant_id` |
| Vercel AI SDK (`ai`) | ^6.0.111 | `generateObject` for reason validation |
| `@ai-sdk/anthropic` | ^3.0.54 | Provides `claude-haiku-4-5` for validation task |
| Zod | ^4.3.6 | Schema for AI validation response object |
| `@react-email/components` | ^1.0.8 | New correction notification template |
| `@react-email/render` | ^2.0.4 | Async render to HTML for Nodemailer |
| Nodemailer | ^8.0.1 | SMTP delivery to multiple recipients |
| `use-intl` (via next-intl ^4.8.3) | ^4.8.3 | `createEmailTranslator` for EN/RO email strings |
| Auth.js v5 / next-auth | ^5.0.0-beta.30 | Session auth — correction API route authorization |

## Supporting Libraries (Unchanged — All Already Installed)

| Library | Version | Purpose in v1.4 | Notes |
|---------|---------|-----------------|-------|
| TanStack Query | ^5.90.21 | Client-side `useMutation` for correction submit | With optimistic update pattern |
| React Hook Form | ^7.71.2 | Correction reason textarea with inline AI feedback | With Zod resolver |
| shadcn/ui (radix-ui) | ^1.4.3 | Dialog + Textarea + inline error for correction UI | No new components needed |
| sonner | ^2.0.7 | Toast on correction success / failure | Already used throughout |

---

## Installation

No new packages required. After schema changes:

```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

---

## Alternatives Considered

| Capability | Our Choice | Alternative | Why Not |
|------------|-----------|-------------|---------|
| Versioning | Dedicated `session_answer_correction` table | Mutate `session_answer` + JSONB diff in `audit_log.metadata` | Loses typed column structure, makes querying corrections expensive, harder to display clean before/after diffs, breaks the uniqueIndex constraint intent |
| Versioning | Dedicated table | PostgreSQL temporal tables / `pgaudit` extension | Requires Neon extension support verification; adds infra complexity; overkill for a single correction event per answer |
| Versioning | Dedicated table | Append-only inserts into `session_answer` with a `is_current` flag | Breaks the existing `uniqueIndex` on `(session_id, question_id)` — requires dropping or replacing that constraint and updating all read queries |
| AI validation | `generateObject` (Vercel AI SDK) | Direct Anthropic REST API | SDK already abstracts retry, streaming, schema validation — no reason to bypass it |
| AI model | `claude-haiku-4-5` | `claude-sonnet-4-5` | Validation is binary classification + one sentence of feedback — Haiku is sufficient and keeps p95 latency under 1 second |
| Email multi-recipient | Loop `sendMail` per recipient | `to: [email1, email2, ...]` single call | Correction emails are role-differentiated — report and admins may receive different content variants. Separate renders per recipient are required. |
| Notification type | Extend existing `notificationTypeEnum` | Separate table for correction notifications | Existing table already tracks email sends for audit; extending with `session_correction` keeps the admin audit query surface uniform |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `pgaudit` PostgreSQL extension | Neon managed PostgreSQL — extension availability unverified; application-level audit is sufficient | `session_answer_correction` table + `logAuditEvent` |
| Temporal tables / history table extension | No Neon support evidence; overkill for a single correction event type | Explicit correction table with `original_*` columns |
| Standalone versioning library (e.g. `drizzle-history`) | No production-grade package exists for this; no ecosystem adoption | Drizzle `pgTable` with explicit columns |
| Bull / BullMQ / queue for correction email | Corrections are low-frequency events; synchronous non-fatal send is acceptable; Inngest was already removed from this project for this reason | Direct async call from API route (fire-and-forget, non-fatal try/catch) |
| Resend SDK for correction emails | Project decision (documented in PROJECT.md Key Decisions) is Nodemailer for provider flexibility | `getTransport().sendMail()` from `src/lib/email/send.ts` |
| DOMPurify / sanitize-html for correction reason | Reason is plain text stored in DB, never rendered as raw HTML in the email (React Email renders safe JSX). Adding sanitization here without fixing the 9 existing XSS sites (tracked in `.planning/codebase/CONCERNS.md` as CRITICAL) is security theater. | Fix XSS at display layer when addressing CONCERNS.md |
| New i18n library for email translations | `createEmailTranslator` from `src/lib/email/translator.ts` already provides this; a second translation system creates drift | Add new keys to existing `messages/en/emails.json` and `messages/ro/emails.json` |

---

## Integration Points Summary

### API Route Pattern

`POST /api/sessions/[id]/corrections`

1. Verify auth: session must belong to authenticated manager's series
2. Call `validateCorrectionReason(reason, tenantLanguage)` → `{ valid, feedback, languageCompliant }`
3. If `valid: false` → return 422 with `feedback` (no DB write)
4. `withTenantContext` transaction:
   - Insert into `session_answer_correction` (original values + new values + reason + ai_validation_status)
   - Update `session_answer` row with new answer values
   - `logAuditEvent(tx, { action: 'session_answer_corrected', ... })`
5. After transaction commits: fire-and-forget `sendCorrectionNotificationEmails(...)` (non-fatal, same pattern as `sendPostSessionSummaryEmails`)

### New Files to Create

| File | What It Is |
|------|-----------|
| `src/lib/db/schema/corrections.ts` | Drizzle table definition for `session_answer_correction` |
| `src/lib/ai/schemas/correction-validation.ts` | Zod schema for AI validation response |
| `src/lib/email/templates/correction-notification.tsx` | React Email template for correction notice |
| `src/lib/notifications/correction-email.ts` | Sender function (report + admins loop) |
| `src/app/api/sessions/[id]/corrections/route.ts` | POST API route |

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/db/schema/enums.ts` | Add `'session_correction'` to `notificationTypeEnum` |
| `src/lib/db/schema/index.ts` | Export `corrections` schema |
| `src/lib/ai/service.ts` | Add `validateCorrectionReason` function |
| `src/lib/ai/models.ts` | Add `correctionValidator: anthropic('claude-haiku-4-5')` entry |
| `messages/en/emails.json` | Add correction notification email keys |
| `messages/ro/emails.json` | Add Romanian translations for correction notification keys |

---

## Version Compatibility Notes

| Package | Constraint | Notes |
|---------|-----------|-------|
| `ai ^6.0.111` | Requires `@ai-sdk/anthropic ^3.0.x` | Both installed and working together in production |
| `drizzle-orm ^0.38.4` | Requires `drizzle-kit ^0.30.x` for codegen | Both installed |
| `@react-email/render ^2.0.4` | `render()` is async (breaking change from v1) | Already using `await render(...)` in `summary-email.ts` — new template follows same pattern |
| `zod ^4.3.6` | Zod v4 has syntax changes from v3 (`z.string().min(1)` → same; `z.object` → same; no `.parse` behavior change) | Already on v4 throughout — use v4 syntax in new schema |

---

## Sources

- `src/lib/db/schema/answers.ts` — confirmed `session_answer` uniqueIndex constraint and typed column pattern
- `src/lib/db/schema/audit-log.ts` — confirmed existing audit trail structure and JSONB metadata field
- `src/lib/db/schema/enums.ts` — confirmed `notificationTypeEnum` values and extension path
- `src/lib/db/schema/notifications.ts` — confirmed notification table structure for correction audit inserts
- `src/lib/ai/service.ts` — confirmed `generateObject` and `Output.object({ schema })` patterns both in use
- `src/lib/ai/models.ts` — confirmed model tier assignments and Haiku usage for short tasks
- `src/lib/ai/pipeline.ts` — confirmed fire-and-forget email pattern and `withTenantContext` transaction usage
- `src/lib/notifications/summary-email.ts` — confirmed multi-recipient loop and per-recipient HTML render
- `src/lib/email/translator.ts` — confirmed `createEmailTranslator` i18n pattern
- `src/lib/audit/log.ts` — confirmed `logAuditEvent` interface and transaction requirement
- `package.json` — confirmed all dependency versions currently installed
- All findings: HIGH confidence — based on live codebase, not training data

---

*Stack research for: v1.4 Session Corrections & Accountability — 1on1 SaaS*
*Researched: 2026-03-10*
