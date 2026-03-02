# Sprint 04 — User Management & Invites

**Duration**: 2 weeks
**Dependencies**: Sprint 03

## Goals

Implement the full user invite flow, user profiles with CRUD, role management, org chart via manager_id, and user deactivation.

## Deliverables

1. **Invite flow**:
   - Admin form: email, first name, last name, role, manager (optional)
   - System sends invite email with magic link token
   - Accept invite page: set password, upload avatar
   - Token validation and expiry (72 hours)
2. **User profile pages**:
   - Profile view: name, email, job title, avatar, role, manager, team memberships
   - Edit own profile: name, job title, avatar, notification preferences
3. **Admin user management**:
   - User list with search, filter by role, filter by active/inactive
   - Edit user: change role, change manager
   - Deactivate user (soft-delete, preserves history)
   - Reactivate user
4. **API routes**: `POST /api/users/invite`, `GET/PUT /api/users/[id]`, `PUT /api/users/[id]/deactivate`
5. **Zod schemas**: user creation, profile update, invite validation

## Acceptance Criteria

- [ ] Admin can invite a user by email — invite email is sent with valid magic link
- [ ] Invited user clicks link, lands on accept page, sets password, sees dashboard
- [ ] Invite token expires after 72 hours (expired link shows error)
- [ ] User can view and edit their own profile (name, job title, avatar, notification prefs)
- [ ] Admin can view list of all users with search and role filter
- [ ] Admin can change a user's role (member ↔ manager ↔ admin)
- [ ] Admin can set/change a user's manager (org chart relationship)
- [ ] Admin can deactivate a user — user can no longer log in, data preserved
- [ ] Admin can reactivate a deactivated user
- [ ] Non-admin users cannot access user management features
- [ ] All user mutations validate input with Zod schemas
- [ ] Email uniqueness enforced within tenant (duplicate invite shows error)

## Key Files

```
src/app/(dashboard)/people/page.tsx          # People list
src/app/(dashboard)/people/[id]/page.tsx     # User profile
src/app/(auth)/invite/[token]/page.tsx       # Accept invite
src/app/api/users/route.ts                   # List users
src/app/api/users/invite/route.ts            # Send invite
src/app/api/users/[id]/route.ts              # Get/update user
src/app/api/users/[id]/deactivate/route.ts   # Deactivate/reactivate
src/components/people/people-table.tsx
src/components/people/invite-dialog.tsx
src/components/people/profile-card.tsx
src/lib/validations/user.ts
src/lib/email/templates/invite.tsx           # Full invite email
```
