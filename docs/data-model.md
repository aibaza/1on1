# Data Model

## Overview

The database is PostgreSQL with multi-tenant isolation via `tenant_id` on every table and Row-Level Security policies. The schema uses Drizzle ORM for type-safe definitions.

## Entity Relationship Diagram

```
TENANT ─────────────────────────────────────────────────────────────┐
  │                                                                  │
  ├── USER ◄──────── manager_id (self-referential)                  │
  │     │                                                            │
  │     ├── TEAM_MEMBER ──► TEAM                                    │
  │     │                                                            │
  │     ├── MEETING_SERIES (as manager)                              │
  │     │     │    └── report_id ──► USER (as report)               │
  │     │     │                                                      │
  │     │     └── SESSION                                            │
  │     │           ├── SESSION_ANSWER ──► TEMPLATE_QUESTION         │
  │     │           ├── PRIVATE_NOTE                                 │
  │     │           ├── TALKING_POINT                                │
  │     │           └── ACTION_ITEM                                  │
  │     │                                                            │
  │     └── NOTIFICATION                                             │
  │                                                                  │
  ├── QUESTIONNAIRE_TEMPLATE                                         │
  │     └── TEMPLATE_QUESTION                                        │
  │                                                                  │
  └── ANALYTICS_SNAPSHOT                                             │
       (pre-computed metrics per user/team/period)                   │
─────────────────────────────────────────────────────────────────────┘
```

## Table Definitions

### TENANT

The root entity. Each company is a tenant.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK, default gen_random_uuid() | |
| `name` | `VARCHAR(255)` | NOT NULL | Company display name |
| `slug` | `VARCHAR(100)` | UNIQUE, NOT NULL | URL-safe identifier (e.g., "acme-corp") |
| `plan` | `ENUM('free','starter','pro','enterprise')` | NOT NULL, default 'free' | Subscription tier |
| `settings` | `JSONB` | NOT NULL, default '{}' | Tenant-wide settings (see below) |
| `logo_url` | `VARCHAR(500)` | | Company logo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**settings JSONB structure:**
```json
{
  "timezone": "Europe/Bucharest",
  "default_cadence": "biweekly",
  "default_session_duration_minutes": 30,
  "branding": {
    "primary_color": "#4F46E5",
    "logo_url": "..."
  },
  "notifications": {
    "pre_meeting_reminder_hours": 24,
    "agenda_prep_reminder_hours": 48
  }
}
```

---

### USER

People within a tenant. Can be admins, managers, or regular members.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `email` | `VARCHAR(255)` | NOT NULL | Unique within tenant |
| `first_name` | `VARCHAR(100)` | NOT NULL | |
| `last_name` | `VARCHAR(100)` | NOT NULL | |
| `role` | `ENUM('admin','manager','member')` | NOT NULL, default 'member' | App-level role |
| `job_title` | `VARCHAR(200)` | | e.g., "Senior Developer", "QA Lead" |
| `avatar_url` | `VARCHAR(500)` | | Profile picture URL |
| `manager_id` | `UUID` | FK → USER, nullable | Direct manager (org chart) |
| `is_active` | `BOOLEAN` | NOT NULL, default true | Soft-delete / deactivation |
| `notification_preferences` | `JSONB` | NOT NULL, default '{}' | Per-user notification settings |
| `invited_at` | `TIMESTAMPTZ` | | When the invite was sent |
| `invite_accepted_at` | `TIMESTAMPTZ` | | When the user accepted |
| `last_login_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `UNIQUE(tenant_id, email)`
- `INDEX(tenant_id, manager_id)` — for org chart queries
- `INDEX(tenant_id, role)` — for filtering by role

**notification_preferences JSONB:**
```json
{
  "email_reminders": true,
  "in_app_notifications": true,
  "reminder_before_hours": 1,
  "weekly_digest": false
}
```

---

### TEAM

Organizational grouping of users.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `name` | `VARCHAR(200)` | NOT NULL | |
| `description` | `TEXT` | | |
| `manager_id` | `UUID` | FK → USER, nullable | Team lead/manager |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

---

### TEAM_MEMBER

Junction table between TEAM and USER.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `team_id` | `UUID` | FK → TEAM, NOT NULL | |
| `user_id` | `UUID` | FK → USER, NOT NULL | |
| `role` | `ENUM('lead','member')` | NOT NULL, default 'member' | Role within the team |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `UNIQUE(team_id, user_id)`

---

### QUESTIONNAIRE_TEMPLATE

A reusable set of questions that can be applied to sessions.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, nullable | NULL = system-global template |
| `name` | `VARCHAR(255)` | NOT NULL | e.g., "Weekly Check-in", "Career Development" |
| `description` | `TEXT` | | |
| `category` | `ENUM('check_in','career','performance','onboarding','custom')` | NOT NULL, default 'custom' | Template category |
| `is_default` | `BOOLEAN` | NOT NULL, default false | Default template for new series |
| `is_published` | `BOOLEAN` | NOT NULL, default false | Visible to managers for selection |
| `created_by` | `UUID` | FK → USER, nullable | NULL for system templates |
| `version` | `INTEGER` | NOT NULL, default 1 | Incremented on edit |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Notes:**
- When a template is edited after being used in sessions, the `version` increments. Past sessions retain their `template_id` and answers are still valid because `TEMPLATE_QUESTION` rows are never deleted — only soft-archived.
- System templates (`tenant_id = NULL`) are read-only and available to all tenants as starting points. Tenants can clone them.

---

### TEMPLATE_QUESTION

Individual questions within a template.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE, NOT NULL | |
| `question_text` | `TEXT` | NOT NULL | The question displayed to the user |
| `help_text` | `TEXT` | | Optional guidance text shown below the question |
| `category` | `ENUM(...)` | NOT NULL, default 'custom' | See categories below |
| `answer_type` | `ENUM(...)` | NOT NULL | See answer types below |
| `answer_config` | `JSONB` | NOT NULL, default '{}' | Type-specific configuration |
| `is_required` | `BOOLEAN` | NOT NULL, default false | Must be answered to proceed |
| `sort_order` | `INTEGER` | NOT NULL | Display order within template |
| `is_archived` | `BOOLEAN` | NOT NULL, default false | Soft-delete (preserve for history) |
| `conditional_on_question_id` | `UUID` | FK → TEMPLATE_QUESTION, nullable | Show only if condition met |
| `conditional_operator` | `ENUM('eq','neq','lt','gt','lte','gte')` | nullable | |
| `conditional_value` | `VARCHAR(255)` | nullable | Value to compare against |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Question categories:**
- `check_in` — Opening/icebreaker
- `wellbeing` — Work-life balance, stress, energy
- `engagement` — Motivation, satisfaction
- `performance` — Blockers, productivity, output
- `career` — Growth, learning, aspirations
- `feedback` — Giving/receiving feedback
- `recognition` — Acknowledgment, praise
- `goals` — Goal tracking, OKRs
- `custom` — Anything else

**Answer types and their `answer_config`:**

| answer_type | answer_config example | Stored in |
|-------------|----------------------|-----------|
| `text` | `{}` | `answer_text` |
| `rating_1_5` | `{"labels": ["Very Poor","Poor","OK","Good","Excellent"]}` | `answer_numeric` |
| `rating_1_10` | `{"labels": {"1":"Not at all","10":"Absolutely"}}` | `answer_numeric` |
| `yes_no` | `{}` | `answer_numeric` (1/0) |
| `multiple_choice` | `{"options": ["Option A","Option B","Option C"], "allow_multiple": false}` | `answer_json` |
| `mood` | `{"scale": ["😞","😐","😊","😄","🤩"]}` | `answer_numeric` (1-5) |
| `scale_custom` | `{"min": 0, "max": 100, "step": 10, "unit": "%", "min_label": "Not at all", "max_label": "Completely"}` | `answer_numeric` |

---

### MEETING_SERIES

Represents the recurring 1:1 relationship between a manager and a report.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `manager_id` | `UUID` | FK → USER, NOT NULL | The person conducting the 1:1 |
| `report_id` | `UUID` | FK → USER, NOT NULL | The direct report |
| `cadence` | `ENUM('weekly','biweekly','monthly','custom')` | NOT NULL, default 'biweekly' | |
| `cadence_custom_days` | `INTEGER` | nullable | Days between sessions if cadence = 'custom' |
| `default_duration_minutes` | `INTEGER` | NOT NULL, default 30 | |
| `default_template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE, nullable | Template auto-applied to new sessions |
| `preferred_day` | `ENUM('mon','tue','wed','thu','fri')` | nullable | Preferred day of week |
| `preferred_time` | `TIME` | nullable | Preferred time |
| `status` | `ENUM('active','paused','archived')` | NOT NULL, default 'active' | |
| `next_session_at` | `TIMESTAMPTZ` | nullable | When the next session is scheduled |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `UNIQUE(tenant_id, manager_id, report_id)` — one active series per pair
- `INDEX(tenant_id, status)`
- `INDEX(next_session_at)` — for scheduler queries

---

### SESSION

A single 1:1 meeting instance.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `series_id` | `UUID` | FK → MEETING_SERIES, NOT NULL | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | Denormalized for RLS |
| `template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE, nullable | Which questionnaire was used |
| `session_number` | `INTEGER` | NOT NULL | Sequential within the series (1, 2, 3...) |
| `scheduled_at` | `TIMESTAMPTZ` | NOT NULL | When the session was planned |
| `started_at` | `TIMESTAMPTZ` | nullable | When the wizard was actually started |
| `completed_at` | `TIMESTAMPTZ` | nullable | When the session was marked complete |
| `status` | `ENUM('scheduled','in_progress','completed','cancelled','missed')` | NOT NULL, default 'scheduled' | |
| `shared_notes` | `TEXT` | | Rich text notes visible to both parties |
| `duration_minutes` | `INTEGER` | nullable | Actual duration (computed from started_at/completed_at) |
| `session_score` | `DECIMAL(4,2)` | nullable | Computed average of all numeric answers |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `INDEX(series_id, scheduled_at DESC)` — for history queries
- `INDEX(tenant_id, status, scheduled_at)` — for dashboard queries
- `INDEX(tenant_id, scheduled_at)` — for upcoming sessions

---

### SESSION_ANSWER

Stores responses to questionnaire questions within a session.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `session_id` | `UUID` | FK → SESSION, NOT NULL | |
| `question_id` | `UUID` | FK → TEMPLATE_QUESTION, NOT NULL | |
| `respondent_id` | `UUID` | FK → USER, NOT NULL | Who answered |
| `answer_text` | `TEXT` | nullable | Used for `text` answer_type |
| `answer_numeric` | `DECIMAL(6,2)` | nullable | Used for `rating_1_5`, `rating_1_10`, `yes_no`, `mood`, `scale_custom` |
| `answer_json` | `JSONB` | nullable | Used for `multiple_choice` and complex types |
| `skipped` | `BOOLEAN` | NOT NULL, default false | Explicitly skipped by respondent |
| `answered_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Design rationale — single table with typed columns:**
- `answer_numeric` enables direct SQL aggregation (`AVG()`, `MIN()`, `MAX()`) for trend charts
- `answer_text` handles free-form responses
- `answer_json` provides flexibility for multi-select and future complex types
- The `answer_type` on the linked `TEMPLATE_QUESTION` determines which column to read
- This avoids JOINs across type-specific tables that would slow analytics queries

**Indexes:**
- `INDEX(session_id, question_id)` — for loading a session's answers
- `INDEX(question_id, respondent_id, answered_at)` — for individual trend queries
- `INDEX(session_id)` — for computing session_score

---

### PRIVATE_NOTE

Notes visible only to the author (typically the manager). Encrypted at rest.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `session_id` | `UUID` | FK → SESSION, NOT NULL | |
| `author_id` | `UUID` | FK → USER, NOT NULL | Only this user can read/edit |
| `content` | `TEXT` | NOT NULL | Encrypted at rest |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `UNIQUE(session_id, author_id)` — one private note per user per session

---

### TALKING_POINT

Agenda items that either party can add before or during a session.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `session_id` | `UUID` | FK → SESSION, NOT NULL | |
| `author_id` | `UUID` | FK → USER, NOT NULL | Who added it |
| `content` | `TEXT` | NOT NULL | The talking point text |
| `sort_order` | `INTEGER` | NOT NULL | Display order |
| `is_discussed` | `BOOLEAN` | NOT NULL, default false | Checked off during session |
| `discussed_at` | `TIMESTAMPTZ` | nullable | When it was marked discussed |
| `carried_from_session_id` | `UUID` | FK → SESSION, nullable | If carried over from a previous session |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

---

### ACTION_ITEM

Tasks created during sessions, assignable to either party.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `session_id` | `UUID` | FK → SESSION, NOT NULL | Session where created |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | Denormalized for RLS |
| `assignee_id` | `UUID` | FK → USER, NOT NULL | Responsible person |
| `created_by_id` | `UUID` | FK → USER, NOT NULL | Who created it |
| `title` | `VARCHAR(500)` | NOT NULL | |
| `description` | `TEXT` | | Additional details |
| `due_date` | `DATE` | nullable | |
| `status` | `ENUM('open','in_progress','completed','cancelled')` | NOT NULL, default 'open' | |
| `completed_at` | `TIMESTAMPTZ` | nullable | |
| `carried_to_session_id` | `UUID` | FK → SESSION, nullable | If auto-carried to next session |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `INDEX(tenant_id, assignee_id, status)` — for "my open action items"
- `INDEX(session_id)` — for loading session's action items
- `INDEX(tenant_id, status, due_date)` — for overdue queries

---

### NOTIFICATION

Tracks all notifications sent or scheduled.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `user_id` | `UUID` | FK → USER, NOT NULL | Recipient |
| `type` | `ENUM('pre_meeting','agenda_prep','overdue_action','session_summary','missed_meeting','system')` | NOT NULL | |
| `channel` | `ENUM('email','in_app')` | NOT NULL | |
| `subject` | `VARCHAR(500)` | | Email subject or notification title |
| `body` | `TEXT` | | Content |
| `reference_type` | `VARCHAR(50)` | nullable | Polymorphic: 'session', 'action_item', 'series' |
| `reference_id` | `UUID` | nullable | ID of the referenced entity |
| `scheduled_for` | `TIMESTAMPTZ` | NOT NULL | When to send |
| `sent_at` | `TIMESTAMPTZ` | nullable | When actually sent (NULL = pending) |
| `status` | `ENUM('pending','sent','failed','cancelled')` | NOT NULL, default 'pending' | |
| `error` | `TEXT` | nullable | Error message if failed |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Indexes:**
- `INDEX(status, scheduled_for)` — for the job queue to pick up pending notifications
- `INDEX(tenant_id, user_id, type)` — for user notification history

---

### ANALYTICS_SNAPSHOT

Pre-computed metrics for fast dashboard rendering.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `user_id` | `UUID` | FK → USER, nullable | Per-user metric (NULL for team/company) |
| `team_id` | `UUID` | FK → TEAM, nullable | Per-team metric (NULL for individual/company) |
| `series_id` | `UUID` | FK → MEETING_SERIES, nullable | Per-series metric |
| `period_type` | `ENUM('week','month','quarter','year')` | NOT NULL | |
| `period_start` | `DATE` | NOT NULL | Start of the period |
| `period_end` | `DATE` | NOT NULL | End of the period |
| `metric_name` | `VARCHAR(100)` | NOT NULL | See metrics below |
| `metric_value` | `DECIMAL(8,3)` | NOT NULL | |
| `sample_count` | `INTEGER` | NOT NULL, default 0 | Number of data points in this aggregate |
| `computed_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**Available metrics:**
- `avg_session_score` — Average of all session_score values in the period
- `wellbeing_score` — Average of answers in the 'wellbeing' category
- `engagement_score` — Average of answers in the 'engagement' category
- `performance_score` — Average of answers in the 'performance' category
- `career_score` — Average of answers in the 'career' category
- `meeting_adherence` — % of scheduled sessions that were completed (not missed/cancelled)
- `action_completion_rate` — % of action items completed within their due date
- `avg_session_duration` — Average duration in minutes
- `sessions_completed` — Count of completed sessions

**Indexes:**
- `INDEX(tenant_id, user_id, metric_name, period_start)` — individual trends
- `INDEX(tenant_id, team_id, metric_name, period_start)` — team trends
- `UNIQUE(tenant_id, user_id, team_id, series_id, period_type, period_start, metric_name)` — prevent duplicate snapshots

---

## Row-Level Security (RLS)

Every table with `tenant_id` has RLS policies:

```sql
-- Example for SESSION table
ALTER TABLE session ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_tenant_isolation ON session
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

The application sets `app.current_tenant_id` on every database connection based on the authenticated user's tenant.

**Private notes have an additional policy:**
```sql
CREATE POLICY private_note_author_only ON private_note
  USING (author_id = current_setting('app.current_user_id')::uuid);
```

## Migration Strategy

Using Drizzle Kit for migrations:
1. Schema changes are made in `src/lib/db/schema/*.ts`
2. `drizzle-kit generate` creates SQL migration files
3. `drizzle-kit migrate` applies them to the database
4. Migrations run automatically on deployment via a pre-deploy hook
