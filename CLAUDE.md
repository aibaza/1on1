# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: 1on1

Structured one-on-one meeting management SaaS for companies. License: AGPL v3.

**Status**: Active development — v1.2 complete (AI-Ready Templates), v1.3 next (Playwright Testing). Full design docs in `docs/`, implementation tracked in `docs/wiki/Phase-Log.md`.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript (strict mode)
- **UI**: shadcn/ui + Tailwind CSS 4
- **ORM**: Drizzle ORM + PostgreSQL 16
- **Auth**: Auth.js v5 (NextAuth)
- **Validation**: Zod (shared client/server schemas)
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Rich Text**: Tiptap
- **Drag-and-Drop**: dnd-kit
- **i18n**: next-intl (cookie-based, EN + RO)
- **AI**: Vercel AI SDK + Anthropic Claude
- **Email**: Nodemailer + React Email (transactional); Resend (alternative provider)
- **State**: TanStack Query (React Query)
- **Testing**: Vitest (unit/integration)
- **Deployment**: Vercel + Neon (managed PostgreSQL)

## Common Commands

```bash
# Development
bun run dev                          # Start Next.js dev server (port 4300)
bun run build                        # Production build
bun run lint                         # ESLint
bun run typecheck                    # tsc --noEmit
bun run test                         # Vitest unit tests
bun run test:watch                   # Vitest in watch mode

# Database (Drizzle)
docker compose up -d                 # Start local PostgreSQL
bunx drizzle-kit generate            # Generate migration from schema changes
bunx drizzle-kit migrate             # Apply migrations
bunx drizzle-kit studio              # Open Drizzle Studio (DB browser)
bun run db:seed                      # Seed development data

# Wiki sync
./scripts/push-wiki.sh               # Push docs/wiki/ changes to GitHub Wiki
./scripts/sync-wiki.sh               # Full wiki sync (alternative, clones + pushes)
```

## Architecture

Monolith-first: single Next.js app with API routes, Server Components, and background email jobs. No microservices.

### Multi-tenancy

Every DB table with tenant data includes `tenant_id`. PostgreSQL Row-Level Security (RLS) provides a second safety layer. The app sets `app.current_tenant_id` via `SET LOCAL` on every DB connection. Tenant ID is always derived from the authenticated session, never from request parameters.

### Data flow pattern

- **Reads**: Server Components fetch data directly via Drizzle (no API calls for initial page loads)
- **Writes**: All mutations go through API routes (`src/app/api/`) for validation, authorization, and audit logging
- **Interactive UI**: Client Components use TanStack Query to fetch/mutate through API routes
- **Async work**: Email sending handled inline or via queued DB notifications

### Key data model relationships

`TENANT → USER → MEETING_SERIES → SESSION → SESSION_ANSWER`

- A `MEETING_SERIES` links a manager-report pair with a cadence and default template
- A `SESSION` is a single meeting instance, using a `QUESTIONNAIRE_TEMPLATE`
- `SESSION_ANSWER` uses typed columns (`answer_text`, `answer_numeric`, `answer_json`) based on the question's `answer_type` — enables direct SQL aggregation
- `ANALYTICS_SNAPSHOT` stores pre-computed metrics per user/team/period for fast dashboard rendering
- `PRIVATE_NOTE` content is encrypted at the application level (AES-256-GCM, per-tenant keys)

Full schema: `docs/data-model.md`. Schema files: `src/lib/db/schema/` (16 files covering 25 tables). Complete project structure: `docs/architecture.md`.

## Conventions

- **Language**: English for everything — code, comments, documentation, GitHub issues, discussions, and commit messages. This is an open source project.
- **Components**: Server Components by default. Use `"use client"` only when interactivity is needed.
- **Validation**: All inputs validated with Zod schemas shared between client and server (`src/lib/validations/`).
- **Tenant isolation**: Every query must filter by `tenant_id`. RLS policies enforce this at the DB level as a safety net.
- **Private notes**: Encrypted at rest with AES-256-GCM. Per-tenant keys derived from master key via HKDF.
- **Existing patterns**: Follow patterns already in the codebase before introducing new ones.

## Authorization (RBAC)

Three roles: `admin`, `manager`, `member`. Key boundaries:
- **Members** can only view/participate in their own sessions and action items
- **Managers** can conduct sessions and view data for their direct reports only
- **Admins** have company-wide access (settings, analytics, user management, invites)

Resource-level checks go beyond role: verify the user is actually the manager or report on a given series/session.

## Documentation

Full project documentation is in `docs/`:
- `architecture.md` — Tech stack, project structure, deployment, environment variables
- `data-model.md` — Complete database schema with all tables, indexes, and RLS policies
- `features.md` — Feature roadmap (v1.0 / v1.1 / v1.2 / v2 / v3)
- `ux-flows.md` — UX patterns, wireframes, screen flows
- `questionnaires.md` — Question types, answer formats, template system
- `analytics.md` — Metrics, KPIs, charting strategy
- `security.md` — Auth, authorization, multi-tenancy, GDPR, audit logging

Phase plans: `docs/wiki/Phase-01.md` through `Phase-17.md`. Phase dependency graph: `docs/wiki/Phase-Log.md`.

## Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Update it with every commit — a PostToolUse hook on Bash will remind you if a `git commit` doesn't include `CHANGELOG.md`. Group entries under `## [Unreleased]` with subsections: `Added`, `Changed`, `Fixed`, `Removed`.

## Phase Progress Tracking

Implementation progress is tracked live on the [GitHub Wiki](https://github.com/dobrician/1on1/wiki/Phase-Log).

**When completing phase work, you MUST update the wiki:**

1. Update the phase's `docs/wiki/Phase-XX.md` with what was built and key decisions
2. Update the phase's `**Status**` field (`Not Started` / `Next` / `In Progress` / `Complete`)
3. Update the Status column in `docs/wiki/Phase-Log.md`
4. The wiki auto-syncs via a PostToolUse hook on Edit/Write — changes to `docs/wiki/*.md` are pushed to the GitHub wiki automatically

If the hook doesn't fire (e.g., first run), manually sync with: `./scripts/push-wiki.sh`
