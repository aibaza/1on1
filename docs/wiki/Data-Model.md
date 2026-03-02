# Data Model

## Overview

PostgreSQL with multi-tenant isolation via `tenant_id` on every table and Row-Level Security policies. Schema defined using Drizzle ORM.

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

## Tables

### TENANT

Root entity. Each company is a tenant.

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK, default gen_random_uuid() | |
| `name` | `VARCHAR(255)` | NOT NULL | Company display name |
| `slug` | `VARCHAR(100)` | UNIQUE, NOT NULL | URL-safe identifier |
| `plan` | `ENUM('free','starter','pro','enterprise')` | NOT NULL, default 'free' | Subscription tier |
| `settings` | `JSONB` | NOT NULL, default '{}' | Tenant-wide settings |
| `logo_url` | `VARCHAR(500)` | | Company logo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default now() | |

**settings JSONB**: timezone, default_cadence, default_session_duration_minutes, branding (primary_color, logo_url), notifications (pre_meeting_reminder_hours, agenda_prep_reminder_hours).

### USER

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, NOT NULL | |
| `email` | `VARCHAR(255)` | NOT NULL | Unique within tenant |
| `first_name` | `VARCHAR(100)` | NOT NULL | |
| `last_name` | `VARCHAR(100)` | NOT NULL | |
| `role` | `ENUM('admin','manager','member')` | NOT NULL, default 'member' | |
| `job_title` | `VARCHAR(200)` | | |
| `avatar_url` | `VARCHAR(500)` | | |
| `manager_id` | `UUID` | FK → USER, nullable | Direct manager |
| `is_active` | `BOOLEAN` | NOT NULL, default true | Soft-delete |
| `notification_preferences` | `JSONB` | NOT NULL, default '{}' | |
| `invited_at` / `invite_accepted_at` / `last_login_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

**Indexes**: UNIQUE(tenant_id, email), INDEX(tenant_id, manager_id), INDEX(tenant_id, role)

### TEAM / TEAM_MEMBER

**TEAM**: id, tenant_id, name, description, manager_id, timestamps.

**TEAM_MEMBER**: id, team_id, user_id, role (lead/member), joined_at. UNIQUE(team_id, user_id).

### QUESTIONNAIRE_TEMPLATE

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK → TENANT, nullable | NULL = system-global template |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | | |
| `category` | `ENUM('check_in','career','performance','onboarding','custom')` | NOT NULL | |
| `is_default` | `BOOLEAN` | NOT NULL, default false | |
| `is_published` | `BOOLEAN` | NOT NULL, default false | |
| `created_by` | `UUID` | FK → USER, nullable | |
| `version` | `INTEGER` | NOT NULL, default 1 | Incremented on edit |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | | |

System templates (`tenant_id = NULL`) are read-only, available to all tenants as starting points.

### TEMPLATE_QUESTION

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE |
| `question_text` | `TEXT` | Displayed to user |
| `help_text` | `TEXT` | Optional guidance |
| `category` | `ENUM(check_in, wellbeing, engagement, performance, career, feedback, recognition, goals, custom)` | |
| `answer_type` | `ENUM(text, rating_1_5, rating_1_10, yes_no, multiple_choice, mood, scale_custom)` | |
| `answer_config` | `JSONB` | Type-specific configuration |
| `is_required` | `BOOLEAN` | |
| `sort_order` | `INTEGER` | Display order |
| `is_archived` | `BOOLEAN` | Soft-delete for history |
| `conditional_on_question_id` / `conditional_operator` / `conditional_value` | | Conditional logic (v2) |

### MEETING_SERIES

Represents a recurring 1:1 relationship between a manager and a report.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `tenant_id` | `UUID` | FK → TENANT |
| `manager_id` | `UUID` | FK → USER |
| `report_id` | `UUID` | FK → USER |
| `cadence` | `ENUM('weekly','biweekly','monthly','custom')` | |
| `cadence_custom_days` | `INTEGER` | If cadence = 'custom' |
| `default_duration_minutes` | `INTEGER` | Default 30 |
| `default_template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE |
| `preferred_day` / `preferred_time` | | Schedule preference |
| `status` | `ENUM('active','paused','archived')` | |
| `next_session_at` | `TIMESTAMPTZ` | |

UNIQUE(tenant_id, manager_id, report_id)

### SESSION

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `series_id` | `UUID` | FK → MEETING_SERIES |
| `tenant_id` | `UUID` | Denormalized for RLS |
| `template_id` | `UUID` | FK → QUESTIONNAIRE_TEMPLATE |
| `session_number` | `INTEGER` | Sequential within series |
| `scheduled_at` | `TIMESTAMPTZ` | |
| `started_at` / `completed_at` | `TIMESTAMPTZ` | |
| `status` | `ENUM('scheduled','in_progress','completed','cancelled','missed')` | |
| `shared_notes` | `TEXT` | |
| `duration_minutes` | `INTEGER` | Computed |
| `session_score` | `DECIMAL(4,2)` | Average of all numeric answers |

### SESSION_ANSWER

Single table with typed columns: `answer_text` (free text), `answer_numeric` (ratings, yes/no, mood), `answer_json` (multiple choice). The `answer_type` on the linked TEMPLATE_QUESTION determines which column to read.

### PRIVATE_NOTE

Encrypted at rest (AES-256-GCM). UNIQUE(session_id, author_id) — one private note per user per session.

### TALKING_POINT

Agenda items added before or during a session. Can be carried over from previous sessions via `carried_from_session_id`.

### ACTION_ITEM

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | PK |
| `session_id` | `UUID` | Session where created |
| `tenant_id` | `UUID` | For RLS |
| `assignee_id` | `UUID` | Responsible person |
| `created_by_id` | `UUID` | Creator |
| `title` | `VARCHAR(500)` | |
| `description` | `TEXT` | |
| `due_date` | `DATE` | |
| `status` | `ENUM('open','in_progress','completed','cancelled')` | |
| `carried_to_session_id` | `UUID` | If auto-carried |

### NOTIFICATION

Tracks all notifications. Types: pre_meeting, agenda_prep, overdue_action, session_summary, missed_meeting, system. Channels: email, in_app. Status: pending, sent, failed, cancelled.

### ANALYTICS_SNAPSHOT

Pre-computed metrics for dashboard performance.

**Metrics**: avg_session_score, wellbeing_score, engagement_score, performance_score, career_score, meeting_adherence, action_completion_rate, avg_session_duration, sessions_completed.

**Periods**: week, month, quarter, year.

Scoped by: user_id (individual), team_id (team), series_id (per-series), or combination.

## Row-Level Security

Every table with `tenant_id` has RLS policies using `current_setting('app.current_tenant_id')`. Private notes have an additional policy restricting to `author_id = current_setting('app.current_user_id')`.

## Migration Strategy

1. Schema changes in `src/lib/db/schema/*.ts`
2. `drizzle-kit generate` creates SQL migration files
3. `drizzle-kit migrate` applies them
4. Migrations run automatically on deployment via pre-deploy hook
