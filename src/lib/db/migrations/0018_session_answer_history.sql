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

DROP POLICY IF EXISTS tenant_isolation_select ON "session_answer_history";--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON "session_answer_history"
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS tenant_isolation_insert ON "session_answer_history";--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON "session_answer_history"
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- No UPDATE or DELETE policies -- session_answer_history is append-only

-- =============================================================
-- 5. Grant privileges
-- =============================================================

GRANT SELECT, INSERT ON "session_answer_history" TO app_user;
