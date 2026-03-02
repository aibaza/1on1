# Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 15 (App Router) | Server-side rendering, React Server Components, file-based routing, API routes in the same repo |
| **Language** | TypeScript (strict) | End-to-end type safety, better refactoring, fewer runtime errors |
| **UI Components** | shadcn/ui | Accessible, copy-paste components built on Radix UI. No vendor lock-in |
| **Styling** | Tailwind CSS 4 | Utility-first, consistent design tokens, fast iteration |
| **Client State** | TanStack Query (React Query) | Server state caching, background refetching, optimistic updates |
| **Forms** | React Hook Form + Zod | Performant form handling with schema-based validation shared between client and server |
| **ORM** | Drizzle ORM | Type-safe SQL queries, declarative schema, lightweight, PostgreSQL-native features (JSONB, enums) |
| **Database** | PostgreSQL 16 | JSONB for flexible answer configs, Row-Level Security for multi-tenancy, window functions for analytics |
| **Auth** | Auth.js v5 (NextAuth) | OAuth (Google, Microsoft), magic link, credential-based login |
| **File Storage** | Cloudflare R2 or S3 | Profile pictures, PDF exports, attachments |
| **Background Jobs** | Inngest | Event-driven functions for reminders, notifications, analytics computation |
| **Charts** | Recharts | Composable React charting library for line/bar/radar charts |
| **Email** | Resend + React Email | Transactional emails with React-based templates |
| **Deployment** | Vercel | Zero-config Next.js hosting, edge functions, preview deployments per PR |
| **Database Hosting** | Neon or Supabase | Managed PostgreSQL with branching or built-in auth/storage |

## Project Structure

```
/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Public auth routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── invite/[token]/
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/              # Protected routes (require auth)
│   │   │   ├── layout.tsx            # Sidebar + header layout
│   │   │   ├── overview/             # Manager dashboard / home
│   │   │   ├── people/               # People directory + profiles
│   │   │   ├── teams/                # Team management
│   │   │   ├── templates/            # Questionnaire templates
│   │   │   ├── series/               # Meeting series
│   │   │   ├── sessions/             # Individual sessions + wizard
│   │   │   ├── analytics/            # Charts and reports
│   │   │   └── settings/             # Company & account settings
│   │   │
│   │   └── api/                      # API route handlers
│   │       ├── auth/
│   │       ├── users/
│   │       ├── teams/
│   │       ├── templates/
│   │       ├── series/
│   │       ├── sessions/
│   │       ├── analytics/
│   │       └── webhooks/
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── layout/                   # App shell (sidebar, header, breadcrumbs)
│   │   ├── session/                  # Session wizard components
│   │   ├── templates/                # Template builder components
│   │   ├── analytics/                # Chart components
│   │   └── people/                   # People management components
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema/               # Drizzle table definitions
│   │   │   ├── index.ts              # DB connection
│   │   │   ├── migrations/           # Generated migration files
│   │   │   └── seed.ts               # Dev seed data
│   │   ├── auth/                     # Auth.js config + middleware
│   │   ├── email/                    # React Email templates + sending
│   │   ├── jobs/                     # Inngest background functions
│   │   ├── validations/              # Zod schemas (shared client/server)
│   │   └── utils/                    # Formatting, scoring, constants
│   │
│   └── types/                        # Shared TypeScript types
│
├── drizzle/                          # Drizzle config + generated files
├── public/
├── docs/                             # Project documentation
└── docs/wiki/                        # Wiki source (synced to GitHub Wiki)
```

## Key Architectural Decisions

### 1. Monolith-first

Everything runs in a single Next.js application. API routes handle backend logic, React Server Components handle data fetching for pages. No microservices, no separate backend.

**Future extraction path**: When the product outgrows this (thousands of concurrent sessions, heavy analytics), background jobs (Inngest) and analytics computation can be extracted first.

### 2. Multi-tenancy via tenant_id

Every database table includes a `tenant_id` column. All queries filter by tenant. PostgreSQL Row-Level Security (RLS) provides a second layer of defense.

Simpler than database-per-tenant while being more secure than no isolation.

### 3. Server Components for data, Client Components for interaction

- **Server Components** (default): Fetch data directly using Drizzle. No API calls for initial page loads.
- **Client Components**: Interactive elements (session wizard, template builder, forms, charts) use TanStack Query through API routes.

### 4. API Routes as the single mutation layer

All writes go through `src/app/api/`. This creates a clear boundary for input validation, authorization checks, audit logging, and future public API exposure.

### 5. Background jobs for async operations

Non-blocking operations via Inngest:
- Sending reminder emails (24h/1h before meetings)
- Computing analytics snapshots (nightly/weekly rollups)
- Auto-carrying over unfinished action items
- Sending post-session summary emails

## Deployment Architecture

```
                    ┌─────────────┐
                    │   Vercel     │
                    │  (Edge +    │
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
