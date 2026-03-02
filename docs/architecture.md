# Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | Server-side rendering, React Server Components, file-based routing, API routes in the same repo |
| **Language** | TypeScript (strict) | End-to-end type safety, better refactoring, fewer runtime errors |
| **UI Components** | shadcn/ui | Accessible, copy-paste components built on Radix UI. No vendor lock-in — components live in the project |
| **Styling** | Tailwind CSS 4 | Utility-first, consistent design tokens, fast iteration |
| **Client State** | TanStack Query (React Query) | Server state caching, background refetching, optimistic updates, mutation management |
| **Forms** | React Hook Form + Zod | Performant form handling with schema-based validation shared between client and server |
| **ORM** | Drizzle ORM | Type-safe SQL queries, declarative schema, lightweight, PostgreSQL-native features (JSONB, enums) |
| **Database** | PostgreSQL 16 | JSONB for flexible answer configs, Row-Level Security for multi-tenancy, window functions for analytics |
| **Auth** | Auth.js v5 (NextAuth) | OAuth (Google, Microsoft), magic link, credential-based login, session management |
| **File Storage** | Cloudflare R2 or S3 | Profile pictures, PDF exports, attachments |
| **Background Jobs** | Inngest | Event-driven functions for reminders, notifications, analytics computation. Serverless-friendly |
| **Charts** | Recharts | Composable React charting library, good for line/bar/radar charts needed for analytics |
| **Email** | Resend + React Email | Transactional emails (invites, reminders, session summaries) with React-based templates |
| **Deployment** | Vercel | Zero-config Next.js hosting, edge functions, preview deployments per PR |
| **Database Hosting** | Neon or Supabase | Managed PostgreSQL with branching (Neon) or built-in auth/storage (Supabase) |

## Project Structure

```
/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Public auth routes
│   │   │   ├── login/
│   │   │   ├── register/             # Company registration
│   │   │   ├── invite/[token]/       # Accept invite
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/              # Protected routes (require auth)
│   │   │   ├── layout.tsx            # Sidebar + header layout
│   │   │   ├── overview/             # Manager dashboard / home
│   │   │   │
│   │   │   ├── people/               # People directory
│   │   │   │   ├── page.tsx          # List all people
│   │   │   │   └── [id]/            # Individual profile + history
│   │   │   │
│   │   │   ├── teams/                # Team management
│   │   │   │   ├── page.tsx          # List teams
│   │   │   │   └── [id]/            # Team detail + members
│   │   │   │
│   │   │   ├── templates/            # Questionnaire templates
│   │   │   │   ├── page.tsx          # List templates
│   │   │   │   ├── new/             # Create template
│   │   │   │   └── [id]/            # Edit template
│   │   │   │
│   │   │   ├── series/               # Meeting series (manager ↔ report pairs)
│   │   │   │   ├── page.tsx          # List all 1:1 relationships
│   │   │   │   └── [id]/            # Series detail + session history
│   │   │   │
│   │   │   ├── sessions/             # Individual sessions
│   │   │   │   ├── page.tsx          # Upcoming + past sessions
│   │   │   │   └── [id]/            # Active session / wizard
│   │   │   │       ├── page.tsx      # Session wizard (during meeting)
│   │   │   │       └── summary/     # Post-session summary
│   │   │   │
│   │   │   ├── analytics/            # Charts and reports
│   │   │   │   ├── page.tsx          # Overview analytics
│   │   │   │   ├── individual/[id]/ # Per-person trends
│   │   │   │   └── team/[id]/       # Team-level analytics
│   │   │   │
│   │   │   └── settings/             # Company & account settings
│   │   │       ├── company/          # Company profile, branding
│   │   │       ├── account/          # Personal account settings
│   │   │       └── notifications/    # Notification preferences
│   │   │
│   │   └── api/                      # API route handlers
│   │       ├── auth/                 # Auth.js routes
│   │       ├── users/
│   │       ├── teams/
│   │       ├── templates/
│   │       ├── series/
│   │       ├── sessions/
│   │       ├── analytics/
│   │       └── webhooks/             # External integrations
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                   # App shell components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── user-menu.tsx
│   │   │
│   │   ├── session/                  # Session-specific components
│   │   │   ├── session-wizard.tsx    # Main wizard controller
│   │   │   ├── question-card.tsx     # Renders question by answer_type
│   │   │   ├── context-panel.tsx     # Side panel with history
│   │   │   ├── notes-editor.tsx      # Rich text notes (shared + private)
│   │   │   ├── action-item-form.tsx  # Create/edit action items
│   │   │   ├── progress-bar.tsx      # Wizard progress indicator
│   │   │   └── session-summary.tsx   # Post-session recap
│   │   │
│   │   ├── templates/                # Template builder components
│   │   │   ├── template-editor.tsx   # Drag-and-drop question builder
│   │   │   ├── question-form.tsx     # Configure individual question
│   │   │   ├── answer-type-picker.tsx
│   │   │   └── template-preview.tsx
│   │   │
│   │   ├── analytics/                # Chart components
│   │   │   ├── score-trend-chart.tsx # Line chart: scores over time
│   │   │   ├── category-radar.tsx    # Radar chart: category breakdown
│   │   │   ├── team-heatmap.tsx      # Heatmap: team × categories
│   │   │   ├── completion-rate.tsx   # Bar chart: meeting adherence
│   │   │   └── metric-card.tsx       # Single KPI display card
│   │   │
│   │   └── people/                   # People management components
│   │       ├── people-table.tsx
│   │       ├── invite-dialog.tsx
│   │       └── profile-card.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema/               # Drizzle table definitions
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── teams.ts
│   │   │   │   ├── templates.ts
│   │   │   │   ├── series.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── answers.ts
│   │   │   │   ├── action-items.ts
│   │   │   │   ├── reminders.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── index.ts              # DB connection + client export
│   │   │   ├── migrations/           # Generated migration files
│   │   │   └── seed.ts               # Development seed data
│   │   │
│   │   ├── auth/
│   │   │   ├── config.ts             # Auth.js configuration
│   │   │   └── middleware.ts         # Route protection
│   │   │
│   │   ├── email/
│   │   │   ├── templates/            # React Email templates
│   │   │   │   ├── invite.tsx
│   │   │   │   ├── reminder.tsx
│   │   │   │   └── session-summary.tsx
│   │   │   └── send.ts              # Email sending utility
│   │   │
│   │   ├── jobs/                     # Inngest functions
│   │   │   ├── send-reminders.ts
│   │   │   ├── compute-analytics.ts
│   │   │   └── carry-over-actions.ts
│   │   │
│   │   ├── validations/              # Zod schemas (shared client/server)
│   │   │   ├── user.ts
│   │   │   ├── template.ts
│   │   │   ├── session.ts
│   │   │   └── answer.ts
│   │   │
│   │   └── utils/
│   │       ├── formatting.ts         # Date, number formatting
│   │       ├── scoring.ts            # Score calculation helpers
│   │       └── constants.ts          # App-wide constants
│   │
│   └── types/
│       └── index.ts                  # Shared TypeScript types
│
├── drizzle/                          # Drizzle config + generated files
├── public/
│   └── images/
├── .env.example
├── .env.local                        # Local env (git-ignored)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.ts
└── middleware.ts                     # Next.js middleware (auth redirect)
```

## Key Architectural Decisions

### 1. Monolith-first

Everything runs in a single Next.js application. API routes handle backend logic, React Server Components handle data fetching for pages. No microservices, no separate backend — this reduces operational complexity and deployment cost for an early-stage product.

When the product outgrows this (thousands of concurrent sessions, heavy analytics), the background jobs (Inngest) and analytics computation can be extracted first.

### 2. Multi-tenancy via tenant_id

Every database table includes a `tenant_id` column. All queries filter by tenant. PostgreSQL Row-Level Security (RLS) provides a second layer of defense — even if application code has a bug, the database won't leak data across tenants.

This is simpler than database-per-tenant (which adds operational overhead) while being more secure than no isolation.

### 3. Server Components for data, Client Components for interaction

- **Server Components** (default): Fetch data directly in components using Drizzle. No API calls, no loading spinners for initial page loads.
- **Client Components**: Used for interactive elements (session wizard, template builder, forms, charts). These use TanStack Query to fetch/mutate data through API routes.

### 4. API Routes as the single mutation layer

All writes go through Next.js API routes (`src/app/api/`). This creates a clear boundary for:
- Input validation (Zod schemas)
- Authorization checks
- Audit logging
- Future public API exposure

### 5. Background jobs for async operations

Operations that don't need to block the user:
- Sending reminder emails (24h/1h before meetings)
- Computing analytics snapshots (nightly/weekly rollups)
- Auto-carrying over unfinished action items to the next session
- Sending post-session summary emails

These run as Inngest functions, triggered by events (e.g., `session.completed`, `cron.daily`).

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Edge +   │
     Users ──────►  │  Serverless)│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │  PostgreSQL  │ │  R2  │ │   Inngest   │
       │ (Neon/Supa)  │ │ (S3) │ │  (Jobs)     │
       └─────────────┘ └──────┘ └─────────────┘
              │                        │
              │            ┌───────────┘
              │            │
       ┌──────▼────────────▼──┐
       │       Resend          │
       │    (Transactional     │
       │       Email)          │
       └──────────────────────┘
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_MICROSOFT_ID=...
AUTH_MICROSOFT_SECRET=...

# Email
RESEND_API_KEY=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=...

# Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# App
NEXT_PUBLIC_APP_URL=https://app.1on1.example.com
```
