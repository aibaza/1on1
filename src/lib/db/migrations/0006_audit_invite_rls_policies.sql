-- RLS Policies for audit_log and invite_token tables (Phase 03-01)
-- audit_log: immutable (SELECT/INSERT only, no UPDATE/DELETE)
-- invite_token: SELECT/INSERT/UPDATE (no DELETE)

-- =============================================================
-- 1. audit_log: Enable RLS + tenant isolation (SELECT/INSERT only)
-- =============================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY tenant_isolation_select ON audit_log
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

CREATE POLICY tenant_isolation_insert ON audit_log
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- No UPDATE or DELETE policies -- audit log is immutable
GRANT SELECT, INSERT ON audit_log TO app_user;--> statement-breakpoint

-- =============================================================
-- 2. invite_token: Enable RLS + tenant isolation (SELECT/INSERT/UPDATE)
-- =============================================================

ALTER TABLE invite_token ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE invite_token FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY tenant_isolation_select ON invite_token
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

CREATE POLICY tenant_isolation_insert ON invite_token
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

CREATE POLICY tenant_isolation_update ON invite_token
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- No DELETE policy -- invites are not deleted, they expire or get accepted
GRANT SELECT, INSERT, UPDATE ON invite_token TO app_user;
