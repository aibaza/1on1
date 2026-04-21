-- RLS policies for feedback_report + feedback_message
-- Follows the tenant_isolation pattern from 0001_rls_policies.sql.
-- Reporter ops use withTenantContext() (app.current_tenant_id); platform-admin
-- ops use adminDb (bypasses RLS, same pattern as admin/billing/page.tsx).

ALTER TABLE "feedback_report" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "feedback_message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- FEEDBACK_REPORT: tenant isolation
CREATE POLICY tenant_isolation ON "feedback_report"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- FEEDBACK_MESSAGE: tenant isolation via denormalized tenant_id
CREATE POLICY tenant_isolation ON "feedback_message"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);--> statement-breakpoint

-- Grants to app_user role (matches existing pattern from 0001)
GRANT SELECT, INSERT, UPDATE, DELETE ON "feedback_report" TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "feedback_message" TO app_user;--> statement-breakpoint
GRANT USAGE ON SEQUENCE feedback_ticket_seq TO app_user;
