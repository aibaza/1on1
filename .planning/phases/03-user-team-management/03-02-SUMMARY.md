---
phase: 03-user-team-management
plan: 02
subsystem: api
tags: [invite-flow, email, onboarding, nodemailer, react-email, bcryptjs, react-hook-form, zod]

# Dependency graph
requires:
  - phase: 03-user-team-management
    plan: 01
    provides: invite_token schema, RBAC helper, audit log helper, Zod validation schemas, proxy.ts /invite access
provides:
  - POST /api/invites endpoint for bulk invite sending with role assignment
  - POST /api/invites/accept endpoint for public invite acceptance (creates user)
  - POST /api/invites/resend endpoint for resending expired invites
  - InviteEmail React Email template
  - InviteDialog client component (multi-email textarea, role selector)
  - Invite acceptance page with 2-step onboarding wizard (password + profile)
  - Auto sign-in after invite acceptance
affects: [03-03-people-directory, 03-04-team-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Public API route with adminDb transaction and manual SET LOCAL for RLS", "2-step wizard form with React Hook Form step validation"]

key-files:
  created:
    - src/app/api/invites/route.ts
    - src/app/api/invites/accept/route.ts
    - src/app/api/invites/resend/route.ts
    - src/lib/email/templates/invite.tsx
    - src/components/people/invite-dialog.tsx
    - src/app/(auth)/invite/[token]/page.tsx
    - src/app/(auth)/invite/[token]/invite-accept-form.tsx
  modified:
    - CHANGELOG.md

key-decisions:
  - "Accept endpoint uses adminDb with manual SET LOCAL for RLS (no session context for unauthenticated users)"
  - "Email verified automatically on invite acceptance (no separate verification step needed)"
  - "2-step wizard validates password fields before advancing to profile step"

patterns-established:
  - "Public API route pattern: adminDb.transaction with manual set_config for tenant context"
  - "Multi-step form: useForm with trigger() for per-step validation before advancing"

requirements-completed: [USER-01, USER-02]

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 3 Plan 2: Invite Flow Summary

**Bulk email invite API with role assignment, React Email template, 2-step onboarding wizard, and auto sign-in after acceptance**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T16:47:52Z
- **Completed:** 2026-03-03T16:54:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Complete invite send/accept/resend API pipeline with RBAC enforcement and audit logging
- Invite email template matching existing design system (verification/password-reset pattern)
- 2-step onboarding page: password setup with show/hide toggle, then profile info with optional job title
- Auto sign-in after invite acceptance lands new user directly in the dashboard

## Task Commits

Each task was committed atomically:

1. **Task 1: Invite API routes and email template** - `316e3f8` (feat)
2. **Task 2: Invite dialog and acceptance onboarding page** - `03db359` (feat)

## Files Created/Modified
- `src/app/api/invites/route.ts` - POST endpoint: validates admin role, sends bulk invites, skips existing users/invites
- `src/app/api/invites/accept/route.ts` - POST endpoint: public, creates user from invite token with hashed password
- `src/app/api/invites/resend/route.ts` - POST endpoint: generates new token, resends invite email
- `src/lib/email/templates/invite.tsx` - InviteEmail component with org name, inviter name, role, and accept button
- `src/components/people/invite-dialog.tsx` - Client component: multi-email textarea, role selector, toast feedback
- `src/app/(auth)/invite/[token]/page.tsx` - Server component: validates token, shows error states or renders form
- `src/app/(auth)/invite/[token]/invite-accept-form.tsx` - Client component: 2-step wizard (password then profile)
- `CHANGELOG.md` - Updated with invite flow entries

## Decisions Made
- Accept endpoint uses adminDb with manual SET LOCAL for tenant RLS context (same pattern as registration in auth/actions.ts) since invitees are unauthenticated
- Email is automatically marked as verified on invite acceptance (trusted invite link serves as verification)
- 2-step wizard validates password fields independently via form.trigger() before allowing step 2 navigation
- Invite email uses ops.and(ops.eq(...)) pattern for drizzle-orm findFirst queries to avoid ESLint unused-var warnings with destructured aliases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in theme-toggle.tsx and auth/actions.ts (out of scope). All new files pass lint cleanly.

## User Setup Required

None - email infrastructure (SMTP) was already configured in Phase 2.

## Next Phase Readiness
- Invite dialog ready to be wired into the People page (Plan 03)
- All three invite API routes functional and type-checked
- Invite acceptance page accessible at /invite/[token] without authentication
- Build passes cleanly with all new routes visible in output

## Self-Check: PASSED

All 7 created files verified present. Both commit hashes (316e3f8, 03db359) confirmed in git log. Build passes with /invite/[token], /api/invites, /api/invites/accept, /api/invites/resend routes visible.

---
*Phase: 03-user-team-management*
*Completed: 2026-03-03*
