# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- CSV export API endpoint (`GET /api/analytics/export`) supporting full, score-trend, categories, velocity, and adherence export types with RBAC
- CSV generation utilities (`generateCSV`, `escapeCsvField`, `sessionDataToRows`) with RFC 4180 escaping
- CsvExportButton component with icon and full variants, browser download trigger, and toast notifications
- Per-chart CSV export buttons on individual analytics page (score trend, categories, velocity, adherence)
- "Export All Data" button on individual analytics page header
- Velocity and adherence charts integrated into individual analytics page with initial server-side data
- Team analytics page with aggregated category scores and SVG dot matrix heatmap (size=sample count, color=score)
- Team analytics API route (`GET /api/analytics/team/[id]`) with RBAC (members blocked, managers need team lead role)
- TeamOverview component showing category score cards with green/amber/red bar visualization and limited-data footnotes
- TeamHeatmap SVG component: dot matrix with size+color encoding, hollow circles for insufficient data (<3 samples), hover tooltips
- Anonymization toggle on team analytics: replaces names with "Member N" in heatmap
- Teams section on analytics overview page linking to team-level analytics
- Action item velocity area chart showing average days from creation to completion per month with 7-day target reference line
- Meeting adherence stacked bar chart showing completed/cancelled/missed sessions per month with adherence percentage
- Velocity and adherence query functions with role-based filtering (admin org-wide, manager their reports, member own data)
- Period selector component with 30d/3mo/6mo/1yr presets and custom date range picker
- Analytics overview page listing reports with latest scores and session counts (RBAC: members auto-redirect to own analytics)
- Analytics nav item in sidebar (BarChart3 icon, visible to all roles)
- Score trend line chart (Recharts) with date-formatted X axis, 1-5 Y domain, custom tooltips
- Category breakdown horizontal bar chart with HSL color rotation and limited-data visual treatment
- Session comparison delta table with dual session selectors and green/red/gray delta indicators
- Individual analytics API route (`GET /api/analytics/individual/[id]`) with RBAC enforcement and period/comparison params
- Individual analytics page (Server Component + Client wrapper) with TanStack Query for period changes
- Dashboard query layer (`src/lib/queries/dashboard.ts`): getUpcomingSessions, getOverdueActionItems, getQuickStats, getRecentSessions with role-based filtering
- Dashboard overview rebuild: upcoming sessions with inline AI nudges, quick stats cards, overdue items grouped by report, recent sessions with score badges
- Start Session button on today's sessions with Resume for in-progress sessions
- Upcoming sessions cards integrate AI nudges inline with expandable "+N more" pattern
- Analytics snapshot compute engine (`computeSessionSnapshot`): per-category averages with rating normalization, delete-then-insert for NULL-safe unique index handling
- Analytics query layer (`src/lib/analytics/queries.ts`): getScoreTrend, getCategoryAverages, getSessionComparison, getTeamAverages, getTeamHeatmapData with snapshot-first and live fallback
- Inngest analytics snapshot function (`computeAnalyticsSnapshot`): triggered by session/completed event with 3 retries
- Inngest analytics sweep cron (`analyticsSnapshotSweep`): daily 3 AM safety net for un-ingested completed sessions
- Analytics ingestion tracking: `analytics_ingested_at` column on session table with migration
- Analytics metric name constants (`METRIC_NAMES`): session_score, per-category scores, operational metrics
- Pre-session nudge cron pipeline (`preSessionNudgeRefresh`): runs every 6 hours, finds series with sessions in next 24h, fires refresh events
- Individual nudge refresh handler (`nudgeRefreshHandler`): gathers context from last completed session, generates fresh nudges, replaces non-dismissed ones
- Nudge API endpoint (`GET /api/nudges`): returns upcoming non-dismissed nudges with report names, sorted by priority
- Nudge dismiss endpoint (`POST /api/nudges/[id]/dismiss`): marks a nudge as permanently dismissed (manager-only)
- Dashboard nudge cards: overview page shows AI nudge cards grouped by report for upcoming sessions (managers only)
- Wizard context panel nudge section: NudgeList rendered as first section in context panel for managers
- NudgeCard component: minimalistic card with coaching suggestion, dismiss button, priority indicator, report name and relative time
- Post-session AI pipeline (`postSessionPipeline`): 9-step Inngest function generating summary, manager addendum, action suggestions, and base nudges after session completion
- AI retry handler (`aiRetryHandler`): re-runs the full AI pipeline for sessions with failed AI generation
- AI retry API endpoint (`POST /api/sessions/[id]/ai-retry`): allows managers to re-trigger failed AI pipelines
- Session completion endpoint fires `session/completed` Inngest event as fire-and-forget (never blocks session completion)
- AI status transitions: `pending` (on completion) -> `generating` (pipeline starts) -> `completed`/`failed`
- AI summary polling API (`GET /api/sessions/[id]/ai-summary`): returns AI summary status/content, manager addendum only for the series manager
- AI suggestions API (`GET/POST /api/sessions/[id]/ai-suggestions`): polling for suggestions + accept/skip actions that create real action items
- AI summary section component: renders structured summary (key takeaways, discussion highlights, follow-up items, sentiment badge) with skeleton loading and retry
- AI suggestions section component: renders suggestion cards with Accept/Edit+Accept/Skip controls, inline edit form with assignee dropdown
- Manager addendum section on session summary: sentiment analysis, patterns, coaching suggestions, follow-up priority (manager-only, behind lock badge)

### Changed
- Dashboard overview page rebuilt: replaced stub Account card and separate NudgeCardsGrid with full 4-section manager briefing layout
- Session summary page passes AI columns and participant info to summary view component
- Session summary view replaces AI placeholder with live AI summary and suggestions sections
- Session completion endpoint now sets `aiStatus: "pending"` when completing a session

### Added
- AI SDK v6 (`ai@6.0.111`) and Anthropic provider (`@ai-sdk/anthropic@3.0.54`) for structured AI generation
- Inngest (`inngest@3.52.6`) for durable background job pipelines with typed event schemas
- Inngest serve route at `/api/inngest` with typed client exporting `session/completed`, `session/nudges.refresh`, `session/ai.retry` events
- AI status enum (`pending`, `generating`, `completed`, `failed`) for tracking AI pipeline progress
- Session table AI columns: `ai_summary`, `ai_manager_addendum`, `ai_suggestions` (JSONB), `ai_status`, `ai_completed_at`
- `ai_nudge` table with tenant isolation RLS policy, indexes on `(series_id, target_session_at)` and `(tenant_id, is_dismissed)`
- Zod schemas for AI structured output: `summarySchema`, `managerAddendumSchema`, `nudgesSchema`, `actionSuggestionsSchema`
- AI model configuration (`src/lib/ai/models.ts`) mapping tasks to Claude model tiers (Sonnet for summaries/addendum/suggestions, Haiku for nudges)
- AI context builder (`src/lib/ai/context.ts`) assembling session data with token-budget truncation for AI prompts
- AI prompt templates for summary, nudges, and action item suggestion generation
- AI service layer (`src/lib/ai/service.ts`) with `generateSummary`, `generateManagerAddendum`, `generateNudges`, `generateActionSuggestions` using AI SDK v6 `generateText` + `Output.object` pattern
- `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` placeholders in `.env.example`
- Full-text search API (`GET /api/search`) with PostgreSQL tsvector/GIN indexes across sessions, action items, templates, and people
- GIN expression indexes on action_item, talking_point, and session_answer tables for fast full-text search
- Global Cmd+K command palette for universal search across sessions, action items, templates, and people
- Search trigger button in dashboard header with keyboard shortcut hint
- History page inline search bar with debounced session content search
- Standalone action items API: GET `/api/action-items` (cross-series, grouped), PATCH `/api/action-items/[id]` (full edit)
- Sidebar navigation for Action Items and History pages
- Zod validation schema for standalone action item updates
- Action Items page at `/action-items` with grouped items, status toggle, inline edit sheet
- Overdue badge and age indicator on action items in context panel
- Session summary page (`/sessions/[id]/summary`) with read-only view of all session data grouped by section
- Session summary view component with collapsible sections, answers, notes, talking points, action items with live status
- AI summary placeholder section on session summary page (ready for Phase 7)
- Private notes displayed on summary page only for the note author (server-side decrypted)
- In-progress sessions redirect from summary page to wizard
- Enhanced session timeline: completed sessions link to summary, in-progress sessions show Resume button
- History page at `/history` showing sessions grouped by series with score sparklines
- History API endpoint (`GET /api/history`) with cursor-based pagination and filters (status, date range, series)
- History page filters: status, date range, series/report with URL-based state
- Load more button for paginated history results

### Changed
- Replace hardcoded category enums with user-defined sections and labels
- Template questions now belong to sections (wizard steps) instead of fixed categories
- Templates use a many-to-many label system (tenant-wide taxonomy) instead of a single category enum
- Wizard steps display section names directly instead of looking up from a hardcoded map
- Context panel and summary screen use "section" terminology instead of "category"
- Template list shows colored label badges instead of category badge
- Create template dialog simplified (no more category picker)

### Added
- Template sections table (`template_section`) — user-defined groups that become wizard steps
- Template labels table (`template_label`) — tenant-wide taxonomy with optional color
- Template label assignments table (`template_label_assignment`) — many-to-many
- Labels CRUD API (`GET/POST /api/labels`, `PATCH/DELETE /api/labels/[id]`)
- Migration `0008_sections_labels` with automatic data migration from categories to sections

### Removed
- `template_category` and `question_category` database enums
- `category` column from `questionnaire_template` and `template_question` tables
- Hardcoded `CATEGORY_LABELS` / `categoryLabels` maps from all components

### Fixed
- Reword inverted rating questions (blockers/capacity) to positive framing so higher = better across all ratings
- Conditional question operator dropdown disabled for unsaved questions — fallback ID matching now consistent between select and lookup
- Conditional question "Add Question" button silently failing — Zod schema required UUID for `conditionalOnQuestionId` but unsaved questions use temporary IDs
- Conditional question references causing 500 on save — temporary `q-{index}` refs nulled during DB insert, then resolved to real UUIDs in a second pass

### Added
- Session summary screen: read-only recap of all answers, notes, talking points, and action items grouped by category
- Session score computation: normalizes all numeric answer types (rating_1_5, rating_1_10, yes_no, mood) to 1-5 scale and averages
- Session completion API (`POST /api/sessions/[id]/complete`): computes score, marks session completed with duration, updates `next_session_at` on series
- Summary step as final wizard tab with score card, per-category review, and "Complete Session" button for managers
- Save status component for wizard top bar (saved/saving/error states with icon transitions)
- Series cards navigate to wizard on "Start" and "Resume" (direct `/wizard/[sessionId]` navigation)
- Series detail "Resume Session" button navigates to wizard for in-progress sessions
- Session score displayed on series cards for completed sessions
- In-progress session number shown on series cards ("Session #N in progress")
- Tiptap rich text editor for session notes with formatting toolbar (bold, italic, lists, links)
- Shared notes tab with auto-save per category via debounced PUT to `/api/sessions/[id]/notes`
- Private notes tab with "Only you can see this" indicator, server-side AES-256-GCM encryption
- Shared notes API (`PUT /api/sessions/[id]/notes`) updates session JSONB per-category key
- Private notes API (`GET/PUT /api/sessions/[id]/notes/private`) with encrypt-on-write, decrypt-on-read
- Talking points list per category with add (Enter to submit), check-off, delete, and carried-from session badge
- Talking points API (`GET/POST/PATCH/DELETE /api/sessions/[id]/talking-points`) with category filtering
- Inline action item creation per category with title, assignee select, optional due date
- Action items API (`GET/POST/PATCH /api/sessions/[id]/action-items`) with assignee name resolution
- Context panel integrated into wizard shell layout (right sidebar on desktop, mobile slide-in overlay)
- Question history dialog wired into wizard shell for per-question answer timeline
- Aggregate save status indicator: tracks all pending mutations (answers, notes, talking points, action items)
- `visibilitychange` event handler in wizard to flush pending debounced saves on tab switch
- `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link` dependencies
- Zod schemas: `sharedNotesUpsertSchema`, `privateNoteUpsertSchema`, `createTalkingPointSchema`, `toggleTalkingPointSchema`, `createActionItemSchema`, `updateActionItemSchema`
- Session wizard: full-page immersive layout without sidebar for focused 1:1 experience
- Session data API (`GET /api/sessions/[id]`) returns comprehensive wizard payload: session, series, template questions, existing answers, previous sessions, and open action items
- Answer upsert API (`PUT /api/sessions/[id]/answers`) with `onConflictDoUpdate` for 500ms debounced auto-save
- Wizard shell (`wizard-shell.tsx`) orchestrates wizard state via `useReducer`: step navigation, answer management, conditional question logic, and auto-save
- Wizard top bar with exit button (with unsaved changes confirmation), session info, and live save status indicator
- Wizard navigation with category pill tabs, prev/next buttons, and keyboard arrow key shortcuts
- Category step component renders questions grouped by category on scrollable screens with required badges and help text
- Recap screen shows last meeting summary (session score, notes by category, answer count) and open action items with status/due date
- Question widget dispatcher maps `answerType` to correct input widget
- Text widget: auto-resizing textarea
- Rating 1-5 widget: clickable star icons with configurable labels
- Rating 1-10 widget: 10 numbered buttons in responsive grid
- Yes/No widget: two large toggle buttons (1 = yes, 0 = no)
- Multiple choice widget: radio-style buttons from `answerConfig.options`
- Mood widget: 5 emoji buttons with configurable labels
- `useDebounce<T>` hook for auto-save pattern
- Zod `answerUpsertSchema` for answer validation
- `beforeunload` handler triggers immediate save of pending debounced answers via `navigator.sendBeacon`
- Conditional question evaluation across all categories (cross-category conditionals work correctly)
- Context panel sidebar (`context-panel.tsx`): always-visible right sidebar with session history context, category-scoped data, and mobile slide-in overlay
- Question history dialog (`question-history-dialog.tsx`): per-question answer timeline across previous sessions with formatted values per answer type
- Score sparkline component (`score-sparkline.tsx`): Recharts mini line chart for score trends with hidden axes
- `recharts` dependency for score trend sparklines and chart components
- `shadcn/ui` collapsible component for context panel sections
- Meeting series CRUD: create, update, archive series with cadence, preferred day/time, and default template
- Series list API (`GET /api/series`) with report info, latest session status, sorted by next meeting date (soonest first)
- Series detail API (`GET /api/series/[id]`) with session history, manager/report info
- Start session API (`POST /api/series/[id]/start`) creates in_progress session record
- Series card grid page (`/sessions`) with responsive grid layout and empty state
- Series card component with report avatar, cadence, next session date, status badge, Start/Resume button
- Create series form (`/sessions/new`) with report selector, cadence radio group, preferred day/time, template selector, duration input
- Series detail page (`/sessions/[id]`) with settings overview, session history timeline, Pause/Resume/Archive actions
- Session timeline component showing session history with scores and status badges
- `computeNextSessionDate` utility for cadence-based scheduling (weekly, biweekly, monthly, custom + preferred day alignment)
- Zod validation schemas for series CRUD: `createSeriesSchema`, `updateSeriesSchema` with custom cadence refinement
- RBAC helpers: `canManageSeries` (admin/manager), `isSeriesParticipant` (manager or report on series)
- Sidebar navigation: "Sessions" item after "Templates" with CalendarDays icon
- Schema migration: `shared_notes` from TEXT to JSONB for per-category storage
- Schema migration: `category` column added to `private_note`, `talking_point`, `action_item` tables
- Schema migration: unique index on `session_answer(session_id, question_id)` for answer upsert support
- Schema migration: updated unique index on `private_note` to include `category`

### Changed
- Seed data updated: `shared_notes` uses JSONB format, action items and private notes have category values

### Added
- Drag-and-drop question reordering in template editor using @dnd-kit with vertical axis constraint
- GripVertical drag handle on question cards with visual drag feedback (shadow + opacity)
- Keyboard accessibility for question reordering via KeyboardSensor
- Optimistic reorder with server persistence and rollback on error
- Reorder API endpoint (`PATCH /api/templates/[id]/questions/reorder`) with contiguous sort_order assignment
- Conditional logic configuration form (`ConditionalLogicForm`) with type-aware operator filtering and adaptive value inputs
- Conditional logic indicator on question cards showing "Shows when Q{n} {operator} {value}"
- Server-side conditional logic validation (`validateConditionalLogic`): prevents circular references, validates operator/type compatibility
- `operatorsForAnswerType` mapping for filtering operators by answer type (text: eq/neq only, ratings/mood: all 6 operators)
- Template editor page (`/templates/[id]`) with full question management: add, edit, remove questions with all 6 answer types
- New template page (`/templates/new`) for creating templates from scratch (admin/manager only)
- Template editor component with metadata form (name, description, category), questions list, and actions toolbar
- Question card component showing question text, answer type badge, category badge, required indicator, and conditional logic badge
- Question form dialog with answer type selection, per-type configuration, and required toggle
- Answer config form with per-type configuration: rating labels, multiple choice options with add/remove, mood emoji labels
- Template actions toolbar: Publish/Unpublish toggle, Set as Default (admin-only), Duplicate, Archive with confirmation
- Read-only mode for member role (no edit controls visible)
- Template versioning-aware PATCH endpoint: detects session usage, increments version, archives old questions when template is in use
- Template duplicate API (`POST /api/templates/[id]/duplicate`): deep-copies template + questions with new UUIDs, remaps conditional references
- Template set-default API (`PUT /api/templates/[id]/default`): atomically sets one default per tenant (admin-only)
- Template publish toggle API (`PUT /api/templates/[id]/publish`): toggles published status with question count validation
- `saveQuestionSchema` Zod schema with optional `id` field for batch save operations
- shadcn/ui `switch` and `alert-dialog` components
- Template schema migration: `is_archived` column on `questionnaire_template` table for soft-delete/archive
- Template CRUD API: `GET/POST /api/templates` for listing and creating templates with question counts
- Template detail API: `GET/PATCH/DELETE /api/templates/[id]` for viewing, updating, and archiving templates
- Template question CRUD API: `POST /api/templates/[id]/questions` and `PATCH/DELETE /api/templates/[id]/questions/[questionId]`
- Zod validation schemas for template CRUD: `createTemplateSchema`, `updateTemplateSchema`, `questionSchema`, `saveTemplateSchema`, `reorderQuestionsSchema`
- Answer config validation: `validateAnswerConfig()` ensures multiple_choice has min 2 options
- RBAC helper: `canManageTemplates()` for admin/manager role check
- Template list page (`/templates`) with responsive card grid showing name, description, category, question count, version, and status badges
- Template create dialog with React Hook Form + Zod validation for name, description, and category
- Sidebar navigation: "Templates" item added after "People" (visible to all roles)

### Fixed
- Security: cross-tenant IDOR in team manager verification (missing tenant_id filter)
- Security: host header injection in invite email URLs — now uses NEXT_PUBLIC_APP_URL only
- Security: LIKE wildcard injection in audit log search
- Security: avatarUrl validation now requires HTTPS URLs
- Bug: Create Team dialog sent `managerId: null` failing Zod validation (now sends `undefined`)
- Dead code: unreachable `acceptedAt` check in invite resend route removed
- React key warning: Fragment in audit log table now has proper key
- Teams page lead picker now filters out deactivated users

### Added
- Playwright E2E test suite: 63 tests across 5 files (people, teams, invite, audit-log, RBAC)
- Invite button on People page header (admin-only) wiring the invite dialog into the UI
- Audit log API: `GET /api/audit-log` with server-side pagination, action type filter, date range filter, and search (admin-only)
- Audit log page (`/settings/audit-log`) with expandable detail rows, pagination, and filters
- Sidebar updated with role-based navigation: Settings section (Company, Audit Log) visible to admins only
- Team CRUD API: `GET/POST /api/teams` for listing and creating teams with member counts and manager info
- Team detail API: `GET/PATCH/DELETE /api/teams/[id]` for viewing, updating, and deleting teams (admin-only delete)
- Team members API: `POST/DELETE /api/teams/[id]/members` for adding and removing team members
- Team card component (`src/components/people/team-card.tsx`) with name, description, lead avatar, member count
- Team create dialog (`src/components/people/team-create-dialog.tsx`) with name, description, and searchable team lead picker
- Member picker dialog (`src/components/people/member-picker.tsx`) with searchable multi-select and checkbox UI
- Teams page (`/teams`) with responsive card grid, create button (admin/manager), empty state
- Team detail page (`/teams/[id]`) with inline name/description editing, member table, add/remove members
- RBAC enforcement on team mutations: admin/manager can create and manage, admin-only delete
- Audit logging for all team mutations: `team_created`, `team_updated`, `team_deleted`, `team_lead_changed`, `member_added_to_team`, `member_removed_from_team`
- Invite API: `POST /api/invites` sends bulk email invitations with role assignment (admin-only)
- Invite acceptance API: `POST /api/invites/accept` creates user account from invite token (public endpoint)
- Invite resend API: `POST /api/invites/resend` generates new token and resends invite email (admin-only)
- Invite email template (`src/lib/email/templates/invite.tsx`) matching existing email design system
- Invite dialog component (`src/components/people/invite-dialog.tsx`) with multi-email textarea and role selector
- Invite acceptance page (`/invite/[token]`) with 2-step onboarding: password setup, then profile info
- Auto-sign-in after invite acceptance: new users land directly in the dashboard
- User management API: `GET /api/users` returns all users with team memberships and pending invites merged
- User detail API: `GET /api/users/[id]` fetches single user with manager name and team memberships
- User update API: `PATCH /api/users/[id]` handles role changes (admin-only), manager assignment (admin-only), profile updates (self or admin), and reactivation (admin-only)
- User deactivation API: `DELETE /api/users/[id]` soft-deactivates users (admin-only) with last-admin protection
- Circular manager assignment prevention: walks up manager chain (max 10 levels) before allowing assignment
- Last-admin guard: prevents demoting or deactivating the last admin in an organization
- Audit logging for all user mutations: `role_changed`, `manager_assigned`, `profile_updated`, `user_deactivated`, `user_reactivated`
- People directory page (`/people`) with sortable/filterable TanStack Table showing all organization users
- People table columns: name (with avatar), email, role (inline editing), teams (badges), manager (combobox), status (badge), actions (kebab menu)
- Inline role editing via `RoleSelect` component with optimistic updates (admin-only)
- Inline manager assignment via `ManagerSelect` combobox with search (admin-only)
- User actions kebab menu: view profile, deactivate, reactivate, resend invite (role-conditional)
- Profile sheet (slide-in panel) opens on table row click with user summary and "View Full Profile" link
- Profile detail page (`/people/[id]`) with user info, team badges, and edit form (self or admin)
- Profile edit form with React Hook Form + Zod validation for firstName, lastName, jobTitle
- People/Teams tab navigation component using URL-based routing
- Search filter: filters table by name, email, or job title
- Role, team, and status dropdown filters with client-side filtering
- Table pagination (20 rows per page) with Previous/Next controls
- Pending invites appear in the people table with "Pending" status badge
- `audit_log` Drizzle schema with tenant/action and tenant/actor composite indexes
- `invite_token` Drizzle schema with tenant+email unique index and 7-day expiry support
- RLS policies for `audit_log` (SELECT/INSERT only, immutable) and `invite_token` (SELECT/INSERT/UPDATE)
- Zod validation schemas for user management: `inviteUsersSchema`, `acceptInviteSchema`, `updateProfileSchema`, `updateUserRoleSchema`, `assignManagerSchema`
- Zod validation schemas for team management: `createTeamSchema`, `updateTeamSchema`, `addTeamMembersSchema`, `removeTeamMemberSchema`
- npm packages: `@tanstack/react-table`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`
- 15 shadcn/ui components: table, dialog, dropdown-menu, tabs, avatar, sonner, sheet, textarea, checkbox, command, popover, tooltip, skeleton, form, pagination
- RBAC helper (`src/lib/auth/rbac.ts`) with `requireRole`, `canManageTeams`, `isAdmin` utilities
- Audit log helper (`src/lib/audit/log.ts`) with transactional `logAuditEvent` function
- TanStack Query provider (`src/providers/query-provider.tsx`) wrapping dashboard layout
- Sidebar navigation with Overview, People, and Settings links
- Toast notifications (Sonner) in dashboard layout

### Changed
- Sidebar navigation restructured: main section (Overview, People) and Settings section (Company, Audit Log) with role-based visibility
- Dashboard layout now includes sidebar navigation and TanStack Query provider
- `proxy.ts` allows unauthenticated access to `/invite/*` paths for invite acceptance flow
- `TransactionClient` type exported from `tenant-context.ts` for use by audit log helper

### Changed
- Wiki overhauled: replaced 15-sprint tracking with 10-phase roadmap matching GSD workflow
- `CLAUDE.md` updated: project status, email tech stack (Nodemailer), sprint references replaced with phase references
- `ROADMAP.md` updated: Phase 2 marked complete with all plan checkboxes checked

### Removed
- 16 sprint wiki pages (`Sprint-01.md` through `Sprint-15.md` and `Sprint-Log.md`) replaced by phase-based tracking

### Added
- `docs/wiki/Phase-Log.md` — master implementation tracking with phase summary table and dependency graph
- `docs/wiki/Phase-01.md` through `Phase-10.md` — per-phase wiki pages with goals, success criteria, and build details
- Phase progress cross-reference in `Features-Roadmap.md`
- PostToolUse hook (`scripts/wiki-phase-hook.sh`) that auto-detects phase completion commits and instructs Claude to update wiki

### Changed
- Database connection module (`src/lib/db/index.ts`) switched from Neon serverless driver to `node-postgres` (pg) for local development compatibility
- Email infrastructure switched from Resend to Nodemailer (SMTP-based) for self-hosted flexibility
- Auth flows (`auth/config.ts`, `auth/actions.ts`, `email/send.ts`) now use `adminDb` (superuser connection) to bypass RLS for registration, login, password reset, and email verification
- Environment variables: replaced `RESEND_API_KEY` with SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`)

### Fixed
- Auth.js redirect detection in `registerAction` and `logoutAction` now uses digest-based check for Next.js compatibility

### Added
- `adminDb` export in `src/lib/db/index.ts` -- superuser database connection for auth flows that operate outside tenant context
- `DATABASE_ADMIN_URL` environment variable for admin database connection
- `nodemailer` and `@react-email/render` dependencies for SMTP-based email sending
- Organization type (`org_type`) enum and column on tenant table: `for_profit` and `non_profit`
- Organization type selector (radio buttons) on registration page between company name and personal info
- `orgType` field in registration schema and action -- tenants created with correct org type
- Organization settings page at `/settings/company` (admin-only, redirects non-admins to `/overview`)
- Company settings API route (`/api/settings/company`) with GET and PUT handlers, Zod validation, tenant-scoped access
- Settings form with timezone selector (26 timezones), cadence radio group, duration dropdown
- Organization details section showing name (editable), type (read-only badge), slug (read-only)
- Zod validation schema for organization settings (`orgSettingsSchema`)
- shadcn/ui components: Select, RadioGroup, Badge, Separator
- Seed data updated with `orgType`: Acme Corp (for_profit), Beta Inc (non_profit)
- Route protection via `proxy.ts` (Next.js 16 convention) -- unauthenticated users redirect to `/login`, authenticated users redirect away from auth pages to `/overview`
- Dashboard layout with `SessionProvider` and server-side session validation (defense-in-depth against CVE-2025-29927)
- Overview page with user info (name, email, role, organization) and email verification banner
- Logout button client component using `signOut()` from `next-auth/react`
- Root page (`/`) redirects to `/overview`
- `emailVerified` field added to JWT token and session for verification status display
- Google and Microsoft OAuth buttons with branded SVG icons on login page
- OAuth error messages: AccessDenied (no account found) and OAuthAccountNotLinked (different sign-in method)
- Auth.js v5 (next-auth@beta) with Credentials provider, Google OAuth, and Microsoft Entra ID
- Drizzle adapter integration with custom user table mapping (`@auth/drizzle-adapter`)
- JWT session strategy with `tenantId`, `role`, and `userId` on session token
- Auth schema tables: `account`, `auth_session`, `verification_token`, `email_verification_token`, `password_reset_token`
- User table extended with `name`, `email_verified`, `image`, and `password_hash` columns
- TypeScript type augmentation for Auth.js session/JWT custom fields (`src/types/next-auth.d.ts`)
- Zod validation schemas for sign-in, register, forgot-password, reset-password (`src/lib/validations/auth.ts`)
- Auth.js route handler at `/api/auth/[...nextauth]`
- OAuth sign-in callback blocks users without existing records (must be invited or register org first)
- Environment variables for AUTH_SECRET, OAuth providers, and Resend email in `.env.example`
- Email sending infrastructure with Resend API and lazy-initialized client (`src/lib/email/send.ts`)
- React Email templates for verification and password reset emails
- Server actions: `registerAction`, `verifyEmailAction`, `forgotPasswordAction`, `resetPasswordAction`, `logoutAction`
- Registration creates tenant + admin user in single DB transaction, then auto-signs-in
- Forgot-password prevents email enumeration (always returns success)
- Auth pages with shadcn/ui: login, register, verify-email, forgot-password, reset-password
- Auth layout with centered card design and authenticated-user redirect
- OAuth buttons (Google, Microsoft) on login page
- shadcn/ui components: Button, Input, Label, Card
- Drizzle migration for auth tables and user schema changes (`0002_clear_la_nuit.sql`)
- RLS policies on `account` and `auth_session` tables (tenant isolation via user JOIN)
- Token tables (`verification_token`, `email_verification_token`, `password_reset_token`) accessible without tenant context
- `app_user` role grants for all new auth tables
- Next.js 15 project scaffolded with Bun, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui
- Drizzle ORM configuration with Neon serverless driver and WebSocket fallback
- Package scripts: `dev` (port 4300), `build`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- Environment variable templates (`.env.example`, `.env.local`)
- Docker Compose with PostgreSQL 16 (blue-green: `oneonone_stable` + `oneonone_dev` databases)
- Dedicated `app_user` database role without BYPASSRLS for RLS enforcement
- Multi-stage Dockerfile (Bun for deps/build, Node.js 22 for production runtime)
- Database init script (`scripts/init-db.sh`) with default privileges for app_user
- Project documentation: architecture, data model, features roadmap, UX flows, questionnaires, analytics, and security docs
- Phase-based implementation plan with dependency graph (`docs/wiki/Phase-01.md` through `Phase-10.md`)
- GitHub Wiki with auto-sync from `docs/wiki/` via GitHub Actions workflow
- Wiki sync scripts (`scripts/push-wiki.sh`, `scripts/push-wiki-hook.sh`)
- Claude Code PostToolUse hooks for automatic wiki sync on file edits
- `CLAUDE.md` with project conventions, architecture overview, and phase tracking instructions
- Complete Drizzle ORM schema for all database tables matching `docs/data-model.md`
- Centralized pgEnum definitions for all 16 enum types (`src/lib/db/schema/enums.ts`)
- Schema files for: tenant, user, team, team_member, questionnaire_template, template_question, meeting_series, session, session_answer, private_note, talking_point, action_item, notification, analytics_snapshot
- All tenant-scoped tables include `tenant_id` foreign key column
- `key_version` column on `private_note` table for encryption key rotation tracking
- Drizzle relations for all foreign key relationships including self-references
- Database indexes per data-model.md specification (unique constraints, composite indexes)
- SQL migrations: initial schema DDL and RLS policies (`src/lib/db/migrations/`)
- Row-Level Security (RLS) enabled on all 14 tables with tenant isolation policies
- Restrictive tenant isolation + author-only policies on `private_note` (FORCE ROW LEVEL SECURITY)
- RLS policies for junction tables (team_member, template_question, session_answer, talking_point) via parent JOIN
- `withTenantContext()` wrapper for tenant-scoped database queries using `set_config` with SET LOCAL
- `app_user` role granted CRUD privileges on all tables with default privileges for future tables
- Vitest test framework with coverage support and path alias configuration
- AES-256-GCM encryption infrastructure for private notes (`src/lib/encryption/`)
- HKDF key derivation from master key to per-tenant encryption keys (`deriveTenantKey`)
- Encrypt/decrypt functions with key versioning for rotation support (`encryptNote`, `decryptNote`)
- 11 encryption unit tests covering round-trips, key isolation, unicode, and tampering detection
- Idempotent seed script with two tenants: Acme Corp (7 users, 2 teams, 2 templates, 3 series, 3 sessions) and Beta Inc (3 users, 1 template, 1 series)
- Seed data includes realistic session answers, action items, and encrypted private notes
- `SEED_DATABASE_URL` environment variable for superuser seed connection (bypasses RLS)
- `pg` (node-postgres) driver for seed script local PostgreSQL connection
