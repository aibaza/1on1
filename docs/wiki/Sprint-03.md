# Sprint 03 — Authentication & Company Onboarding

**Duration**: 2 weeks
**Dependencies**: Sprint 02

## Goals

Implement all authentication flows (email+password, magic link, Google OAuth, Microsoft OAuth), company registration with the 3-step setup wizard, and route protection middleware.

## Deliverables

1. **Auth.js v5 full configuration**: providers (Credentials, Email/Magic Link, Google, Microsoft), session strategy, callbacks
2. **Login page**: email+password form, OAuth buttons (Google, Microsoft), "Forgot password" link
3. **Registration page**: company name, admin email, password → creates TENANT + first USER (admin role)
4. **Setup wizard** (3-step post-registration):
   - Step 1: Company profile (name, timezone, logo upload)
   - Step 2: Invite team (email list + role assignment, skippable)
   - Step 3: Create first template (use system template or skip)
5. **Forgot password flow**: request form → magic link email → reset password page
6. **Middleware**: route protection redirecting unauthenticated users to `/login`, public routes allowlist
7. **Session management**: HTTP-only cookies, JWT token generation, session expiry
8. **Zod schemas**: registration, login, password reset validation

## Acceptance Criteria

- [ ] New company can register: creates tenant + admin user, redirects to setup wizard
- [ ] Admin can complete setup wizard (all 3 steps) or skip steps 2 and 3
- [ ] Email+password login works (correct credentials → dashboard, wrong → error)
- [ ] Google OAuth login works (redirects to Google, returns authenticated)
- [ ] Microsoft OAuth login works (redirects to Microsoft, returns authenticated)
- [ ] Forgot password sends a magic link email, link allows password reset
- [ ] Magic link expires after 1 hour
- [ ] Unauthenticated users redirected to `/login` from protected routes
- [ ] Authenticated users redirected to `/overview` from auth pages
- [ ] Password validation enforces policy (8+ chars, uppercase, lowercase, number)
- [ ] CSRF protection active on all auth forms
- [ ] Session cookie is HTTP-only, Secure, SameSite=Strict

## Key Files

```
src/lib/auth/config.ts                 # Full Auth.js configuration
src/lib/auth/middleware.ts             # Route protection logic
middleware.ts                          # Next.js middleware
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/register/setup/page.tsx # Setup wizard
src/lib/validations/auth.ts            # Zod schemas
src/lib/email/templates/invite.tsx     # Invite email (stub for wizard step 2)
src/lib/email/templates/password-reset.tsx
src/lib/email/send.ts                  # Email sending utility
```
