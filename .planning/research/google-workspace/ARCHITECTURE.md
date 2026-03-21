# Architecture Patterns: Google Workspace Integration

**Domain:** Google Workspace API Integration
**Researched:** 2026-03-21

## Recommended Architecture

### High-Level Component Diagram

```
                           +--------------------+
                           |   1on1 Next.js App |
                           +--------------------+
                                    |
                    +---------------+---------------+
                    |               |               |
              +-----v-----+  +-----v-----+  +-----v-----+
              |  Auth      |  |  Calendar  |  |  Tasks     |
              |  Module    |  |  Service   |  |  Service   |
              +-----------+  +-----------+  +-----------+
                    |               |               |
              +-----v-----+  +-----v-----+  +-----v-----+
              | Auth.js v5 |  | Google     |  | Google     |
              | + Google   |  | Calendar   |  | Tasks      |
              | Provider   |  | API v3     |  | API v1     |
              +-----------+  +-----------+  +-----------+
                    |               |               |
              +-----v-----------------------------------------+
              |           Google OAuth 2.0 Tokens              |
              |  (stored encrypted in accounts table)          |
              +-----------------------------------------------+
                                    |
              +-----v-----------------------------------------+
              |           google_integration table             |
              |  (sync state, channel IDs, granted scopes)     |
              +-----------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/lib/google/client.ts` | Create authenticated Google API client from stored tokens | Auth module, all Google services |
| `src/lib/google/tokens.ts` | Token refresh, encryption/decryption, scope validation | DB (accounts table), Google OAuth endpoints |
| `src/lib/google/calendar.ts` | FreeBusy queries, event CRUD, watch channel management | Google Calendar API v3 |
| `src/lib/google/tasks.ts` | Task CRUD, list management, sync operations | Google Tasks API v1 |
| `src/lib/google/sync.ts` | Polling orchestrator, conflict resolution, sync state | Tasks service, DB (google_integration table) |
| `src/lib/google/slots.ts` | Free slot computation algorithm | Calendar service (consumes FreeBusy data) |
| `src/app/api/google/calendar/` | API routes for availability, event creation | Calendar service |
| `src/app/api/google/tasks/` | API routes for task sync operations | Tasks service |
| `src/app/api/google/webhook/` | Webhook receiver for calendar push notifications | Calendar service |
| `src/app/api/cron/google-sync/` | Vercel cron: Tasks polling + channel renewal | Sync service |

### Data Flow: OAuth Token Lifecycle

```
1. User clicks "Connect Google Calendar" in settings
2. Client calls signIn("google", {}, { scope: "calendar.events.freebusy", prompt: "consent", access_type: "offline" })
3. Auth.js redirects to Google consent screen (incremental -- only new scopes shown)
4. Google redirects back with authorization code
5. Auth.js exchanges code for access_token + refresh_token
6. DrizzleAdapter stores tokens in accounts table
7. Post-login hook encrypts tokens (AES-256-GCM, same key derivation as private notes)
8. google_integration row created/updated with granted_scopes
```

### Data Flow: Calendar Availability

```
1. Manager opens "Schedule Session" for a series
2. API route loads both manager's and report's Google tokens from accounts table
3. For EACH user with a connected calendar:
   a. Create authenticated googleapis client from their decrypted tokens
   b. Call calendar.freebusy.query({
        timeMin: startOfSearchWindow,
        timeMax: endOfSearchWindow,
        items: [{ id: "primary" }]
      })
4. Merge busy periods from both calendars
5. Run slot-finding algorithm (see Pattern 4 below)
6. Return suggested meeting times to UI
7. UI displays slots in each user's local timezone
```

### Data Flow: Calendar Event Creation

```
1. Manager confirms a session time (from suggested slots or manual entry)
2. API route creates event via calendar.events.insert:
   - Calendar: manager's primary calendar
   - Attendees: [manager email, report email]
   - Description: session link, talking points, template name
   - sendUpdates: "all" (sends email invite to report)
3. Store event ID in sessions.google_event_id
4. (Optional) Set up watch channel for this calendar if not already active
```

### Data Flow: Tasks One-Way Push

```
1. User completes session with new action items
2. For each action item where assignee has Tasks sync enabled:
   a. Load assignee's Google token + tasks_list_id from google_integration
   b. If no tasks_list_id, create "1on1 Action Items" list first
   c. Call tasks.insert({
        tasklist: tasks_list_id,
        requestBody: {
          title: actionItem.title,
          notes: `${actionItem.description}\n\nSession: ${sessionUrl}`,
          due: actionItem.dueDate ? toRFC3339(actionItem.dueDate) : undefined,
          status: "needsAction"
        }
      })
   d. Store Google taskId in action_items.google_task_id
3. When action item status changes in-app:
   a. If google_task_id exists, call tasks.patch to update status
```

### Data Flow: Tasks Bidirectional Sync (Future)

```
1. Vercel Cron fires every 5 minutes
2. For each user with tasks_enabled=true in google_integration:
   a. Load sync state (tasks_last_sync_at, tasks_list_id)
   b. Call tasks.list({
        tasklist: tasks_list_id,
        updatedMin: tasks_last_sync_at (RFC 3339),
        showCompleted: true,
        showHidden: true
      })
   c. For each changed Google task:
      - Match to action_item via google_task_id
      - If no match, skip (task created outside app)
      - Compare timestamps:
        * Google task.updated > action_item.google_synced_at
          AND action_item.updated_at > action_item.google_synced_at
          → CONFLICT: last-write-wins (compare task.updated vs action_item.updated_at)
        * Only Google changed → update action_item
        * Only app changed → update Google task
   d. Push any locally-changed items that haven't been synced
   e. Update tasks_last_sync_at = now()
```

## Patterns to Follow

### Pattern 1: Authenticated Google Client Factory

**What:** Centralized factory that creates an authenticated Google API client from stored tokens.
**When:** Every Google API call.

```typescript
// src/lib/google/client.ts
import { google } from "googleapis";

export async function getGoogleClient(userId: string, tenantId: string) {
  const account = await getGoogleAccount(userId, tenantId);
  if (!account) throw new GoogleNotConnectedError();

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: decrypt(account.access_token),
    refresh_token: decrypt(account.refresh_token),
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Persist new tokens when Google auto-refreshes
  oauth2Client.on("tokens", async (tokens) => {
    await updateStoredTokens(userId, tenantId, tokens);
  });

  return oauth2Client;
}

export function getCalendarClient(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

export function getTasksClient(auth: OAuth2Client) {
  return google.tasks({ version: "v1", auth });
}
```

### Pattern 2: Workspace Domain Validation (Server-Side)

**What:** Enforce workspace-only login in the Auth.js signIn callback, not just the `hd` URL parameter.
**When:** Every Google OAuth sign-in.

```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === "google") {
    const googleProfile = profile as { hd?: string; email?: string };

    // CRITICAL: hd param is UI-only. Validate server-side.
    if (!googleProfile.hd) {
      // No hd claim = personal Gmail account → block
      return "/login?error=workspace-only";
    }

    // Optional: restrict to specific domains
    // const allowedDomains = await getAllowedDomains(tenantId);
    // if (!allowedDomains.includes(googleProfile.hd)) return false;

    // ... existing user-existence check
  }
  return true;
}
```

### Pattern 3: Incremental Scope Request

**What:** Request API scopes only when user first uses a feature.
**When:** User clicks "Connect Calendar" or "Enable Tasks Sync."

```typescript
// Client component
"use client";
import { signIn } from "next-auth/react";

async function connectCalendar() {
  await signIn("google", { redirect: true, callbackUrl: "/settings/integrations" }, {
    scope: "https://www.googleapis.com/auth/calendar.events.freebusy",
    prompt: "consent",
    access_type: "offline",
  });
}

async function connectTasks() {
  await signIn("google", { redirect: true, callbackUrl: "/settings/integrations" }, {
    scope: "https://www.googleapis.com/auth/tasks",
    prompt: "consent",
    access_type: "offline",
  });
}
```

### Pattern 4: Common Free Slot Algorithm

**What:** Merge busy periods from two calendars and find common free slots.
**When:** Scheduling a new session.

```typescript
// src/lib/google/slots.ts
interface TimeSlot { start: Date; end: Date; }
interface WorkingHours { startHour: number; endHour: number; } // e.g., 9-17

export function findCommonFreeSlots(
  managerBusy: TimeSlot[],
  reportBusy: TimeSlot[],
  searchStart: Date,
  searchEnd: Date,
  slotDurationMinutes: number,
  workingHours: WorkingHours,
  timezone: string,
): TimeSlot[] {
  // 1. Merge all busy periods
  const allBusy = [...managerBusy, ...reportBusy]
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // 2. Merge overlapping/adjacent busy periods
  const merged: TimeSlot[] = [];
  for (const slot of allBusy) {
    const last = merged[merged.length - 1];
    if (last && slot.start <= last.end) {
      last.end = new Date(Math.max(last.end.getTime(), slot.end.getTime()));
    } else {
      merged.push({ ...slot });
    }
  }

  // 3. Find gaps between busy periods within search window
  const gaps: TimeSlot[] = [];
  let cursor = searchStart;
  for (const busy of merged) {
    if (cursor < busy.start) {
      gaps.push({ start: new Date(cursor), end: new Date(busy.start) });
    }
    cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
  }
  if (cursor < searchEnd) {
    gaps.push({ start: new Date(cursor), end: new Date(searchEnd) });
  }

  // 4. Filter by working hours and split into slots
  const slots: TimeSlot[] = [];
  for (const gap of gaps) {
    // Clip to working hours for each day in the gap
    const clipped = clipToWorkingHours(gap, workingHours, timezone);
    for (const window of clipped) {
      // Split into slotDurationMinutes chunks
      let slotStart = window.start;
      while (slotStart.getTime() + slotDurationMinutes * 60000 <= window.end.getTime()) {
        slots.push({
          start: new Date(slotStart),
          end: new Date(slotStart.getTime() + slotDurationMinutes * 60000),
        });
        slotStart = new Date(slotStart.getTime() + 30 * 60000); // 30-min increments
      }
    }
  }

  return slots;
}
```

### Pattern 5: Watch Channel Renewal Cron

**What:** Vercel cron job that renews expiring Calendar watch channels.
**When:** Daily at 02:00 UTC.

```typescript
// src/app/api/cron/google-sync/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Renew expiring watch channels (within 24 hours)
  const expiringChannels = await db.query.googleIntegration.findMany({
    where: (gi, { lt, isNotNull }) => and(
      isNotNull(gi.calendarChannelId),
      lt(gi.calendarChannelExpiry, addHours(new Date(), 24))
    ),
  });

  for (const channel of expiringChannels) {
    await renewWatchChannel(channel);
  }

  // 2. Poll Google Tasks for users with sync enabled
  const syncUsers = await db.query.googleIntegration.findMany({
    where: (gi, { eq }) => eq(gi.tasksEnabled, true),
  });

  for (const user of syncUsers) {
    await syncTasksForUser(user);
  }

  return Response.json({ renewed: expiringChannels.length, synced: syncUsers.length });
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Tokens in JWT Cookie

**What:** Putting Google access/refresh tokens in the Auth.js JWT.
**Why bad:** Cookies have 4KB limit. Tokens add ~500 bytes. Multiple providers = overflow. Also, tokens become accessible client-side if cookie is not properly secured.
**Instead:** Store tokens in the database (accounts table) encrypted at rest. Only store `hasGoogleCalendar: boolean` in the JWT session for UI conditionals.

### Anti-Pattern 2: Requesting All Scopes at Login

**What:** Asking for calendar + tasks + profile scopes on first Google sign-in.
**Why bad:** Users see a wall of permissions and abandon signup. Google explicitly recommends incremental consent.
**Instead:** Request only `openid profile email` at login. Prompt for calendar/tasks scopes on first feature use.

### Anti-Pattern 3: Real-Time Tasks Sync Expectations

**What:** Designing the UI to suggest Google Tasks changes appear instantly in the app.
**Why bad:** Google Tasks API has NO webhooks. Polling means 5+ minute delays. Users will perceive this as broken.
**Instead:** Show "Last synced 2 min ago" status. Provide manual "Sync now" button. Use optimistic UI for app-to-Google pushes.

### Anti-Pattern 4: Using the Broadest Calendar Scope

**What:** Requesting `https://www.googleapis.com/auth/calendar` (full read/write to all calendars).
**Why bad:** Broadest scope triggers more scrutiny during OAuth verification. Users distrust apps that request "edit all your calendars." Also reads all event details (privacy concern).
**Instead:** Use `calendar.events.freebusy` (availability only) + `calendar.events.owned` (create/edit only events we create).

### Anti-Pattern 5: Single Watch Channel for All Users

**What:** Trying to create one webhook endpoint that handles all users' calendar changes.
**Why bad:** Watch channels are per-user, per-calendar. Each channel requires that user's auth token. One shared channel is not possible.
**Instead:** Create individual watch channels per user. Track channel IDs and expiry in google_integration table. Renew via cron.

## Database Schema Additions

```sql
-- Track Google integration state per user
CREATE TABLE google_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenant(id),

  -- Granted scopes (track incrementally)
  granted_scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Calendar watch channel
  calendar_channel_id VARCHAR(64),
  calendar_resource_id VARCHAR(256),
  calendar_channel_expiry TIMESTAMPTZ,
  calendar_sync_token TEXT,

  -- Tasks sync
  tasks_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tasks_list_id VARCHAR(256),        -- Google Tasks list ID for "1on1 Action Items"
  tasks_last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

CREATE INDEX google_integration_tenant_idx ON google_integration(tenant_id);
CREATE INDEX google_integration_tasks_sync_idx ON google_integration(tasks_enabled) WHERE tasks_enabled = TRUE;
CREATE INDEX google_integration_channel_expiry_idx ON google_integration(calendar_channel_expiry)
  WHERE calendar_channel_id IS NOT NULL;

-- Add Google reference columns to existing tables
ALTER TABLE action_item
  ADD COLUMN google_task_id VARCHAR(256),
  ADD COLUMN google_task_list_id VARCHAR(256),
  ADD COLUMN google_synced_at TIMESTAMPTZ;

ALTER TABLE session
  ADD COLUMN google_event_id VARCHAR(256),
  ADD COLUMN google_calendar_id VARCHAR(256) DEFAULT 'primary';
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Token storage | 100 encrypted rows | 10K rows, negligible | Partition by tenant |
| FreeBusy queries | 200 API calls/scheduling | Rate limit awareness | Caching layer, queue |
| Tasks polling (5-min) | 20 calls/min | 2K calls/min, batch needed | Dedicated worker fleet |
| Watch channels | 100 channels, cron renewal | 10K, stagger renewal | Channel management service |
| Calendar API quota | Well within 1M/day | ~100K/day, fine | May need quota increase |

## Sources

- [Google Calendar Push Notifications Guide](https://developers.google.com/workspace/calendar/api/guides/push) - HIGH confidence
- [Google Calendar FreeBusy Query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) - HIGH confidence
- [Google Tasks REST API Reference](https://developers.google.com/workspace/tasks/reference/rest) - HIGH confidence
- [Auth.js Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - HIGH confidence
- [Google OAuth Incremental Auth](https://developers.google.com/identity/sign-in/web/incremental-auth) - MEDIUM confidence
