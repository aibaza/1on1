# Sprint 05 — Team Management

**Duration**: 2 weeks
**Dependencies**: Sprint 04
**Parallelizable with**: Sprint 06

## Goals

Implement team CRUD, team membership management, team roles, and update the people directory to show team affiliations.

## Deliverables

1. **Team list page**: all teams with member count, manager name
2. **Team detail page**: team info, member list, add/remove members
3. **Team CRUD**:
   - Create team: name, description, manager
   - Edit team: name, description, change manager
   - Delete team (only if no active series reference it)
4. **Membership management**:
   - Add members to team (search by name/email)
   - Remove members from team
   - Set team role (lead/member)
   - One user can belong to multiple teams
5. **People directory enhancement**: show team badges on user cards
6. **API routes**: `GET/POST /api/teams`, `GET/PUT/DELETE /api/teams/[id]`, `POST/DELETE /api/teams/[id]/members`
7. **Zod schemas**: team creation, team update, membership management

## Acceptance Criteria

- [ ] Admin can create a team with name, description, and manager
- [ ] Admin can edit team details (name, description, manager)
- [ ] Admin can delete a team that has no active meeting series referencing it
- [ ] Admin can add users to a team (search works by name and email)
- [ ] Admin can remove users from a team
- [ ] Admin can change a member's team role (lead ↔ member)
- [ ] A user can belong to multiple teams simultaneously
- [ ] Team list page shows all teams with member count
- [ ] Team detail page shows all members with their roles
- [ ] People directory shows team badges next to user names
- [ ] Non-admin users can view teams but cannot modify them
- [ ] UNIQUE(team_id, user_id) constraint prevents duplicate membership

## Key Files

```
src/app/(dashboard)/teams/page.tsx          # Team list
src/app/(dashboard)/teams/[id]/page.tsx     # Team detail
src/app/api/teams/route.ts                  # List/create teams
src/app/api/teams/[id]/route.ts             # Get/update/delete team
src/app/api/teams/[id]/members/route.ts     # Add/remove members
src/lib/validations/team.ts
src/components/people/people-table.tsx       # Updated with team badges
```
