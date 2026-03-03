---
phase: 03-user-team-management
plan: 01
subsystem: infra
tags: [drizzle, rbac, audit-log, tanstack-query, react-hook-form, shadcn, zod, sidebar]

# Dependency graph
requires:
  - phase: 02-authentication-organization
    provides: Auth.js config, session with tenantId/role/userId, proxy.ts, dashboard layout, user/tenant schemas
provides:
  - audit_log Drizzle schema with tenant isolation indexes
  - invite_token table with tenant+email unique constraint
  - RLS policies for audit_log (immutable) and invite_token
  - RBAC helper (requireRole, canManageTeams, isAdmin)
  - Transactional audit log helper (logAuditEvent)
  - Zod validation schemas for user management (invite, accept, profile, role, manager)
  - Zod validation schemas for team management (create, update, add/remove members)
  - TanStack Query provider wrapping dashboard layout
  - Sidebar navigation (Overview, People, Settings)
  - Toast notifications (Sonner) in dashboard
  - proxy.ts /invite route access for unauthenticated users
  - 15 shadcn/ui components installed
  - TransactionClient type exported from tenant-context
affects: [03-02-invite-flow, 03-03-people-directory, 03-04-team-management]

# Tech tracking
tech-stack:
  added: ["@tanstack/react-table", "@tanstack/react-query", "react-hook-form", "@hookform/resolvers"]
  patterns: ["RBAC guard pattern (requireRole returns 403 or null)", "Transactional audit logging inside withTenantContext", "TanStack Query provider at dashboard layout level"]

key-files:
  created:
    - src/lib/db/schema/audit-log.ts
    - src/lib/auth/rbac.ts
    - src/lib/audit/log.ts
    - src/lib/validations/user.ts
    - src/lib/validations/team.ts
    - src/providers/query-provider.tsx
    - src/components/layout/sidebar.tsx
    - src/lib/db/migrations/0005_soft_norman_osborn.sql
    - src/lib/db/migrations/0006_audit_invite_rls_policies.sql
  modified:
    - src/lib/db/schema/auth.ts
    - src/lib/db/schema/index.ts
    - src/lib/db/tenant-context.ts
    - src/app/(dashboard)/layout.tsx
    - proxy.ts
    - package.json

key-decisions:
  - "audit_log is immutable: RLS policies allow SELECT/INSERT only, no UPDATE/DELETE"
  - "invite_token has no DELETE RLS policy: invites expire or get accepted, never deleted"
  - "TransactionClient type exported from tenant-context.ts for audit helper reuse"
  - "Sidebar has three nav items: Overview, People, Settings (minimal for v1)"

patterns-established:
  - "RBAC guard: requireRole(session.user.role, 'admin') returns NextResponse(403) or null"
  - "Audit logging: logAuditEvent(tx, event) must be called inside withTenantContext transaction"
  - "Validation schemas: Zod schemas in src/lib/validations/ shared between client and server"

requirements-completed: [SEC-03, SEC-06]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 3 Plan 1: Infrastructure Foundation Summary

**RBAC guard, transactional audit logging, invite token schema, Zod validation schemas, sidebar navigation, and TanStack Query provider for Phase 3 user/team management**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T16:39:27Z
- **Completed:** 2026-03-03T16:45:08Z
- **Tasks:** 2
- **Files modified:** 36

## Accomplishments
- Database schemas created: audit_log table (with composite indexes) and invite_token table (with tenant+email unique constraint), both with RLS policies applied
- Shared utilities built: RBAC helper (requireRole/canManageTeams/isAdmin), transactional audit log helper (logAuditEvent), and Zod validation schemas for users and teams
- Dashboard infrastructure: sidebar navigation, TanStack Query provider, toast notifications, and proxy.ts updated for /invite routes
- All dependencies installed: 4 npm packages and 15 shadcn/ui components

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create schemas** - `a4408dc` (feat)
2. **Task 2: Create RBAC, audit, query provider, sidebar, and proxy update** - `87ee254` (feat)

## Files Created/Modified
- `src/lib/db/schema/audit-log.ts` - Audit log Drizzle schema with tenant/action and tenant/actor indexes
- `src/lib/db/schema/auth.ts` - Added invite_tokens table with tenant+email unique index
- `src/lib/db/schema/index.ts` - Barrel export updated with audit-log
- `src/lib/db/migrations/0005_soft_norman_osborn.sql` - DDL for audit_log and invite_token tables
- `src/lib/db/migrations/0006_audit_invite_rls_policies.sql` - RLS policies for new tables
- `src/lib/auth/rbac.ts` - RBAC helper with requireRole, canManageTeams, isAdmin
- `src/lib/audit/log.ts` - Transactional audit event logging helper
- `src/lib/db/tenant-context.ts` - Exported TransactionClient type
- `src/lib/validations/user.ts` - Zod schemas: inviteUsers, acceptInvite, updateProfile, updateUserRole, assignManager
- `src/lib/validations/team.ts` - Zod schemas: createTeam, updateTeam, addTeamMembers, removeTeamMember
- `src/providers/query-provider.tsx` - TanStack Query client provider (staleTime 60s)
- `src/components/layout/sidebar.tsx` - Sidebar navigation with Overview, People, Settings
- `src/app/(dashboard)/layout.tsx` - Updated with QueryProvider, Sidebar, Toaster
- `proxy.ts` - Added /invite to allowed unauthenticated routes
- `package.json` - Added @tanstack/react-table, @tanstack/react-query, react-hook-form, @hookform/resolvers
- 15 shadcn/ui component files in `src/components/ui/`

## Decisions Made
- audit_log is immutable: RLS allows SELECT/INSERT only, no UPDATE/DELETE policies
- invite_token has SELECT/INSERT/UPDATE RLS (no DELETE) -- invites expire or get accepted, never hard-deleted
- TransactionClient type exported from tenant-context.ts to enable typed audit log helper
- Sidebar shows three nav items: Overview, People, Settings -- minimal for v1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in `theme-toggle.tsx` (setState in effect) and `auth/actions.ts` (unused imports) -- out of scope, not caused by this plan's changes. All new files lint cleanly.
- `bunx shadcn@latest` failed with "Script not found" -- used `npx shadcn@latest` instead (Bun CLI compatibility issue with shadcn binary)
- PostgreSQL container required `docker exec` instead of `psql` directly (psql not installed on host)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All shared schemas, helpers, validations, and UI infrastructure ready for Plans 02-04
- Plans 02 (invite flow), 03 (people directory), and 04 (team management) can now use the RBAC helper, audit log, and validation schemas
- Database migration applied with RLS policies in place

## Self-Check: PASSED

All 10 created files verified present. Both commit hashes confirmed in git log. All exports (requireRole, canManageTeams, isAdmin, logAuditEvent, QueryProvider, inviteUsersSchema, createTeamSchema) verified. Proxy.ts /invite route confirmed. Sidebar component confirmed.

---
*Phase: 03-user-team-management*
*Completed: 2026-03-03*
