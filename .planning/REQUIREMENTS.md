# Requirements: 1on1

**Defined:** 2026-03-03
**Core Value:** The AI context layer that makes every meeting smarter than the last

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via time-limited email link
- [x] **AUTH-04**: User session persists across browser refresh (HTTP-only cookies)
- [x] **AUTH-05**: User can sign in with Google OAuth
- [x] **AUTH-06**: User can sign in with Microsoft OAuth
- [x] **AUTH-07**: User can log out from any page

### Organization & Multi-Tenancy

- [ ] **ORG-01**: Admin can register a new organization with name, slug, and admin account
- [x] **ORG-02**: Organization data is fully isolated via tenant_id on all tables
- [x] **ORG-03**: PostgreSQL Row-Level Security enforces tenant isolation at the database level
- [ ] **ORG-04**: Organization admin can configure settings (timezone, default cadence, default duration)
- [ ] **ORG-05**: Organization type supports both for-profit and non-profit models

### User Management

- [x] **USER-01**: Admin can invite users to the organization via email
- [x] **USER-02**: Invited user receives email with magic link to set password and join
- [x] **USER-03**: User can edit their profile (first name, last name, job title, avatar)
- [x] **USER-04**: Admin can assign roles: admin, manager, or member
- [x] **USER-05**: Each user can have a manager_id establishing reporting lines (org chart)
- [x] **USER-06**: Admin can deactivate a user (soft delete preserving historical data)

### Team Management

- [x] **TEAM-01**: Admin or manager can create teams with name, description, and team lead
- [x] **TEAM-02**: Admin or manager can add/remove members to teams
- [x] **TEAM-03**: Teams support lead and member roles
- [x] **TEAM-04**: A user can belong to multiple teams

### Questionnaire Templates

- [x] **TMPL-01**: Admin or manager can create questionnaire templates with a name and description
- [x] **TMPL-02**: Templates support 6 question types: free text, rating 1-5, rating 1-10, yes/no, multiple choice, mood (5-point emoji)
- [x] **TMPL-03**: Each question can be configured as required/optional with help text
- [x] **TMPL-04**: Questions can be tagged with categories (wellbeing, engagement, performance, career, etc.)
- [x] **TMPL-05**: Templates are versioned — edits create new versions; past sessions retain original answers
- [x] **TMPL-06**: Admin can mark one template as the organization default
- [x] **TMPL-07**: User can duplicate an existing template
- [x] **TMPL-08**: User can archive a template (hide from active use, preserve history)
- [x] **TMPL-09**: User can reorder questions within a template via drag-and-drop
- [x] **TMPL-10**: User can configure conditional logic — show/hide questions based on previous answers (operators: eq, neq, lt, gt, lte, gte)

### Meeting Series

- [x] **MEET-01**: Manager can create a 1:1 series by selecting themselves and a report
- [x] **MEET-02**: Series has configurable cadence: weekly, biweekly, monthly, or custom interval
- [x] **MEET-03**: Series can have a default questionnaire template
- [x] **MEET-04**: Series can have a preferred day and time
- [x] **MEET-05**: Next session date is auto-computed based on cadence
- [x] **MEET-06**: Series lifecycle supports Active, Paused, and Archived states

### Session Wizard

- [x] **SESS-01**: Manager can start a session for a scheduled meeting in a series
- [x] **SESS-02**: Session wizard presents questions one at a time (or in category groups) with progress indicator
- [x] **SESS-03**: Context panel (sidebar) shows notes from last 3 sessions (collapsible)
- [x] **SESS-04**: Context panel shows open action items from past sessions
- [x] **SESS-05**: Context panel shows score trend sparklines (last 6 sessions)
- [x] **SESS-06**: Appropriate input widget renders per question type (text area, star rating, slider, toggle, select, emoji picker)
- [x] **SESS-07**: Both manager and report can add talking points to the pre-session agenda
- [x] **SESS-08**: Shared notes area with rich text editor visible to both parties
- [x] **SESS-09**: Private notes area visible only to the author, encrypted at rest (AES-256-GCM)
- [x] **SESS-10**: User can create action items inline at any point during the session
- [x] **SESS-11**: All answers and notes auto-save with debounce (500ms)
- [x] **SESS-12**: Navigation supports next/previous and direct jump to any step
- [x] **SESS-13**: Post-session summary screen shows recap of all answers, notes, and new action items
- [x] **SESS-14**: Session score is computed as average of all numeric answers
- [x] **SESS-15**: Manager confirms session completion from the summary screen

### Action Items

- [x] **ACTN-01**: User can create action items with title, description, assignee, and optional due date
- [x] **ACTN-02**: Action items track status: Open → In Progress → Completed / Cancelled
- [x] **ACTN-03**: Unfinished action items automatically carry over and appear flagged in the next session's context panel
- [x] **ACTN-04**: Dedicated list view shows all open action items across all series
- [x] **ACTN-05**: Action items are visible in the session wizard context panel during future sessions

### Session History

- [x] **HIST-01**: User can view a chronological timeline of all sessions in a series
- [x] **HIST-02**: User can open a read-only detail view of any completed session (answers, notes, action items)
- [x] **HIST-03**: User can search across session notes and talking points (full-text search)
- [x] **HIST-04**: User can filter sessions by date range and status

### Manager Dashboard

- [x] **DASH-01**: Dashboard shows upcoming sessions for the next 7 days (report name, date, template, agenda readiness)
- [x] **DASH-02**: Dashboard shows overdue action items grouped by report with days overdue
- [x] **DASH-03**: Dashboard shows quick stats: total reports, sessions this month, average session score
- [x] **DASH-04**: Dashboard shows last 5 completed sessions with scores
- [x] **DASH-05**: "Start session" quick action button for today's scheduled sessions

### AI Features

- [x] **AI-01**: After session completion, AI generates a concise narrative summary from structured answers and notes
- [x] **AI-02**: AI summary is stored and viewable in session history and post-session email
- [x] **AI-03**: Before a session, AI generates 2-3 specific follow-up suggestions based on previous session answers ("Last time Alex mentioned burnout — follow up?")
- [x] **AI-04**: Pre-session nudges appear on the dashboard and in the pre-session state
- [x] **AI-05**: After session completion, AI suggests 1-3 action items based on session answers and discussion
- [ ] **AI-06**: Embedding infrastructure (pgvector) stores session embeddings for context retrieval and profile building
- [x] **AI-07**: AI features use Vercel AI SDK v6 with provider-agnostic model routing (cost-optimized per task)
- [x] **AI-08**: AI pipelines run as durable Inngest background functions with automatic retry

### Analytics

- [x] **ANLT-01**: Line chart showing individual session scores over time per report
- [x] **ANLT-02**: Bar chart showing per-category average scores (wellbeing, engagement, performance, career)
- [x] **ANLT-03**: Session-over-session comparison showing how each category score changed
- [x] **ANLT-04**: Team analytics with aggregated scores across all reports (anonymized option)
- [x] **ANLT-05**: Heatmap displaying team × question category matrix with color-coded scores
- [x] **ANLT-06**: Action item velocity chart (average time from creation to completion)
- [x] **ANLT-07**: Meeting adherence chart (% of scheduled sessions completed per month)
- [x] **ANLT-08**: Analytics powered by pre-computed ANALYTICS_SNAPSHOT table (Inngest background job)
- [x] **ANLT-09**: User can export session data as CSV

### Email Notifications

- [ ] **NOTF-01**: Invite email sent when admin invites a user to the organization
- [ ] **NOTF-02**: Pre-meeting reminder email sent configurable hours before session (default: 24h)
- [ ] **NOTF-03**: Post-session summary email sent to both parties with answers, notes, action items, and AI summary
- [ ] **NOTF-04**: Agenda prep reminder email ("Add your talking points") sent 48h before meeting

### Infrastructure

- [x] **INFR-01**: Application runs in Docker Compose locally on port 4300, accessible on local network
- [x] **INFR-02**: Blue-green style local deployment — stable test environment always running while developing next version
- [x] **INFR-03**: Application is deployable to Vercel (serverless functions, edge runtime)
- [x] **INFR-04**: Bun is the package manager for all dependency management
- [ ] **INFR-05**: Dark mode support via Tailwind CSS dark: variants

### Security

- [x] **SEC-01**: Private notes encrypted at rest with AES-256-GCM, per-tenant keys derived via HKDF
- [x] **SEC-02**: Encryption key versioning for rotation support
- [x] **SEC-03**: RBAC enforced at API route level — members see only their sessions, managers see their reports, admins see organization-wide
- [x] **SEC-04**: Resource-level authorization checks beyond role (verify user is manager/report on specific series)
- [x] **SEC-05**: Tenant ID always derived from authenticated session, never from request parameters
- [x] **SEC-06**: Audit log records significant events (invites, deactivations, data exports, settings changes)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Calendar Integration

- **CAL-01**: Google Calendar read-only sync (display upcoming 1:1s, deep link to wizard)
- **CAL-02**: Google Calendar read/write (auto-create calendar events for scheduled sessions)
- **CAL-03**: Outlook/O365 calendar sync

### Advanced AI

- **AI-V2-01**: Live AI suggestions during active sessions (streaming, low latency)
- **AI-V2-02**: AI personal profiles built from accumulated session data
- **AI-V2-03**: AI-generated growth narratives ("Over Q1, Alex improved communication by 23%...")
- **AI-V2-04**: AI anomaly detection with proactive alerts ("Maria's wellbeing dropped 40% in 2 sessions")

### Additional Features

- **MISC-01**: Magic link passwordless login
- **MISC-02**: Overdue action item email notifications
- **MISC-03**: Slack/Teams integration (reminders, nudges, quick action item updates)
- **MISC-04**: PDF export with organization branding for performance reviews
- **MISC-05**: SSO (SAML 2.0, OIDC) for enterprise organizations
- **MISC-06**: System template library (pre-built questionnaires for common scenarios)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time video/audio | Competing with Zoom/Teams is suicidal. Run wizard alongside video call. |
| AI meeting transcription | Structured questionnaire approach IS the alternative. Transcripts produce noisy data. |
| Full HRIS integration | HRIS integrations are a swamp. CSV import for bulk users suffices. |
| Anonymous peer feedback / 360 | Poisons the 1:1 trust relationship. Separate product category. |
| OKR / goal tracking | Separate product category. Reference goals as free text in notes. |
| Gamification (badges, leaderboards) | Trivializes professional conversations. Use subtle progress indicators instead. |
| Slack bot replacing session wizard | Chat answers produce lower-quality responses than the focused wizard UX. |
| Manager scoring / ranking | Creates perverse incentives. Show managers their own trends privately. |
| Mobile native app | Web responsive is sufficient for v1. Native if mobile demand is proven. |
| Multi-language (i18n) | English-only until international expansion. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| ORG-01 | Phase 2 | Pending |
| ORG-02 | Phase 1 | Complete |
| ORG-03 | Phase 1 | Complete |
| ORG-04 | Phase 2 | Pending |
| ORG-05 | Phase 2 | Pending |
| USER-01 | Phase 3 | Complete |
| USER-02 | Phase 3 | Complete |
| USER-03 | Phase 3 | Complete |
| USER-04 | Phase 3 | Complete |
| USER-05 | Phase 3 | Complete |
| USER-06 | Phase 3 | Complete |
| TEAM-01 | Phase 3 | Complete |
| TEAM-02 | Phase 3 | Complete |
| TEAM-03 | Phase 3 | Complete |
| TEAM-04 | Phase 3 | Complete |
| TMPL-01 | Phase 4 | Complete |
| TMPL-02 | Phase 4 | Complete |
| TMPL-03 | Phase 4 | Complete |
| TMPL-04 | Phase 4 | Complete |
| TMPL-05 | Phase 4 | Complete |
| TMPL-06 | Phase 4 | Complete |
| TMPL-07 | Phase 4 | Complete |
| TMPL-08 | Phase 4 | Complete |
| TMPL-09 | Phase 4 | Complete |
| TMPL-10 | Phase 4 | Complete |
| MEET-01 | Phase 5 | Complete |
| MEET-02 | Phase 5 | Complete |
| MEET-03 | Phase 5 | Complete |
| MEET-04 | Phase 5 | Complete |
| MEET-05 | Phase 5 | Complete |
| MEET-06 | Phase 5 | Complete |
| SESS-01 | Phase 5 | Complete |
| SESS-02 | Phase 5 | Complete |
| SESS-03 | Phase 5 | Complete |
| SESS-04 | Phase 5 | Complete |
| SESS-05 | Phase 5 | Complete |
| SESS-06 | Phase 5 | Complete |
| SESS-07 | Phase 5 | Complete |
| SESS-08 | Phase 5 | Complete |
| SESS-09 | Phase 5 | Complete |
| SESS-10 | Phase 5 | Complete |
| SESS-11 | Phase 5 | Complete |
| SESS-12 | Phase 5 | Complete |
| SESS-13 | Phase 5 | Complete |
| SESS-14 | Phase 5 | Complete |
| SESS-15 | Phase 5 | Complete |
| ACTN-01 | Phase 6 | Complete |
| ACTN-02 | Phase 6 | Complete |
| ACTN-03 | Phase 6 | Complete |
| ACTN-04 | Phase 6 | Complete |
| ACTN-05 | Phase 6 | Complete |
| HIST-01 | Phase 6 | Complete |
| HIST-02 | Phase 6 | Complete |
| HIST-03 | Phase 6 | Complete |
| HIST-04 | Phase 6 | Complete |
| DASH-01 | Phase 8 | Complete |
| DASH-02 | Phase 8 | Complete |
| DASH-03 | Phase 8 | Complete |
| DASH-04 | Phase 8 | Complete |
| DASH-05 | Phase 8 | Complete |
| AI-01 | Phase 7 | Complete |
| AI-02 | Phase 7 | Complete |
| AI-03 | Phase 7 | Complete |
| AI-04 | Phase 7 | Complete |
| AI-05 | Phase 7 | Complete |
| AI-06 | Phase 7 | Pending |
| AI-07 | Phase 7 | Complete |
| AI-08 | Phase 7 | Complete |
| ANLT-01 | Phase 8 | Complete |
| ANLT-02 | Phase 8 | Complete |
| ANLT-03 | Phase 8 | Complete |
| ANLT-04 | Phase 8 | Complete |
| ANLT-05 | Phase 8 | Complete |
| ANLT-06 | Phase 8 | Complete |
| ANLT-07 | Phase 8 | Complete |
| ANLT-08 | Phase 8 | Complete |
| ANLT-09 | Phase 8 | Complete |
| NOTF-01 | Phase 9 | Pending |
| NOTF-02 | Phase 9 | Pending |
| NOTF-03 | Phase 9 | Pending |
| NOTF-04 | Phase 9 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-05 | Phase 10 | Pending |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 3 | Complete |
| SEC-04 | Phase 3 | Complete |
| SEC-05 | Phase 1 | Complete |
| SEC-06 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 99 total
- Mapped to phases: 99
- Unmapped: 0

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after roadmap creation*
