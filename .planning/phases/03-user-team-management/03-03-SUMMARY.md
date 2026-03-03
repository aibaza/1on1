---
phase: 03-user-team-management
plan: 03
subsystem: ui, api
tags: [tanstack-table, tanstack-query, react-hook-form, rbac, audit-log, shadcn, drizzle, data-table]

# Dependency graph
requires:
  - phase: 03-user-team-management
    provides: RBAC helper (requireRole, isAdmin), audit log helper (logAuditEvent), Zod validation schemas (user), sidebar with People nav, TanStack Query provider, shadcn UI components
  - phase: 02-authentication-organization
    provides: Auth.js session with tenantId/role/userId, dashboard layout, withTenantContext
provides:
  - User management API routes (GET /api/users, GET/PATCH/DELETE /api/users/[id])
  - People directory page with sortable/filterable TanStack Table
  - Inline role editing and manager assignment (admin-only)
  - User deactivation and reactivation with last-admin guard
  - Circular manager assignment prevention (10-level chain walk)
  - Profile detail page with edit form
  - Profile sheet (slide-in panel) on table row click
  - People/Teams tab navigation (URL-based)
affects: [03-04-team-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["TanStack Table with server-initial data + client-side query refresh", "Inline editing via optimistic mutations with queryClient.setQueryData", "Column filter functions for client-side role/team/status filtering", "URL-based tab navigation using usePathname + Link"]

key-files:
  created:
    - src/app/api/users/route.ts
    - src/app/api/users/[id]/route.ts
    - src/app/(dashboard)/people/page.tsx
    - src/app/(dashboard)/people/[id]/page.tsx
    - src/app/(dashboard)/people/[id]/profile-edit-form.tsx
    - src/components/people/people-table.tsx
    - src/components/people/people-table-columns.tsx
    - src/components/people/role-select.tsx
    - src/components/people/manager-select.tsx
    - src/components/people/user-actions-menu.tsx
    - src/components/people/profile-sheet.tsx
    - src/components/people/people-tabs.tsx
  modified:
    - CHANGELOG.md

key-decisions:
  - "Client-side filtering for v1: Server Component fetches all users, TanStack Table handles sorting/filtering/pagination"
  - "URL-based tab navigation: /people for People tab, /teams for Teams tab (per plan decision)"
  - "Profile editing on dedicated page, not in table: cleaner UX, ProfileSheet is read-only quick view"
  - "Optimistic updates for role/manager changes: instant UX feedback with rollback on error"

patterns-established:
  - "Data table pattern: Server Component fetches initial data, passes to client PeopleTable with useQuery for refresh"
  - "Inline editing pattern: cell renders Select/Combobox, useMutation with optimistic update via queryClient"
  - "User API PATCH dispatch: inspect body keys (role, managerId, isActive, profile fields) to determine operation type"
  - "Circular reference check: walk up manager chain max 10 levels before allowing assignment"

requirements-completed: [USER-03, USER-04, USER-05, USER-06, SEC-03, SEC-04]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 3 Plan 3: People Directory Summary

**Sortable/filterable people table with inline role/manager editing, user deactivation, profile pages, and secured user management API routes with RBAC and audit logging**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T16:48:29Z
- **Completed:** 2026-03-03T16:55:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Full user management API: list users with teams/invites, single user detail, role change, manager assignment, profile update, deactivation, reactivation -- all with RBAC and audit logging
- People directory page with TanStack Table: 7 columns (name, email, role, teams, manager, status, actions), inline editing for admins, search, filters, pagination
- Profile detail page with edit form (React Hook Form + Zod), back navigation, team badges, role/status badges
- Safety guards: last-admin protection on demotion and deactivation, circular manager reference prevention, self-deactivation blocked

## Task Commits

Each task was committed atomically:

1. **Task 1: User API routes with RBAC and audit logging** - `69aa19a` (feat)
2. **Task 2: People directory page with data table and inline editing** - `77cd68d` (feat)

## Files Created/Modified
- `src/app/api/users/route.ts` - GET endpoint returning all users with team memberships and pending invites
- `src/app/api/users/[id]/route.ts` - GET single user, PATCH (role/manager/profile/reactivation), DELETE (deactivation)
- `src/app/(dashboard)/people/page.tsx` - Server Component people directory with TanStack Table
- `src/app/(dashboard)/people/[id]/page.tsx` - User profile detail page with manager, teams, edit section
- `src/app/(dashboard)/people/[id]/profile-edit-form.tsx` - Client form for profile editing (firstName, lastName, jobTitle)
- `src/components/people/people-table.tsx` - TanStack Table with sorting, filtering, pagination, row click
- `src/components/people/people-table-columns.tsx` - Column definitions with inline RoleSelect, ManagerSelect, UserActionsMenu
- `src/components/people/role-select.tsx` - Inline role change dropdown with optimistic updates
- `src/components/people/manager-select.tsx` - Searchable combobox for manager assignment with optimistic updates
- `src/components/people/user-actions-menu.tsx` - Kebab menu: view profile, deactivate, reactivate, resend invite
- `src/components/people/profile-sheet.tsx` - Slide-in panel showing user profile summary
- `src/components/people/people-tabs.tsx` - URL-based People/Teams tab navigation
- `CHANGELOG.md` - Updated with all people directory entries

## Decisions Made
- Client-side filtering for v1: all users fetched by Server Component, TanStack Table handles sorting/filtering/pagination locally (sufficient for small-to-medium orgs)
- URL-based tab navigation for People/Teams: uses usePathname + Link instead of controlled Tabs state, enabling bookmarkable URLs
- Profile editing on dedicated page (/people/[id]) rather than inline in table: ProfileSheet is read-only quick view, full editing on detail page
- PATCH endpoint dispatches on body keys: role field -> admin role change, managerId -> admin manager assignment, isActive -> admin reactivation, profile fields -> self or admin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in theme-toggle.tsx and auth/actions.ts from earlier phases -- not caused by this plan, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- People directory fully functional with all RBAC enforcement
- Team management (Plan 04) can build on the People/Teams tab system -- Teams tab currently shows placeholder
- ManagerSelect and UserActionsMenu available as reusable patterns for future components

## Self-Check: PASSED

All 12 created files verified present. Both commit hashes confirmed in git log. Build passes. Typecheck passes.

---
*Phase: 03-user-team-management*
*Completed: 2026-03-03*
