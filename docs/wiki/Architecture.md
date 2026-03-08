# Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 16 (App Router) | Server-side rendering, React Server Components, file-based routing, API routes in the same repo |
| **Language** | TypeScript (strict) | End-to-end type safety, better refactoring, fewer runtime errors |
| **UI Components** | shadcn/ui | Accessible, copy-paste components built on Radix UI. No vendor lock-in — components live in the project |
| **Styling** | Tailwind CSS 4 | Utility-first, consistent design tokens, fast iteration |
| **Client State** | TanStack Query (React Query) | Server state caching, background refetching, optimistic updates, mutation management |
| **Forms** | React Hook Form + Zod | Performant form handling with schema-based validation shared between client and server |
| **Rich Text** | Tiptap | ProseMirror-based editor for shared notes and session context |
| **Drag-and-Drop** | dnd-kit | Template question reordering, sortable UI patterns |
| **i18n** | next-intl | Cookie-based locale switching, server + client message loading, ICU plurals |
| **ORM** | Drizzle ORM | Type-safe SQL queries, declarative schema, lightweight, PostgreSQL-native features (JSONB, enums) |
| **Database** | PostgreSQL 16 | JSONB for flexible answer configs, Row-Level Security for multi-tenancy, window functions for analytics |
| **Auth** | Auth.js v5 (NextAuth) | OAuth (Google, Microsoft), magic link, credential-based login, session management |
| **AI** | Vercel AI SDK + Anthropic Claude | Streaming AI responses, structured output, template co-authoring editor |
| **Email** | Nodemailer + React Email | Transactional emails (invites, reminders, session summaries) with React-based templates |
| **File Storage** | Cloudflare R2 or S3 | Profile pictures, PDF exports, attachments |
| **Charts** | Recharts | Composable React charting library, good for line/bar/radar charts needed for analytics |
| **Testing** | Vitest + Testing Library | Unit and integration tests, component tests, translation parity checks; `happy-dom` for DOM-dependent tests (Tiptap rendering) |
| **Deployment** | Vercel | Zero-config Next.js hosting, edge functions, preview deployments per PR |
| **Database Hosting** | Neon | Managed PostgreSQL with branching |

## Project Structure

```
/
├── messages/                         # i18n translation files
│   ├── en/                           # English messages (namespace JSON files)
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── dashboard.json
│   │   ├── sessions.json
│   │   ├── templates.json
│   │   ├── people.json
│   │   ├── teams.json
│   │   ├── analytics.json
│   │   ├── actionItems.json
│   │   ├── history.json
│   │   ├── settings.json
│   │   ├── admin.json
│   │   ├── navigation.json
│   │   ├── search.json
│   │   ├── validation.json
│   │   ├── emails.json
│   │   └── spec.json
│   └── ro/                           # Romanian messages (mirrors en/)
│
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
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── teams/                # Team management
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── templates/            # Questionnaire templates
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   ├── [id]/             # Edit template
│   │   │   │   │   └── ai/           # AI co-authoring editor
│   │   │   │   ├── import/           # Template import dialog
│   │   │   │   └── spec/             # JSON schema spec page
│   │   │   │
│   │   │   ├── series/               # Meeting series
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── sessions/             # Individual sessions
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Session wizard
│   │   │   │       └── summary/
│   │   │   │
│   │   │   ├── analytics/            # Charts and reports
│   │   │   │   ├── page.tsx
│   │   │   │   ├── individual/[id]/
│   │   │   │   └── team/[id]/
│   │   │   │
│   │   │   └── settings/             # Company & account settings
│   │   │       ├── company/
│   │   │       ├── account/
│   │   │       └── notifications/
│   │   │
│   │   └── api/                      # API route handlers
│   │       ├── auth/                 # Auth.js routes
│   │       ├── users/
│   │       ├── teams/
│   │       ├── templates/
│   │       │   └── [id]/
│   │       │       ├── export/       # Template export endpoint
│   │       │       └── ai/           # AI chat endpoint (streaming)
│   │       ├── series/
│   │       ├── sessions/
│   │       ├── analytics/
│   │       └── admin/
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   │   ├── star-rating.tsx       # Reusable star rating display (sm/md/lg)
│   │   │   └── empty-state.tsx       # Standardized empty state (icon + title + action)
│   │   │
│   │   ├── layout/                   # App shell components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── breadcrumbs.tsx
│   │   │   └── user-menu.tsx
│   │   │
│   │   ├── session/                  # Session-specific components
│   │   │   ├── session-wizard.tsx
│   │   │   ├── question-card.tsx
│   │   │   ├── context-panel.tsx
│   │   │   ├── notes-editor.tsx      # Tiptap rich text editor
│   │   │   ├── action-item-form.tsx
│   │   │   ├── talking-points.tsx
│   │   │   ├── progress-bar.tsx
│   │   │   └── session-summary.tsx
│   │   │
│   │   ├── templates/                # Template builder components
│   │   │   ├── template-editor.tsx   # Drag-and-drop question builder (dnd-kit)
│   │   │   ├── question-form.tsx
│   │   │   ├── answer-type-picker.tsx
│   │   │   ├── template-preview.tsx
│   │   │   ├── ai-editor/            # AI co-authoring split-screen
│   │   │   ├── import-dialog.tsx
│   │   │   └── export-button.tsx
│   │   │
│   │   ├── analytics/                # Chart components
│   │   │   ├── score-trend-chart.tsx
│   │   │   ├── category-bar-chart.tsx
│   │   │   ├── team-heatmap.tsx
│   │   │   ├── completion-rate.tsx
│   │   │   └── metric-card.tsx
│   │   │
│   │   └── people/                   # People management components
│   │       ├── people-table.tsx
│   │       ├── invite-dialog.tsx
│   │       └── profile-card.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema/               # Drizzle table definitions (16 files, 25 tables)
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── users.ts
│   │   │   │   ├── teams.ts
│   │   │   │   ├── templates.ts      # template + sections + labels + questions
│   │   │   │   ├── series.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── answers.ts
│   │   │   │   ├── notes.ts          # private_note + talking_point
│   │   │   │   ├── action-items.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── auth.ts           # OAuth accounts + sessions + invite/reset tokens
│   │   │   │   ├── nudges.ts         # ai_nudge
│   │   │   │   ├── audit-log.ts
│   │   │   │   ├── enums.ts          # Shared pgEnum definitions
│   │   │   │   └── index.ts          # Re-exports all tables
│   │   │   ├── index.ts              # DB connection + client export
│   │   │   ├── migrations/           # Generated migration files
│   │   │   └── seed.ts               # Development seed data
│   │   │
│   │   ├── auth/
│   │   │   └── config.ts             # Auth.js configuration
│   │   │
│   │   ├── ai/                       # AI pipeline
│   │   │   ├── service.ts            # Core AI service (Vercel AI SDK)
│   │   │   ├── pipeline.ts           # Orchestration for multi-step AI flows
│   │   │   ├── models.ts             # Model selection + config
│   │   │   ├── context.ts            # Session context builder for prompts
│   │   │   ├── editor-types.ts       # Types for AI template editor
│   │   │   ├── prompts/              # System prompts per feature
│   │   │   └── schemas/              # Zod schemas for structured AI output
│   │   │
│   │   ├── email/
│   │   │   ├── templates/            # React Email templates
│   │   │   │   ├── invite.tsx
│   │   │   │   ├── reminder.tsx
│   │   │   │   └── session-summary.tsx
│   │   │   └── send.ts              # Email sending utility (Nodemailer)
│   │   │
│   │   ├── i18n/                     # i18n utilities
│   │   │   ├── zod-error-map.ts      # Translate Zod errors to active locale
│   │   │   └── api-error-toast.ts    # Translate API errors for toast display
│   │   │
│   │   ├── validations/              # Zod schemas (shared client/server)
│   │   │   ├── user.ts
│   │   │   ├── template.ts
│   │   │   ├── session.ts
│   │   │   └── answer.ts
│   │   │
│   │   ├── session/
│   │   │   └── tiptap-render.ts          # contentToHtml() — type-safe Tiptap JSON→HTML
│   │   │
│   │   └── utils/
│   │       ├── formatting.ts
│   │       ├── scoring.ts
│   │       └── constants.ts
│   │
│   └── types/
│       └── index.ts
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
└── middleware.ts                     # Next.js middleware (auth + locale routing)
```

## Key Architectural Decisions

### 1. Monolith-first

Everything runs in a single Next.js application. API routes handle backend logic, React Server Components handle data fetching for pages. No microservices, no separate backend — this reduces operational complexity and deployment cost for an early-stage product.

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

### 5. AI as a first-class feature

AI (Anthropic Claude via Vercel AI SDK) is integrated directly into the template builder. The AI pipeline (`src/lib/ai/`) handles:
- Streaming responses to the split-screen editor
- Structured JSON output mapped to typed template fields
- Persistent chat history stored on the template record
- Per-feature prompt engineering with Zod-validated output schemas

### 6. i18n architecture

Two independent translation layers:
- **UI language**: Per-user cookie (`NEXT_LOCALE`), controls all app chrome and labels
- **Content language**: Per-company setting, controls template questions and company-created content

Both are handled via `next-intl` with message files in `messages/{locale}/`. A CI test (`translation-parity.test.ts`) ensures EN and RO keys stay synchronized.

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
       │  PostgreSQL  │ │  R2  │ │  Anthropic  │
       │   (Neon)     │ │ (S3) │ │  Claude API │
       └─────────────┘ └──────┘ └─────────────┘
              │
       ┌──────▼──────────────┐
       │    Nodemailer        │
       │  (Transactional      │
       │     Email)           │
       └──────────────────────┘
```

**Local development**: Blue-green Docker setup. Stable test env runs on port 4300, proxied via reverse proxy at https://1on1.surmont.co/.

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

# AI
ANTHROPIC_API_KEY=...

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=...

# App
NEXT_PUBLIC_APP_URL=https://app.1on1.example.com
ENCRYPTION_MASTER_KEY=...         # AES-256-GCM key for private notes
```
