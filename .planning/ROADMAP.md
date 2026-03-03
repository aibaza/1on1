# Roadmap: 1on1

## Overview

Transform the validated Google Forms 1:1 meeting workflow into an AI-native SaaS product where the AI context layer makes every meeting smarter than the last. The roadmap builds from data foundation through the core session wizard to AI features, following the principle that structured data collection enables everything else. Each phase delivers a coherent, verifiable capability. AI ships in v1 as a core feature, not a bolt-on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Infrastructure** - Database schema, RLS, encryption, Docker, Vercel deployment, project scaffolding
- [x] **Phase 2: Authentication & Organization** - Auth flows, org registration, multi-tenancy enforcement, session management
- [ ] **Phase 3: User & Team Management** - Invites, profiles, RBAC, teams, reporting lines, audit logging
- [ ] **Phase 4: Questionnaire Templates** - Template builder with 6 question types, versioning, conditional logic, drag-and-drop
- [ ] **Phase 5: Meeting Series & Session Wizard** - Series lifecycle, step-by-step wizard, context panel, notes, auto-save
- [ ] **Phase 6: Action Items & Session History** - Action tracking with carry-over, session timeline, full-text search
- [ ] **Phase 7: AI Pipeline** - Session summaries, pre-session nudges, embeddings, Inngest durable functions, AI SDK integration
- [ ] **Phase 8: Manager Dashboard & Analytics** - Dashboard home screen, score charts, category breakdowns, team analytics, CSV export
- [ ] **Phase 9: Email Notifications** - Invite emails, meeting reminders, post-session summaries, agenda prep reminders
- [ ] **Phase 10: Integration & Polish** - Dark mode, final UI polish, end-to-end flow verification

## Phase Details

### Phase 1: Foundation & Infrastructure
**Goal**: A running application skeleton with correct multi-tenancy, encryption, and deployment infrastructure that all future phases build on
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, ORG-02, ORG-03, SEC-01, SEC-02, SEC-05
**Success Criteria** (what must be TRUE):
  1. Next.js application starts locally via Docker Compose on port 4300 and is accessible on the local network
  2. Application deploys successfully to Vercel with serverless functions
  3. PostgreSQL database has all schema tables with RLS policies enforced via a dedicated app role (not neondb_owner)
  4. Private note encryption round-trips correctly (encrypt, store, decrypt) with key versioning
  5. Every database query runs inside a withTenantContext() wrapper that sets tenant_id via SET LOCAL
**Plans**: 3 plans in 3 waves (sequential -- each layer builds on the previous)

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding with Bun, Docker Compose blue-green setup (Wave 1)
- [x] 01-02-PLAN.md -- Complete Drizzle schema, RLS policies, tenant context wrapper (Wave 2)
- [x] 01-03-PLAN.md -- Encryption infrastructure, seed data, Vercel deployment (Wave 3)

### Phase 2: Authentication & Organization
**Goal**: Users can securely create accounts, sign in through multiple methods, and register organizations with full tenant isolation
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, ORG-01, ORG-04, ORG-05
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password and receives a verification email
  2. User can sign in with Google OAuth or Microsoft OAuth and lands in their organization
  3. User session persists across browser refresh and user can log out from any page
  4. User can reset a forgotten password via a time-limited email link
  5. Admin can register a new organization and configure its settings (timezone, cadence, duration, org type)
**Plans**: TBD

Plans:
- [x] 02-01: Auth.js setup with email/password and email verification
- [x] 02-02: OAuth providers (Google, Microsoft) and session management
- [x] 02-03: Organization registration wizard and settings

### Phase 3: User & Team Management
**Goal**: Admins can build their organization's people structure with invites, roles, teams, and reporting lines
**Depends on**: Phase 2
**Requirements**: USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, TEAM-01, TEAM-02, TEAM-03, TEAM-04, SEC-03, SEC-04, SEC-06
**Success Criteria** (what must be TRUE):
  1. Admin can invite users via email and invitees receive a magic link to join and set their password
  2. Admin can assign roles (admin, manager, member) and each role sees only what it should (RBAC enforced at API level)
  3. Users can edit their profile (name, job title, avatar) and admin can set manager-report relationships
  4. Admin or manager can create teams, assign leads, and add/remove members (users can belong to multiple teams)
  5. Significant events (invites, deactivations, role changes, settings changes) are recorded in the audit log
**Plans**: 4 plans in 3 waves (Wave 1: foundation, Wave 2: invites + people in parallel, Wave 3: teams + audit)

Plans:
- [x] 03-01-PLAN.md -- Foundation: deps, schemas (audit_log, invite_tokens), RBAC/audit helpers, sidebar, query provider (Wave 1)
- [x] 03-02-PLAN.md -- Invite flow: send bulk invites, email template, 2-step onboarding acceptance (Wave 2)
- [x] 03-03-PLAN.md -- People directory: data table, inline role/manager editing, profile, deactivation (Wave 2)
- [x] 03-04-PLAN.md -- Teams: card grid, detail page, member management, audit log viewer (Wave 3)

### Phase 4: Questionnaire Templates
**Goal**: Managers and admins can design structured questionnaire templates that capture typed, categorized data across 6 question formats
**Depends on**: Phase 3
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, TMPL-09, TMPL-10
**Success Criteria** (what must be TRUE):
  1. Admin or manager can create a template with all 6 question types (free text, rating 1-5, rating 1-10, yes/no, multiple choice, mood emoji)
  2. Questions can be configured as required/optional with help text, tagged with categories, and reordered via drag-and-drop
  3. Template edits create new versions while past sessions retain their original answers
  4. User can duplicate, archive, and set an organization default template
  5. Conditional logic allows showing/hiding questions based on previous answers (eq, neq, lt, gt, lte, gte operators)
**Plans**: 3 plans in 2 waves (Wave 1: CRUD foundation, Wave 2: editor + DnD/conditional in parallel)

Plans:
- [x] 04-01-PLAN.md -- Schema migration, Zod validations, API CRUD, template list page, sidebar (Wave 1)
- [x] 04-02-PLAN.md -- Template editor, versioning, duplication, archival, default setting (Wave 2)
- [ ] 04-03-PLAN.md -- Drag-and-drop reordering and conditional logic (Wave 2)

### Phase 5: Meeting Series & Session Wizard
**Goal**: Managers can run structured 1:1 sessions through a step-by-step wizard with full context from previous meetings
**Depends on**: Phase 4
**Requirements**: MEET-01, MEET-02, MEET-03, MEET-04, MEET-05, MEET-06, SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07, SESS-08, SESS-09, SESS-10, SESS-11, SESS-12, SESS-13, SESS-14, SESS-15
**Success Criteria** (what must be TRUE):
  1. Manager can create a 1:1 series with a report, set cadence (weekly/biweekly/monthly/custom), preferred day/time, and default template
  2. Session wizard presents questions one at a time with progress indicator, rendering the correct input widget per question type
  3. Context panel shows notes from last 3 sessions, open action items, and score trend sparklines (last 6 sessions)
  4. Both parties can add talking points, use shared notes (rich text), create private notes (encrypted), and create action items inline
  5. All answers auto-save with 500ms debounce, navigation supports next/previous/jump, and manager confirms completion from a summary screen showing all answers, notes, action items, and computed session score
**Plans**: TBD

Plans:
- [ ] 05-01: Meeting series CRUD and lifecycle management
- [ ] 05-02: Session wizard core (question flow, input widgets, progress, navigation)
- [ ] 05-03: Context panel (history, action items, sparklines)
- [ ] 05-04: Notes (shared + private), talking points, and inline action items
- [ ] 05-05: Auto-save, session scoring, summary screen, and completion flow

### Phase 6: Action Items & Session History
**Goal**: Action items carry over between sessions creating accountability, and users can browse and search their complete session history
**Depends on**: Phase 5
**Requirements**: ACTN-01, ACTN-02, ACTN-03, ACTN-04, ACTN-05, HIST-01, HIST-02, HIST-03, HIST-04
**Success Criteria** (what must be TRUE):
  1. User can create action items with title, description, assignee, due date, and track status (Open, In Progress, Completed, Cancelled)
  2. Unfinished action items automatically carry over and appear flagged in the next session's context panel
  3. Dedicated list view shows all open action items across all series
  4. User can view a chronological timeline of sessions in a series and open read-only detail views of completed sessions
  5. User can search across session notes (full-text) and filter sessions by date range and status
**Plans**: TBD

Plans:
- [ ] 06-01: Action item CRUD, status tracking, and carry-over logic
- [ ] 06-02: Action item list view (cross-series)
- [ ] 06-03: Session history timeline and detail view
- [ ] 06-04: Full-text search and filtering

### Phase 7: AI Pipeline
**Goal**: AI generates session summaries and pre-meeting nudges, proving the "AI-first" positioning with reliable background pipelines
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07, AI-08
**Success Criteria** (what must be TRUE):
  1. After session completion, AI generates a narrative summary from answers and notes, stored and viewable in history
  2. Before a session, AI generates 2-3 specific follow-up suggestions based on previous session data (e.g., "Last time Alex mentioned burnout -- follow up?")
  3. Pre-session nudges appear on the dashboard and in the pre-session state
  4. After completion, AI suggests 1-3 action items based on session content
  5. All AI pipelines run as durable Inngest background functions with retry, using Vercel AI SDK with provider-agnostic routing, and session embeddings are stored via pgvector
**Plans**: TBD

Plans:
- [ ] 07-01: AI service layer, tenant guard, and Vercel AI SDK configuration
- [ ] 07-02: Post-session pipeline (summary generation, action item suggestions, embedding storage)
- [ ] 07-03: Pre-session nudge pipeline and dashboard/session integration

### Phase 8: Manager Dashboard & Analytics
**Goal**: Managers have a home screen that surfaces everything they need, and analytics charts reveal trends across sessions and teams
**Depends on**: Phase 6, Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, ANLT-01, ANLT-02, ANLT-03, ANLT-04, ANLT-05, ANLT-06, ANLT-07, ANLT-08, ANLT-09
**Success Criteria** (what must be TRUE):
  1. Dashboard shows upcoming sessions (next 7 days), overdue action items grouped by report, and quick stats (total reports, sessions this month, average score)
  2. Dashboard shows last 5 completed sessions with scores and a "Start session" button for today's scheduled sessions
  3. Analytics shows line charts of individual scores over time, bar charts of per-category averages, and session-over-session comparison
  4. Team analytics shows aggregated scores across reports (with anonymized option) and a heatmap of team x category scores
  5. Action item velocity chart, meeting adherence chart, and CSV export are available, all powered by pre-computed analytics snapshots
**Plans**: TBD

Plans:
- [ ] 08-01: Dashboard layout (upcoming sessions, overdue items, quick stats, recent sessions)
- [ ] 08-02: Analytics snapshot computation (Inngest background job)
- [ ] 08-03: Individual analytics charts (score trends, category breakdown, session comparison)
- [ ] 08-04: Team analytics (aggregated scores, heatmap, anonymization)
- [ ] 08-05: Action item velocity, meeting adherence, and CSV export

### Phase 9: Email Notifications
**Goal**: The application keeps users engaged between sessions with timely, well-designed email notifications
**Depends on**: Phase 5
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04
**Success Criteria** (what must be TRUE):
  1. Invited users receive a well-formatted invite email with a link to join the organization
  2. Pre-meeting reminder email is sent configurable hours before a session (default 24h)
  3. Post-session summary email is sent to both manager and report with answers, notes, action items, and AI summary
  4. Agenda prep reminder email ("Add your talking points") is sent 48h before meeting
**Plans**: TBD

Plans:
- [ ] 09-01: Email infrastructure (Resend + React Email templates)
- [ ] 09-02: Invite and reminder emails (Inngest scheduled jobs)
- [ ] 09-03: Post-session summary and agenda prep emails

### Phase 10: Integration & Polish
**Goal**: The application feels cohesive and polished with dark mode, consistent design, and verified end-to-end workflows
**Depends on**: Phase 8, Phase 9
**Requirements**: INFR-05
**Success Criteria** (what must be TRUE):
  1. Dark mode works correctly across all screens via Tailwind CSS dark: variants with system preference detection
  2. Complete user workflow functions end-to-end: register org, invite user, create template, create series, run session, view AI summary, check dashboard, receive email
  3. Blue-green local deployment works -- stable test environment on port 4300 runs while developing the next version
**Plans**: TBD

Plans:
- [ ] 10-01: Dark mode implementation and theme consistency
- [ ] 10-02: End-to-end workflow verification and polish

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6/7/9 (parallel) -> 8 -> 10

Note: Phases 6, 7, and 9 all depend only on Phase 5 and can execute in parallel. Phase 8 depends on both 6 and 7.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | 3/3 | Complete | 2026-03-03 |
| 2. Authentication & Organization | 3/3 | Complete | 2026-03-03 |
| 3. User & Team Management | 0/4 | Not started | - |
| 4. Questionnaire Templates | 0/3 | Not started | - |
| 5. Meeting Series & Session Wizard | 0/5 | Not started | - |
| 6. Action Items & Session History | 0/4 | Not started | - |
| 7. AI Pipeline | 0/3 | Not started | - |
| 8. Manager Dashboard & Analytics | 0/5 | Not started | - |
| 9. Email Notifications | 0/3 | Not started | - |
| 10. Integration & Polish | 0/2 | Not started | - |
