# CLAUDE.md

## Project: 1on1

Structured one-on-one meeting management SaaS for companies.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict mode)
- **UI**: shadcn/ui + Tailwind CSS 4
- **ORM**: Drizzle ORM + PostgreSQL 16
- **Auth**: Auth.js v5 (NextAuth)
- **Validation**: Zod (shared client/server schemas)
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Email**: Resend + React Email
- **Jobs**: Inngest
- **State**: TanStack Query (React Query)

## Architecture

- Monorepo, monolith-first approach
- Multi-tenant via `tenant_id` + PostgreSQL Row-Level Security
- Server Components for data fetching, Client Components for interactivity
- All mutations go through API routes (`src/app/api/`)
- Background jobs via Inngest for reminders, analytics computation

## Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (ui/, session/, templates/, analytics/, layout/)
- `src/lib/db/schema/` — Drizzle ORM table definitions
- `src/lib/validations/` — Zod schemas
- `src/lib/jobs/` — Inngest background functions
- `docs/` — Project documentation

## Conventions

- Use English for all code, comments, variable names, and documentation
- Use Romanian for user-facing communication (discussions, issues)
- Prefer Server Components by default, use `"use client"` only when needed
- Validate all inputs with Zod schemas shared between client and server
- Every DB table with tenant data must include `tenant_id`
- Private notes are encrypted at the application level (AES-256-GCM)
- Follow existing patterns in the codebase before inventing new ones

## Documentation

Full project documentation is in `docs/`:
- `architecture.md` — Tech stack, project structure, deployment
- `data-model.md` — Complete database schema
- `features.md` — Feature roadmap (MVP / v2 / v3)
- `ux-flows.md` — UX patterns and wireframes
- `questionnaires.md` — Question types, answer formats, template system
- `analytics.md` — Metrics, KPIs, charting strategy
- `security.md` — Auth, authorization, multi-tenancy, GDPR
