---
phase: 09-email-notifications
plan: 01
subsystem: email
tags: [react-email, nodemailer, smtp, cron, notifications, drizzle]

# Dependency graph
requires:
  - phase: 05-meeting-series-session-wizard
    provides: meeting_series schema, sessions
  - phase: 07-ai-pipeline
    provides: ai_nudges table for agenda prep emails
provides:
  - Shared email layout and styles for all templates
  - 3 new email templates (pre-meeting, agenda-prep, session-summary)
  - Notification scheduler for creating/cancelling series notifications
  - Notification sender for processing pending notifications via SMTP
  - Cron endpoint for automated notification processing
  - reminderHoursBefore column for configurable reminder timing
affects: [09-02-wiring, email-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-claim-cron, shared-email-layout, notification-service-layer]

key-files:
  created:
    - src/lib/email/styles.ts
    - src/lib/email/templates/components/email-layout.tsx
    - src/lib/email/templates/pre-meeting-reminder.tsx
    - src/lib/email/templates/agenda-prep.tsx
    - src/lib/email/templates/session-summary.tsx
    - src/lib/notifications/queries.ts
    - src/lib/notifications/scheduler.ts
    - src/lib/notifications/sender.ts
    - src/app/api/cron/notifications/route.ts
    - vercel.json
    - src/lib/db/migrations/0013_reminder_hours_before.sql
  modified:
    - src/lib/email/send.ts
    - src/lib/email/templates/invite.tsx
    - src/lib/email/templates/verification.tsx
    - src/lib/email/templates/password-reset.tsx
    - src/lib/db/schema/series.ts
    - src/app/api/invites/route.ts
    - src/app/api/invites/resend/route.ts

key-decisions:
  - "Optimistic claim pattern for cron: UPDATE...RETURNING atomically claims notifications, preventing double-sends"
  - "Removed 'use server' from send.ts to allow import from API routes (callers have their own server context)"
  - "Manual migration (drizzle-kit generate is interactive) -- consistent with phase 7 pattern"
  - "Skip past-scheduled notifications: if nextSessionAt is less than reminderHoursBefore away, reminders are not created"

patterns-established:
  - "EmailLayout wrapper: all email templates use shared layout for consistent brand/footer"
  - "Notification service layer: queries.ts (DB ops) + scheduler.ts (creation) + sender.ts (processing)"
  - "Cron auth: CRON_SECRET Bearer token check on cron endpoints"

requirements-completed: [NOTF-01, NOTF-02, NOTF-04]

# Metrics
duration: 6min
completed: 2026-03-05
---

# Phase 09 Plan 01: Email Notification Infrastructure Summary

**Shared email template system with layout/styles, 3 new templates (pre-meeting, agenda-prep, session-summary), notification service layer, and CRON_SECRET-authenticated cron endpoint**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-05T13:49:59Z
- **Completed:** 2026-03-05T13:56:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Extracted duplicated email styles into shared module and created reusable EmailLayout component used by all 6 templates
- Built 3 new email templates: pre-meeting reminder, agenda prep (with manager/report variants and AI nudges), session summary (with score, AI summary, action items, manager insights)
- Created notification service layer (queries, scheduler, sender) with optimistic claim pattern for cron processing
- Consolidated duplicate SMTP transport code from invite routes into single source of truth in send.ts
- Added reminderHoursBefore column to meeting_series for configurable reminder timing

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared email styles, layout component, 3 new templates, and refresh existing templates** - `8cc6e3c` (feat)
2. **Task 2: Schema migration, notification service layer, cron endpoint, and transport consolidation** - `f643193` (feat)

## Files Created/Modified
- `src/lib/email/styles.ts` - Shared email style constants (body, container, section, brand, heading, etc.)
- `src/lib/email/templates/components/email-layout.tsx` - Reusable layout wrapper with brand + children + footer
- `src/lib/email/templates/pre-meeting-reminder.tsx` - Pre-meeting reminder template
- `src/lib/email/templates/agenda-prep.tsx` - Agenda prep with manager/report variants and AI nudge cards
- `src/lib/email/templates/session-summary.tsx` - Session summary with score badge, AI summary, action items, manager insights
- `src/lib/email/templates/invite.tsx` - Refactored to use EmailLayout
- `src/lib/email/templates/verification.tsx` - Refactored to use EmailLayout
- `src/lib/email/templates/password-reset.tsx` - Refactored to use EmailLayout
- `src/lib/email/send.ts` - Exported getTransport/getEmailFrom, removed "use server"
- `src/lib/db/schema/series.ts` - Added reminderHoursBefore column
- `src/lib/db/migrations/0013_reminder_hours_before.sql` - Migration for new column
- `src/lib/notifications/queries.ts` - DB helpers: claim, mark sent/failed, cancel by series
- `src/lib/notifications/scheduler.ts` - Schedule pre-meeting + agenda-prep notifications
- `src/lib/notifications/sender.ts` - Process notifications: lookup data, render, send via SMTP
- `src/app/api/cron/notifications/route.ts` - Cron endpoint with CRON_SECRET auth
- `src/app/api/invites/route.ts` - Consolidated transport import
- `src/app/api/invites/resend/route.ts` - Consolidated transport import
- `vercel.json` - Cron config: 5-minute schedule for notification processing

## Decisions Made
- Optimistic claim pattern for cron: UPDATE...RETURNING atomically claims notifications, preventing double-sends in concurrent runs
- Removed "use server" from send.ts to allow import from API routes (callers have their own server context)
- Manual migration (drizzle-kit generate is interactive) -- consistent with phase 7 pattern
- Skip past-scheduled notifications: if nextSessionAt is less than reminderHoursBefore away, reminders are not created

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
- Add `CRON_SECRET` environment variable for cron endpoint authentication (required for Vercel Cron Jobs)

## Next Phase Readiness
- Email templates and notification service layer ready for Plan 02 to wire into lifecycle events
- Cron endpoint will process any pending notifications once CRON_SECRET is configured
- Session summary template ready but sender stub logs warning (event-driven sending wired in Plan 02)

---
*Phase: 09-email-notifications*
*Completed: 2026-03-05*
