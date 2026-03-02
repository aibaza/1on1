# Features Roadmap

## MVP (v1) — Core Product

The minimum viable product delivers structured 1:1 sessions with quantifiable answers and historical tracking.

### 1. Company Onboarding & Multi-tenancy
- Company registration (name, slug, admin email, password)
- Tenant isolation via `tenant_id` + RLS
- Company settings: timezone, default cadence, default duration
- Admin configures company-level defaults

### 2. User Management
- Invite system: admin invites via email → magic link → set password
- User profiles: first/last name, email, job title, avatar
- Roles: Admin (full access), Manager (conducts 1:1s), Member (participates)
- Org chart: `manager_id` establishes reporting lines
- Deactivation: soft-delete preserving historical data

### 3. Team Management
- CRUD teams: name, description, manager
- Assign/remove members, team roles (lead/member)
- Users can belong to multiple teams

### 4. Questionnaire Template Builder
- Template CRUD: create, edit, duplicate, archive
- 6 question types: free text, rating 1-5, rating 1-10, yes/no, multiple choice, mood
- Question config: required/optional, help text, display order, categories
- Template versioning (version increments, past sessions preserved)
- Default template marking, drag-and-drop reordering

### 5. Meeting Series
- Create 1:1 relationships (manager + report)
- Cadence: weekly, biweekly, monthly, custom
- Default template per series, preferred day/time
- Series lifecycle: active → paused → archived
- Auto-generation of next session date

### 6. Session Wizard (Core Experience)
**Pre-session**: scheduled on dashboard, both parties add talking points

**During session**:
- Step-by-step question flow (grouped by category)
- Progress indicator, context panel (past 3 sessions, open action items, sparkline)
- Answer input widgets per type
- Shared notes (rich text), private notes (encrypted), action item creation inline
- Talking point checklist, navigation (prev/next + direct jump), auto-save

**Post-session**: summary screen, session score, mark complete, email summary

### 7. Action Items
- Create: title, description, assignee, due date
- Status: open → in progress → completed / cancelled
- Visible in context panel, dedicated list view, carry-over flagging

### 8. Manager Dashboard
- Upcoming sessions (next 7 days)
- Overdue action items grouped by report
- Quick stats: total reports, sessions this month, avg score
- Recent sessions, quick start button

### 9. Session History & Search
- Timeline view per series
- Read-only completed session detail
- Full-text search across notes and talking points
- Filters: date range, status, report

### 10. Basic Analytics
- Individual score trend line charts
- Category breakdown bar chart
- Session-over-session comparison
- CSV export

### 11. Email Notifications
- Invite, pre-meeting reminder, agenda prep reminder
- Session summary, overdue action item notification

---

## v2 — Enhanced Experience

| # | Feature | Description |
|---|---------|-------------|
| 12 | Calendar Integration | Google Calendar + Outlook sync, auto-create events |
| 13 | Advanced Analytics | Team heatmap, meeting adherence, action velocity, comparison view |
| 14 | Template Library | Pre-built system templates (weekly check-in, career dev, onboarding, PIP) |
| 15 | Conditional Logic | Show/hide questions based on previous answers |
| 16 | Auto Carry-Over | Unfinished action items auto-appear in next session |
| 17 | Slack/Teams Integration | Reminders as DMs, quick action items, summary posting |
| 18 | PDF Export | Branded reports for annual reviews |
| 19 | SSO | SAML 2.0, OIDC, Okta/Azure AD/Google Workspace |

## v3 — Differentiation & Scale

| # | Feature | Description |
|---|---------|-------------|
| 20 | AI Features | Auto-summaries, suggested talking points, sentiment analysis, anomaly detection |
| 21 | eNPS Tracking | Employee Net Promoter Score per team/manager/quarter |
| 22 | 360 Feedback | Anonymous peer feedback surfaced in 1:1 context |
| 23 | Goal/OKR Tracking | Per-employee goals linked to action items |
| 24 | Public API & Webhooks | REST API, webhook events for integrations |
| 25 | Mobile App | iOS/Android (React Native) |
| 26 | Multi-language (i18n) | English, Romanian, German, French, Spanish |

## Priority Matrix

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
