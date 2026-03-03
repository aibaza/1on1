# Phase 1: Foundation & Infrastructure - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A running application skeleton with correct multi-tenancy, encryption, and deployment infrastructure that all future phases build on. Includes: Next.js scaffolding, full PostgreSQL schema with RLS, private note encryption, Docker Compose local environment, and Vercel deployment. No UI screens, no auth flows, no business logic.

</domain>

<decisions>
## Implementation Decisions

### Database provider
- Neon for managed PostgreSQL (not Supabase)
- Database branching enabled — each Vercel preview deploy gets its own Neon database branch via native Neon-Vercel integration
- Dedicated app role (not neondb_owner) to enforce RLS properly — neondb_owner has BYPASSRLS
- Full schema deployed upfront — all tables from data-model.md created in Phase 1, not incrementally per phase

### Encryption key storage
- Master encryption key stored as environment variable (ENCRYPTION_MASTER_KEY)
- Stored in .env.local for dev, Vercel env vars for production
- Key versioning via key_version field on private_note table (missing from current docs — must be added)
- Rotation means updating the env var and re-deploying

### Development seed data
- Full demo company: "Acme Corp" with admin, 2 managers, 4 members, teams, reporting lines, 2 templates, sessions with answers
- Second tenant: "Beta Inc" with minimal data — for multi-tenancy isolation testing
- Realistic-looking content (real names, actual 1:1 questions, plausible answers)
- Idempotent seed script (upsert logic, safe to run multiple times)
- Seed script at src/lib/db/seed.ts, invoked via `bun run db:seed`

### Blue-green local setup
- Stable (green) version runs in Docker Compose: PostgreSQL + built Next.js app on port 4300
- Active development runs bare-metal with `bun dev` on a different port (e.g., 4301)
- Shared PostgreSQL container with two databases: `oneonone_stable` and `oneonone_dev`
- Reverse proxy (1on1.surmont.co -> localhost:4300) already configured externally — not part of this project
- Switch stable version by rebuilding the Docker image when a version is ready

### Vercel deployment
- Vercel project created and linked to GitHub repo in Phase 1
- Vercel default subdomain for now (*.vercel.app) — custom domain added later
- Production deploys from main branch, preview deploys from PRs
- No separate staging environment — PR preview deploys serve that purpose
- Neon Vercel integration installed for automatic DATABASE_URL provisioning and branch cleanup
- No CI/CD (GitHub Actions) yet — just Vercel auto-deploy. CI added when there are tests to run (Phase 2+)

### Claude's Discretion
- Connection pooling configuration for Neon
- Exact Docker Compose service configuration and Dockerfile optimization
- ESLint and Prettier configuration details
- TypeScript strict mode config specifics
- Drizzle ORM configuration and migration setup approach

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code exists yet — greenfield project
- Comprehensive documentation in docs/ (architecture, data-model, features, UX flows, security, analytics, questionnaires)
- 7 codebase analysis documents in .planning/codebase/ (STACK, CONVENTIONS, CONCERNS, ARCHITECTURE, STRUCTURE, INTEGRATIONS, TESTING)
- 15 sprint plans in docs/wiki/

### Established Patterns
- Conventions defined in .planning/codebase/CONVENTIONS.md — naming, imports, error handling, module design
- Data model fully specified in docs/data-model.md — all tables, indexes, RLS policies
- Security patterns documented in docs/security.md — encryption, RLS, RBAC

### Integration Points
- Neon PostgreSQL (cloud) + local Docker PostgreSQL (dev)
- Vercel for serverless deployment
- Neon-Vercel integration for automatic database branch management
- Bun as package manager (not npm)

</code_context>

<specifics>
## Specific Ideas

- Blue-green local deployment: Docker for stable, bare-metal for dev — fast iteration with a reliable test instance always running
- Two-tenant seed data validates RLS isolation from day one — catches tenant leakage bugs before any features are built
- Neon branching per PR means every preview deploy is fully isolated — no shared dev database state

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-infrastructure*
*Context gathered: 2026-03-03*
