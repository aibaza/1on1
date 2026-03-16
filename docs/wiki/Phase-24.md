# Phase 24: Schema Foundation

**Status**: Complete
**Milestone**: v1.4 Session Corrections & Accountability
**Depends on**: Phase 23
**Completed**: 2026-03-10

## Goal

The database is structurally ready for corrections — original answer values can never be lost, cross-tenant exposure is impossible, and the notification system recognizes correction events.

## Success Criteria

1. CORR-02: A `session_answer_history` table exists with typed snapshot columns (`answer_text`, `answer_numeric`, `answer_json`) that mirror `session_answers` — original values are captured, not overwritten
2. CORR-02: The table has `tenant_id` on every row and an active Row-Level Security policy — no cross-tenant reads are possible, including via `adminDb`
3. CORR-02: `notificationTypeEnum` includes `session_correction` — the enum is extended in the same migration without recreating it
4. CORR-02: Drizzle schema is exported from `index.ts` and `bunx drizzle-kit migrate` runs cleanly against the local database

## What Was Built

- **`sessionAnswerHistory` Drizzle schema** (`src/lib/db/schema/answer-history.ts`): 11 typed snapshot columns mirroring `session_answers` (`answer_text`, `answer_numeric`, `answer_json`), 3 composite indexes, and 4 FK relations. Direct `tenant_id` column (not join-derived) required for FORCE RLS to block `adminDb` superuser bypass.
- **`notificationTypeEnum` extension** (`src/lib/db/schema/enums.ts`): Added `session_correction` value. Extension handled via hand-written `ALTER TYPE` migration — `drizzle-kit generate` would attempt drop/recreate breaking FK references.
- **Hand-written SQL migration** (`src/lib/db/migrations/0018_session_answer_history.sql`): Creates `session_answer_history` table with `ENABLE FORCE ROW LEVEL SECURITY`, append-only RLS policies (SELECT + INSERT only — no UPDATE or DELETE), and minimum privilege grants to `app_user`.
- **TDD verification**: 20 passing unit tests validate schema shape via Drizzle column property inspection and `getTableName()`.

## Key Decisions

- Direct `tenant_id` on history table (not inherited via FK join) — required for FORCE ROW LEVEL SECURITY to block even `adminDb` superuser bypass
- Hand-written `ALTER TYPE` migration — `drizzle-kit generate` cannot extend enums without drop/recreate, which would break FK references
- No `many(sessionAnswerHistories)` relation added to `sessions.ts` — avoids circular imports (Phase 27 concern)
- Registered migrations 0012–0017 in `drizzle.__drizzle_migrations` tracking table (they were applied manually but previously untracked)

## Key Files

- `src/lib/db/schema/answer-history.ts` (new)
- `src/lib/db/schema/__tests__/answer-history.test.ts` (new)
- `src/lib/db/schema/__tests__/enums.test.ts` (new)
- `src/lib/db/migrations/0018_session_answer_history.sql` (new)
- `src/lib/db/schema/enums.ts`
- `src/lib/db/schema/index.ts`
- `src/lib/db/migrations/meta/_journal.json`
