# Features Roadmap

## MVP (v1) — Core Product

The minimum viable product that delivers the core value proposition: structured 1:1 sessions with quantifiable answers and historical tracking.

### 1. Company Onboarding & Multi-tenancy

- **Company registration**: Name, slug, admin email, password
- **Tenant isolation**: All data scoped by `tenant_id`, enforced by RLS
- **Company settings**: Timezone, default session cadence, default duration
- Admin can configure company-level defaults

### 2. User Management

- **Invite system**: Admin invites users via email → magic link → set password
- **User profiles**: First name, last name, email, job title, profile picture
- **Roles**: Admin (full access), Manager (conducts 1:1s, sees their reports), Member (participates in 1:1s)
- **Org chart**: Each user can have a `manager_id` → establishes reporting lines
- **Deactivation**: Soft-delete users (preserve historical data)

### 3. Team Management

- **CRUD teams**: Create teams with name, description, manager
- **Assign members**: Add/remove users to teams
- **Team roles**: Lead vs member within a team
- One user can belong to multiple teams

### 4. Questionnaire Template Builder

- **Template CRUD**: Create, edit, duplicate, archive templates
- **Question types** (6 types for MVP):
  - **Free text** — open-ended response
  - **Rating 1-5** — with customizable labels (e.g., "Very Poor" to "Excellent")
  - **Rating 1-10** — numeric scale with endpoint labels
  - **Yes/No** — binary choice
  - **Multiple choice** — single or multi-select from defined options
  - **Mood** — 5-point emoji scale (😞 😐 😊 😄 🤩)
- **Question configuration**: Required/optional, help text, display order
- **Categories**: Tag questions with categories (wellbeing, engagement, performance, career, etc.)
- **Template versioning**: Version increments on edit; past sessions keep their answers intact
- **Default template**: Mark one template as default for new meeting series
- **Drag-and-drop reordering** of questions within a template

### 5. Meeting Series

- **Create 1:1 relationships**: Select manager + report → establish a meeting series
- **Cadence configuration**: Weekly, biweekly, monthly, or custom interval
- **Assign default template**: Each series can have a default questionnaire
- **Preferred schedule**: Optional preferred day and time
- **Series lifecycle**: Active → Paused → Archived
- **Auto-generation**: Next session date is computed automatically based on cadence

### 6. Session Wizard (Core Experience)

The main screen where the 1:1 happens. Split into three phases:

**Pre-session:**
- Session appears as "scheduled" on the dashboard
- Both manager and report can add talking points to the agenda
- Manager sees which sessions are coming up and can prepare

**During session (wizard):**
- **Step-by-step flow**: Questions presented one at a time (or in category groups)
- **Progress indicator**: Shows current position in the questionnaire
- **Context panel** (sidebar):
  - Notes from the last 3 sessions (collapsible)
  - Open action items from past sessions
  - Score trends mini-chart (sparkline of last 6 sessions)
- **Answer input**: Appropriate input widget per question type
- **Shared notes**: Rich text editor for notes both parties can see
- **Private notes**: Separate text area visible only to the author (encrypted)
- **Action items**: Create action items inline at any point during the session
- **Talking points**: Check off talking points as they're discussed
- **Navigation**: Next/Previous buttons + direct jump to any step
- **Auto-save**: All answers and notes save automatically (debounced)

**Post-session:**
- **Summary screen**: Recap of all answers, notes, and new action items
- **Session score**: Computed average of all numeric answers
- **Mark complete**: Manager confirms the session is done
- **Email summary**: Automatic summary email sent to both parties (optional)

### 7. Action Items

- **Create**: Title, description (optional), assignee, due date (optional)
- **Status tracking**: Open → In Progress → Completed / Cancelled
- **Visibility**: Action items appear in the context panel during future sessions
- **List view**: Dedicated page showing all open action items across all series
- **Carry-over**: Unfinished items are flagged in the next session's context panel

### 8. Manager Dashboard (Home)

The landing page after login for managers:

- **Upcoming sessions**: Next 7 days, showing report name, date, template, agenda readiness
- **Overdue action items**: Grouped by report, days overdue
- **Quick stats**: Total reports, sessions this month, avg session score
- **Recent sessions**: Last 5 completed sessions with scores
- **Quick actions**: "Start session" button for today's scheduled sessions

### 9. Session History & Search

- **Timeline view**: Chronological list of all sessions in a series
- **Session detail**: Read-only view of completed sessions (answers, notes, action items)
- **Full-text search**: Search across notes and talking points
- **Filters**: By date range, by status, by report

### 10. Basic Analytics

- **Individual score trends**: Line chart showing session scores over time per report
- **Category breakdown**: Per-category average scores (wellbeing, engagement, etc.) as a bar chart
- **Session-over-session comparison**: See how each category score changed from last session
- **Export**: Download session data as CSV

### 11. Email Notifications

- **Invite email**: When a user is invited to the platform
- **Pre-meeting reminder**: Configurable hours before (default: 24h)
- **Agenda prep reminder**: "Add your talking points" (default: 48h before)
- **Session summary**: Post-session email with answers, notes, action items
- **Overdue action item**: Notify when an action item passes its due date

---

## v2 — Enhanced Experience

Features that improve the daily workflow and expand the analytics.

### 12. Calendar Integration
- **Google Calendar** sync (read/write)
- **Outlook/O365** sync
- Auto-create calendar events for scheduled sessions
- Deep link to session wizard from calendar event

### 13. Advanced Analytics Dashboard
- **Team analytics**: Aggregated scores across all reports (anonymized option)
- **Heatmap**: Team × question category matrix with color-coded scores
- **Meeting adherence chart**: % of scheduled sessions completed per month
- **Action item velocity**: Average time from creation to completion
- **Manager effectiveness indicators**: Cadence adherence, avg session duration, score trends across reports
- **Comparison view**: Compare two employees' trends side by side
- **Date range picker**: Filter all analytics by custom date ranges

### 14. Template Library
- **System templates**: Pre-built questionnaires for common scenarios:
  - Weekly check-in
  - Monthly deep-dive
  - Career development discussion
  - New hire onboarding (first 90 days)
  - Performance improvement plan (PIP)
  - Return from leave
- **Clone & customize**: Start from a system template, modify for the company's needs

### 15. Conditional Question Logic
- Show/hide questions based on previous answers
- Example: If "How's your workload?" < 3, show "What can we do to help?"
- Configured per question with operator (eq, neq, lt, gt, lte, gte) and value

### 16. Action Item Carry-Over (Automatic)
- Unfinished action items automatically appear as agenda items in the next session
- Visual indicator showing which items were carried over and from when
- Manager can dismiss or re-prioritize carried-over items

### 17. Slack / Microsoft Teams Integration
- Session reminders as DMs
- Quick action item creation from Slack
- Session summary posted to a channel (optional)

### 18. PDF Export & Reports
- Generate PDF reports for individual employees (covering a date range)
- Include: session summaries, score trends, action item history
- Designed for annual reviews and salary negotiation preparation
- Company-branded with logo and colors

### 19. SSO (Single Sign-On)
- SAML 2.0 support
- OIDC support
- Integration with Okta, Azure AD, Google Workspace
- Enterprise requirement for larger companies

---

## v3 — Differentiation & Scale

Features that create competitive advantage.

### 20. AI-Powered Features
- **Session summaries**: Auto-generate a concise summary from notes and answers
- **Suggested talking points**: Based on previous sessions' answers and trends
- **Sentiment analysis**: Detect sentiment trends in free-text answers over time
- **Anomaly detection**: Alert when a score drops significantly

### 21. eNPS Tracking
- Built-in Employee Net Promoter Score surveys
- Track eNPS per team, per manager, per quarter
- Benchmark against company average

### 22. 360 Feedback Integration
- Collect anonymous peer feedback that surfaces in 1:1 context
- Manager can reference peer feedback during sessions

### 23. Goal / OKR Tracking
- Define goals per employee, track progress across sessions
- Link action items to goals
- Goal achievement visible in analytics

### 24. Public API & Webhooks
- REST API for all core operations
- Webhook events: session.completed, action_item.created, etc.
- Enable custom integrations (HRIS sync, custom dashboards)

### 25. Mobile Application
- iOS and Android (React Native)
- Quick session prep and review on the go
- Push notifications for reminders

### 26. Multi-language Support (i18n)
- UI translations: English, Romanian, German, French, Spanish
- Configurable per tenant and per user

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Company onboarding + multi-tenancy | High | Medium | MVP |
| User management + invites | High | Medium | MVP |
| Team management | Medium | Low | MVP |
| Template builder (6 types) | High | High | MVP |
| Meeting series | High | Medium | MVP |
| Session wizard + context panel | Very High | Very High | MVP |
| Action items | High | Medium | MVP |
| Manager dashboard | High | Medium | MVP |
| Session history + search | Medium | Medium | MVP |
| Basic analytics (line charts) | High | Medium | MVP |
| Email notifications | Medium | Medium | MVP |
| Calendar integration | Medium | Medium | v2 |
| Advanced analytics + heatmap | High | High | v2 |
| Template library (pre-built) | Medium | Low | v2 |
| Conditional question logic | Medium | Medium | v2 |
| Auto carry-over action items | Medium | Low | v2 |
| Slack/Teams integration | Medium | Medium | v2 |
| PDF export | High | Medium | v2 |
| SSO | Medium | Medium | v2 |
| AI features | High | High | v3 |
| eNPS tracking | Medium | Medium | v3 |
| 360 feedback | Medium | High | v3 |
| Goal/OKR tracking | Medium | High | v3 |
| Public API + webhooks | Medium | Medium | v3 |
| Mobile app | Medium | Very High | v3 |
| i18n | Low | Medium | v3 |
