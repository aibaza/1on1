# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Wiki overhauled: replaced 15-sprint tracking with 10-phase roadmap matching GSD workflow
- `CLAUDE.md` updated: project status, email tech stack (Nodemailer), sprint references replaced with phase references
- `ROADMAP.md` updated: Phase 2 marked complete with all plan checkboxes checked

### Removed
- 16 sprint wiki pages (`Sprint-01.md` through `Sprint-15.md` and `Sprint-Log.md`) replaced by phase-based tracking

### Added
- `docs/wiki/Phase-Log.md` — master implementation tracking with phase summary table and dependency graph
- `docs/wiki/Phase-01.md` through `Phase-10.md` — per-phase wiki pages with goals, success criteria, and build details
- Phase progress cross-reference in `Features-Roadmap.md`
- PostToolUse hook (`scripts/wiki-phase-hook.sh`) that auto-detects phase completion commits and instructs Claude to update wiki

### Changed
- Database connection module (`src/lib/db/index.ts`) switched from Neon serverless driver to `node-postgres` (pg) for local development compatibility
- Email infrastructure switched from Resend to Nodemailer (SMTP-based) for self-hosted flexibility
- Auth flows (`auth/config.ts`, `auth/actions.ts`, `email/send.ts`) now use `adminDb` (superuser connection) to bypass RLS for registration, login, password reset, and email verification
- Environment variables: replaced `RESEND_API_KEY` with SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`)

### Fixed
- Auth.js redirect detection in `registerAction` and `logoutAction` now uses digest-based check for Next.js compatibility

### Added
- `adminDb` export in `src/lib/db/index.ts` -- superuser database connection for auth flows that operate outside tenant context
- `DATABASE_ADMIN_URL` environment variable for admin database connection
- `nodemailer` and `@react-email/render` dependencies for SMTP-based email sending
- Organization type (`org_type`) enum and column on tenant table: `for_profit` and `non_profit`
- Organization type selector (radio buttons) on registration page between company name and personal info
- `orgType` field in registration schema and action -- tenants created with correct org type
- Organization settings page at `/settings/company` (admin-only, redirects non-admins to `/overview`)
- Company settings API route (`/api/settings/company`) with GET and PUT handlers, Zod validation, tenant-scoped access
- Settings form with timezone selector (26 timezones), cadence radio group, duration dropdown
- Organization details section showing name (editable), type (read-only badge), slug (read-only)
- Zod validation schema for organization settings (`orgSettingsSchema`)
- shadcn/ui components: Select, RadioGroup, Badge, Separator
- Seed data updated with `orgType`: Acme Corp (for_profit), Beta Inc (non_profit)
- Route protection via `proxy.ts` (Next.js 16 convention) -- unauthenticated users redirect to `/login`, authenticated users redirect away from auth pages to `/overview`
- Dashboard layout with `SessionProvider` and server-side session validation (defense-in-depth against CVE-2025-29927)
- Overview page with user info (name, email, role, organization) and email verification banner
- Logout button client component using `signOut()` from `next-auth/react`
- Root page (`/`) redirects to `/overview`
- `emailVerified` field added to JWT token and session for verification status display
- Google and Microsoft OAuth buttons with branded SVG icons on login page
- OAuth error messages: AccessDenied (no account found) and OAuthAccountNotLinked (different sign-in method)
- Auth.js v5 (next-auth@beta) with Credentials provider, Google OAuth, and Microsoft Entra ID
- Drizzle adapter integration with custom user table mapping (`@auth/drizzle-adapter`)
- JWT session strategy with `tenantId`, `role`, and `userId` on session token
- Auth schema tables: `account`, `auth_session`, `verification_token`, `email_verification_token`, `password_reset_token`
- User table extended with `name`, `email_verified`, `image`, and `password_hash` columns
- TypeScript type augmentation for Auth.js session/JWT custom fields (`src/types/next-auth.d.ts`)
- Zod validation schemas for sign-in, register, forgot-password, reset-password (`src/lib/validations/auth.ts`)
- Auth.js route handler at `/api/auth/[...nextauth]`
- OAuth sign-in callback blocks users without existing records (must be invited or register org first)
- Environment variables for AUTH_SECRET, OAuth providers, and Resend email in `.env.example`
- Email sending infrastructure with Resend API and lazy-initialized client (`src/lib/email/send.ts`)
- React Email templates for verification and password reset emails
- Server actions: `registerAction`, `verifyEmailAction`, `forgotPasswordAction`, `resetPasswordAction`, `logoutAction`
- Registration creates tenant + admin user in single DB transaction, then auto-signs-in
- Forgot-password prevents email enumeration (always returns success)
- Auth pages with shadcn/ui: login, register, verify-email, forgot-password, reset-password
- Auth layout with centered card design and authenticated-user redirect
- OAuth buttons (Google, Microsoft) on login page
- shadcn/ui components: Button, Input, Label, Card
- Drizzle migration for auth tables and user schema changes (`0002_clear_la_nuit.sql`)
- RLS policies on `account` and `auth_session` tables (tenant isolation via user JOIN)
- Token tables (`verification_token`, `email_verification_token`, `password_reset_token`) accessible without tenant context
- `app_user` role grants for all new auth tables
- Next.js 15 project scaffolded with Bun, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui
- Drizzle ORM configuration with Neon serverless driver and WebSocket fallback
- Package scripts: `dev` (port 4300), `build`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- Environment variable templates (`.env.example`, `.env.local`)
- Docker Compose with PostgreSQL 16 (blue-green: `oneonone_stable` + `oneonone_dev` databases)
- Dedicated `app_user` database role without BYPASSRLS for RLS enforcement
- Multi-stage Dockerfile (Bun for deps/build, Node.js 22 for production runtime)
- Database init script (`scripts/init-db.sh`) with default privileges for app_user
- Project documentation: architecture, data model, features roadmap, UX flows, questionnaires, analytics, and security docs
- Phase-based implementation plan with dependency graph (`docs/wiki/Phase-01.md` through `Phase-10.md`)
- GitHub Wiki with auto-sync from `docs/wiki/` via GitHub Actions workflow
- Wiki sync scripts (`scripts/push-wiki.sh`, `scripts/push-wiki-hook.sh`)
- Claude Code PostToolUse hooks for automatic wiki sync on file edits
- `CLAUDE.md` with project conventions, architecture overview, and phase tracking instructions
- Complete Drizzle ORM schema for all database tables matching `docs/data-model.md`
- Centralized pgEnum definitions for all 16 enum types (`src/lib/db/schema/enums.ts`)
- Schema files for: tenant, user, team, team_member, questionnaire_template, template_question, meeting_series, session, session_answer, private_note, talking_point, action_item, notification, analytics_snapshot
- All tenant-scoped tables include `tenant_id` foreign key column
- `key_version` column on `private_note` table for encryption key rotation tracking
- Drizzle relations for all foreign key relationships including self-references
- Database indexes per data-model.md specification (unique constraints, composite indexes)
- SQL migrations: initial schema DDL and RLS policies (`src/lib/db/migrations/`)
- Row-Level Security (RLS) enabled on all 14 tables with tenant isolation policies
- Restrictive tenant isolation + author-only policies on `private_note` (FORCE ROW LEVEL SECURITY)
- RLS policies for junction tables (team_member, template_question, session_answer, talking_point) via parent JOIN
- `withTenantContext()` wrapper for tenant-scoped database queries using `set_config` with SET LOCAL
- `app_user` role granted CRUD privileges on all tables with default privileges for future tables
- Vitest test framework with coverage support and path alias configuration
- AES-256-GCM encryption infrastructure for private notes (`src/lib/encryption/`)
- HKDF key derivation from master key to per-tenant encryption keys (`deriveTenantKey`)
- Encrypt/decrypt functions with key versioning for rotation support (`encryptNote`, `decryptNote`)
- 11 encryption unit tests covering round-trips, key isolation, unicode, and tampering detection
- Idempotent seed script with two tenants: Acme Corp (7 users, 2 teams, 2 templates, 3 series, 3 sessions) and Beta Inc (3 users, 1 template, 1 series)
- Seed data includes realistic session answers, action items, and encrypted private notes
- `SEED_DATABASE_URL` environment variable for superuser seed connection (bypasses RLS)
- `pg` (node-postgres) driver for seed script local PostgreSQL connection
