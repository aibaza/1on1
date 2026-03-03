-- Auth RLS Policies for Phase 02-01
-- RLS on account and auth_session (tenant isolation via user JOIN)
-- Token tables: no RLS (accessed in unauthenticated context during registration/reset)

-- account table: RLS via user JOIN for tenant isolation
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE account FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON account
  USING (user_id IN (SELECT id FROM "user" WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON account TO app_user;

-- auth_session table: RLS via user JOIN for tenant isolation
ALTER TABLE auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_session FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON auth_session
  USING (user_id IN (SELECT id FROM "user" WHERE tenant_id = current_setting('app.current_tenant_id')::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_session TO app_user;

-- verification_token: no RLS (Auth.js magic link tokens, global access)
GRANT SELECT, INSERT, DELETE ON verification_token TO app_user;

-- email_verification_token: no RLS (accessed during registration, before tenant context exists)
GRANT SELECT, INSERT, DELETE ON email_verification_token TO app_user;

-- password_reset_token: no RLS (accessed during password reset, before tenant context exists)
GRANT SELECT, INSERT, DELETE ON password_reset_token TO app_user;
