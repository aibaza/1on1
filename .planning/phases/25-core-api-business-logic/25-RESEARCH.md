# Phase 25: Core API & Business Logic - Research

**Researched:** 2026-03-10
**Domain:** Next.js API routes, Drizzle transactions, Zod validation, Vercel AI SDK structured output, RBAC authorization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLT-01 | When a numeric answer is corrected, the session score is recalculated in-transaction and the analytics snapshot is refreshed asynchronously after commit | `computeSessionScore` in `src/lib/utils/scoring.ts` already exists and is reusable; in-transaction pattern is demonstrated by `complete/route.ts`; async post-commit work uses fire-and-forget `.catch()` pattern |
| WFLOW-01 | Manager can initiate a correction for any answer in a completed session they conducted; admins can correct any session in the tenant | RBAC pattern: `isAdmin(role)` OR `session.user.id === series.managerId` — same check exists in `complete/route.ts` and `answers/route.ts`; must verify session `status === "completed"` |
| WFLOW-02 | Manager must provide an explicit correction reason (20–500 characters) before submitting — empty or too-short reasons are rejected | Zod schema in `src/lib/validations/` with `.min(20).max(500)` on reason field; checked before any DB call |
| WFLOW-03 | AI validates the correction reason for quality, relevance, and company language compliance before the correction can be submitted | Separate `/validate-reason` route using `generateObject` pattern from `service.ts`; AI failure must not block the mutation endpoint (separate route, no DB write) |
| NOTIF-03 | A `session.answer_corrected` audit log event is written inside the same database transaction as the correction — no correction exists without an audit record | `logAuditEvent(tx, {...})` in `src/lib/audit/log.ts` accepts a `TransactionClient` — call inside `withTenantContext` transaction, same pattern as `complete/route.ts` |
</phase_requirements>

---

## Summary

Phase 25 builds two API routes on top of the schema Phase 24 created. The core mutation (`POST /api/sessions/[id]/corrections`) must atomically: (1) snapshot the original answer into `session_answer_history`, (2) update the `session_answer` row, (3) recompute `session.session_score` if the answer is numeric, and (4) write a `session.answer_corrected` audit log entry — all within a single `withTenantContext` call. The validate-reason endpoint (`POST /api/sessions/[id]/corrections/validate-reason`) calls the Vercel AI SDK and returns AI feedback without touching the database.

The codebase already has every building block needed: `withTenantContext` for transaction wrapping, `logAuditEvent` for the audit trail, `computeSessionScore` for score recomputation, `isAdmin`/`isSeriesParticipant` from `src/lib/auth/rbac.ts` for authorization, and the `generateObject`/`generateText` + `Output.object` pattern in `src/lib/ai/service.ts` for structured AI responses. This phase is primarily assembly and composition, not net-new infrastructure.

The most important architectural constraint is that AI availability must never block the correction mutation. The design explicitly separates the two operations into two endpoints — the mutation route never calls the AI SDK; the validation route never writes to the database.

**Primary recommendation:** Build the correction route inside `src/app/api/sessions/[id]/corrections/route.ts` and the validation route inside `src/app/api/sessions/[id]/corrections/validate-reason/route.ts`. Extract Zod schemas to `src/lib/validations/correction.ts`. Extract the RBAC check for "can correct this session" into `src/lib/auth/rbac.ts` as `canCorrectSession`. Extract the AI prompt/schema for reason validation to `src/lib/ai/schemas/correction.ts` and a companion function in `src/lib/ai/service.ts`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | existing | Transaction queries, insert/update | All DB operations go through Drizzle |
| zod | existing | Request body validation | All API routes use Zod before DB calls |
| @ai-sdk/anthropic + ai | existing | Structured AI output for reason validation | `generateObject` pattern already used for template editor |
| next/server (NextResponse) | existing | API route response helpers | All routes use this |
| src/lib/db/tenant-context | existing | `withTenantContext` wraps all DB mutations | All writes use this wrapper |
| src/lib/audit/log | existing | `logAuditEvent` inside transactions | Used in `complete/route.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/lib/utils/scoring | existing | `computeSessionScore` | Score recomputation when a numeric answer is corrected |
| src/lib/auth/rbac | existing | `isAdmin`, `isSeriesParticipant` | Authorization checks inside routes |
| drizzle-orm eq/and | existing | Query filtering | Every SELECT inside transactions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateObject` for AI reason validation | `generateText` with `Output.object` | Either works; `generateObject` is more concise and type-enforced at the schema level; use `generateObject` for new AI features |
| Single combined endpoint | Two separate routes | Single endpoint would couple AI availability to data integrity; requirement SC-3 explicitly requires separation |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/sessions/[id]/corrections/
│   ├── route.ts                    # POST — correction mutation
│   └── validate-reason/
│       └── route.ts                # POST — AI reason validation (no DB)
├── lib/
│   ├── validations/
│   │   └── correction.ts           # correctionInputSchema, validateReasonSchema
│   ├── auth/
│   │   └── rbac.ts                 # ADD: canCorrectSession(user, series) → boolean
│   └── ai/
│       ├── schemas/
│       │   └── correction.ts       # reasonValidationResultSchema + type
│       └── service.ts              # ADD: validateCorrectionReason(reason, language?)
```

### Pattern 1: Atomic Correction Transaction

**What:** All four writes (history insert, answer update, session score update, audit log insert) happen in a single `withTenantContext` call. If any step throws, the entire transaction rolls back — no partial state.

**When to use:** Any multi-table write that must be consistent.

**Example:**
```typescript
// Source: src/app/api/sessions/[id]/complete/route.ts (pattern to follow)
const result = await withTenantContext(
  session.user.tenantId,
  session.user.id,
  async (tx) => {
    // Step 1: Load and authorize
    const sessionRecord = await tx.select()...
    const series = await tx.select()...
    if (!canCorrectSession(session.user, series, sessionRecord)) {
      return { error: "FORBIDDEN" as const };
    }

    // Step 2: Load the answer being corrected
    const [answer] = await tx.select().from(sessionAnswers)
      .where(and(eq(sessionAnswers.id, data.answerId),
                 eq(sessionAnswers.sessionId, sessionId)))
      .limit(1);
    if (!answer) return { error: "NOT_FOUND" as const };

    // Step 3: Snapshot original into history (INSERT first)
    await tx.insert(sessionAnswerHistory).values({
      sessionAnswerId: answer.id,
      sessionId,
      tenantId: session.user.tenantId,
      correctedById: session.user.id,
      originalAnswerText: answer.answerText,
      originalAnswerNumeric: answer.answerNumeric,
      originalAnswerJson: answer.answerJson,
      originalSkipped: answer.skipped,
      correctionReason: data.reason,
    });

    // Step 4: Update the answer
    await tx.update(sessionAnswers)
      .set({
        answerText: data.newAnswerText ?? null,
        answerNumeric: data.newAnswerNumeric != null ? String(data.newAnswerNumeric) : null,
        answerJson: data.newAnswerJson ?? null,
        skipped: data.skipped ?? false,
        answeredAt: new Date(),
      })
      .where(eq(sessionAnswers.id, answer.id));

    // Step 5: Recompute session score if the answer is numeric
    const answersWithType = await tx.select({...})
      .from(sessionAnswers).innerJoin(templateQuestions, ...)
      .where(eq(sessionAnswers.sessionId, sessionId));
    const newScore = computeSessionScore(answersWithType.map(...));
    await tx.update(sessions)
      .set({ sessionScore: newScore !== null ? String(newScore) : null, updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    // Step 6: Audit log (inside same tx — NOTIF-03)
    await logAuditEvent(tx, {
      tenantId: session.user.tenantId,
      actorId: session.user.id,
      action: "session.answer_corrected",
      resourceType: "session",
      resourceId: sessionId,
      metadata: { answerId: answer.id, reason: data.reason, newScore },
    });

    return { sessionId, newScore };
  }
);
```

### Pattern 2: AI Validation Endpoint (No DB Write)

**What:** The `/validate-reason` route calls `generateObject` and returns a typed result. It never touches the database.

**When to use:** Any AI-powered validation that must not block the primary mutation.

**Example:**
```typescript
// Source: src/lib/ai/service.ts generateTemplateChatTurn as pattern reference
// New function to add to service.ts:
export async function validateCorrectionReason(
  reason: string,
  language?: string
): Promise<ReasonValidationResult> {
  try {
    const { object } = await generateObject({
      model: models.correctionValidator, // claude-haiku-4-5 is sufficient
      schema: reasonValidationResultSchema,
      system: buildCorrectionReasonSystemPrompt(language),
      prompt: `Correction reason: "${reason}"`,
    });
    return object;
  } catch (e) {
    // AI is unavailable — return a neutral pass so UI doesn't block correction
    // The mutation endpoint does NOT call this function
    throw new Error("AI validation failed: " + String(e));
  }
}
```

**The validation route:**
```typescript
// POST /api/sessions/[id]/corrections/validate-reason
export async function POST(request: Request, ...) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const data = validateReasonSchema.parse(body); // Zod check: reason 20-500 chars

  try {
    const result = await validateCorrectionReason(data.reason, session.user.preferredLanguage);
    return NextResponse.json(result);
  } catch {
    // AI unavailable — don't 500, return a degraded response UI can handle
    return NextResponse.json({ pass: true, feedback: null }, { status: 200 });
  }
}
```

### Pattern 3: RBAC Helper for Correction Authorization

**What:** The correction rule is: `isAdmin(role)` OR (`isManager` AND `user.id === series.managerId`). Members and reports get 403. This is stricter than `isSeriesParticipant` (which allows the report too).

**When to use:** Both routes — the mutation route AND the validate-reason route should verify authorization before doing anything.

**Example:**
```typescript
// Source: src/lib/auth/rbac.ts — add this function
/**
 * Check if user can correct answers in a session on this series.
 * Admin can correct any session in the tenant.
 * Manager can only correct sessions on their own series.
 * Members and reports cannot correct answers.
 */
export function canCorrectSession(
  userId: string,
  userRole: string,
  series: { managerId: string }
): boolean {
  if (isAdmin(userRole)) return true;
  return userRole === "manager" && userId === series.managerId;
}
```

### Pattern 4: Zod Validation Schema for Correction Input

**What:** Validates the request body before any DB or AI call. Reason length is the critical constraint from WFLOW-02.

**Example:**
```typescript
// src/lib/validations/correction.ts
import { z } from "zod";

export const correctionInputSchema = z.object({
  answerId: z.string().uuid("answerId must be a valid UUID"),
  reason: z.string()
    .min(20, "Correction reason must be at least 20 characters")
    .max(500, "Correction reason must be at most 500 characters"),
  newAnswerText: z.string().optional(),
  newAnswerNumeric: z.number().optional(),
  newAnswerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});

export type CorrectionInput = z.infer<typeof correctionInputSchema>;

export const validateReasonSchema = z.object({
  reason: z.string()
    .min(20, "Reason must be at least 20 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export type ValidateReasonInput = z.infer<typeof validateReasonSchema>;
```

### Pattern 5: AI Schema for Reason Validation Result

**What:** The AI returns a structured `{ pass: boolean, feedback: string }` object. Zod schema for `generateObject` ensures type safety.

**Example:**
```typescript
// src/lib/ai/schemas/correction.ts
import { z } from "zod";

export const reasonValidationResultSchema = z.object({
  pass: z.boolean().describe(
    "true if the reason is specific, professional, and explains why the answer needs correction; false otherwise"
  ),
  feedback: z.string().max(200).describe(
    "One sentence of feedback. If pass=true, acknowledge the reason quality. If pass=false, explain specifically what is missing or problematic."
  ),
});

export type ReasonValidationResult = z.infer<typeof reasonValidationResultSchema>;
```

### Anti-Patterns to Avoid

- **Calling AI inside the mutation transaction:** AI latency (1-3s) holds the DB transaction open, risking connection pool exhaustion and timeout. AI must be called ONLY in the validate-reason route, never inside `withTenantContext`.
- **Checking authorization only at the role level:** `requireRole("manager")` is insufficient — a manager can only correct sessions on their own series. The `canCorrectSession` helper must verify `userId === series.managerId`.
- **Skipping session status check:** Corrections must only be allowed on `status === "completed"` sessions. Attempting to correct an in-progress or scheduled session should return 400, not 403.
- **Fetching all answers without innerJoin to templateQuestions:** `computeSessionScore` needs `answerType` and `scoreWeight` — the same `innerJoin(templateQuestions, ...)` pattern from `complete/route.ts` is required.
- **ZodError detection via `error.name === "ZodError"`:** The codebase has a known bug pattern (MEMORY.md code quality concerns) where ZodError is detected via string name comparison. Use `instanceof ZodError` — import `ZodError` from `zod` and use proper instanceof check.
- **Storing answerNumeric as a number in Drizzle insert:** Drizzle's `decimal` columns require `String(value)` on write (see existing `answers/route.ts` line `answerNumeric: String(data.answerNumeric)`).
- **Not checking `session.status === "completed"` before allowing corrections:** The correction endpoint should reject sessions not in `completed` status with a 409 or 400 response.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Transaction with tenant context | Custom db.transaction + SET LOCAL | `withTenantContext(tenantId, userId, async (tx) => {...})` in `src/lib/db/tenant-context.ts` | Already handles both `app.current_tenant_id` and `app.current_user_id` with rollback |
| Audit log insert | Inline `tx.insert(auditLog)` | `logAuditEvent(tx, event)` in `src/lib/audit/log.ts` | Standardizes audit event shape, accepts `TransactionClient` |
| Score computation | Custom weighted average | `computeSessionScore(answers)` in `src/lib/utils/scoring.ts` | Handles normalization across `rating_1_5`, `rating_1_10`, `yes_no`, `mood`; already weighted |
| Role checks | Inline role string comparisons | `isAdmin(role)`, `isSeriesParticipant(userId, series)` in `src/lib/auth/rbac.ts` | Centralized, tested, consistent |
| AI structured output | Manual JSON parsing | `generateObject({ schema: zodSchema, ... })` from Vercel AI SDK | Type-safe at schema level, no manual parsing needed |

---

## Common Pitfalls

### Pitfall 1: Session Status Not Checked
**What goes wrong:** A correction is accepted for a session that is still `in_progress` or `scheduled`, corrupting active wizard state.
**Why it happens:** The authorization check passes (manager on the series), but the status guard is missing.
**How to avoid:** After loading the session, check `if (sessionRecord.status !== "completed") return { error: "INVALID_STATUS" }`. Return 409 to the client.
**Warning signs:** Test case: correction on a non-completed session should get 409, not 200.

### Pitfall 2: AI Blocks the Mutation
**What goes wrong:** Developer adds an AI call inside the mutation transaction (or in the same request before the DB write) "to validate before committing". An AI timeout causes the correction to never commit.
**Why it happens:** Seems logical to validate before writing, but AI latency (1-5s) and potential downtime make it unsuitable for blocking flows.
**How to avoid:** The design enforces separation: validate-reason is a separate endpoint called by the UI before the user submits the form. The mutation endpoint never calls AI SDK functions.
**Warning signs:** Any `import` of `generateObject` or `validateCorrectionReason` in `corrections/route.ts` is a red flag.

### Pitfall 3: Score Recompute Fetches Stale Answer
**What goes wrong:** The score recomputation fetches all answers for the session, but the just-updated answer is read before the UPDATE has flushed within the transaction (stale read).
**Why it happens:** Fetching answers after `tx.update(sessionAnswers)` within the same Drizzle transaction should see the updated row (PostgreSQL read-your-own-writes guarantee within a transaction). However, if the SELECT happens before the UPDATE, it uses the old value.
**How to avoid:** Order operations strictly: (1) INSERT history, (2) UPDATE sessionAnswer, (3) SELECT all answers for score, (4) UPDATE sessions.sessionScore, (5) INSERT audit log. Never reorder steps 2 and 3.
**Warning signs:** Score after correction matches the old answer's contribution.

### Pitfall 4: answerNumeric Type Mismatch
**What goes wrong:** TypeScript error or DB write failure because `answerNumeric` is stored as a JS `number` but Drizzle's `decimal` column requires a `string`.
**Why it happens:** `decimal` in Drizzle maps to PostgreSQL `NUMERIC` — when writing, pass a string. When reading back, cast with `Number(a.answerNumeric)`.
**How to avoid:** In the UPDATE set: `answerNumeric: data.newAnswerNumeric != null ? String(data.newAnswerNumeric) : null`. Same pattern as `answers/route.ts` line 100.
**Warning signs:** TypeScript reports type `number` not assignable to `string | SQL | undefined` on the answerNumeric field.

### Pitfall 5: Wrong ZodError Detection
**What goes wrong:** The Zod validation catch block checks `error.name === "ZodError"` which is fragile and a known issue in this codebase (MEMORY.md audit).
**Why it happens:** Old pattern carried through the codebase. For new routes, use `instanceof ZodError`.
**How to avoid:** Import `ZodError` from `zod` and use `if (error instanceof ZodError)` in the catch block.
**Warning signs:** The string `error.name === "ZodError"` appearing in the new route file.

### Pitfall 6: Authorization Checks Answer Without Verifying Session Ownership
**What goes wrong:** The correction route receives `answerId` in the body. An attacker provides an `answerId` that belongs to a different session (or different tenant). Without verifying the answer's `sessionId` matches the URL's `[id]`, the check is bypassed.
**Why it happens:** Route trusts request body data for resource ownership.
**How to avoid:** After loading the answer: `if (answer.sessionId !== sessionId) return { error: "NOT_FOUND" }`. RLS provides a DB-level backstop, but explicit check is still required.

---

## Code Examples

### File Structure for the Two New Routes

```
src/app/api/sessions/[id]/corrections/route.ts
src/app/api/sessions/[id]/corrections/validate-reason/route.ts
```

These follow the exact directory naming convention already established by:
- `src/app/api/sessions/[id]/action-items/route.ts`
- `src/app/api/sessions/[id]/complete/route.ts`

### Complete correctionInputSchema
```typescript
// Source: pattern from src/lib/validations/session.ts
import { z } from "zod";

export const correctionInputSchema = z.object({
  answerId: z.string().uuid(),
  reason: z.string().min(20).max(500),
  // New answer values — at least one must be provided (enforced in route, not Zod)
  newAnswerText: z.string().nullable().optional(),
  newAnswerNumeric: z.number().nullable().optional(),
  newAnswerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});
```

### Score Recomputation Inside Transaction
```typescript
// Source: src/app/api/sessions/[id]/complete/route.ts lines 88-109
// Same pattern — reuse computeSessionScore with innerJoin to get answerType + scoreWeight
const answersWithType = await tx
  .select({
    answerNumeric: sessionAnswers.answerNumeric,
    skipped: sessionAnswers.skipped,
    answerType: templateQuestions.answerType,
    scoreWeight: templateQuestions.scoreWeight,
  })
  .from(sessionAnswers)
  .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
  .where(eq(sessionAnswers.sessionId, sessionId));

const newScore = computeSessionScore(
  answersWithType.map((a) => ({
    answerType: a.answerType,
    answerNumeric: a.answerNumeric ? Number(a.answerNumeric) : null,
    skipped: a.skipped,
    scoreWeight: a.scoreWeight ? Number(a.scoreWeight) : 1,
  }))
);

await tx
  .update(sessions)
  .set({ sessionScore: newScore !== null ? String(newScore) : null, updatedAt: new Date() })
  .where(eq(sessions.id, sessionId));
```

### Audit Log Call (Inside Transaction)
```typescript
// Source: src/lib/audit/log.ts + usage in complete/route.ts
await logAuditEvent(tx, {
  tenantId: session.user.tenantId,
  actorId: session.user.id,
  action: "session.answer_corrected",
  resourceType: "session",
  resourceId: sessionId,
  metadata: {
    answerId: answer.id,
    questionId: answer.questionId,
    reason: data.reason,
    newScore,
  },
});
```

### AI Model Tier for Correction Reason Validation
```typescript
// Source: src/lib/ai/models.ts — add one entry
export const models = {
  // ... existing entries ...
  /** Correction reason validator — short structured output, Haiku is sufficient. */
  correctionValidator: anthropic("claude-haiku-4-5"),
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc ZodError detection via `error.name` | `instanceof ZodError` | Should be fixed in this phase | Correct TypeScript narrowing, avoids false positives |
| N/A — no correction endpoint exists | Atomic correction transaction with history snapshot, score recompute, and audit log | Phase 25 (new) | Introduces full amendment accountability with append-only history |

**Deprecated/outdated:**
- `error.name === "ZodError"` string comparison: this codebase has 22 such instances (MEMORY.md). New routes in Phase 25 must use `instanceof ZodError`.

---

## Open Questions

1. **Should `validate-reason` require session authorization or just auth?**
   - What we know: The route takes only `reason` text — it doesn't need the session or series to validate the reason's quality
   - What's unclear: Whether requiring the user to be a manager/admin before they can call validate-reason adds security value
   - Recommendation: Require auth (`session?.user` check) but not session/series authorization. The route does no DB write, and the reason text is not sensitive. Keeping it light reduces latency.

2. **Should score recomputation happen even when the corrected answer is not numeric?**
   - What we know: `computeSessionScore` returns `null` when no scorable answers exist; it handles non-numeric types gracefully. ANLT-01 says "when a numeric answer is corrected" — implying it's conditional.
   - What's unclear: Whether we should skip the score recompute step entirely for non-numeric corrections, or always run it (idempotent result for text-only answers)
   - Recommendation: Always run `computeSessionScore` and update `session.session_score` regardless of answer type. The function handles non-numeric answers correctly (returns previous score for unchanged numeric answers), and "always recompute" is simpler and safer than conditional logic.

3. **Analytics snapshot refresh after correction**
   - What we know: ANLT-01 requires "analytics snapshot is refreshed asynchronously after commit". The existing analytics pipeline runs via `runAIPipelineDirect` after `complete/`. There is no standalone `refreshAnalyticsSnapshot` function.
   - What's unclear: Whether Phase 25 should build an analytics refresh trigger, or whether that is deferred to Phase 26/27.
   - Recommendation: For Phase 25, mark `session.analyticsIngestedAt = null` inside the transaction to invalidate the snapshot. Phase 26 can implement the actual async refresh job. Resetting `analyticsIngestedAt` is a safe in-transaction signal — if the session appears with a null `analyticsIngestedAt`, the analytics pipeline knows to re-ingest it.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, environment: node) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `bun run test` |
| Full suite command | `bun run test && bun run typecheck && bun run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFLOW-02 | `correctionInputSchema` rejects reason < 20 chars | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ❌ Wave 0 |
| WFLOW-02 | `correctionInputSchema` rejects reason > 500 chars | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ❌ Wave 0 |
| WFLOW-02 | `correctionInputSchema` accepts reason 20-500 chars | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ❌ Wave 0 |
| WFLOW-02 | `correctionInputSchema` rejects missing answerId | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ❌ Wave 0 |
| WFLOW-01 | `canCorrectSession` returns true for admin | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ❌ Wave 0 |
| WFLOW-01 | `canCorrectSession` returns true for manager on own series | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ❌ Wave 0 |
| WFLOW-01 | `canCorrectSession` returns false for manager on other series | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ❌ Wave 0 |
| WFLOW-01 | `canCorrectSession` returns false for member | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ❌ Wave 0 |
| WFLOW-03 | `reasonValidationResultSchema` accepts `{ pass: true, feedback: "..." }` | unit | `bun run test src/lib/ai/schemas/__tests__/correction.test.ts` | ❌ Wave 0 |
| WFLOW-03 | `reasonValidationResultSchema` rejects missing `pass` field | unit | `bun run test src/lib/ai/schemas/__tests__/correction.test.ts` | ❌ Wave 0 |
| ANLT-01 | `computeSessionScore` returns correct score after hypothetical answer change | unit | `bun run test src/lib/utils/__tests__/scoring.test.ts` | ❌ Wave 0 |
| NOTIF-03 | Audit event action name is `"session.answer_corrected"` (string constant test) | unit | included in rbac/correction tests | ❌ Wave 0 |

**Note:** Full integration testing of the API routes (actual DB transaction, atomicity guarantee) requires a live PostgreSQL instance and is not covered by Vitest unit tests. Manual testing via the dev server serves as the integration gate for Phase 25. The unit tests cover all logic that can be verified in-process: Zod schema validation, RBAC helper behavior, and AI schema shape.

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck`
- **Phase gate:** `bun run test && bun run typecheck && bun run lint && bun run build` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/validations/__tests__/correction.test.ts` — covers correctionInputSchema and validateReasonSchema Zod behavior
- [ ] `src/lib/auth/__tests__/rbac.test.ts` — covers `canCorrectSession` (and may also test existing `isAdmin`, `isSeriesParticipant` helpers)
- [ ] `src/lib/ai/schemas/__tests__/correction.test.ts` — covers `reasonValidationResultSchema` shape

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `src/app/api/sessions/[id]/complete/route.ts` — atomic transaction pattern, score recompute pattern, audit log call pattern
- Direct source inspection: `src/app/api/sessions/[id]/answers/route.ts` — `answerNumeric: String(value)` pattern, Zod validation before DB, ZodError catch
- Direct source inspection: `src/lib/db/tenant-context.ts` — `withTenantContext` signature and behavior
- Direct source inspection: `src/lib/audit/log.ts` — `logAuditEvent` signature, accepts `TransactionClient`
- Direct source inspection: `src/lib/utils/scoring.ts` — `computeSessionScore` signature, handles weighted averages, returns null for no-scorable
- Direct source inspection: `src/lib/auth/rbac.ts` — `isAdmin`, `isSeriesParticipant` — no `canCorrectSession` yet, must be added
- Direct source inspection: `src/lib/ai/service.ts` — `generateObject` pattern, `generateText` + `Output.object` pattern, model tiers
- Direct source inspection: `src/lib/ai/models.ts` — model tier assignments, `claude-haiku-4-5` for short structured tasks
- Direct source inspection: `src/lib/validations/session.ts` — Zod schema style and placement convention
- Direct source inspection: `src/lib/db/schema/sessions.ts` — `session.sessionScore` column (decimal), `session.analyticsIngestedAt`
- Direct source inspection: `src/lib/db/schema/answer-history.ts` — confirmed Phase 24 schema exists with expected columns

### Secondary (MEDIUM confidence)
- MEMORY.md code quality notes: 22 instances of `error.name === "ZodError"` in the codebase; new routes must use `instanceof ZodError`
- STATE.md decision log: "AI validation runs via separate `/validate-reason` endpoint — AI outages do not block the mutation" — this is a locked architectural decision

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct source inspection; no new dependencies
- Architecture: HIGH — every pattern is directly derived from `complete/route.ts` and `answers/route.ts` which already implement the same transaction + audit + RBAC structure
- Pitfalls: HIGH — derived from concrete code audit (ZodError, decimal string type, stale read ordering, missing status check, answer ownership verification)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain; all dependencies are pinned)
