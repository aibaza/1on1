# 1on1 — Structured One-on-One Meeting Management

A SaaS platform that helps organizations run effective, data-driven 1:1 meetings between managers and their direct reports. Unlike general-purpose meeting tools, 1on1 focuses on structured questionnaire-based sessions with longitudinal analytics — enabling companies to track employee engagement, wellbeing, and performance over months and years.

## Core Value Proposition

- **Structured sessions** — Customizable questionnaire templates with multiple answer types (ratings, scales, text, mood) that produce quantifiable data
- **Historical context** — Every session surfaces past notes, action items, and score trends so managers walk in prepared
- **Long-term analytics** — Track engagement, wellbeing, and performance scores over time for annual reviews and salary negotiations
- **Company-configurable** — Each organization defines its own teams, questionnaires, and evaluation criteria

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| UI | shadcn/ui + Tailwind CSS 4 |
| ORM | Drizzle ORM + PostgreSQL 16 |
| Auth | Auth.js v5 (NextAuth) |
| Validation | Zod (shared client/server) |
| Forms | React Hook Form |
| Charts | Recharts |
| Email | Nodemailer + React Email |
| AI | Vercel AI SDK + Anthropic Claude |
| Client State | TanStack Query |
| Testing | Vitest + Testing Library |
| Deployment | Vercel + Neon |

## Wiki Pages

| Page | Description |
|------|-------------|
| [[Architecture]] | Tech stack details, project structure, deployment strategy |
| [[Data-Model]] | Complete database schema with entity relationships |
| [[Features-Roadmap]] | Feature breakdown: MVP, v2, v3 |
| [[UX-Flows]] | User experience patterns, wireframes, screen flows |
| [[Questionnaires]] | Question types, answer formats, template system |
| [[Analytics]] | Metrics, KPIs, charting strategy, data aggregation |
| [[Security]] | Authentication, authorization, multi-tenancy, GDPR |
| [[Phase-Log]] | Implementation progress — phase-based roadmap |

## Repository

- **Source**: [github.com/dobrician/1on1](https://github.com/dobrician/1on1)
- **License**: AGPL v3
- **Wiki source**: Versioned in `docs/wiki/` — synced to GitHub Wiki

## Architecture at a Glance

- Monorepo, monolith-first approach
- Multi-tenant via `tenant_id` + PostgreSQL Row-Level Security
- Server Components for data fetching, Client Components for interactivity
- All mutations go through API routes (`src/app/api/`)
- Background jobs handled inline or via queued DB notifications (no separate job queue)
