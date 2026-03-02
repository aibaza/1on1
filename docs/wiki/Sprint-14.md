# Sprint 14 — Email Notifications

**Duration**: 2 weeks
**Dependencies**: Sprint 10
**Parallelizable with**: Sprint 13

## Goals

Set up Resend + React Email for transactional emails, build all MVP email templates, implement Inngest background jobs for scheduled reminders, and create the notification tracking system.

## Deliverables

1. **Email infrastructure**:
   - Resend SDK configuration
   - React Email template setup with company branding variables
   - Email sending utility (`sendEmail()`) with error handling and retry
2. **Email templates** (React Email):
   - **Invite email**: welcome message with magic link, company name, inviter name
   - **Pre-meeting reminder**: session details, date/time, link to session, sent 24h before (configurable)
   - **Agenda prep reminder**: "Add your talking points", sent 48h before (configurable)
   - **Session summary**: answers recap, notes, action items, session score
   - **Overdue action item**: item title, due date, days overdue, link to item
3. **Inngest background jobs**:
   - `send-reminders`: cron job checking for upcoming sessions, creates NOTIFICATION records, sends emails
   - `send-session-summary`: triggered by `session.completed` event
   - `check-overdue-actions`: daily cron checking for newly overdue action items
4. **Notification tracking**: create NOTIFICATION records for all sent/scheduled/failed notifications
5. **User notification preferences**: respect per-user settings (email_reminders on/off, reminder_before_hours)
6. **Tenant notification settings**: respect tenant-level defaults (pre_meeting_reminder_hours, agenda_prep_reminder_hours)

## Acceptance Criteria

- [ ] Invite email sent when admin invites a user (contains working magic link)
- [ ] Pre-meeting reminder sent at configured hours before session (default 24h)
- [ ] Agenda prep reminder sent at configured hours before session (default 48h)
- [ ] Session summary email sent after session completion with all data
- [ ] Overdue action item notification sent when an item passes its due date
- [ ] All emails render correctly (tested with React Email preview)
- [ ] Emails include company name and appropriate branding
- [ ] Inngest cron jobs execute on schedule
- [ ] Reminder job only sends to users with email_reminders enabled
- [ ] Reminder timing respects per-user reminder_before_hours setting
- [ ] NOTIFICATION records created for all email attempts (pending → sent / failed)
- [ ] Failed emails recorded with error message in NOTIFICATION table
- [ ] Duplicate reminders prevented (same notification not sent twice)
- [ ] Cancelled sessions don't trigger reminders (notifications cancelled)
- [ ] Email sending errors don't crash the application (graceful error handling)

## Key Files

```
src/lib/email/send.ts                             # Email utility
src/lib/email/templates/invite.tsx
src/lib/email/templates/reminder.tsx
src/lib/email/templates/agenda-prep.tsx
src/lib/email/templates/session-summary.tsx
src/lib/email/templates/overdue-action.tsx
src/lib/jobs/send-reminders.ts                    # Inngest cron
src/lib/jobs/send-session-summary.ts              # Inngest event handler
src/lib/jobs/check-overdue-actions.ts             # Inngest cron
src/app/api/webhooks/inngest/route.ts             # Inngest webhook endpoint
```
