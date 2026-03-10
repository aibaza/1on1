# Feature Research

**Domain:** Session correction and accountability workflow for 1:1 meeting management SaaS
**Researched:** 2026-03-10
**Confidence:** HIGH (core patterns verified against regulated-industry precedents — EHR, legal document management, accounting; existing codebase fully inspected)

---

## Context

This milestone adds post-completion correction capability to an already-shipped product. The product already has:

- Structured session wizard; completed sessions stored with typed answers (`SESSION_ANSWER` — typed columns: `answer_text`, `answer_numeric`, `answer_json`)
- Immutable `AUDIT_LOG` (append-only: actor, action, resource_id, metadata JSONB)
- `NOTIFICATION` table and email pipeline (Nodemailer + React Email)
- RBAC: `admin`, `manager`, `member` — resource-level checks via `isSeriesParticipant` and `isAdmin`
- AI pipeline: Vercel AI SDK + Anthropic Claude, used for summaries, nudges, template co-authoring
- `SESSION_ANSWER.respondent_id` — every answer attributed to the user who submitted it
- Current `PUT /api/sessions/[id]/answers` hard-blocks on `status !== 'in_progress'` — corrections require a separate route

The correction feature must fit this existing model without architectural surgery.

---

## Authorization Boundaries — The Critical Design Question

| Actor | Can correct | Cannot correct |
|-------|-------------|----------------|
| Manager (series manager) | Any answer in sessions they conducted (`series.manager_id == actor`) | Sessions from other managers; sessions where they are the report |
| Admin | Any answer in the tenant | — |
| Member (report) | None | Reports cannot correct session data |

**Rationale:** 1:1 sessions in this product are manager-led. Corrections must be traceable to the same or higher authority as the original session. Allowing members to self-correct enables score manipulation without managerial accountability.

**Can a manager correct answers the report submitted?** Yes. In some templates both parties answer. The manager who conducted the session may correct any answer within it. The original `respondent_id` is preserved in the correction record; the correcting actor is a separate field.

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Edit individual answers in a completed session | Data entry errors happen; no structured-data product should permanently lock records without a correction path | MEDIUM | Requires a new dedicated route (`POST /api/sessions/[id]/corrections`) — not modifying the existing answer upsert, which is gated on `in_progress` for good reason |
| Mandatory explanation text before saving | Industry standard for any post-hoc record amendment (EHR, legal, accounting). Without it, corrections are silent and untrustworthy. | LOW | Plain text area with enforced minimum (20 characters). Zod validation server-side. Client-side counter. |
| Original values permanently preserved — never overwritten | Non-negotiable for an audit trail. Overwriting destroys evidentiary record. Required by AHIMA EHR amendment standards, FDA 21 CFR Part 11, accounting audit trail regulations. | MEDIUM | New `SESSION_ANSWER_CORRECTION` table stores before/after. `SESSION_ANSWER` rows are updated to the corrected value (so reads always return current data), but the original is preserved in the correction record. |
| Correction visible indicator in session history view | Users viewing a corrected session must know they are seeing amended data. Trust degrades if corrections are invisible. | LOW | "Amended" badge on each corrected answer row in session detail. Reveal original value on hover or expand. |
| Email notification to involved parties | Corrections without notification create hidden information asymmetry — the report discovers their session data changed with no explanation. | MEDIUM | Involved parties: series manager + report + all active tenant admins. Email includes: session identifier, question text, before value, after value, explanation, correcting actor, timestamp. |
| Audit log entry | Audit log already exists; every significant mutation must appear here. | LOW | Action: `session.answer_corrected`. Metadata: `{ question_id, before, after, reason, ai_validated }`. Uses existing `AUDIT_LOG` infrastructure. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI validation of the correction explanation (synchronous) | No other 1:1 tool has a correction feature at all; those that do accept any free-text reason without quality checks. AI validation ensures the explanation is substantive, in the company language, and relevant to the change — turning corrections into accountable records rather than box-ticking. | MEDIUM | Single-turn, non-streaming. Passes question text, original answer, new answer, explanation. Returns `{ valid: boolean, feedback: string }`. Called before the DB write. On rejection: inline feedback shown to user, record not committed. On approval: proceed to write. |
| Inline "correction mode" UI on session detail (before/after side-by-side) | Most tools, if they allow edits at all, navigate to a separate edit screen with no surrounding context. Showing the original answer alongside the correction form keeps the full session visible and reduces input errors. | MEDIUM | Triggered by a hover-revealed pencil icon per answer row in the session detail view. Expands inline — original value (read-only, visually dimmed) on the left, new value input using the same widget type on the right. |
| Correction history panel on session detail | Dedicated section showing the full amendment log: question corrected, before/after values, explanation (quoted), actor, AI validation result, timestamp. Visible to all involved parties. | LOW-MEDIUM | Read-only panel at the bottom of session detail. Collapsed by default when no corrections exist; expanded automatically when corrections are present. |
| Session score recalculation after correction | If a numeric answer (rating, mood, scale) is corrected, `session.session_score` updates to reflect reality. Analytics remain accurate. | MEDIUM | Score recomputation runs in the same DB transaction as the correction write. Analytics snapshots (`ANALYTICS_SNAPSHOT`) invalidated via the existing delete-then-insert pattern. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Report (employee) can dispute or counter-correct answers | Seems fair — the report should have a voice if they disagree | Creates a recursive dispute loop with no natural resolution point; adds a state machine (dispute → escalation → resolution); poisons the trust relationship that makes 1:1s work; turns the session into a legal document rather than a coaching artifact | If a report disagrees, they raise it verbally; the manager can issue another correction with an updated explanation, or create an action item. The audit trail already shows all corrections — the record speaks for itself. |
| Free-form reason without minimum quality gate | Managers want to type "typo" and be done | Meaningless corrections undermine the accountability rationale. "Typo" is not an explanation for changing a wellbeing score from 3 to 5. | Enforce 20-character minimum and AI quality validation. AI rejects single-word or vague explanations with actionable feedback: "Please describe which answer was incorrect and why the new value is accurate." |
| Correcting action items or shared notes via the same correction flow | Seems natural to bundle all "post-completion edits" | Action items have their own status lifecycle and are forward-looking — corrected by normal status updates. Shared notes are already editable post-completion via the existing notes route. Bundling adds scope without accountability value. | Keep correction feature scoped to `SESSION_ANSWER` only. Shared notes and action items continue using their existing edit paths. |
| Bulk correction (correct multiple answers in a single submission) | Power-user efficiency | One explanation for many changed answers is weaker accountability than one explanation per answer. Also increases AI validation complexity. | Each answer has its own correction and its own explanation. The UI can support correcting multiple answers in one sitting (multiple inline forms open simultaneously), but each correction is a separate atomic event with its own AI call and audit entry. |
| Hard session locking (admin prevents further corrections) | Compliance teams want to freeze records | For v1.4, mandatory explanation + AI validation + audit trail + email is already a strong accountability framework. Hard locking is a governance feature for a later release. | Implement session locking as a future admin permission. For now, all corrections are fully traceable. |
| "Exclude from analytics" flag (mark corrected answer as data error) | Managers want to explain away bad metrics from obvious entry errors | Creates two-tier data where corrections can be used selectively. If data was wrong and is corrected, the corrected value IS the real value and belongs in analytics. | Post-correction, the corrected value replaces the original in score computation. The correction record preserves the original for audit purposes. No analytics exclusion flag. |

---

## Feature Dependencies

```
[SESSION_ANSWER_CORRECTION table — new schema + migration]
    └──required by──> [Correction API route]
                          ├──required by──> [AI explanation validation (synchronous)]
                          ├──required by──> [Correction UI on session detail]
                          ├──required by──> [Email notification to involved parties]
                          └──required by──> [Audit log entry]

[Session score recalculation]
    └──required by──> [ANALYTICS_SNAPSHOT invalidation]
    └──runs in same transaction as──> [Correction API write]

[Correction history panel]
    └──depends on──> [SESSION_ANSWER_CORRECTION table]
    └──rendered within──> [Session detail page — existing]

[Corrected answer indicator badge]
    └──depends on──> [SESSION_ANSWER_CORRECTION table]
    └──rendered within──> [Session detail page — existing]

[AI explanation validation]
    └──blocks──> [Correction DB write] (synchronous — validation must pass before commit)
    └──uses──> [Existing AI pipeline — Vercel AI SDK + Anthropic]
    └──reads──> [tenant.settings.preferredLanguage] (company language for language compliance check)

[Email notification]
    └──uses──> [Existing NOTIFICATION table + Nodemailer + React Email pipeline]
    └──fires after──> [Correction DB write commits] (fire-and-forget; email failure does not roll back correction)
    └──recipients: series manager + report + all active admins]
```

### Dependency Notes

- **Schema first.** All other work depends on the `SESSION_ANSWER_CORRECTION` table. Ship the Drizzle schema file, generate migration, verify RLS policy before touching the API.

- **AI validation is synchronous, not async.** The correction must not be committed until AI approves. Async validation (save now, validate later) creates a window where a saved-but-invalid correction has already triggered email and audit entries. The existing AI template co-authoring pattern is synchronous; this is simpler still (no streaming, deterministic JSON).

- **Score recalculation in the same transaction as the correction write.** Write correction record + update `SESSION_ANSWER` + recompute `session.session_score` atomically. Invalidate `ANALYTICS_SNAPSHOT` outside the transaction (delete-then-insert pattern already established).

- **Email fires after commit.** Use the existing notification pipeline after the transaction succeeds. Email failure is logged but does not roll back the correction.

- **i18n.** All new UI strings must be added to EN and RO locale files. The AI validation prompt must include a language compliance instruction using the existing `withLanguageInstruction()` helper in `src/lib/ai/service.ts`.

---

## UX Patterns — Concrete Recommendations

### (1) Selecting which answers to correct

The session detail page already exists as a read-only view. The correction affordance should be:
- A small pencil icon appearing on hover/focus on each answer row. Not a persistent button — corrections are rare deliberate actions, not routine operations. Persistent buttons make corrections look like normal editing.
- Only the series manager (or admin) sees the pencil icon. The report's view of the session shows no edit affordance.
- Clicking the icon expands an **inline correction form below the current answer row** — original value on the left (read-only, visually dimmed), new value input on the right using the same input widget that was used during the session (rating scale, mood picker, text area, etc.).

### (2) Entering and submitting the explanation

- The explanation field is always present and cannot be bypassed — it renders as part of the expanded form, not as an optional afterthought.
- Label: "Why are you correcting this answer?" — not "Reason (optional)".
- Character count displayed below the field: "X / 20 minimum". Submit button disabled until minimum is met.
- Submit button label: "Save correction".
- While AI validation runs (~1–2 seconds), show a spinner on the submit button. Do not disable the form fields.
- **If AI rejects:** Show the AI feedback inline below the explanation field in an amber callout. The user revises and resubmits. The form stays open.
- **If AI approves:** Briefly show "Correction saved" confirmation, collapse the form, update the answer display in-place, and show the "Amended" badge.

### (3) AI validation — synchronous single-turn

**Why synchronous:** Validation blocks the DB write. The record should not exist in an approved state if the explanation is inadequate. The latency (~1–2 seconds for a single-turn text quality check) is acceptable for a deliberate, high-stakes action.

**Prompt approach:** One-shot system prompt with structured JSON output. Pass:
- The question text
- The original answer (formatted as human-readable for the answer type)
- The new answer
- The explanation text

Return: `{ "valid": boolean, "feedback": string }`. The `feedback` field is shown to the user only on rejection — one actionable sentence.

**Validation criteria the AI checks:**
1. Minimum specificity — not just "typo" or "error" without detail
2. Explains what was wrong with the original value
3. Explains why the new value is correct
4. Written in the company language (use `withLanguageInstruction()`)

### (4) Viewing correction history on a session

- A "Corrections" section at the bottom of the session detail page. Collapsed by default when no corrections exist. Automatically expanded when corrections are present.
- Each correction entry shows: question text, original value → corrected value (formatted for the answer type), explanation (block-quoted), corrected by (avatar + name), corrected at (relative time with absolute timestamp on hover), AI validated indicator (checkmark).
- The main answer display in the session shows the **current (corrected) value** with a small "Amended" chip. Clicking the chip reveals the original value and reason inline — no separate navigation required.

### (5) "All involved parties" in a 1:1 context

A 1:1 session involves exactly:
- **The series manager** — `MEETING_SERIES.manager_id`
- **The report** — `MEETING_SERIES.report_id`
- **All active tenant admins** — `users WHERE role = 'admin' AND is_active = true AND tenant_id = [tenant]`

The correction notification email goes to all three groups.

**If the corrector IS the manager:** The manager still receives the notification email as a confirmation receipt. The report and admins are the primary new recipients.
**If the corrector IS an admin:** Both the manager and the report receive the notification. All other admins also receive it.

---

## MVP Definition

### Launch With (v1.4)

- [ ] `SESSION_ANSWER_CORRECTION` table — Drizzle schema, migration, RLS policy
- [ ] `POST /api/sessions/[id]/corrections` — accepts `question_id`, `new_answer_*`, `reason`; verifies manager authorization; calls AI validation synchronously; writes correction + updates answer + recalculates session score in one transaction; fires email (async); writes audit log entry
- [ ] AI explanation validation — single-turn, non-streaming, JSON output `{ valid, feedback }`, company language compliance via existing `withLanguageInstruction()`
- [ ] Session detail correction UI — hover-revealed pencil icon per answer, before/after inline form, answer widget for the question's `answer_type`, AI feedback display, loading state on submit
- [ ] Correction history panel — expandable section at bottom of session detail; each entry shows before/after, explanation, actor, timestamp, AI validated indicator
- [ ] Corrected answer indicator badge — "Amended" chip on each answer row that has been corrected; click reveals original value and reason inline
- [ ] Email notification — new React Email template; sent to report + series manager + admins; includes question text, before/after values, explanation, actor, session reference, timestamp
- [ ] Audit log entry — action `session.answer_corrected`; metadata `{ question_id, before, after, reason, ai_validated }`
- [ ] Session score recalculation — in-transaction recompute when a numeric answer is corrected; ANALYTICS_SNAPSHOT invalidated after commit
- [ ] i18n — all new UI strings in EN + RO locale files; AI validation prompt uses company language setting

### Add After Validation (v1.x)

- [ ] Hard session locking — admin permission to freeze a session against further corrections; add when compliance customers request it
- [ ] Report acknowledgement workflow — report receives email and can click "I acknowledge this correction" to generate a confirmation record; no dispute capability
- [ ] Correction notification preferences — per-user opt-out for correction emails; add if email fatigue becomes a support issue

### Future Consideration (v2+)

- [ ] Correction export in PDF/CSV session reports — once PDF export ships in v2
- [ ] Webhook event `session.answer_corrected` — when public API ships in v3
- [ ] Bulk correction mode — low priority; per-answer corrections with separate explanations are the correct accountability model

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SESSION_ANSWER_CORRECTION schema + migration | HIGH | LOW | P1 |
| Correction API route (auth + AI validation + write) | HIGH | MEDIUM | P1 |
| AI explanation validation (synchronous) | HIGH | LOW | P1 |
| Session detail correction UI (inline before/after) | HIGH | MEDIUM | P1 |
| Corrected answer indicator badge | HIGH | LOW | P1 |
| Correction history panel | MEDIUM | LOW | P1 |
| Email notification to involved parties | HIGH | MEDIUM | P1 |
| Audit log entry | HIGH | LOW | P1 |
| Session score recalculation + analytics invalidation | MEDIUM | MEDIUM | P1 |
| Hard session locking | LOW | MEDIUM | P3 |
| Report acknowledgement workflow | LOW | HIGH | P3 |
| Correction export in PDF | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.4 launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Lattice / Leapsome / 15Five | Workday / SuccessFactors | Our Approach |
|---------|----------------------|--------------------------|--------------|
| Edit completed session/review answers | Not publicly documented; generally locked after submission window closes | Admin-only unlock via HR workflow; requires HR involvement | Manager self-service with mandatory explanation — lower friction, still accountable |
| Audit trail for answer edits | Basic change log in enterprise tiers only | Full before/after audit in enterprise tier | Before/after in dedicated table, visible to all involved parties including the report |
| AI validation of edit explanation | No known implementation across any competitor | No known implementation | Differentiator — AI quality-gates the explanation before commit |
| Notification to involved parties on correction | No known standardized approach for 1:1 corrections | HR department notified, report typically not | Report + manager + admins all notified — transparency by default |
| Session score recalculation after correction | Not applicable (most use static review ratings, not computed session scores) | Manual recalculation triggers | Automatic, in-transaction |

---

## Sources

- AHIMA: [Amendments in the Electronic Health Record](https://www.ahima.org/media/r2dc4xhg/amendments-in-the-electronic-health-record_axs.pdf) — original values preserved, reason required, dated authorship on every amendment (HIGH confidence, professional standards body)
- FDA 21 CFR Part 11: [Audit Trail Requirements](https://simplerqms.com/21-cfr-part-11-audit-trail/) — tamper-resistant logs, never obscure previously recorded data (HIGH confidence, regulatory standard)
- fynk: [Audit trail for legal documents](https://fynk.com/en/blog/audit-trail-legal-documents/) — reason-capture adds clarity, version control keeps all historical states accessible (MEDIUM confidence, verified against multiple audit trail guides)
- AuditBoard: [What is an Audit Trail](https://auditboard.com/blog/what-is-an-audit-trail) — comprehensive pattern documentation (MEDIUM confidence)
- Existing codebase: `/home/dc/work/1on1/src/app/api/sessions/[id]/answers/route.ts` — current answer upsert only works on `in_progress` sessions; correction route must be separate
- Existing codebase: `/home/dc/work/1on1/src/lib/auth/rbac.ts` — `isSeriesParticipant`, `isAdmin` authorization primitives already exist
- Existing codebase: `/home/dc/work/1on1/docs/data-model.md` — `SESSION_ANSWER`, `AUDIT_LOG`, `NOTIFICATION` table schemas fully inspected
- Existing codebase: `/home/dc/work/1on1/docs/features.md` — v1.4 target features confirmed; score computation and analytics snapshot patterns documented

---

*Feature research for: Session corrections and accountability (v1.4)*
*Researched: 2026-03-10*
