# Architecture Research

**Domain:** Session corrections & accountability for 1:1 meeting SaaS
**Researched:** 2026-03-10
**Confidence:** HIGH — based on direct codebase inspection, not assumptions

---

## The Four Architecture Questions

### Q1: Separate `session_answer_history` table vs soft-update with version column?

**Recommendation: Separate `session_answer_history` table.**

**Rationale:**

The existing `session_answer` table has a `UNIQUE(session_id, question_id)` index (see `src/lib/db/schema/answers.ts:39`). The current auto-save pattern uses `onConflictDoUpdate` against that index — answers are intentionally mutable during `in_progress` sessions. That design is correct for live sessions.

For corrections on *completed* sessions, the semantics are different: you must preserve what was originally submitted, who changed it, when, and why. A version column on `session_answer` would muddy this boundary — you would need to query `WHERE version = 1` to get the original, which is fragile and adds cognitive overhead to every analytics query that currently does `SELECT avg(answer_numeric) FROM session_answer`.

A dedicated `session_answer_history` table is the right move because:

1. **Analytics queries stay clean.** `session_answer` always holds the current (authoritative) value. Analytics pipelines, score computations, and session summaries need zero changes.
2. **Audit trail is unambiguous.** History rows are append-only. Each row records the complete before-state, actor, reason, and timestamp. No `WHERE version = MAX(version)` logic anywhere.
3. **RLS extends naturally.** Add `tenant_id` to history table and the existing RLS pattern applies directly.
4. **The correction reason lives next to the data it explains.** You do not need to cross-reference `audit_log` to find out why answer X was changed — it is on the history row itself.

The `audit_log` table still records the event (`session_answer.corrected`) for centralized compliance querying. The history table is for data-level reconstruction ("show me what this answer was before").

**Verdict against version column:** A version integer requires bumping it on each correction, adds a migration that touches a hot table, and still requires joining to a separate "diff" store if you want before/after values. Not worth it.

---

### Q2: AI reason validation — synchronous during form submission, or separate validation endpoint?

**Recommendation: Separate validation endpoint, called before form submission.**

**Rationale:**

The existing AI pipeline pattern (`src/lib/ai/pipeline.ts`) is fire-and-forget. The session `complete` route returns immediately and AI runs in the background. However, corrections are different: the user *must* get feedback on their reason before the correction is committed. You cannot fire-and-forget something the form is waiting on.

Two options for synchronous validation:
- Option A: Validate inline inside `POST /api/sessions/[id]/corrections` before writing to DB
- Option B: Separate `POST /api/sessions/[id]/corrections/validate-reason` endpoint, called on blur or on submit-attempt before the real submission

**Option B is better** because:

1. **UX feedback without side effects.** The user sees validation feedback ("reason too vague — please be more specific") while still on the form, before the correction is persisted. The mutation endpoint stays clean.
2. **Retryable without risk.** The validate endpoint is idempotent — calling it twice has no side effects. The corrections endpoint is not idempotent (it writes to DB, fires email, writes audit log). Keeping these separate avoids partial-state problems if the user's connection drops mid-submit.
3. **Follows existing patterns.** The template AI editor (`src/app/api/templates/[id]/ai/route.ts`) is a separate endpoint called by the client. The AI call is isolated from the mutation.
4. **Latency is manageable.** Reason validation is a single short `generateText` call with a boolean+feedback output schema. Claude Haiku returns in ~800ms. The form can show a spinner during validation before allowing final submit.

The validate endpoint returns `{ valid: boolean, feedback: string | null }`. The correction submit endpoint also validates the reason server-side (defense in depth) but can use a much faster heuristic (length check) since the AI pre-validation already ran.

**AI model choice:** Use the cheapest/fastest model (haiku) with a structured output schema. The validation prompt: "Is this correction reason specific, honest, and written in {language}? Reason: {reason}. Answer with valid: true/false and feedback if false." Output via `generateObject` with a small Zod schema.

---

### Q3: Correction email — how does it integrate with the existing React Email + Nodemailer + i18n stack?

**Recommendation: New `session-correction.tsx` React Email template, new `sendCorrectionNotificationEmails()` function, new translation keys in `messages/{locale}/emails.json`.**

**Pattern to follow:** `src/lib/notifications/summary-email.ts` is the exact model. It:
1. Fetches session + series + users + tenant language from `adminDb` (bypasses RLS — correct for background work)
2. Calls `createEmailTranslator(locale)` to get a `t()` function
3. Renders the React Email template with pre-interpolated label strings
4. Sends via `getTransport().sendMail()`
5. Inserts a record into `notifications` table for audit

**New template props needed for correction email:**

```typescript
interface SessionCorrectionEmailProps {
  recipientName: string;
  managerName: string;
  reportName: string;
  sessionNumber: number;
  questionText: string;
  originalAnswer: string;       // human-readable, formatted by caller
  correctedAnswer: string;      // human-readable, formatted by caller
  correctionReason: string;
  correctedAt: string;          // formatted date
  viewSessionUrl: string;
  labels: SessionCorrectionLabels;
}
```

**i18n keys to add to `messages/en/emails.json` and `messages/ro/emails.json`:**

```json
"sessionCorrection": {
  "subject": "Session #{sessionNumber} answer corrected",
  "heading": "Session Answer Corrected",
  "greeting": "Hi {recipientName},",
  "body": "{managerName} corrected an answer in Session #{sessionNumber} with {reportName}.",
  "question": "Question",
  "originalAnswer": "Original Answer",
  "correctedAnswer": "Corrected Answer",
  "reason": "Reason for Correction",
  "correctedAt": "Corrected on {date}",
  "button": "View Session",
  "footer": "This email was sent by 1on1"
}
```

**Recipients:** Report + all tenant admins. Not just the report. Admins are accountability watchers — this is explicit in the v1.4 requirements. Fetch admins via `WHERE tenant_id = ? AND role = 'admin'` using `adminDb`.

**Notification type enum:** The `notificationTypeEnum` in `src/lib/db/schema/enums.ts` needs a new value `'session_correction'`. This requires a Drizzle migration to alter the enum in PostgreSQL.

---

### Q4: Where in RBAC does correction permission sit — manager-only, or admin too?

**Recommendation: Manager who owns the series, OR tenant admin. Not all managers.**

**Rationale:**

Current RBAC logic (see `src/lib/auth/rbac.ts`):
- `isAdmin(role)` — tenant-wide admin access
- `isSeriesParticipant(userId, series)` — is this user the manager or report on this series?

The existing `complete` route checks `session.user.id !== series.managerId` — only the specific manager can complete. Corrections should follow the same resource-level model but extended to admins.

**Correct check for corrections:**

```typescript
const canCorrect =
  isAdmin(session.user.role) ||
  session.user.id === series.managerId;
```

**Why not report?** Reports cannot correct their own answers after the session is complete — that would undermine the accountability purpose. Corrections are a manager/admin action.

**Why admin too?** Admins have company-wide access per the RBAC model. If a manager leaves the company, an admin must be able to correct erroneous data. Also, the email notification going to admins implies they have oversight authority — giving them correction power is consistent with that.

**Why not all managers?** Only the manager on the specific series has context to judge whether a correction is appropriate. A different manager correcting someone else's session data would be a security concern.

**New RBAC helper to add in `src/lib/auth/rbac.ts`:**

```typescript
export function canCorrectSession(
  userId: string,
  userRole: string,
  series: { managerId: string }
): boolean {
  return isAdmin(userRole) || userId === series.managerId;
}
```

---

## System Overview

```
+---------------------------------------------------------------+
|                      Client (Browser)                         |
|  +-----------------------------------------------------------+|
|  |  SessionCorrectionDialog (Client Component)               ||
|  |  - Answer diff display (before/after)                    ||
|  |  - Reason textarea with AI validation feedback           ||
|  |  - TanStack Query mutations                              ||
|  +-----------------------------+-----------------------------+|
+--------------------------------+------------------------------+
                                 |
          POST /api/sessions/[id]/corrections/validate-reason
          POST /api/sessions/[id]/corrections
                                 |
                                 v
+---------------------------------------------------------------+
|                      API Layer (Next.js)                      |
|                                                               |
|  POST /validate-reason                                        |
|    -> auth check -> AI validation (Claude Haiku)              |
|    -> returns { valid, feedback }                             |
|                                                               |
|  POST /corrections                                            |
|    -> auth + RBAC (canCorrectSession)                         |
|    -> withTenantContext transaction:                           |
|       1. Fetch session (must be completed)                    |
|       2. Fetch series (get managerId for RBAC check)          |
|       3. Read current answer -> snapshot into history         |
|       4. Update session_answer with new values                |
|       5. Recompute session_score on session row               |
|       6. Write audit_log (session_answer.corrected)           |
|    -> fire-and-forget: sendCorrectionNotificationEmails()     |
|    -> return corrected answer                                 |
+---------------------------------------------------------------+
                                 |
                                 v
+---------------------------------------------------------------+
|                      Data Layer                               |
|                                                               |
|  session_answer         -- updated in-place (current values)  |
|  session_answer_history -- new row (before-state snapshot)    |
|  session.session_score  -- recomputed after correction        |
|  audit_log              -- immutable event record             |
|  notification           -- email record for report + admins   |
+---------------------------------------------------------------+
```

---

## New Schema — Explicit Definitions

### `session_answer_history` (new table)

This is an append-only audit table. Rows are never updated or deleted.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, defaultRandom() | |
| `tenant_id` | UUID | FK tenant, NOT NULL | For RLS |
| `session_answer_id` | UUID | FK session_answer, NOT NULL | Which answer was corrected |
| `session_id` | UUID | FK session, NOT NULL | Denormalized for query convenience |
| `question_id` | UUID | FK template_question, NOT NULL | Denormalized |
| `corrected_by_id` | UUID | FK user, NOT NULL | Actor who made the correction |
| `original_answer_text` | TEXT | nullable | Previous text value |
| `original_answer_numeric` | DECIMAL(6,2) | nullable | Previous numeric value |
| `original_answer_json` | JSONB | nullable | Previous json value |
| `original_skipped` | BOOLEAN | NOT NULL | Previous skipped state |
| `new_answer_text` | TEXT | nullable | New text value |
| `new_answer_numeric` | DECIMAL(6,2) | nullable | New numeric value |
| `new_answer_json` | JSONB | nullable | New json value |
| `new_skipped` | BOOLEAN | NOT NULL | New skipped state |
| `correction_reason` | TEXT | NOT NULL | Mandatory explanation |
| `ai_reason_valid` | BOOLEAN | nullable | Result of AI validation (null if check skipped) |
| `corrected_at` | TIMESTAMPTZ | NOT NULL, defaultNow() | |

**Indexes:**
- `INDEX(session_id)` — load all corrections for a session display
- `INDEX(tenant_id, corrected_by_id)` — admin view of corrections by actor
- `INDEX(session_answer_id)` — history for a specific answer

**RLS policy:** Same pattern as all other tenant tables — `tenant_id = current_setting('app.current_tenant_id')::uuid`.

### Modified: `notificationTypeEnum` (enum value addition)

Add `'session_correction'` to the existing `notification_type` PostgreSQL enum. This requires:
1. Adding to `src/lib/db/schema/enums.ts` notificationTypeEnum array
2. Drizzle migration: `ALTER TYPE notification_type ADD VALUE 'session_correction'`

PostgreSQL `ADD VALUE` on an enum does not require a table rewrite. It is safe to run on production with zero downtime.

### No changes to `session_answer`

The existing schema is sufficient. Corrections update the three value columns plus `skipped` plus `answered_at` (set to correction timestamp). The `respondent_id` stays as the original respondent — it records *who answered*, not *who corrected*.

### No changes to `session`, `audit_log`, `notification`

These tables need no schema changes. `session_score` on `session` is recomputed after correction using the existing `computeSessionScore()` utility.

---

## New Files — Explicit List

### Schema file

**`src/lib/db/schema/corrections.ts`** (new)
- Defines `sessionAnswerHistory` table
- Exports `sessionAnswerHistoryRelations`

### API routes

**`src/app/api/sessions/[id]/corrections/route.ts`** (new)
- `POST` — submit a correction (requires validated reason)
- Body: `{ questionId, newAnswerText?, newAnswerNumeric?, newAnswerJson?, skipped?, correctionReason }`
- Reads current answer -> writes history row -> updates answer -> recomputes score -> audit log -> fire-and-forget email

**`src/app/api/sessions/[id]/corrections/validate-reason/route.ts`** (new)
- `POST` — validate correction reason via AI
- Body: `{ questionId, reason, originalAnswer, newAnswer }`
- Returns: `{ valid: boolean, feedback: string | null }`
- Uses `generateObject` with a small Zod schema

### AI schema

**`src/lib/ai/schemas/correction-reason.ts`** (new)
- `correctionReasonValidationSchema` — `z.object({ valid: z.boolean(), feedback: z.string().nullable() })`

### AI service function

Add `validateCorrectionReason()` to **`src/lib/ai/service.ts`** (modify existing)
- Parameters: `reason: string, questionText: string, originalAnswer: string, newAnswer: string, language?: string`
- Returns: `{ valid: boolean, feedback: string | null }`

### RBAC helper

Add `canCorrectSession()` to **`src/lib/auth/rbac.ts`** (modify existing)

### Email template

**`src/lib/email/templates/session-correction.tsx`** (new)
- React Email component following `session-summary.tsx` pattern
- Props: before/after answer diff + reason + metadata + translated labels
- Single template used for both report and admin recipients (same content)

### Notification function

**`src/lib/notifications/correction-email.ts`** (new)
- `sendCorrectionNotificationEmails()` following `summary-email.ts` pattern
- Fetches report + all tenant admins
- Renders and sends `SessionCorrectionEmail` for each recipient
- Inserts `notification` rows with type `session_correction`

### Zod validation schema

Add to **`src/lib/validations/session.ts`** (modify existing)
- `correctionSubmitSchema` — validates correction body including reason min-length
- `correctionValidateReasonSchema` — validates the validate-reason endpoint body

### i18n keys

Modify **`messages/en/emails.json`** and **`messages/ro/emails.json`** (modify existing)
- Add `emails.sessionCorrection` namespace with keys listed in Q3 above

### UI component

**`src/components/session/correction-dialog.tsx`** (new — Client Component)
- Dialog triggered from session history view on a completed session's answer
- Shows question text, current answer, new answer input (matching original answer type widget)
- Reason textarea with AI validation feedback
- Two-phase submit: validate reason -> on valid, submit correction
- TanStack Query mutations for both endpoints

---

## Data Flow

### Correction Submit Flow

```
Manager clicks "Edit" on completed session answer
    |
    v
CorrectionDialog opens (pre-populated with current answer)
    |
    v
Manager enters new answer + correction reason
    |
    v
[Blur / "Check reason"] -> POST /corrections/validate-reason
    |
    v (AI returns { valid: true/false, feedback })
Manager sees validation feedback inline
    |
    v
Manager clicks "Save Correction" (enabled only when reason valid)
    |
    v
POST /api/sessions/[id]/corrections
    +-- withTenantContext transaction:
    |   +-- Load session (assert status = 'completed')
    |   +-- Load series (get managerId for RBAC check)
    |   +-- canCorrectSession check
    |   +-- Load current session_answer row
    |   +-- INSERT session_answer_history (before-state snapshot)
    |   +-- UPDATE session_answer (new values + answeredAt = now)
    |   +-- Recompute + UPDATE session.session_score
    |   +-- logAuditEvent('session_answer.corrected', metadata={questionId, reason})
    +-- fire-and-forget: sendCorrectionNotificationEmails()
    |
    v
Client invalidates TanStack Query cache for session
Dialog closes, answer shows updated value + "corrected" badge
```

### Email Send Flow

```
sendCorrectionNotificationEmails({ sessionId, correctionHistoryId, tenantId })
    |
    v
Fetch: session, series, question text, history row (before/after),
       manager, report, admins, tenant locale
    |
    v
createEmailTranslator(locale)  ->  t()
    |
    v
For each recipient (report + all admins):
    render SessionCorrectionEmail({ ...props, labels })
    transport.sendMail(...)
    adminDb.insert(notifications, { type: 'session_correction', ... })
```

---

## Architectural Patterns

### Pattern 1: History Table as Append-Only Snapshot

**What:** Before updating a record, write its current state to a history table. The live table always holds the current value. The history table is append-only — never updated, never deleted.

**When to use:** Any mutation where the previous value has legal, compliance, or accountability significance. Corrections qualify because they affect recorded session data after the session is closed.

**Trade-offs:** Slightly more storage. History table queries need explicit filtering. In exchange: analytics queries are never complicated by versioning logic, and the audit trail is physically separate from the live data.

**Example in this codebase:**
```typescript
// Inside withTenantContext transaction:

// 1. Read current answer
const [current] = await tx.select().from(sessionAnswers)
  .where(and(
    eq(sessionAnswers.sessionId, sessionId),
    eq(sessionAnswers.questionId, data.questionId)
  ))
  .limit(1);

// 2. Write history (before-state)
await tx.insert(sessionAnswerHistory).values({
  tenantId: session.user.tenantId,
  sessionAnswerId: current.id,
  sessionId,
  questionId: data.questionId,
  correctedById: session.user.id,
  originalAnswerText: current.answerText,
  originalAnswerNumeric: current.answerNumeric,
  originalAnswerJson: current.answerJson,
  originalSkipped: current.skipped,
  newAnswerText: data.newAnswerText ?? null,
  newAnswerNumeric: data.newAnswerNumeric != null ? String(data.newAnswerNumeric) : null,
  newAnswerJson: data.newAnswerJson ?? null,
  newSkipped: data.skipped ?? false,
  correctionReason: data.correctionReason,
});

// 3. Update live record
await tx.update(sessionAnswers)
  .set({ ... })
  .where(eq(sessionAnswers.id, current.id));
```

### Pattern 2: Separate AI Validation Endpoint

**What:** Expose AI validation as a distinct endpoint from the mutation endpoint. The client calls validate first, gets feedback, then submits the confirmed mutation.

**When to use:** When the user needs real-time feedback from AI before committing a write operation that has side effects (email, audit log, DB write).

**Trade-offs:** Two HTTP round trips instead of one. The mutation endpoint must still validate server-side for defense in depth. In exchange: the UX is clean (feedback before commit), and the mutation endpoint stays simple.

**Example:**
```typescript
// POST /api/sessions/[id]/corrections/validate-reason
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { reason, questionText, originalAnswer, newAnswer } = await request.json();
  const language = await getTenantLanguage(session.user.tenantId);
  const result = await validateCorrectionReason(reason, questionText, originalAnswer, newAnswer, language);
  return NextResponse.json(result); // { valid: boolean, feedback: string | null }
}
```

### Pattern 3: Fire-and-Forget Non-Blocking Side Effects

**What:** After a mutation commits to DB, trigger email/analytics as non-awaited promises with `.catch(console.error)`.

**When to use:** Side effects that must not block the HTTP response. Session completion already uses this for AI pipeline and notification scheduling (see `src/app/api/sessions/[id]/complete/route.ts:219`).

**Trade-offs:** Email failure is silent from the user's perspective. DB mutation already committed — if email fails, you must retry manually or accept the missed notification. Acceptable for notifications; unacceptable for primary data.

```typescript
// After transaction commits:
sendCorrectionNotificationEmails({
  sessionId,
  correctionHistoryId: historyRow.id,
  tenantId: session.user.tenantId,
}).catch((err) => console.error("Correction notification failed:", err));
```

---

## Recommended Build Order

Dependencies flow DB -> validation -> API -> AI -> email -> UI. Build in this sequence to avoid blocked work.

| Step | What | Why This Order |
|------|------|----------------|
| 1 | `src/lib/db/schema/corrections.ts` | All API routes depend on this table |
| 2 | Drizzle migration (generate + apply) | Schema must exist before any API can use it |
| 3 | `notificationTypeEnum` update + migration | Email sender depends on this enum value |
| 4 | `src/lib/validations/session.ts` additions | API routes import these before doing anything |
| 5 | `canCorrectSession()` in `rbac.ts` | Corrections route imports this |
| 6 | `src/lib/ai/schemas/correction-reason.ts` | AI service function depends on this |
| 7 | `validateCorrectionReason()` in `service.ts` | Validate-reason route depends on this |
| 8 | i18n key additions (`messages/*/emails.json`) | Email template depends on these keys |
| 9 | `src/lib/email/templates/session-correction.tsx` | Notification sender depends on this |
| 10 | `src/lib/notifications/correction-email.ts` | Corrections route calls this fire-and-forget |
| 11 | `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` | UI depends on this endpoint |
| 12 | `src/app/api/sessions/[id]/corrections/route.ts` | UI depends on this endpoint |
| 13 | `src/components/session/correction-dialog.tsx` | Needs both API endpoints to exist |
| 14 | Wire dialog into session history/summary view | Component must exist before placement |

---

## Integration Points — Summary

### Modified files

| File | Change |
|------|--------|
| `src/lib/db/schema/enums.ts` | Add `'session_correction'` to `notificationTypeEnum` |
| `src/lib/db/schema/index.ts` | Re-export `sessionAnswerHistory` from corrections.ts |
| `src/lib/auth/rbac.ts` | Add `canCorrectSession()` helper |
| `src/lib/ai/service.ts` | Add `validateCorrectionReason()` function |
| `src/lib/validations/session.ts` | Add `correctionSubmitSchema`, `correctionValidateReasonSchema` |
| `messages/en/emails.json` | Add `emails.sessionCorrection` namespace |
| `messages/ro/emails.json` | Add `emails.sessionCorrection` namespace |

### New files

| File | Purpose |
|------|---------|
| `src/lib/db/schema/corrections.ts` | `session_answer_history` table + relations |
| `src/lib/ai/schemas/correction-reason.ts` | Zod schema for AI validation output |
| `src/lib/email/templates/session-correction.tsx` | React Email template |
| `src/lib/notifications/correction-email.ts` | Email send function |
| `src/app/api/sessions/[id]/corrections/route.ts` | Correction submit endpoint |
| `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` | AI reason validation endpoint |
| `src/components/session/correction-dialog.tsx` | UI dialog (Client Component) |
| `drizzle/migrations/XXXX_add_correction_history.sql` | Generated migration |

### Zero-change items (confirmed)

| Item | Why no change needed |
|------|---------------------|
| `session_answer` table schema | Value columns are sufficient; no new columns needed |
| `session` table schema | `session_score` is already nullable decimal; recomputed in place |
| `audit_log` table | `metadata` JSONB accepts arbitrary context; no schema change |
| `notification` table | Column types are sufficient; only enum value addition needed |
| `withTenantContext` / RLS | History table gets same tenant_id pattern; no infra changes |
| `computeSessionScore()` utility | Already stateless; called with a fresh answer list |
| AI pipeline / `runAIPipelineDirect` | Corrections do not trigger re-summarization |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Reusing the PUT /answers Endpoint for Corrections

**What people do:** Allow `PUT /api/sessions/[id]/answers` to accept corrections to completed sessions by removing the `status !== 'in_progress'` guard.

**Why it is wrong:** The existing endpoint does an upsert with `onConflictDoUpdate` — it overwrites silently with no history, no reason, no audit. It also has no RBAC check for manager-only access to completed sessions.

**Do this instead:** New endpoint at `POST /api/sessions/[id]/corrections`. Different semantics, different RBAC, different side effects, different history model.

### Anti-Pattern 2: Storing Correction Reason Only in audit_log Metadata

**What people do:** Put the correction reason in `audit_log.metadata` JSONB and skip the history table.

**Why it is wrong:** The `audit_log` is an event record for compliance — it records *that* something happened. The `session_answer_history` table is a data record for reconstruction — it records *what* the data was before. These are different use cases. If you want to display a correction timeline in the UI ("this answer was X, corrected to Y, reason: Z"), querying `audit_log.metadata` requires deserializing JSONB and is fragile to metadata shape changes.

**Do this instead:** History table for data reconstruction. `audit_log` for compliance events. Both.

### Anti-Pattern 3: Blocking HTTP Response on AI Validation During Submit

**What people do:** Add AI reason validation inside the corrections POST handler, blocking the response until AI returns.

**Why it is wrong:** If the AI API is slow or unavailable, the user's correction is blocked. The mutation should not depend on a third-party API call. AI validation is UX-layer feedback, not a data-layer guard.

**Do this instead:** Validate via the separate `/validate-reason` endpoint *before* submit. The correction endpoint does a lightweight server-side sanity check (min-length, non-empty) but does not call the AI.

### Anti-Pattern 4: Sending Correction Emails to All Managers

**What people do:** Notify all managers in the tenant, not just the series participants.

**Why it is wrong:** Corrections are sensitive — a manager's data error being visible to unrelated managers is a privacy concern and creates noise.

**Do this instead:** Notify report (the other party in the session) + all tenant admins (who have legitimate oversight). The correcting manager does not need a copy (they made the correction).

### Anti-Pattern 5: Recomputing Analytics Snapshots After Every Correction

**What people do:** Trigger `computeSessionSnapshot()` after each correction to refresh analytics.

**Why it is wrong:** `computeSessionSnapshot()` (used in the AI pipeline) is designed for post-session computation. Running it on corrections would overwrite analytics snapshots outside the normal cadence, potentially confusing trending data. The corrections milestone does not specify analytics refresh as a requirement.

**Do this instead:** Update `session.session_score` to reflect the corrected answer values (this is visible in the session view). Leave `analytics_snapshot` rows as-is for this milestone. If analytics refresh on correction is needed, that belongs in a future milestone with explicit requirements.

---

## Scaling Considerations

This feature has negligible scaling impact at expected v1.4 volumes:

| Scale | Architecture Note |
|-------|------------------|
| Current (early SaaS, under 1k users) | Single serverless function per correction is fine; no queue needed |
| 10k+ users | Correction emails could be queued via the existing `notification` table + a pending-jobs poller if synchronous send latency becomes an issue |
| 100k+ users | History table grows linearly with corrections, not with sessions; index on `session_id` is the first query optimization if correction timeline queries slow down |

---

## Sources

- Direct inspection: `src/lib/db/schema/answers.ts` — confirms `UNIQUE(session_id, question_id)` constraint and `onConflictDoUpdate` auto-save pattern
- Direct inspection: `src/app/api/sessions/[id]/answers/route.ts` — confirms `in_progress` status guard and upsert semantics
- Direct inspection: `src/app/api/sessions/[id]/complete/route.ts` — confirms fire-and-forget AI + notification pattern (lines 219-241)
- Direct inspection: `src/lib/ai/pipeline.ts` — confirms `generateText`/`generateObject` usage and language parameter pattern
- Direct inspection: `src/lib/ai/service.ts` — confirms `generateText` + `Output.object` pattern for structured AI output
- Direct inspection: `src/lib/notifications/summary-email.ts` — confirms email send pattern (adminDb, createEmailTranslator, render, sendMail, insert notification)
- Direct inspection: `src/lib/auth/rbac.ts` — confirms RBAC helper pattern, role hierarchy, `isAdmin()` function
- Direct inspection: `src/lib/audit/log.ts` — confirms `logAuditEvent` interface and transaction-bound pattern
- Direct inspection: `src/lib/db/schema/enums.ts` — confirms enum structure and existing notification types
- Direct inspection: `src/lib/db/schema/sessions.ts` — confirms `session_score` column type (decimal) and `aiStatus` field
- Direct inspection: `messages/en/emails.json` — confirms i18n key structure for email templates
- Direct inspection: `.planning/PROJECT.md` — confirms v1.4 correction requirements (mandatory reason, AI validation, email notification, audit trail)
- Confidence: HIGH — all findings based on direct codebase inspection

---
*Architecture research for: session corrections & accountability (v1.4)*
*Researched: 2026-03-10*
