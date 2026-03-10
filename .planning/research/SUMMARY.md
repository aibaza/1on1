# Project Research Summary

**Project:** v1.4 Session Corrections & Accountability — 1on1 SaaS
**Domain:** Post-completion session answer correction with AI-validated audit trail
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

This milestone adds a structured, accountable post-completion correction capability to an already-deployed 1:1 meeting product. The research found that no new dependencies are required — every capability needed (AI, email, RBAC, schema tooling) is already installed and working in production. The implementation is entirely additive: one new database table (`session_answer_history`), two new API sub-routes, a new AI service function, a new email template, and a new UI dialog component.

The recommended approach is a dedicated append-only `session_answer_history` table that snapshots the before-state on every correction, keeping the live `session_answer` table as the single source of current values. This preserves clean analytics queries (no versioning logic in `SELECT avg()` calls), provides unambiguous before/after comparison for the UI, and matches the pattern used by regulated industries (healthcare, legal, accounting) where original values must never be destroyed. AI validation of the correction reason is run as a separate pre-submit endpoint call, giving the manager inline feedback without blocking the mutation on AI availability.

The primary risks are implementation-level, not architectural: writing the audit log outside the correction transaction (compliance gap), failing to add Row-Level Security to the new history table (cross-tenant exposure), allowing AI validation to block the HTTP correction response (availability coupling), and sending one email per corrected answer instead of one per session (notification spam). All four are avoidable with explicit checklists and the build order prescribed by the architecture research.

## Key Findings

### Recommended Stack

The full stack for v1.4 is already in `package.json` and running in production. No installation step is required. Schema changes are handled by `drizzle-kit generate` + `drizzle-kit migrate`. AI validation uses `generateObject` from the existing Vercel AI SDK via `@ai-sdk/anthropic`, calling `claude-haiku-4-5` — the same low-cost model tier already used for manager addenda and action suggestions. Email notifications follow the existing `summary-email.ts` pattern: React Email template rendered server-side, sent via Nodemailer, logged to the `notifications` table with `createEmailTranslator()` for EN/RO support.

**Core technologies:**
- Drizzle ORM `^0.38.4` + drizzle-kit `^0.30.4`: new `session_answer_history` table schema and migration — no version change needed
- Vercel AI SDK `ai ^6.0.111` + `@ai-sdk/anthropic ^3.0.54`: `generateObject` for structured reason validation output — same pattern as existing `generateTemplateChatTurn`
- `claude-haiku-4-5`: reason validation model — binary classification + one feedback sentence, appropriate cost tier
- `@react-email/components ^1.0.8` + Nodemailer `^8.0.1`: new correction notification template and multi-recipient send
- Zod `^4.3.6`: correction submit schema, validate-reason schema, AI response schema — v4 syntax already used throughout
- TanStack Query `^5.90.21` + React Hook Form `^7.71.2`: client-side correction dialog with optimistic feedback
- shadcn/ui (Radix `^1.4.3`): Dialog + Textarea + inline error display — no new components needed

### Expected Features

All v1.4 features are P1 with no scope ambiguity. The research confirmed exactly what ships in this milestone and what is explicitly deferred.

**Must have (table stakes):**
- Edit individual answers in a completed session — data entry errors happen; no structured-data product should permanently lock records without a correction path
- Mandatory explanation (20 char minimum, AI quality-validated) — industry standard from EHR, legal, and accounting amendment workflows; "typo" alone is not an acceptable reason
- Original values permanently preserved — non-negotiable for audit; destroying the before-state is a compliance failure
- Corrected answer indicator badge ("Amended" chip on each corrected answer row) — users viewing a session must know they are seeing amended data
- Email notification to report + all tenant admins — transparency by default; corrections without notification create hidden information asymmetry
- Audit log entry (`session.answer_corrected`) — every significant mutation must appear in the existing `AUDIT_LOG`
- Session score recalculation when a numeric answer is corrected — analytics must remain accurate

**Should have (differentiators):**
- AI validation of correction explanation — no competitor implements this; turns corrections into accountable records rather than box-ticking
- Inline before/after correction form on session detail — keeps full session visible during correction, reduces input errors; most tools navigate to a separate edit screen
- Correction history panel on session detail — full amendment log visible to all involved parties; collapsed by default when no corrections exist

**Defer (v1.x / v2+):**
- Hard session locking (admin freeze) — v1.x governance feature for compliance customers; v1.4 audit trail is already a strong framework
- Report acknowledgement workflow — v1.x once core correction flow is validated
- Correction export in PDF/CSV — v2 when PDF export ships
- Webhook event `session.answer_corrected` — v3 with public API

### Architecture Approach

The architecture follows four established patterns from the existing codebase: (1) an append-only snapshot table for before-states rather than version columns or in-place mutation; (2) a separate pre-submit AI validation endpoint that provides inline feedback without coupling the mutation endpoint to AI availability; (3) fire-and-forget non-blocking email send after the transaction commits; and (4) resource-level RBAC that verifies the correction actor is the specific series manager or a tenant admin — role alone is not sufficient. The build order flows strictly: DB schema → validation schemas → RBAC helpers → AI service → i18n keys → email template → notification sender → API routes → UI component.

**Major components:**
1. `src/lib/db/schema/corrections.ts` — `session_answer_history` append-only table; columns mirror the typed answer columns (`text`, `numeric`, `json`) for clean before/after display; `tenant_id` on every row for RLS
2. `src/app/api/sessions/[id]/corrections/` — two routes: `/validate-reason` (AI call, idempotent, no DB write) and root `POST` (auth + RBAC + transaction: snapshot before-state → update answer → recompute score → audit log, then fire-and-forget email)
3. `src/lib/ai/service.ts` addition — `validateCorrectionReason()` using `generateObject` with structured Zod output; reason passed as JSON in user message (not system prompt) to prevent prompt injection
4. `src/lib/notifications/correction-email.ts` — `sendCorrectionNotificationEmails()` sending to report + all active tenant admins with session-level deduplication (5-minute window)
5. `src/components/session/correction-dialog.tsx` — Client Component with two-phase submit: validate reason first, then submit correction; answer widget matches original `answer_type`

### Critical Pitfalls

1. **In-place `session_answer` overwrite** — do not call `UPDATE session_answers SET ...` for corrections on completed sessions; the before-state is permanently lost. The existing `onConflictDoUpdate` in the answers route is correct only for live sessions. Use the append-only `session_answer_history` table for every correction.

2. **Audit log written outside the transaction** — `logAuditEvent` must be called inside the same `withTenantContext` block as the history INSERT and answer UPDATE. Calling it with `adminDb` or after the transaction closes creates a compliance gap where a correction exists with no audit record if the server crashes between steps.

3. **RLS missing on the new history table** — the `session_answer_history` migration must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and a `CREATE POLICY` on `tenant_id` in the same migration file. New tables have no RLS by default; `adminDb` bypasses RLS silently.

4. **AI blocking the correction HTTP response** — AI validation runs via a pre-submit separate endpoint (`/validate-reason`), not inside the correction POST handler. The mutation endpoint does only a lightweight Zod length check. AI outages must not block corrections for all users.

5. **One notification email per corrected answer** — email sends must be session-scoped with a 5-minute deduplication window. Sending one email per answer (trivially easy to implement incorrectly) causes notification storms and may trigger spam filters. The deduplication pattern already exists in `scheduler.ts`.

6. **Prompt injection via the correction reason field** — the reason is a free-text field that goes into AI context. Pass it as JSON in the user message, never by string-concatenating it into the system prompt. Apply a hard character limit (max 500 chars) via Zod.

7. **Analytics snapshots stale after numeric correction** — `ANALYTICS_SNAPSHOT` stores pre-computed scores. After correcting a numeric answer, `session.session_score` must be recomputed in-transaction and `computeSessionSnapshot()` must be called fire-and-forget after commit. Text-only corrections do not require this.

## Implications for Roadmap

The dependency chain confirmed in the architecture research maps cleanly to 4 phases. Each phase unblocks the next with no circular dependencies.

### Phase 1: Schema Foundation
**Rationale:** All downstream build steps depend on `session_answer_history` existing. Nothing else can be built, tested, or validated until schema and migration are done. RLS policy must be in this migration — the pitfalls research is explicit that a follow-up migration is too late.
**Delivers:** `session_answer_history` table with typed columns, RLS policy, indexes, `notificationTypeEnum` extended with `session_correction` value, schema exported from `index.ts`.
**Files:** `src/lib/db/schema/corrections.ts`, enums update, `index.ts` re-export, generated migration
**Avoids:** Pitfall 1 (in-place overwrite) by establishing the correct append-only structure from the start; Pitfall 3 (RLS gap) by including RLS in the same migration

### Phase 2: Core API and Business Logic
**Rationale:** Both API routes depend on the schema, AI service function, RBAC helper, and Zod validation schemas. These internal modules have no UI dependency and can be fully TDD'd before any UI work begins.
**Delivers:** `canCorrectSession()` RBAC helper, `validateCorrectionReason()` AI service function using `generateObject`, `correctionSubmitSchema` + `correctionValidateReasonSchema` Zod schemas, `POST /api/sessions/[id]/corrections` (full transaction: snapshot + answer update + score recompute + audit log), `POST /api/sessions/[id]/corrections/validate-reason` (AI endpoint, idempotent).
**Addresses:** All P1 table-stakes features at the data and logic level
**Avoids:** Pitfall 2 (audit outside transaction), Pitfall 4 (synchronous AI blocking mutation — separate endpoint), Pitfall 6 (prompt injection — JSON-encode reason in user message), Pitfall 7 (stale analytics — score recompute in-transaction, snapshot fire-and-forget)

### Phase 3: Email Notification and i18n
**Rationale:** Email depends on the API route being done (called fire-and-forget after transaction), i18n keys, and the email template. The session-level deduplication logic must be established here before the first email is ever sent, not retrofitted after the first spam complaints.
**Delivers:** `messages/en/emails.json` + `messages/ro/emails.json` additions (new `emails.sessionCorrection` namespace), `src/lib/email/templates/session-correction.tsx` React Email template, `src/lib/notifications/correction-email.ts` with 5-minute session-level deduplication.
**Avoids:** Pitfall 5 (notification storm) — deduplication built from day one following the existing `scheduler.ts` cancel-then-reschedule pattern

### Phase 4: UI Integration
**Rationale:** The correction dialog is the last layer — it calls both API endpoints and must handle two async states (AI validation feedback, then correction save). Session detail wiring happens after the dialog component exists.
**Delivers:** `src/components/session/correction-dialog.tsx` (before/after inline form, AI feedback display, loading states, `answer_type`-matched widgets, two-phase submit), "Amended" badge on corrected answer rows, correction history panel at session detail bottom, hover-revealed pencil icon per answer row wired into the session history/summary view.
**Addresses:** All differentiator UI features — inline before/after form, correction history panel, corrected answer indicator

### Phase Ordering Rationale

- Schema first is mandatory — 13 downstream files depend on the table existing
- API before email — the notification function is called from the API route; building in that order enables end-to-end testing in one pass
- Email before UI — with Phase 3 done, Phase 4 can test full end-to-end including notification delivery, not just the API response
- UI last — the dialog needs both API endpoints to exist before it can be built or tested; wiring into session detail is the final step with no downstream dependencies

### Research Flags

Phases with standard patterns (skip additional research):
- **Phase 1 (Schema):** Drizzle table definitions and RLS policies follow the exact same pattern as all 25 existing tables. Zero ambiguity.
- **Phase 3 (Email):** React Email + Nodemailer + `createEmailTranslator` is documented by `summary-email.ts`. The deduplication pattern is in `scheduler.ts`. No research needed.
- **Phase 4 (UI):** TanStack Query mutation + shadcn/ui Dialog + inline form feedback is established throughout the codebase.

Phases warranting a brief review before coding:
- **Phase 2 (AI prompt design):** The prompt injection mitigation (passing reason as JSON in user message, not system prompt) is correct in principle, but the exact `generateObject` call structure should be reviewed against current `src/lib/ai/service.ts` patterns before coding to ensure consistency. Low risk — 15-minute review is sufficient.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from live `package.json` and source file inspection — no assumptions about what is installed |
| Features | HIGH | Core patterns validated against AHIMA EHR amendment standards, FDA 21 CFR Part 11, and direct codebase inspection of existing RBAC and answer route guards |
| Architecture | HIGH | Every recommendation traces to a specific file and line in the codebase (answers route, pipeline, notifications, audit log, RLS policies) |
| Pitfalls | HIGH | All 7 critical pitfalls derived from direct codebase analysis — not generic web security advice |

**Overall confidence:** HIGH

### Gaps to Address

- **Score recomputation scope:** The architecture research recommends updating `session.session_score` in-transaction and deferring `analytics_snapshot` recomputation. The pitfalls research recommends recomputing analytics after numeric corrections. These are reconcilable: recompute score in-transaction, recompute snapshot fire-and-forget after commit (matching `pipeline.ts` behavior). The Phase 2 plan should state this explicitly to avoid confusion during implementation.

- **AI validation as hard gate vs advisory:** The pitfalls research cautions against hard-gating on AI availability; the features research recommends synchronous pre-submit validation. The recommended resolution — separate `/validate-reason` endpoint called before submit, mutation endpoint does only a lightweight Zod check — threads this needle correctly. AI validates the reason before the manager submits, but the mutation does not await any AI call. This should be explicit in the Phase 2 spec.

- **Email content privacy:** The pitfalls research flags that including before/after answer content in correction emails exposes potentially sensitive text to email provider logging. The architecture research's template draft includes `originalAnswer` and `correctedAnswer` as props. The Phase 3 implementation should decide: include inline content (convenience) or link-only (privacy). Recommended default: link-only with a "View Session" button, consistent with the existing `session-summary.tsx` template pattern.

## Sources

### Primary (HIGH confidence)
- `src/lib/db/schema/answers.ts` — confirmed `UNIQUE(session_id, question_id)` constraint and typed column pattern
- `src/lib/db/schema/enums.ts` — confirmed `notificationTypeEnum` structure and extension path
- `src/lib/db/schema/audit-log.ts` — confirmed audit trail structure and JSONB metadata field
- `src/lib/ai/service.ts` — confirmed `generateObject` and `Output.object` patterns both in production use
- `src/lib/ai/models.ts` — confirmed model tier assignments and Haiku usage for short tasks
- `src/lib/ai/pipeline.ts` — confirmed fire-and-forget pattern and `withTenantContext` transaction usage
- `src/lib/notifications/summary-email.ts` — confirmed multi-recipient loop and per-recipient render
- `src/lib/notifications/scheduler.ts` — confirmed cancel-then-reschedule deduplication pattern
- `src/lib/auth/rbac.ts` — confirmed RBAC helper pattern and role hierarchy
- `src/lib/audit/log.ts` — confirmed `logAuditEvent` transaction-scoped interface
- `src/app/api/sessions/[id]/answers/route.ts` — confirmed `in_progress` status guard and upsert semantics
- `src/app/api/sessions/[id]/complete/route.ts` — confirmed fire-and-forget email pattern (lines 219-241)
- `.planning/codebase/CONCERNS.md` — confirmed existing security gaps including no rate limiting on any endpoint
- `package.json` — confirmed all dependency versions currently installed

### Secondary (MEDIUM confidence)
- AHIMA: Amendments in the Electronic Health Record — original values preserved, reason required, dated authorship on every amendment
- FDA 21 CFR Part 11 audit trail requirements — tamper-resistant logs, never obscure previously recorded data
- AuditBoard: What is an Audit Trail — comprehensive pattern documentation for before/after preservation

### Tertiary (LOW confidence — established patterns, not project-specific)
- OWASP LLM Top 10, LLM01 — prompt injection via user-supplied text in AI pipelines; structured output defense
- General PostgreSQL append-only audit table patterns for financial and HR audit trails

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
