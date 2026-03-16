# Phase 25: Core API & Business Logic

**Status**: Complete
**Milestone**: v1.4 Session Corrections & Accountability
**Depends on**: Phase 24
**Completed**: 2026-03-10

## Goal

The full correction transaction is implemented and tested — a manager can submit a correction that atomically snapshots the original, updates the answer, recomputes the session score, writes the audit log, and separately validates reasons through an AI endpoint.

## Success Criteria

1. WFLOW-01: `POST /api/sessions/[id]/corrections` accepts a valid correction, writes the history snapshot, updates the answer, and writes a `session.answer_corrected` audit log entry all within a single database transaction — no partial state is possible
2. ANLT-01: When a numeric answer is corrected, `session.session_score` is recomputed within that same transaction before the response is returned
3. NOTIF-03: `POST /api/sessions/[id]/corrections/validate-reason` returns AI feedback (pass/fail + one sentence) without performing any database write — AI availability does not block the mutation endpoint
4. WFLOW-02: A manager can only correct sessions from their own series; an admin can correct any session in the tenant — any other actor receives a 403 response
5. WFLOW-03: Submitting a reason shorter than 20 characters or longer than 500 characters is rejected by Zod validation before any AI or database call is made

## What Was Built

- **RED test scaffold** (Plan 01): Four test files covering `correctionInputSchema`, `validateReasonSchema`, `canCorrectSession` RBAC, AI result schema, and session scoring — 29 tests total (25 RED, 10 already GREEN for scoring).
- **Zod schemas + RBAC + AI service** (Plan 02): `src/lib/validations/correction.ts` (input + validate-reason schemas), `src/lib/ai/schemas/correction.ts` (AI result schema), `canCorrectSession` added to `src/lib/auth/rbac.ts`, `validateCorrectionReason` AI service in `src/lib/ai/services/correction.ts`. All RED tests turn GREEN.
- **Atomic correction route** (`src/app/api/sessions/[id]/corrections/route.ts`): 6-step transaction — history INSERT → answer UPDATE → all-answers SELECT → score recompute → session UPDATE (`analyticsIngestedAt=null`) → audit INSERT. Sets `analyticsIngestedAt=null` as invalidation signal for async analytics refresh.
- **AI validation route** (`src/app/api/sessions/[id]/corrections/validate-reason/route.ts`): Auth-only guard (no series RBAC), zero DB writes, graceful fallback returns `{ pass: true, feedback: null }` on AI failure.

## Key Decisions

- Zod v4 uses `.issues` not `.errors` — auto-fixed `ZodError` property access to `error.issues[0].message`
- `validate-reason` is auth-only (no series RBAC) — reason text is not sensitive, AI response is advisory only
- `analyticsIngestedAt=null` used as invalidation signal in mutation transaction — async analytics pipeline can detect and refresh
- AI graceful degradation: `validateCorrectionReason` throws → route catches → returns `{ pass: true, feedback: null }` (mutation endpoint never blocked by AI availability)
- `computeSessionScore` was already fully implemented — scoring tests were GREEN on first run

## Key Files

- `src/lib/validations/correction.ts` (new)
- `src/lib/ai/schemas/correction.ts` (new)
- `src/lib/ai/services/correction.ts` (new)
- `src/app/api/sessions/[id]/corrections/route.ts` (new)
- `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` (new)
- `src/lib/auth/rbac.ts`
- `src/lib/validations/__tests__/correction.test.ts` (new)
- `src/lib/ai/schemas/__tests__/correction.test.ts` (new)
- `src/lib/auth/__tests__/rbac.test.ts`
- `src/lib/utils/__tests__/scoring.test.ts` (new)
