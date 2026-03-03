# Phase 3: User & Team Management - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can build their organization's people structure with invites, roles, teams, and reporting lines. Includes: user invitation flow (multi-email), mini onboarding for invitees, people directory with search/filters, RBAC enforcement at API level, team management (create, edit, add/remove members), reporting line assignment, and audit logging for significant events. Does NOT include: session management, templates, analytics, or email notifications beyond invite emails.

</domain>

<decisions>
## Implementation Decisions

### Invite flow
- Multi-email invite form: admin types multiple email addresses (comma-separated or one per line), all get the same role
- Admin provides: email addresses + role (admin/manager/member). Manager assignment happens later in the people directory, not at invite time
- Invite links expire after 7 days. Admin can resend from people directory (generates new token)
- Pending invites appear in the people list with a "Pending" badge

### Invitee onboarding
- 2-step mini onboarding flow when invitee clicks the magic link:
  1. Set password
  2. Fill basic profile (first name, last name, job title)
- After completing both steps, invitee lands in the app

### People directory
- Table layout with columns: name, email, role, team(s), manager, status
- Sortable columns, search bar at top
- Filters: role (All/Admin/Manager/Member), team, status (Active/Pending/Deactivated)
- No org chart view — manager shown as a column in the table
- Inline actions: role change dropdown and "Assign manager" directly in the table row
- Kebab menu (⋮) for: deactivate, resend invite, etc.
- Clicking a row opens a profile detail sheet/page

### Team management
- Teams live as a tab under People section (People | Teams)
- Team list displayed as card grid: team name, lead avatar, member count, short description
- Click a card to open team detail page
- Team detail shows: member list (with remove button), team lead badge, editable team name/description
- Add members via search + select dialog (searchable user list, multi-select, confirm)
- Admin or manager can create teams, assign leads, add/remove members

### Audit logging
- Admin-only access to audit logs
- Dedicated page: Settings > Audit Log
- Table view: timestamp, actor, action, target, details
- Each row shows action summary; expandable to show before/after diff values
- Searchable and filterable by action type and date range
- Events logged: invite sent, invite accepted, role changed, manager assigned, user deactivated, user reactivated, profile updated, team created, team deleted, member added to team, member removed from team, team lead changed, org settings changed

### Claude's Discretion
- Exact table component styling and pagination approach
- Profile detail page/sheet layout
- Invite email template design
- Audit log diff format details
- Error and empty state handling across all pages

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Auth session with tenantId, userId, role already available (src/lib/auth/config.ts)
- Email infrastructure: React Email + SMTP, verification/reset templates as patterns (src/lib/email/send.ts)
- withTenantContext() wrapper for all DB operations (src/lib/db/tenant-context.ts)
- Company settings form pattern: server action + Zod validation + React Hook Form (src/app/(dashboard)/settings/company/)
- API route pattern: auth check, role guard, Zod validation, withTenantContext (src/app/api/settings/company/route.ts)
- shadcn components available: button, input, label, card, select, radio-group, badge, separator

### Established Patterns
- Server Components by default, "use client" only for interactivity
- Zod schemas shared between client and server (src/lib/validations/)
- API routes for all mutations, Server Components for reads
- OAuth sign-in blocked unless user already exists — aligns with "invite first" model

### Integration Points
- (dashboard) route group with auth guard layout (src/app/(dashboard)/layout.tsx)
- Existing sidebar placeholder — needs People/Teams nav item
- Auth.js verificationTokens table — can be used for invite tokens or add dedicated invite_tokens
- User schema has all needed fields: managerId, jobTitle, avatarUrl, isActive, invitedAt, inviteAcceptedAt
- Teams + teamMembers junction table already in schema
- Audit log table already in schema

</code_context>

<specifics>
## Specific Ideas

- People and Teams as tabs on the same page — keeps organizational structure in one place
- Card grid for teams vs table for people — different visualization for different data shapes
- Inline role/manager editing in the people table — fast admin workflows, fewer page transitions
- Mini onboarding (password + profile) ensures users have complete profiles from day one

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-user-team-management*
*Context gathered: 2026-03-03*
