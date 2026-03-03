---
phase: 01-foundation-infrastructure
plan: 02
subsystem: database
tags: [drizzle-orm, postgresql, rls, multi-tenancy, tenant-isolation, schema, migrations]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure/01-01
    provides: Next.js project with Drizzle ORM config, Docker Compose PostgreSQL, app_user role
provides:
  - Complete Drizzle ORM schema for all 14 database tables
  - 16 pgEnum types for all domain enumerations
  - SQL migrations (DDL + RLS policies)
  - Row-Level Security on all tenant-scoped tables
  - Private note RESTRICTIVE tenant + author-only RLS policies
  - withTenantContext() wrapper for tenant-scoped database queries
  - app_user role with CRUD privileges on all tables
affects: [01-03, 02-auth, 03-meeting-series, all-data-access-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [rls-tenant-isolation, set-config-local-transaction, restrictive-policy-and-logic, junction-table-rls-via-join]

key-files:
  created: [src/lib/db/schema/enums.ts, src/lib/db/schema/tenants.ts, src/lib/db/schema/users.ts, src/lib/db/schema/teams.ts, src/lib/db/schema/templates.ts, src/lib/db/schema/series.ts, src/lib/db/schema/sessions.ts, src/lib/db/schema/answers.ts, src/lib/db/schema/notes.ts, src/lib/db/schema/action-items.ts, src/lib/db/schema/notifications.ts, src/lib/db/schema/analytics.ts, src/lib/db/schema/index.ts, src/lib/db/tenant-context.ts, src/lib/db/migrations/0000_complex_scalphunter.sql, src/lib/db/migrations/0001_rls_policies.sql]
  modified: [CHANGELOG.md]

key-decisions:
  - "Applied migrations via psql instead of drizzle-kit migrate (Neon serverless driver cannot connect to local PostgreSQL)"
  - "Private note RLS uses RESTRICTIVE tenant policy + permissive author-only per-operation policies (AND logic)"
  - "Junction table RLS policies use subquery JOIN to parent table for tenant isolation"
  - "Drizzle migration journal manually updated to track both auto-generated and custom RLS migration"

patterns-established:
  - "Schema file per entity: src/lib/db/schema/{entity}.ts with table + relations"
  - "Centralized enums: all pgEnum definitions in src/lib/db/schema/enums.ts"
  - "Re-export barrel: src/lib/db/schema/index.ts re-exports all schema files"
  - "Tenant context wrapper: withTenantContext(tenantId, userId, operation) for all tenant-scoped queries"
  - "RLS policy naming: tenant_isolation for standard policies, author_only_{op} for private note"

requirements-completed: [ORG-02, ORG-03, SEC-05]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 1 Plan 02: Database Schema & RLS Summary

**Complete Drizzle ORM schema for 14 tables with RLS tenant isolation and withTenantContext() wrapper using SET LOCAL transactions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-03T09:15:11Z
- **Completed:** 2026-03-03T09:19:49Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments
- All 14 database tables defined in Drizzle ORM matching docs/data-model.md exactly, with 16 pgEnum types
- Row-Level Security enabled on all tables with tenant isolation policies (direct and via parent JOIN for junction tables)
- Private note has RESTRICTIVE tenant policy + author-only policies (FORCE ROW LEVEL SECURITY enforces AND logic)
- withTenantContext() wrapper uses set_config with SET LOCAL for transaction-scoped tenant/user context
- Migrations applied to local PostgreSQL (oneonone_dev) with app_user role granted CRUD privileges

## Task Commits

Each task was committed atomically:

1. **Task 1: Create complete Drizzle schema for all database tables** - `811972d` (feat)
2. **Task 2: Generate migration, add RLS policies, create tenant context wrapper** - `95f3ad5` (feat)

## Files Created/Modified
- `src/lib/db/schema/enums.ts` - 16 pgEnum definitions for all domain types
- `src/lib/db/schema/tenants.ts` - TENANT table with plan, settings, slug
- `src/lib/db/schema/users.ts` - USER table with tenant_id, manager_id self-reference, 3 indexes
- `src/lib/db/schema/teams.ts` - TEAM and TEAM_MEMBER tables with unique constraint
- `src/lib/db/schema/templates.ts` - QUESTIONNAIRE_TEMPLATE and TEMPLATE_QUESTION with conditional logic columns
- `src/lib/db/schema/series.ts` - MEETING_SERIES with cadence, preferred day/time, 3 indexes
- `src/lib/db/schema/sessions.ts` - SESSION with score, status, 3 indexes
- `src/lib/db/schema/answers.ts` - SESSION_ANSWER with typed columns (text, numeric, json), 3 indexes
- `src/lib/db/schema/notes.ts` - PRIVATE_NOTE with key_version column, TALKING_POINT with carry-over FK
- `src/lib/db/schema/action-items.ts` - ACTION_ITEM with status, due_date, carry-over FK, 3 indexes
- `src/lib/db/schema/notifications.ts` - NOTIFICATION with type, channel, scheduling, 2 indexes
- `src/lib/db/schema/analytics.ts` - ANALYTICS_SNAPSHOT with metric_value decimal, unique composite index
- `src/lib/db/schema/index.ts` - Barrel re-export for all schema modules
- `src/lib/db/tenant-context.ts` - withTenantContext() using set_config + transaction
- `src/lib/db/migrations/0000_complex_scalphunter.sql` - Drizzle-generated DDL (14 tables, 16 enums, all indexes)
- `src/lib/db/migrations/0001_rls_policies.sql` - Custom RLS policies and app_user grants

## Decisions Made
- Applied migrations via psql instead of drizzle-kit migrate because the Neon serverless driver cannot connect to local PostgreSQL (expects WebSocket connection). This is a local dev convenience; production uses Neon natively.
- Private note RLS uses PostgreSQL's RESTRICTIVE mode for tenant policy combined with permissive author-only policies, achieving AND logic between tenant isolation and author access control.
- Junction tables (team_member, template_question, session_answer, talking_point) use subquery-based RLS policies that JOIN to their parent table's tenant_id, since they don't have their own tenant_id column.
- Manually updated the Drizzle migration journal to track both the auto-generated schema migration and the custom RLS migration, ensuring future db:migrate calls won't re-apply them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied migrations via psql instead of drizzle-kit migrate**
- **Found during:** Task 2 (migration application)
- **Issue:** `drizzle-kit migrate` uses the Neon serverless driver which requires WebSocket connections; local PostgreSQL via Docker does not support WebSocket connections
- **Fix:** Applied both migration SQL files directly via `docker compose exec db psql` with pipe from stdin
- **Files modified:** None (runtime approach change only)
- **Verification:** All 14 tables created, RLS enabled on all tables confirmed via pg_tables query
- **Committed in:** 95f3ad5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration approach changed from drizzle-kit to psql for local dev. No impact on schema correctness or production deployment (Neon driver works natively with Neon cloud).

## Issues Encountered
- Neon serverless driver (used by drizzle-kit migrate) cannot connect to local PostgreSQL because it requires WebSocket connections (`wss://localhost/v2`). Resolved by applying SQL migrations directly via psql. This is expected behavior -- the Neon driver is designed for cloud Neon instances, not local PostgreSQL.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete database schema is ready for Plan 01-03 (seed data, encryption utilities)
- withTenantContext() is available for all future data access code
- RLS policies are active and will enforce tenant isolation from the first query
- app_user role is ready for application-level database connections

## Self-Check: PASSED

All 16 created files verified present. Both task commits (811972d, 95f3ad5) verified in git log.

---
*Phase: 01-foundation-infrastructure*
*Completed: 2026-03-03*
