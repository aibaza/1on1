# 1on1

## What This Is

An AI-powered one-on-one meeting management platform where the AI context layer makes every meeting smarter than the last. Managers run structured 1:1s through a step-by-step wizard, the AI surfaces context from previous sessions, generates summaries, suggests follow-ups, and recommends action items. Built as a multi-tenant SaaS with Apple-level UI polish.

## Core Value

The AI context layer that makes every meeting smarter than the last — knowing what happened before, what matters now, and what should happen next.

## Requirements

### Validated

- ✓ Structured session wizard with step-by-step question flow and context panel — v1.0
- ✓ Custom questionnaire templates per company (6 question types, versioning, conditional logic) — v1.0
- ✓ Session history with full continuity between meetings — v1.0
- ✓ AI-generated session summaries, suggested questions, and action items — v1.0
- ✓ AI proactive nudges before meetings ("Last time Alex mentioned burnout — follow up?") — v1.0
- ✓ Score trends, category breakdown, team analytics, velocity charts, CSV export — v1.0
- ✓ Action items that carry over between sessions with progress tracking — v1.0
- ✓ Multi-tenant with company-level customization (templates, settings, cadence) — v1.0
- ✓ Manager dashboard with upcoming sessions, overdue items, quick stats — v1.0
- ✓ Team management with reporting lines — v1.0
- ✓ Email notifications (invites, reminders, summaries) — v1.0
- ✓ RBAC: admin, manager, member with resource-level authorization — v1.0
- ✓ Auth: email/password, Google OAuth, Microsoft OAuth — v1.0
- ✓ Company onboarding with registration wizard — v1.0
- ✓ Dockerized local test environment (blue-green style, port 4300) — v1.0
- ✓ Vercel-deployable production build — v1.0
- ✓ Dark mode with org color themes — v1.0
- ✓ Full-text search and command palette (Cmd+K) — v1.0
- ✓ i18n framework with UI language per-user and content language per-company — v1.1
- ✓ Full UI translation: English + Romanian (~650-800 keys, locale-aware formatting) — v1.1
- ✓ AI-generated content (summaries, nudges, action items) in company language — v1.1
- ✓ Email notifications in company language — v1.1
- ✓ Browser locale detection for pre-login screens — v1.1
- ✓ JSON schema spec for templates (downloadable, AI-friendly, methodology principles + weight system docs) — v1.2
- ✓ Template export as portable JSON (schemaVersion, tenant-neutral, language field, role-gated) — v1.2
- ✓ Template import from JSON (preview, language mismatch warning, conflict resolution, field-specific validation errors) — v1.2
- ✓ In-app AI template generator (describe → AI generates in company language → preview → save) — v1.2
- ✓ DIY prompt kit (copyable schema + principles + example for Claude, ChatGPT, etc.) — v1.2
- ✓ Design system: consistent badge semantics, sentence-case headers, EmptyState shared component — v1.3
- ✓ Mobile responsiveness: 44px touch targets, responsive column hiding, overflow menus — v1.3
- ✓ Content & data display: numeric score badges, collapsible wizard sections with counts, aggregate analytics stats — v1.3
- ✓ Safety & inputs: Danger Zone with AlertDialog, shared DatePicker, contextual 404 page — v1.3
- ✓ Session correction: manager can amend answers in a completed session with append-only history — v1.4
- ✓ Correction reason: mandatory text (20–500 chars), AI-validated for quality and language compliance — v1.4
- ✓ Correction notification: report + all admins emailed with session link, 5-minute deduplication window — v1.4
- ✓ Correction audit trail: atomic write (history + answer update + audit log in one transaction) — v1.4
- ✓ Playwright E2E test suite: auth setup, full flow coverage, RBAC assertions, CI pipeline (GitHub Actions) — v1.5
- ✓ Low-priority polish: 9 small visual and copy tweaks (registration, audit log, auth pages, people list, action items, team cards, session cards, mobile history) — v1.6
- ✓ Template versioning: on-publish snapshots to template_version table, version history UI with preview/diff/restore, answers preserved via original question_id FK — v1.6
- ✓ Role-based sessions access control: admin grouped by manager, manager split into My Team/My 1:1s, member flat list — v1.6
- ✓ Pre-meeting talking points via AgendaSheet component — v1.6
- ✓ Unified AI pipeline: single Sonnet call replaces 3-call chain — v1.7
- ✓ Company Internal Manifesto + team context for AI — v1.7
- ✓ AI assessment score migrated from 1-100 to 1-5 scale — v1.7
- ✓ Vercel Web Analytics — v1.7
- ✓ Dev preview environment (develop branch + separate Neon DB) — v1.7

### Future (prioritized)

1. **Complete UI/UX review** — full audit and polish pass before adding major features
2. **Report pre-fill** — person being reviewed pre-fills the questionnaire 24h before due time; auto-invited via email when prefill opens; manager reviews everything and only manager can complete the session
3. **AI personal profiles** — pgvector embeddings built from accumulated session data; integrated with sessions and continuously updated/maintained as new sessions complete
4. **AI growth narratives & behavioral metrics** — research and define a core set of behavioral metrics (involvement, results, communication, etc.); AI grades these automatically from session text answers; metrics can grow or shrink over time (personal vectors); foundation for text-only-question grading
5. **AI anomaly detection** — proactive alerts when metrics deviate significantly from baseline
6. **Google Workspace integration** — Google OAuth restricted to workspace accounts; Google Calendar access for scheduling; suggest free common slots for both manager and report; deeper than just calendar sync
7. **Google Tasks integration** — action items maintained as Google Workspace Tasks (replaces simple "overdue email" concept); bidirectional sync
8. **Analytics everywhere** — surface relevant trends to dashboards, personal cards, series views — not just dedicated report pages; make data visible always, in context
9. **SMART Objectives** — integration and automatic tracking (needs research on how to implement)
10. **AI live suggestions** — streaming suggestions during active sessions (low latency)
11. **PDF export** — organization-branded reports for performance reviews
12. **SSO (SAML 2.0, OIDC)** — enterprise authentication
13. **System template library** — pre-built questionnaire templates
14. **Outlook/O365 calendar sync** — after Google Workspace proves the pattern

### Out of Scope

- Mobile native app — web responsive is sufficient; native if mobile demand is proven
- Real-time video/audio — run wizard alongside video call, don't compete with Zoom/Teams
- AI meeting transcription — structured questionnaire approach IS the alternative
- Full HRIS integration — CSV import for bulk users suffices
- Anonymous peer feedback / 360 — poisons the 1:1 trust relationship
- OKR / goal tracking — separate product category, reference goals in notes
- Gamification (badges, leaderboards) — trivializes professional conversations
- Slack bot replacing session wizard — chat answers produce lower-quality responses
- Manager scoring / ranking — creates perverse incentives
- Multi-language template translations — questionnaires defined in one language per company, no per-template multi-language support yet

## Latest Release: v1.7.0 (2026-03-21)

All milestones v1.0–v1.7.0 archived. Ready for next milestone.

**Shipped milestones:**
- v1.0 MVP (2026-03-05) — 10 phases, 40 plans
- v1.1 Internationalization (2026-03-07) — 4 phases, 13 plans
- v1.2 AI-Ready Templates (2026-03-07) — 3 phases, 16 plans
- v1.3 UI/UX Improvements (2026-03-16) — 5 phases, 18 plans
- v1.4 Session Corrections (2026-03-13) — 4 phases, 12 plans
- v1.5 Playwright E2E (2026-03-13) — 1 phase, 6 plans
- v1.6 Polish + Versioning (2026-03-20) — 3 phases, 8 plans
- v1.7.0 Unified AI + Infrastructure (2026-03-21) — no GSD phases

## Context

**Shipped v1.7.0** on 2026-03-21. 29 GSD phases across 7 milestones, plus v1.7.0 infrastructure work done outside the phase system. Codebase: ~55,000+ LOC TypeScript/TSX. Timeline: 20 days (2026-03-02 → 2026-03-21).

**Tech stack:** Next.js 16 (App Router) + TypeScript + Drizzle ORM + PostgreSQL 16 + shadcn/ui + Tailwind CSS 4 + Vercel AI SDK + Auth.js v5 + TanStack Query + Recharts + React Email + Tiptap.

**Architecture:** Monolith-first — single Next.js app with Server Components for reads, API routes for writes, direct async functions for AI pipeline.

**Key technical patterns:** PostgreSQL RLS for tenant isolation, AES-256-GCM for private note encryption, delete-then-insert for analytics snapshots, useReducer for wizard state, Collapsible context panels, optimistic UI updates, cursor-based pagination, full-text search with websearch_to_tsquery.

**Known tech debt:**
- AI context retrieval uses full-text search (pgvector deferred)
- Client-side filtering for people directory (acceptable for v1 volumes)
- Shared notes searched via JSONB text extraction without GIN index

## Constraints

- **Package manager**: Bun (not npm)
- **Tech stack**: Next.js 16 + TypeScript + Drizzle ORM + PostgreSQL 16
- **UI framework**: shadcn/ui + Tailwind CSS 4
- **Deployment**: Vercel (production), Docker Compose (local, port 4300)
- **Test URL**: `https://1on1.surmont.co/` → reverse proxy to `localhost:4300`
- **Multi-tenancy**: Every table with tenant data includes `tenant_id`, enforced by PostgreSQL RLS
- **Private notes**: Encrypted at rest with AES-256-GCM, per-tenant keys via HKDF
- **Language**: English for all code, comments, docs, and commits (AGPL v3)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI is core, not v3 add-on | AI context layer is the primary differentiator | ✓ Good — AI pipeline ships in v1 |
| Bun over npm | Faster installs, better DX, native TypeScript support | ✓ Good |
| Port 4300 for test env | Avoids conflicts with other local projects | ✓ Good |
| Blue-green local deploy | Stable test environment always available | ✓ Good |
| Google Calendar first | Most common calendar; Outlook deferred to v2 | — Pending (deferred entirely from v1) |
| Monolith-first | Single Next.js app — no microservices | ✓ Good |
| Design-first per-phase | Mockups within phase plans, not separate phase | ✓ Good — faster iteration |
| Direct AI pipeline over Inngest | Simpler, fewer moving parts, retry via UI | ✓ Good — reduced complexity |
| Full-text search over pgvector | Sufficient for v1 context retrieval, pgvector deferred | ✓ Good — avoided premature optimization |
| useReducer for wizard state | Single source of truth for cross-category logic | ✓ Good |
| Delete-then-insert for snapshots | NULL-safe unique index handling | ✓ Good |
| Nodemailer over Resend | Works with any SMTP provider | ✓ Good — provider flexibility |
| Unified AI (1 call vs 3) | Lower latency, better coherence, simpler code | ✓ Good — v1.7.0 |
| 1-5 score scale over 1-100 | More intuitive for users, matches star ratings | ✓ Good — v1.7.0 |

---
*Last updated: 2026-03-21 — all milestones through v1.7.0 archived*
