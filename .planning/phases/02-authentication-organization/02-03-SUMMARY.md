---
phase: 02-authentication-organization
plan: 03
subsystem: auth
tags: [auth.js, drizzle, org-type, server-actions, reverse-proxy, nodemailer]

requires:
  - phase: 02-02
    provides: Route protection via proxy.ts, dashboard shell, OAuth buttons
provides:
  - org_type enum column on tenant table (for_profit / non_profit)
  - Organization settings page (admin-only) at /settings/company
  - Settings API route (GET/PUT) with tenant-scoped access
  - Enhanced registration with org type selection
  - Server-side auth redirects for reverse proxy compatibility
  - Email URL derivation from request headers
affects: [03-user-team-management, settings, onboarding]

tech-stack:
  added: [nodemailer, "@react-email/render"]
  patterns: [server-action-auth-redirects, request-header-base-url, admin-only-pages]

key-files:
  created:
    - src/lib/validations/organization.ts
    - src/app/(dashboard)/settings/company/page.tsx
    - src/app/(dashboard)/settings/company/company-settings-form.tsx
    - src/app/api/settings/company/route.ts
    - src/lib/db/migrations/0004_massive_ulik.sql
  modified:
    - src/lib/db/schema/enums.ts
    - src/lib/db/schema/tenants.ts
    - src/lib/auth/actions.ts
    - src/lib/auth/config.ts
    - src/lib/email/send.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/register/page.tsx
    - src/components/auth/logout-button.tsx
    - proxy.ts
    - src/lib/db/seed.ts

key-decisions:
  - "org_type is a dedicated column, not JSONB settings — structural property affecting business logic"
  - "All auth flows use server actions with server-side redirects — eliminates client-side URL construction from next-auth/react"
  - "trustHost: true in Auth.js config + X-Forwarded-Host/Proto header reading in proxy.ts for reverse proxy support"
  - "Switched from Resend to nodemailer for email — works with any SMTP provider (smtp2go)"
  - "Email base URLs derived from request headers at call time, not hardcoded NEXT_PUBLIC_APP_URL"
  - "orgType set at registration and read-only in settings — not changeable after creation"

patterns-established:
  - "Server-action auth pattern: all signIn/signOut/OAuth via server actions, never client-side next-auth/react"
  - "Admin-only pages: server component checks session.user.role, redirects non-admins"
  - "Settings API pattern: GET for data, PUT with Zod validation, withTenantContext for isolation"
  - "Proxy header detection: getBaseUrl() reads x-forwarded-proto + x-forwarded-host for correct origins"

requirements-completed: [ORG-01, ORG-04, ORG-05]

duration: 45min
completed: 2026-03-03
---

# Plan 02-03: Organization Type & Settings Summary

**Org type column (for-profit/non-profit) on tenants, admin settings page with timezone/cadence/duration, and server-side auth redirects for reverse proxy compatibility**

## Performance

- **Duration:** ~45 min (including checkpoint verification and fixes)
- **Started:** 2026-03-03
- **Completed:** 2026-03-03
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 15

## Accomplishments
- Tenant table extended with `org_type` enum column (for_profit / non_profit)
- Registration flow enhanced with org type radio selector
- Admin-only organization settings page at `/settings/company` with timezone, cadence, and duration controls
- All auth redirects converted to server-side actions — works correctly behind reverse proxy
- Email links derive base URL from request headers instead of hardcoded env var

## Task Commits

1. **Task 1: Add org_type, registration org selector, settings page** - `e2c78d2` (feat)
2. **Task 2: Generate migration for org_type column** - `8352e24` (chore)
3. **Fix: adminDb for auth flows, nodemailer for email** - `971ea78` (fix)
4. **Fix: Server-side auth redirects for reverse proxy** - `66345c7` (fix)

## Files Created/Modified
- `src/lib/db/schema/enums.ts` - Added orgTypeEnum
- `src/lib/db/schema/tenants.ts` - Added orgType column
- `src/lib/validations/organization.ts` - Zod schemas for org settings
- `src/app/(dashboard)/settings/company/page.tsx` - Admin settings server component
- `src/app/(dashboard)/settings/company/company-settings-form.tsx` - Settings client form
- `src/app/api/settings/company/route.ts` - GET/PUT settings API with tenant-scoped access
- `src/app/(auth)/login/page.tsx` - Converted to server action auth
- `src/app/(auth)/register/page.tsx` - Added org type selector, server-side redirect
- `src/components/auth/logout-button.tsx` - Server action form submission
- `src/lib/auth/actions.ts` - loginAction, signInWithGoogle/Microsoft, getBaseUrl helper
- `src/lib/auth/config.ts` - Added trustHost: true
- `src/lib/email/send.ts` - baseUrl parameter, request-header derived URLs
- `proxy.ts` - X-Forwarded-Host/Proto header detection for redirects
- `src/lib/db/migrations/0004_massive_ulik.sql` - org_type enum and column migration
- `src/lib/db/seed.ts` - Updated with org_type and structured settings

## Decisions Made
- org_type as dedicated column (not JSONB) — structural property affecting business logic and pricing
- All auth flows via server actions — client-side signIn from next-auth/react constructs localhost URLs behind proxy
- trustHost: true + forwarded header reading for proxy-safe URL detection
- Switched to nodemailer from Resend — works with any SMTP provider
- orgType is immutable after registration (read-only badge in settings)

## Deviations from Plan

### Auto-fixed Issues

**1. Auth flows used tenant-scoped DB instead of adminDb**
- **Found during:** Task 1 verification
- **Issue:** Registration and auth callbacks used tenant-scoped DB queries that fail without tenant context
- **Fix:** Switched to adminDb for all auth flows (registration, login, OAuth callback)
- **Committed in:** `971ea78`

**2. Resend email client incompatible with SMTP provider**
- **Found during:** Task 1 verification
- **Issue:** Resend requires Resend API key, project uses smtp2go SMTP
- **Fix:** Replaced Resend with nodemailer + @react-email/render
- **Committed in:** `971ea78`

**3. Client-side auth redirects resolve to localhost behind reverse proxy**
- **Found during:** Task 3 (human-verify checkpoint)
- **Issue:** next-auth/react signIn() constructs absolute URLs using internal origin
- **Fix:** All auth flows converted to server actions; proxy reads forwarded headers; email URLs from request context
- **Committed in:** `66345c7`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 found during UAT)
**Impact on plan:** All fixes essential for correct operation behind reverse proxy. No scope creep.

## Issues Encountered
- Auth.js client-side signIn constructs localhost URLs when behind reverse proxy — required architectural shift to server-side auth actions
- Resend SDK incompatible with SMTP providers — replaced with nodemailer

## User Setup Required
None - SMTP credentials already configured in .env.local.

## Next Phase Readiness
- Full authentication system operational: register, login, logout, email verification, password reset
- Organization settings page provides admin-configurable defaults
- Server-action auth pattern established for all future auth flows
- Ready for Phase 03: User & Team Management

---
*Phase: 02-authentication-organization*
*Completed: 2026-03-03*
