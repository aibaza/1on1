# Phase 24: Schema Foundation - Research

**Researched:** 2026-03-10
**Domain:** Drizzle ORM schema extension, PostgreSQL append-only history tables, RLS policies, enum extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORR-02 | System preserves the original answer value (text/numeric/json) in an append-only history table — original value is never overwritten or destroyed | Append-only history table design with typed snapshot columns, RLS policy pattern, migration structure |
</phase_requirements>

---

## Summary

Phase 24 is a pure database schema phase: add one new table (`session_answer_history`), extend one existing enum (`notificationTypeEnum`), and run a single migration that does both atomically. The codebase has strong, consistent Drizzle patterns for all three operations — this research documents those exact patterns so the planner produces tasks that follow them precisely.

The `session_answer_history` table must carry its own `tenant_id` column (not join through `session_answer`) because the phase requirement explicitly states "no cross-tenant reads possible, including via `adminDb`". The only way to enforce that with `FORCE ROW LEVEL SECURITY` is a direct `tenant_id` column with an `ALTER TABLE ... FORCE ROW LEVEL SECURITY` directive. The `session_answer` table in the current codebase does *not* have its own `tenant_id` — it joins through `session`. The history table should be designed stronger: direct `tenant_id` + `FORCE ROW LEVEL SECURITY`.

Extending `notificationTypeEnum` in PostgreSQL requires `ALTER TYPE ... ADD VALUE` — Drizzle `generate` does NOT produce this for existing enums. A custom hand-written migration is required, matching the pattern used in `0010_ai_pipeline_schema.sql` (which used a `DO $$ BEGIN ... END $$;` guard) and in `0001_rls_policies.sql` (which was a fully custom file). The journal entry and meta snapshot must be kept consistent: either let `drizzle-kit generate` produce the table DDL and then manually add the `ALTER TYPE` to the same file, or write the entire migration by hand and update the journal manually. The proven project pattern for mixed DDL + custom SQL is a single hand-written migration file registered in `_journal.json`.

**Primary recommendation:** Write one hand-crafted migration (numbered `0018_session_answer_history.sql`) that: (1) extends the `notification_type` enum with `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, (2) creates `session_answer_history` with all typed columns, (3) enables and forces RLS, (4) creates the tenant isolation policy (SELECT/INSERT only — history is append-only), (5) grants privileges to `app_user`. Update the Drizzle schema files and `index.ts` export in a single commit so `drizzle-kit migrate` finds a clean state.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | (existing) | Schema definition, query builder | Already in use — all tables defined here |
| drizzle-kit | (existing) | Migration generation and execution | `bunx drizzle-kit migrate` applies migrations |
| @neondatabase/serverless | (existing) | WebSocket pool that supports transactions + SET LOCAL | Required for RLS tenant context |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm/pg-core | (existing) | `pgTable`, `pgEnum`, `uuid`, `text`, `decimal`, `jsonb`, `timestamp`, `index` | Every new schema file |
| drizzle-orm `relations` | (existing) | Declare foreign-key relationships for eager loading | Any table with FK references |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written migration | `drizzle-kit generate` | `generate` would not produce `ALTER TYPE ADD VALUE` or RLS statements — always requires manual augmentation for those operations |
| Direct `tenant_id` column on history table | Join through `session_answer` | Join-based policy is weaker — `FORCE ROW LEVEL SECURITY` cannot be applied without own column; requirement explicitly calls out `adminDb` bypass risk |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/db/schema/
├── enums.ts           # Add 'session_correction' to notificationTypeEnum
├── answers.ts         # Existing session_answers table (no changes)
├── answer-history.ts  # NEW: sessionAnswerHistory table + relations
└── index.ts           # Add export: export * from "./answer-history"

src/lib/db/migrations/
└── 0018_session_answer_history.sql  # Hand-written migration (see Code Examples)
```

### Pattern 1: Schema File Structure
**What:** Each table lives in its own `.ts` file matching the table's domain. Enums live in `enums.ts`. The file imports from sibling schema files for FK references.
**When to use:** All new tables in this project.
**Example:**
```typescript
// Source: src/lib/db/schema/analytics.ts (existing pattern)
import {
  pgTable,
  uuid,
  text,
  decimal,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { sessions } from "./sessions";
import { sessionAnswers } from "./answers";

export const sessionAnswerHistory = pgTable(
  "session_answer_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionAnswerId: uuid("session_answer_id")
      .notNull()
      .references(() => sessionAnswers.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    correctedById: uuid("corrected_by_id")
      .notNull()
      .references(() => users.id),
    // Snapshot of original values at correction time
    originalAnswerText: text("original_answer_text"),
    originalAnswerNumeric: decimal("original_answer_numeric", { precision: 6, scale: 2 }),
    originalAnswerJson: jsonb("original_answer_json"),
    originalSkipped: boolean("original_skipped").notNull().default(false),
    correctionReason: text("correction_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_answer_history_answer_idx").on(table.sessionAnswerId),
    index("session_answer_history_session_idx").on(table.sessionId, table.createdAt),
    index("session_answer_history_tenant_idx").on(table.tenantId, table.createdAt),
  ]
);
```

### Pattern 2: Enum Extension in Drizzle Schema
**What:** Add the new value to the `pgEnum` call in `enums.ts`. The TypeScript type is updated automatically. The migration SQL uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.
**When to use:** Any time a new notification type is added.
**Example:**
```typescript
// Source: src/lib/db/schema/enums.ts — update existing declaration
export const notificationTypeEnum = pgEnum("notification_type", [
  "pre_meeting",
  "agenda_prep",
  "overdue_action",
  "session_summary",
  "missed_meeting",
  "system",
  "session_correction",   // ADD THIS
]);
```

### Pattern 3: RLS on Append-Only History Table
**What:** History tables are INSERT + SELECT only. No UPDATE or DELETE policy means the DB rejects those operations even for superusers when `FORCE ROW LEVEL SECURITY` is set.
**When to use:** Any table that must be immutable (audit, history).
**Example:**
```sql
-- Source: matches 0006_audit_invite_rls_policies.sql pattern
ALTER TABLE "session_answer_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_answer_history" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON "session_answer_history"
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_insert ON "session_answer_history"
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- No UPDATE or DELETE policies -- history is append-only

GRANT SELECT, INSERT ON "session_answer_history" TO app_user;
```

### Pattern 4: Relations Declaration
**What:** Every table with FK relations needs a `relations()` export so Drizzle can eager-load via `with:`.
**Example:**
```typescript
// Source: src/lib/db/schema/audit-log.ts (existing pattern)
export const sessionAnswerHistoryRelations = relations(
  sessionAnswerHistory,
  ({ one }) => ({
    sessionAnswer: one(sessionAnswers, {
      fields: [sessionAnswerHistory.sessionAnswerId],
      references: [sessionAnswers.id],
    }),
    session: one(sessions, {
      fields: [sessionAnswerHistory.sessionId],
      references: [sessions.id],
    }),
    tenant: one(tenants, {
      fields: [sessionAnswerHistory.tenantId],
      references: [tenants.id],
    }),
    correctedBy: one(users, {
      fields: [sessionAnswerHistory.correctedById],
      references: [users.id],
    }),
  })
);
```

### Anti-Patterns to Avoid
- **Omitting `FORCE ROW LEVEL SECURITY`:** Without `FORCE ROW LEVEL SECURITY`, the table owner (postgres) and `adminDb` can bypass RLS. The audit_log and invite_token tables in this project both use `FORCE` — the history table must too, per the explicit requirement.
- **Join-based RLS on a history table:** Using `session_id IN (SELECT id FROM session WHERE tenant_id = ...)` means the policy depends on a join that might be bypassed. Direct `tenant_id` column + direct comparison is the stronger design.
- **Modifying `session_answers` instead of snapshotting:** The point of the history table is to snapshot original values before mutation. The history row is written first, the answer updated second, all in one transaction (Phase 25 concern, but the schema must support it).
- **Running `drizzle-kit generate` for the enum extension:** Drizzle's generator does not produce `ALTER TYPE ... ADD VALUE`. It will instead try to drop and recreate the enum, which fails if any column references it. Always use hand-written `ALTER TYPE ... ADD VALUE IF NOT EXISTS` for enum extensions.
- **Using `boolean` import without including it in the pg-core import list:** The `sessionAnswers` table doesn't import `boolean` in its current file. The new history table needs `boolean` for `original_skipped`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant context in transactions | Custom SET LOCAL logic | `withTenantContext()` in `src/lib/db/tenant-context.ts` | Already handles SET LOCAL for both `app.current_tenant_id` and `app.current_user_id` |
| Migration sequencing | Manual file renaming | Register entry in `meta/_journal.json` with correct `idx` | Drizzle uses the journal to track applied migrations |
| Enum type checking | Runtime string checks | TypeScript inference from `pgEnum` declaration | Type-safe at compile time once `enums.ts` is updated |

---

## Common Pitfalls

### Pitfall 1: Enum Extension Breaks `drizzle-kit generate`
**What goes wrong:** If the developer updates `enums.ts` and runs `drizzle-kit generate`, Drizzle may attempt to drop and recreate the `notification_type` enum because it sees a value added. This fails at the SQL level because the enum is referenced by the `notification` table.
**Why it happens:** Drizzle's schema diffing can treat enum value additions as a full type replacement.
**How to avoid:** Write the migration SQL by hand using `ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'session_correction';`. Register this in `_journal.json` manually and do NOT run `drizzle-kit generate` for the enum change. Update `enums.ts` so TypeScript types are correct, but apply the DDL manually.
**Warning signs:** If `drizzle-kit generate` produces `DROP TYPE` or `CREATE TYPE` for `notification_type` in its output, discard that output and write the migration manually.

### Pitfall 2: Missing `import { boolean }` in New Schema File
**What goes wrong:** The `sessionAnswerHistory` table needs `boolean` for `original_skipped` (mirroring `session_answers.skipped`). The `answers.ts` file imports it, but a freshly created `answer-history.ts` will throw a TypeScript error if `boolean` is forgotten.
**Why it happens:** Copy-paste from `analytics.ts` or `audit-log.ts` won't include `boolean`.
**How to avoid:** Ensure the import from `drizzle-orm/pg-core` includes `boolean, decimal, jsonb, text, timestamp, uuid, index, pgTable`.

### Pitfall 3: Journal Index Collision
**What goes wrong:** If `_journal.json` already has an entry with `idx: 18`, adding another with the same index will cause `drizzle-kit migrate` to fail or skip the migration.
**Why it happens:** The last entry in the journal is `idx: 17`. The next must be `idx: 18` with a unique `tag`.
**How to avoid:** Read `_journal.json` before writing the entry. Use tag `0018_session_answer_history` and `idx: 18`.

### Pitfall 4: `adminDb` Bypass Not Blocked
**What goes wrong:** The `adminDb` connection in `src/lib/db/index.ts` connects as a superuser (or table owner). Without `FORCE ROW LEVEL SECURITY`, the superuser can read across tenants. Without `FORCE`, `ENABLE ROW LEVEL SECURITY` alone does not protect against the table owner.
**Why it happens:** PostgreSQL's default is that table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is explicitly set.
**How to avoid:** Use `ALTER TABLE "session_answer_history" FORCE ROW LEVEL SECURITY;` immediately after `ENABLE ROW LEVEL SECURITY;` in the migration.

### Pitfall 5: Missing `nudges.ts` Export Pattern for Forward References
**What goes wrong:** `sessions.ts` uses forward `import` at the bottom of the file (e.g., `import { sessionAnswers } from "./answers"`). If `answer-history.ts` is imported by `sessions.ts` prematurely, circular reference errors occur.
**Why it happens:** TypeScript/Node circular module resolution.
**How to avoid:** Do NOT add a `many(sessionAnswerHistories)` relation to `sessions.ts` in this phase. The relation from `sessions` to `sessionAnswerHistory` is optional and can be added in Phase 27 when needed for UI queries. In Phase 24, only the `sessionAnswerHistoryRelations` in `answer-history.ts` need to reference `sessions`.

---

## Code Examples

### Complete Migration File: `0018_session_answer_history.sql`
```sql
-- Phase 24: Session Answer History Table + notificationTypeEnum extension
-- Hand-written migration — drizzle-kit generate does not handle ALTER TYPE ADD VALUE

-- =============================================================
-- 1. Extend notification_type enum
-- =============================================================

ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'session_correction';--> statement-breakpoint

-- =============================================================
-- 2. Create session_answer_history table
-- =============================================================

CREATE TABLE IF NOT EXISTS "session_answer_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_answer_id" uuid NOT NULL REFERENCES "session_answer"("id"),
  "session_id" uuid NOT NULL REFERENCES "session"("id"),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "corrected_by_id" uuid NOT NULL REFERENCES "user"("id"),
  "original_answer_text" text,
  "original_answer_numeric" numeric(6, 2),
  "original_answer_json" jsonb,
  "original_skipped" boolean NOT NULL DEFAULT false,
  "correction_reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- =============================================================
-- 3. Indexes
-- =============================================================

CREATE INDEX IF NOT EXISTS "session_answer_history_answer_idx"
  ON "session_answer_history" ("session_answer_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "session_answer_history_session_idx"
  ON "session_answer_history" ("session_id", "created_at");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "session_answer_history_tenant_idx"
  ON "session_answer_history" ("tenant_id", "created_at");--> statement-breakpoint

-- =============================================================
-- 4. Enable and force RLS (append-only: SELECT + INSERT only)
-- =============================================================

ALTER TABLE "session_answer_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_answer_history" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY tenant_isolation_select ON "session_answer_history"
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

CREATE POLICY tenant_isolation_insert ON "session_answer_history"
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- No UPDATE or DELETE policies -- session_answer_history is append-only

-- =============================================================
-- 5. Grant privileges
-- =============================================================

GRANT SELECT, INSERT ON "session_answer_history" TO app_user;
```

### Journal Entry to Add to `_journal.json`
```json
{
  "idx": 18,
  "version": "7",
  "when": 1773000000000,
  "tag": "0018_session_answer_history",
  "breakpoints": true
}
```

### Drizzle Schema: `src/lib/db/schema/answer-history.ts`
```typescript
import {
  pgTable,
  uuid,
  text,
  decimal,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { sessions } from "./sessions";
import { sessionAnswers } from "./answers";

export const sessionAnswerHistory = pgTable(
  "session_answer_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionAnswerId: uuid("session_answer_id")
      .notNull()
      .references(() => sessionAnswers.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    correctedById: uuid("corrected_by_id")
      .notNull()
      .references(() => users.id),
    originalAnswerText: text("original_answer_text"),
    originalAnswerNumeric: decimal("original_answer_numeric", { precision: 6, scale: 2 }),
    originalAnswerJson: jsonb("original_answer_json"),
    originalSkipped: boolean("original_skipped").notNull().default(false),
    correctionReason: text("correction_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_answer_history_answer_idx").on(table.sessionAnswerId),
    index("session_answer_history_session_idx").on(table.sessionId, table.createdAt),
    index("session_answer_history_tenant_idx").on(table.tenantId, table.createdAt),
  ]
);

export const sessionAnswerHistoryRelations = relations(
  sessionAnswerHistory,
  ({ one }) => ({
    sessionAnswer: one(sessionAnswers, {
      fields: [sessionAnswerHistory.sessionAnswerId],
      references: [sessionAnswers.id],
    }),
    session: one(sessions, {
      fields: [sessionAnswerHistory.sessionId],
      references: [sessions.id],
    }),
    tenant: one(tenants, {
      fields: [sessionAnswerHistory.tenantId],
      references: [tenants.id],
    }),
    correctedBy: one(users, {
      fields: [sessionAnswerHistory.correctedById],
      references: [users.id],
    }),
  })
);
```

### `enums.ts` Change (diff view)
```typescript
// Before:
export const notificationTypeEnum = pgEnum("notification_type", [
  "pre_meeting",
  "agenda_prep",
  "overdue_action",
  "session_summary",
  "missed_meeting",
  "system",
]);

// After:
export const notificationTypeEnum = pgEnum("notification_type", [
  "pre_meeting",
  "agenda_prep",
  "overdue_action",
  "session_summary",
  "missed_meeting",
  "system",
  "session_correction",
]);
```

### `index.ts` Change (add one line)
```typescript
export * from "./enums";
export * from "./tenants";
export * from "./users";
export * from "./auth";
export * from "./teams";
export * from "./templates";
export * from "./series";
export * from "./sessions";
export * from "./answers";
export * from "./answer-history";   // ADD THIS
export * from "./notes";
export * from "./action-items";
export * from "./notifications";
export * from "./analytics";
export * from "./audit-log";
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pgEnum` recreation on value add | `ALTER TYPE ... ADD VALUE IF NOT EXISTS` | Always been PostgreSQL standard | Enum additions are safe non-destructive DDL |
| RLS `ENABLE` only | `ENABLE` + `FORCE ROW LEVEL SECURITY` for immutable/sensitive tables | Established in this project (audit_log, invite_token) | Blocks superuser/adminDb bypass |
| Session-join RLS | Direct `tenant_id` column + direct comparison | See session_answer vs proposed history table | Stronger isolation, no implicit join path |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, environment: node) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORR-02 | `sessionAnswerHistory` Drizzle schema shape has all required typed columns | unit | `bun run test src/lib/db/schema/__tests__/answer-history.test.ts` | ❌ Wave 0 |
| CORR-02 | `notificationTypeEnum` values array includes `'session_correction'` | unit | `bun run test src/lib/db/schema/__tests__/enums.test.ts` | ❌ Wave 0 |
| CORR-02 | `sessionAnswerHistory` is exported from `schema/index.ts` | unit | included in schema shape test | ❌ Wave 0 |

**Note:** RLS enforcement (`FORCE ROW LEVEL SECURITY`, cross-tenant isolation) cannot be unit tested against Drizzle's schema objects — it requires a live PostgreSQL instance. The migration is verified by running `bunx drizzle-kit migrate` against the local Docker DB as an integration step, not a unit test. The unit tests cover only what can be verified in-process: column presence, TypeScript types, and export presence.

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck`
- **Phase gate:** `bun run test && bun run typecheck && bun run lint && bunx drizzle-kit migrate` green before moving to Phase 25

### Wave 0 Gaps
- [ ] `src/lib/db/schema/__tests__/answer-history.test.ts` — covers CORR-02 schema shape
- [ ] `src/lib/db/schema/__tests__/enums.test.ts` — covers `notificationTypeEnum` includes `session_correction`

---

## Open Questions

1. **`drizzle-kit generate` conflict risk**
   - What we know: Drizzle may attempt to drop/recreate `notification_type` enum if it detects the value addition
   - What's unclear: Whether current Drizzle version (project uses existing pinned version) handles `ADD VALUE` gracefully in `generate`
   - Recommendation: Do not run `drizzle-kit generate` after updating `enums.ts`. Write and apply the migration by hand. Verify with `drizzle-kit migrate --dry-run` (if supported) or inspect the generated SQL before applying.

2. **`correctionReason` column placement**
   - What we know: Phase 25 will also store `correction_reason` on the correction action itself via the API. Phase 24 captures it as part of the history snapshot.
   - What's unclear: Whether `correction_reason` belongs in the history table or a separate `session_correction` table that Phase 25 might introduce
   - Recommendation: Include `correction_reason` in `session_answer_history` now. If Phase 25 introduces a dedicated `session_correction` table, it can FK back to history rows. Having the reason in history avoids a join to reconstruct a complete snapshot.

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `src/lib/db/schema/enums.ts` — current `notificationTypeEnum` values
- Direct source inspection: `src/lib/db/schema/answers.ts` — `session_answers` column types to mirror
- Direct source inspection: `src/lib/db/migrations/0006_audit_invite_rls_policies.sql` — append-only table RLS pattern (`FORCE ROW LEVEL SECURITY`, SELECT+INSERT only)
- Direct source inspection: `src/lib/db/migrations/0010_ai_pipeline_schema.sql` — `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object` enum guard pattern
- Direct source inspection: `src/lib/db/migrations/0001_rls_policies.sql` — `GRANT SELECT, INSERT ON ... TO app_user` pattern
- Direct source inspection: `src/lib/db/migrations/meta/_journal.json` — next `idx` is 18
- Direct source inspection: `src/lib/db/index.ts` — `adminDb` uses superuser connection, bypasses RLS without FORCE
- Direct source inspection: `src/lib/db/tenant-context.ts` — `withTenantContext()` wrapper for transaction-scoped tenant setting

### Secondary (MEDIUM confidence)
- PostgreSQL documentation: `ALTER TYPE ... ADD VALUE` is safe DDL that does not require recreating the type or migrating existing data — confirmed by project's own migration history (no examples of enum recreation)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in use; no new dependencies
- Architecture: HIGH — every pattern is directly derived from existing codebase files
- Pitfalls: HIGH — derived from concrete code inspection (adminDb bypass, FORCE RLS, circular imports, journal collision)

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable schema domain; Drizzle version is pinned)
