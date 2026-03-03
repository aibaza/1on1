# Phase 3: User & Team Management

**Status**: Complete
**Depends on**: Phase 2
**Completed**: 2026-03-03

## Goal

Admins can build their organization's people structure with invites, roles, teams, and reporting lines.

## Success Criteria

1. [x] Admin can invite users via email and invitees receive a magic link to join and set their password
2. [x] Admin can assign roles (admin, manager, member) and each role sees only what it should (RBAC enforced at API level)
3. [x] Users can edit their profile (name, job title, avatar) and admin can set manager-report relationships
4. [x] Admin or manager can create teams, assign leads, and add/remove members (users can belong to multiple teams)
5. [x] Significant events (invites, deactivations, role changes, settings changes) are recorded in the audit log

## What Was Built

### Plan 03-01: Infrastructure Foundation
- RBAC helper (requireRole, canManageTeams, isAdmin), audit log helper (logAuditEvent)
- Zod validation schemas for users and teams
- TanStack Query provider, sidebar navigation, 15 shadcn/ui components
- audit_log and invite_token Drizzle schemas with RLS policies

### Plan 03-02: Invite Flow
- Bulk email invite API with role assignment
- 2-step onboarding wizard (password + profile) for invited users
- Auto sign-in after invite acceptance
- React Email invite template

### Plan 03-03: People Directory
- User management API: list, detail, role change, manager assignment, deactivation
- People directory with TanStack Table: sorting, filtering, pagination, inline editing
- Profile detail page with edit form
- Safety guards: last-admin protection, circular manager prevention

### Plan 03-04: Team Management & Audit Log
- Team CRUD with card grid UI and member management (add/remove via searchable picker)
- Audit log page with expandable detail rows, server-side pagination, action/date/search filters
- Sidebar restructured with role-based Settings section (admin-only)

## Key Decisions
- Client-side filtering for people table (sufficient for small-to-medium orgs)
- Server-side pagination for audit log (grows unbounded over time)
- URL-based tab navigation for People/Teams
- Sidebar restructured with Settings section header and role-based visibility

## Requirements

USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, TEAM-01, TEAM-02, TEAM-03, TEAM-04, SEC-03, SEC-04, SEC-06
