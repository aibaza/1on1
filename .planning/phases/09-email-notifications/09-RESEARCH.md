# Phase 9: Email Notifications - Research

**Researched:** 2026-03-05
**Domain:** Email notifications (Nodemailer + React Email), scheduling, AI content integration
**Confidence:** HIGH

## Summary

Phase 9 adds three new email types (pre-meeting reminder, post-session summary, agenda prep reminder) and refreshes the existing invite email for design consistency. The infrastructure is already in place: Nodemailer SMTP transport, React Email templates, and a fully-defined notification table with scheduling support. The core challenge is the scheduling mechanism for timed notifications and integrating AI-generated content into email templates.

The notification table's `scheduledFor` field and status-based indexing are purpose-built for a cron-polling pattern: a periodic API route queries for pending notifications due for delivery and sends them. Post-session summary is event-driven (triggered after AI pipeline completes), not scheduled. The meeting_series table needs a new `reminderHoursBefore` column for configurable reminder timing.

**Primary recommendation:** Use a cron API route (Vercel Cron or external scheduler) polling the notification table for scheduled sends, plus event-driven triggers for the post-session summary email. Extract shared email styles into a reusable component library. Store org language preference in the existing tenants.settings JSONB field.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Post-session summary: Highlights + link pattern. AI summary paragraph, action items list, session score, "View Full Session" button. Manager gets extra AI addendum section (sentiment, coaching). Report gets shared version only
- Post-session timing: Wait for AI pipeline to complete before sending (guarantees AI content)
- Pre-meeting reminder: Configurable per-series (1h, 4h, 24h, 48h). Stored on meeting_series. Default 24h
- Agenda prep reminder: Manager version includes 1-2 AI nudges inline. Report version is plain nudge only. Timing: 48h before meeting
- No unsubscribe mechanism: Company procedures, employees cannot opt out
- Design consistency: Refresh invite email to match new templates
- Organization language: Org-level setting. AI content uses org language. Email chrome stays English for v1
- Email delivery: Use Nodemailer with existing SMTP settings. No Resend, no new provider

### Claude's Discretion
- Scheduling mechanism (cron API route vs event-driven vs hybrid)
- Failure handling and retry strategy
- React Email template layout and component structure
- Org language setting schema and storage location

### Deferred Ideas (OUT OF SCOPE)
- Overdue action item email notifications (MISC-02, v2)
- In-app notification center (bell icon, notification drawer)
- Email digest mode (daily/weekly summary)

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTF-01 | Invite email sent when admin invites a user | Already implemented. Needs design refresh to match new template system. Existing code in `src/app/api/invites/route.ts` |
| NOTF-02 | Pre-meeting reminder email sent configurable hours before session (default 24h) | Requires: `reminderHoursBefore` column on meeting_series, cron job to poll notifications table, React Email template |
| NOTF-03 | Post-session summary email to both parties with answers, notes, action items, AI summary | Requires: event-driven trigger after AI pipeline completes, differentiated manager/report templates, data gathering from session + AI output |
| NOTF-04 | Agenda prep reminder ("Add your talking points") sent 48h before meeting | Requires: cron job scheduling, manager template with AI nudges, report template with plain nudge, link to series page |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | (installed) | SMTP email delivery | Locked decision -- existing transport pattern |
| @react-email/components | ^1.0.8 | Email template components | Already used for 3 templates |
| @react-email/render | ^2.0.4 | Server-side rendering to HTML | Already used in send.ts |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm | (installed) | Notification table queries | Scheduling, status tracking |
| zod | (installed) | Validation of notification payloads | Template data validation |

### No New Dependencies Required

The existing stack covers all needs. No new packages needed.

## Architecture Patterns

### Recommended File Structure
```
src/
├── lib/
│   ├── email/
│   │   ├── send.ts                     # Extend: add sendNotificationEmail() generic sender
│   │   ├── styles.ts                   # NEW: shared email style constants (extracted from templates)
│   │   └── templates/
│   │       ├── components/             # NEW: shared email components
│   │       │   ├── email-layout.tsx    # Shared layout wrapper (brand, container, footer)
│   │       │   └── email-button.tsx    # Reusable CTA button
│   │       ├── verification.tsx        # Existing (refactor to use shared layout)
│   │       ├── password-reset.tsx      # Existing (refactor to use shared layout)
│   │       ├── invite.tsx              # Existing (refactor to use shared layout)
│   │       ├── pre-meeting-reminder.tsx    # NEW
│   │       ├── agenda-prep.tsx             # NEW (dual: manager/report variants)
│   │       └── session-summary.tsx         # NEW (dual: manager/report variants)
│   ├── notifications/
│   │   ├── scheduler.ts               # NEW: create/cancel notification records
│   │   ├── sender.ts                  # NEW: process pending notifications (fetch + send + status update)
│   │   └── queries.ts                 # NEW: notification DB queries
│   └── db/
│       └── schema/
│           └── series.ts              # MODIFY: add reminderHoursBefore column
├── app/
│   └── api/
│       └── cron/
│           └── notifications/
│               └── route.ts           # NEW: cron endpoint to process pending notifications
```

### Pattern 1: Hybrid Scheduling (Cron + Event-Driven)

**What:** Two distinct trigger mechanisms for different notification types.

**When to use:** Pre-meeting reminders and agenda prep are time-based (cron). Post-session summary is event-driven (triggered by AI pipeline completion).

**Cron flow (NOTF-02, NOTF-04):**
1. When a session is created or `nextSessionAt` is computed, insert notification records into the `notification` table with `scheduledFor` set to the computed send time
2. A cron API route (`/api/cron/notifications`) runs every 5-15 minutes
3. Queries for notifications WHERE `status = 'pending' AND scheduledFor <= NOW()`
4. Processes each: renders template, sends via SMTP, updates status to `sent` or `failed`

**Event-driven flow (NOTF-03):**
1. AI pipeline completes (in `pipeline.ts`, after `aiStatus` set to `completed`)
2. Directly call the summary email sender (no notification table for this type -- fire immediately)
3. Optionally log a notification record with `status = 'sent'` for audit trail

```typescript
// In pipeline.ts, after aiStatus = "completed":
await sendPostSessionSummaryEmail({
  sessionId,
  seriesId,
  tenantId,
  managerId,
  reportId,
});
```

### Pattern 2: Notification Record Lifecycle

**What:** Notification records track scheduled, sent, and failed states for auditability and retry.

**Lifecycle:**
```
Created (pending) → scheduledFor reached → Processing → sent | failed
                                                         ↓
                                                    (retry: back to pending with new scheduledFor)
```

**When series nextSessionAt changes:** Cancel old pending notifications for that series, create new ones with updated timing.

```typescript
// scheduler.ts
export async function scheduleSeriesNotifications(
  tx: TransactionClient,
  seriesId: string,
  tenantId: string,
  nextSessionAt: Date,
  managerId: string,
  reportId: string,
  reminderHoursBefore: number
) {
  // Cancel existing pending notifications for this series
  await tx.update(notifications)
    .set({ status: 'cancelled' })
    .where(and(
      eq(notifications.referenceId, seriesId),
      eq(notifications.status, 'pending'),
      inArray(notifications.type, ['pre_meeting', 'agenda_prep'])
    ));

  const reminderAt = new Date(nextSessionAt.getTime() - reminderHoursBefore * 3600000);
  const agendaPrepAt = new Date(nextSessionAt.getTime() - 48 * 3600000);

  // Insert pre-meeting reminder for both manager and report
  // Insert agenda prep for both manager and report
  // Each gets their own notification record
}
```

### Pattern 3: Differentiated Email Content

**What:** Same notification type renders different content based on recipient role.

**Post-session summary:**
- Manager receives: AI summary + action items + score + AI addendum (sentiment, coaching)
- Report receives: AI summary + action items + score (no addendum)

**Agenda prep:**
- Manager receives: Nudge text + 1-2 AI nudges inline from the nudges table
- Report receives: Plain nudge text + link to series page

```typescript
// Template accepts a variant prop
interface SessionSummaryProps {
  variant: 'manager' | 'report';
  recipientName: string;
  otherPartyName: string;
  sessionNumber: number;
  sessionScore: number | null;
  aiSummary: AISummary;
  actionItems: { title: string; assigneeName: string; dueDate: string | null }[];
  viewSessionUrl: string;
  // Manager-only
  aiAddendum?: AIManagerAddendum;
}
```

### Anti-Patterns to Avoid
- **Duplicating SMTP transport initialization:** The transport is already lazy-initialized in `send.ts` and duplicated in `invites/route.ts`. Extract to a single shared `getTransport()` export.
- **Sending emails inside database transactions:** Email sending is I/O-heavy and can timeout. Always send AFTER the transaction commits.
- **Blocking session completion on email:** Post-session email should be fire-and-forget (same pattern as AI pipeline).
- **Using notification table for event-driven emails:** The summary email fires immediately after AI completes -- don't add scheduling overhead. Just send and log.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Raw HTML strings | React Email components + render() | Cross-client compatibility, maintainability |
| SMTP transport | Custom socket code | Nodemailer (already installed) | Connection pooling, TLS, error handling |
| Cron scheduling | setInterval/setTimeout | Vercel Cron or external cron hitting API route | Survives restarts, works in serverless |
| Email style consistency | Copy-paste styles per template | Shared style constants + layout component | Single source of truth |
| Retry logic | Custom retry loops | Simple status update + next cron cycle picks it up | Idempotent, no in-memory state |

**Key insight:** The notification table IS the job queue. No need for a separate job system (Inngest was already removed). The cron just polls and processes.

## Common Pitfalls

### Pitfall 1: Race Condition on Double-Send
**What goes wrong:** Cron runs, picks up pending notifications, but takes time to process. Next cron run starts before first finishes, picks up same notifications.
**Why it happens:** No locking mechanism on notification processing.
**How to avoid:** Use `UPDATE ... SET status = 'processing' WHERE status = 'pending' AND scheduledFor <= NOW() RETURNING *` in a single atomic query. Only the transaction that successfully updates to 'processing' gets to send.
**Warning signs:** Duplicate emails to same user for same event.

Note: The existing notificationStatusEnum has values `pending`, `sent`, `failed`, `cancelled`. A `processing` status would need to be added to the enum, OR use an alternative approach: set `sentAt = NOW()` immediately as a claim marker, then update `status` to `sent` or `failed` after actual sending.

### Pitfall 2: Stale Notification After Reschedule
**What goes wrong:** Series next session date changes, but old notification records still pending.
**Why it happens:** Forgot to cancel old notifications when rescheduling.
**How to avoid:** Always cancel pending notifications for a series before creating new ones. Use `referenceId` (series ID) and `referenceType = 'series'` to find them.
**Warning signs:** Reminders sent for cancelled or rescheduled sessions.

### Pitfall 3: AI Pipeline Failure Blocks Summary Email
**What goes wrong:** AI fails, summary email never sent because it waits for AI completion.
**Why it happens:** Locked decision says wait for AI, but AI can fail.
**How to avoid:** If `aiStatus = 'failed'`, send a degraded summary (without AI content). The summary still has answers, notes, action items, and score. Only the AI paragraph and addendum would be missing.
**Warning signs:** Completed sessions with no summary email sent.

### Pitfall 4: Timezone Confusion in Scheduling
**What goes wrong:** Reminder sent at wrong time because scheduledFor computed in wrong timezone.
**Why it happens:** `nextSessionAt` is stored with timezone, but reminder offset calculation ignores it.
**How to avoid:** All date arithmetic uses the stored `nextSessionAt` timestamp directly (it's already in UTC). Simple subtraction: `nextSessionAt - reminderHours * 3600000`.
**Warning signs:** Reminders arriving at unexpected times.

### Pitfall 5: Email Transport Not Shared
**What goes wrong:** Transport created in multiple places (send.ts AND invites/route.ts), configuration drift.
**Why it happens:** Invite route duplicated the transport setup instead of importing.
**How to avoid:** Export `getTransport()` and `getEmailFrom()` from `send.ts`, import everywhere.

## Code Examples

### Shared Email Layout Component
```typescript
// src/lib/email/templates/components/email-layout.tsx
import {
  Html, Head, Body, Container, Section, Text, Hr,
} from "@react-email/components";

const styles = { /* shared styles from existing templates */ };

interface EmailLayoutProps {
  children: React.ReactNode;
  footerText?: string;
}

export function EmailLayout({ children, footerText }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.section}>
            <Text style={styles.brand}>1on1</Text>
            {children}
            {footerText && (
              <>
                <Hr style={styles.hr} />
                <Text style={styles.footer}>{footerText}</Text>
              </>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Cron Notification Processor
```typescript
// src/app/api/cron/notifications/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends CRON_SECRET header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Claim pending notifications atomically
  const pending = await adminDb
    .update(notifications)
    .set({ status: "sent", sentAt: new Date() }) // Optimistic claim
    .where(
      and(
        eq(notifications.status, "pending"),
        lte(notifications.scheduledFor, new Date())
      )
    )
    .returning();

  let sent = 0, failed = 0;
  for (const notif of pending) {
    try {
      await processNotification(notif);
      sent++;
    } catch (error) {
      // Revert to failed
      await adminDb
        .update(notifications)
        .set({ status: "failed", error: String(error), sentAt: null })
        .where(eq(notifications.id, notif.id));
      failed++;
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
```

### Post-Session Summary Trigger (added to pipeline.ts)
```typescript
// After AI pipeline completes successfully, before the final console.log:
try {
  await sendPostSessionSummaryEmails({
    sessionId,
    seriesId,
    tenantId,
    managerId,
    reportId,
  });
} catch (emailError) {
  // Non-fatal: log but don't fail the pipeline
  console.error(`[AI Pipeline] Summary email failed:`, emailError);
}
```

### Schema Change: reminderHoursBefore on meeting_series
```typescript
// Add to series.ts meetingSeries table definition:
reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
```

### Org Language in Tenants Settings JSONB
```typescript
// Tenant settings type (extend existing JSONB):
interface TenantSettings {
  timezone?: string;
  defaultCadence?: string;
  preferredLanguage?: string; // e.g., "en", "ro", "de" -- used for AI content generation
}

// Access pattern:
const tenant = await tx.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
const lang = (tenant[0].settings as TenantSettings)?.preferredLanguage || 'en';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inngest for background jobs | Direct async functions | Phase 7 (07-05) | Simpler, no external dependency. Cron for scheduling only |
| Resend for email delivery | Nodemailer + SMTP | Phase 2 (02-03) | Works with any SMTP provider, already configured |
| Separate email transport per file | Should be shared singleton | Current tech debt | Consolidate in this phase |

**Deprecated/outdated:**
- Resend package is installed (^6.9.3) but unused per locked decision. Can be removed as cleanup.

## Scheduling Mechanism Recommendation (Claude's Discretion)

**Recommendation: Cron API route + notification table polling**

**Why:**
1. The notification table already has `scheduledFor`, `status`, and proper indexes -- it's designed for this
2. Vercel Cron Jobs support minute-level granularity (but minimum recommended: every 5 minutes on free tier, every 1 minute on Pro)
3. No external dependency needed -- just an API route protected by CRON_SECRET
4. Idempotent: if cron misses a cycle, next cycle catches up
5. Failure handling is built-in: failed notifications stay in `failed` status, can be retried by resetting to `pending`

**Local development:** Use a simple curl loop or node-cron for local testing. Or manually trigger via `curl http://localhost:4300/api/cron/notifications`.

**Vercel config (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Failure Handling Recommendation (Claude's Discretion)

**Strategy: Status-based retry with max attempts**

1. On SMTP failure: set notification status to `failed`, store error message
2. Add `retryCount` column (integer, default 0) to notification table
3. A separate retry sweep (same cron, or a second pass): notifications with `status = 'failed' AND retryCount < 3` get reset to `pending` with `scheduledFor = NOW() + 15 minutes`
4. After 3 retries: leave as `failed` permanently, log audit event

**Alternative (simpler for v1):** Skip automatic retry entirely. Failed notifications stay failed. Admin can see them in audit log. Manual retry via admin action if needed. This is the recommended v1 approach -- keeps complexity low.

## Template Component Structure Recommendation (Claude's Discretion)

**Recommendation: Shared layout + variant props**

1. Extract shared styles into `src/lib/email/styles.ts`
2. Create `EmailLayout` component wrapping all templates (brand, container, footer)
3. Each email type is a single component with a `variant` prop where needed (manager/report)
4. Refactor existing 3 templates to use shared layout for consistency (NOTF-01 refresh)

## Org Language Setting Recommendation (Claude's Discretion)

**Recommendation: Store in existing `tenants.settings` JSONB column**

- Add `preferredLanguage` key to the settings JSONB (e.g., `"en"`, `"ro"`, `"de"`)
- Default to `"en"` when not set
- No schema migration needed -- JSONB is schema-less
- Add a language selector to the org settings page (admin only)
- Pass language to AI prompts: append "Respond in {language}" to system prompts
- This affects ALL AI output (summaries, nudges, addendum, action suggestions) per locked decision

## Notification Creation Points

| Event | Notifications Created | Timing |
|-------|----------------------|--------|
| Session created / nextSessionAt computed | Pre-meeting reminder (both users), Agenda prep (both users) | Computed from nextSessionAt |
| Series reminder setting changed | Cancel + recreate pre-meeting reminders | Immediate |
| Session completed + AI pipeline done | Post-session summary (both users) | Immediate send, no scheduling |
| Series paused/archived | Cancel all pending notifications for series | Immediate |

**Key integration point:** The session completion API already computes `nextSessionAt` and updates the series. This is where pre-meeting and agenda prep notifications for the NEXT session should be scheduled.

## Open Questions

1. **Notification enum values**
   - What we know: `notification_type` enum has `pre_meeting`, `agenda_prep`, `session_summary`, `overdue_action`, `missed_meeting`, `system`
   - What's unclear: Do we need an `invite` type? Current invite emails bypass the notification table entirely
   - Recommendation: Leave invites as-is (they don't need scheduling). The notification table is for scheduled/tracked notifications only

2. **Processing status in enum**
   - What we know: Current enum is `pending`, `sent`, `failed`, `cancelled`. No `processing` state
   - What's unclear: Whether to add it or use optimistic claim pattern
   - Recommendation: Use optimistic claim (set `sentAt` immediately, update status after). Avoids schema migration for enum change. Alternatively, add `processing` to enum if the team prefers explicit states

3. **Admin visibility of notification status**
   - What we know: No UI for viewing notification history planned in this phase
   - What's unclear: Whether admins need to see failed notifications
   - Recommendation: Log to audit table for now. UI can come later

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/email/send.ts` -- existing SMTP transport pattern
- Codebase: `src/lib/email/templates/*.tsx` -- existing React Email template design system
- Codebase: `src/lib/db/schema/notifications.ts` -- notification table schema with scheduling support
- Codebase: `src/lib/db/schema/enums.ts` -- notification type/channel/status enums
- Codebase: `src/lib/ai/pipeline.ts` -- AI pipeline completion flow (integration point for summary email)
- Codebase: `src/lib/db/schema/series.ts` -- meeting series schema (needs reminderHoursBefore)
- Codebase: `src/lib/db/schema/tenants.ts` -- tenant settings JSONB (for org language)
- Codebase: `src/app/api/sessions/[id]/complete/route.ts` -- session completion + next session computation

### Secondary (MEDIUM confidence)
- Vercel Cron Jobs documentation -- cron syntax and CRON_SECRET authentication pattern
- React Email component library -- layout patterns and cross-client compatibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in codebase
- Architecture: HIGH -- notification table and email infrastructure already designed for this use case
- Pitfalls: HIGH -- based on direct codebase analysis (duplicate transport, scheduling races)
- Scheduling mechanism: MEDIUM -- Vercel Cron specifics may need verification during implementation

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- infrastructure already exists)
