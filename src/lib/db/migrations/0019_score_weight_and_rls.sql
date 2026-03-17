-- Consolidate orphan migrations not tracked in drizzle journal:
-- 0012_score_weight.sql: add score_weight to template_question
-- 0006_audit_invite_rls_policies.sql: RLS for audit_log + invite_token
-- Using IF NOT EXISTS / IF NOT EXISTS guards so this is idempotent on
-- production databases where these changes were applied manually.

-- =============================================================
-- 1. score_weight column (was 0012_score_weight.sql)
-- =============================================================

ALTER TABLE template_question
  ADD COLUMN IF NOT EXISTS score_weight DECIMAL(4,2) NOT NULL DEFAULT 1.0;

-- =============================================================
-- 2. audit_log RLS (was 0006_audit_invite_rls_policies.sql)
-- =============================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'tenant_isolation_select'
  ) THEN
    CREATE POLICY tenant_isolation_select ON audit_log
      FOR SELECT
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'tenant_isolation_insert'
  ) THEN
    CREATE POLICY tenant_isolation_insert ON audit_log
      FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
  END IF;
END $$;

GRANT SELECT, INSERT ON audit_log TO app_user;

-- =============================================================
-- 3. invite_token RLS (was 0006_audit_invite_rls_policies.sql)
-- =============================================================

ALTER TABLE invite_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_token FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invite_token' AND policyname = 'tenant_isolation_select'
  ) THEN
    CREATE POLICY tenant_isolation_select ON invite_token
      FOR SELECT
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invite_token' AND policyname = 'tenant_isolation_insert'
  ) THEN
    CREATE POLICY tenant_isolation_insert ON invite_token
      FOR INSERT
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invite_token' AND policyname = 'tenant_isolation_update'
  ) THEN
    CREATE POLICY tenant_isolation_update ON invite_token
      FOR UPDATE
      USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON invite_token TO app_user;
