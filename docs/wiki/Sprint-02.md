# Sprint 02 — Database Schema & RLS

**Duration**: 2 weeks
**Dependencies**: Sprint 01

## Goals

Define all Drizzle ORM table schemas, create PostgreSQL migrations, implement Row-Level Security policies, build the tenant context middleware, and create seed data for development.

## Deliverables

1. **All Drizzle schema files**: tenants, users, teams, team_members, questionnaire_templates, template_questions, meeting_series, sessions, session_answers, private_notes, talking_points, action_items, notifications, analytics_snapshots
2. **PostgreSQL enums**: all enum types defined (plan, user_role, team_role, template_category, answer_type, question_category, cadence, series_status, session_status, action_status, notification_type, notification_channel, notification_status, period_type, conditional_operator)
3. **Indexes**: all indexes as specified in the data model
4. **RLS policies**: tenant isolation on every tenant-scoped table, author-only policy on private_notes
5. **Tenant context middleware**: `withTenantContext()` function that sets `app.current_tenant_id` and `app.current_user_id` via `SET LOCAL`
6. **Migration files**: generated and tested
7. **Seed script**: creates a demo tenant, 5 users (1 admin, 2 managers, 2 members), 2 teams, 1 template with questions

## Acceptance Criteria

- [ ] All 14 table schemas compile without TypeScript errors
- [ ] `drizzle-kit generate` produces migration SQL without errors
- [ ] `drizzle-kit migrate` applies migrations to a clean database successfully
- [ ] RLS policies prevent cross-tenant data access (verified with test queries using different `app.current_tenant_id`)
- [ ] Private note RLS restricts access to author only (verified with test)
- [ ] `withTenantContext()` correctly scopes queries to the active tenant
- [ ] Seed script runs successfully and creates valid test data
- [ ] All foreign key relationships are valid (insert/delete cascades work)
- [ ] Unique constraints prevent duplicate data (e.g., same email in same tenant)
- [ ] JSONB columns accept and return properly typed data

## Key Files

```
src/lib/db/schema/tenants.ts
src/lib/db/schema/users.ts
src/lib/db/schema/teams.ts
src/lib/db/schema/templates.ts
src/lib/db/schema/series.ts
src/lib/db/schema/sessions.ts
src/lib/db/schema/answers.ts
src/lib/db/schema/action-items.ts
src/lib/db/schema/notifications.ts
src/lib/db/schema/analytics.ts
src/lib/db/schema/index.ts            # re-exports all schemas
src/lib/db/index.ts                    # connection + tenant context
src/lib/db/seed.ts
src/lib/db/migrations/                 # generated SQL
drizzle.config.ts                      # updated if needed
```
