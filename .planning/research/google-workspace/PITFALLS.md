# Domain Pitfalls: Google Workspace Integration

**Domain:** Google Workspace API Integration
**Researched:** 2026-03-21

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Google Tasks Has No Webhooks

**What goes wrong:** Team designs architecture assuming real-time push notifications for Tasks changes (like Calendar has). Discovers during implementation that Google Tasks API has zero webhook/push notification support.
**Why it happens:** Calendar API has excellent push notification support via watch channels. Developers assume Tasks is similar. Google's docs don't prominently warn about this absence -- the feature simply doesn't exist and isn't mentioned.
**Consequences:** Architecture redesign. UI promises of "instant sync" must be walked back. Need to build entire polling infrastructure from scratch.
**Prevention:** Design Tasks sync as polling-first from day one. Use 5-minute poll interval. Provide "Sync Now" button. Show "Last synced X min ago" in UI. Never promise real-time.
**Detection:** Search the entire Google Tasks API documentation for "watch", "push", "notification", or "webhook" -- you will find nothing.

### Pitfall 2: Google Refresh Token One-Time Issuance

**What goes wrong:** App gets refresh token on first sign-in, stores it. Later, when requesting additional scopes via incremental consent, Google does NOT issue a new refresh token (only a new access token). When the access token expires after ~1 hour, token refresh fails.
**Why it happens:** Google only issues a refresh token the very first time a user grants consent, unless `prompt: "consent"` is explicitly passed in the authorization URL. Without this flag, incremental consent produces access-token-only grants.
**Consequences:** All Google API calls fail with 401 after ~1 hour. Users must re-authenticate manually. Feature appears broken.
**Prevention:** ALWAYS pass `prompt: "consent"` AND `access_type: "offline"` on EVERY incremental scope request. Update the stored refresh token in the DB whenever Google issues a new one (listen for the `tokens` event on the OAuth2 client).
**Detection:** API calls start failing with 401 approximately 1 hour after an incremental consent grant.

### Pitfall 3: hd Parameter Is UI-Only, Not a Security Boundary

**What goes wrong:** App passes `hd=example.com` to Google OAuth URL and assumes only workspace users can sign in. An attacker modifies the OAuth URL to remove the `hd` parameter and signs in with a personal Gmail account.
**Why it happens:** The `hd` parameter controls the Google login UI hint only. It is NOT enforced server-side by Google. Google's own documentation (while not prominently warning about this) does not claim it as a security feature.
**Consequences:** Personal Gmail accounts bypass the workspace-only restriction. Undermines the B2B-only positioning.
**Prevention:** ALWAYS validate the `hd` claim in the ID token/profile server-side in the Auth.js `signIn` callback. Block sign-in if `profile.hd` is undefined (personal Gmail) or doesn't match allowed domains.
**Detection:** Manually test: craft an OAuth URL without the `hd` parameter and attempt sign-in with a personal Gmail.

### Pitfall 4: Calendar Watch Channels Expire Silently After 7 Days

**What goes wrong:** App creates watch channels for calendar push notifications. After 7 days, channels silently expire. The app stops receiving notifications. No error is thrown -- notifications simply stop arriving.
**Why it happens:** Google enforces a maximum ~7-day TTL on watch channels. There is no automatic renewal. The creation response includes an `expiration` timestamp, but many developers don't build renewal logic.
**Consequences:** Calendar sync appears to work for the first week, then silently breaks. Users see stale data. No errors in logs because the failure is the absence of incoming webhooks, not an API error.
**Prevention:** Store channel expiry in `google_integration.calendar_channel_expiry`. Run a Vercel cron job daily that renews channels expiring within 24 hours. Create new channel before old one expires. Log renewal events. Monitor for channels past expiry without renewal.
**Detection:** Check google_integration table for rows where calendar_channel_expiry < NOW() and calendar_channel_id IS NOT NULL.

### Pitfall 5: OAuth Scope Verification Blocks Production Launch

**What goes wrong:** Team builds entire Calendar + Tasks integration, deploys to production, then discovers that sensitive scopes require Google OAuth verification. Unverified apps show a scary "This app isn't verified" warning screen and are limited to 100 users in test mode.
**Why it happens:** During development, test users added in Google Cloud Console bypass verification entirely. The team never encounters the warning until a non-test user tries to sign in.
**Consequences:** 3-5 business day delay minimum (community reports up to 2-4 weeks) while verification completes. Must prepare: updated privacy policy, demo video showing each scope's usage, written justification per scope.
**Prevention:** Submit for OAuth verification AS SOON as scope requirements are finalized -- during development, not after. Run verification in parallel with feature development. Start preparing the demo video and privacy policy updates in the first sprint.
**Detection:** Check Google Cloud Console > APIs & Services > OAuth consent screen > Publishing status. If it says "Testing", you are not verified.

## Moderate Pitfalls

### Pitfall 1: FreeBusy Returns Busy Periods, Not Free Slots

**What goes wrong:** Developer expects the FreeBusy API to return available time slots. It returns an array of `busy` periods with start/end times. Developer must compute free slots from the inverse.
**Prevention:** Write a proper slot-finding algorithm: (1) merge busy periods from both calendars, (2) merge overlapping periods, (3) find gaps, (4) filter by working hours, (5) split into desired-duration slots. See ARCHITECTURE.md Pattern 4.

### Pitfall 2: Token Storage Without Encryption at Rest

**What goes wrong:** Google OAuth tokens stored as plaintext in the accounts table. A database breach exposes tokens that grant access to users' calendars and tasks -- the most sensitive workspace data.
**Prevention:** Encrypt tokens at rest with AES-256-GCM using per-tenant keys derived via HKDF. The project already has this pattern for private notes encryption. Reuse it.

### Pitfall 3: Race Condition in Token Refresh

**What goes wrong:** Multiple concurrent API calls (e.g., FreeBusy for manager + report) detect an expired access token simultaneously. Both attempt to refresh using the same refresh token. One succeeds; the other may get an invalid_grant error (Google may invalidate refresh tokens after use in some flows).
**Prevention:** Implement a per-user token refresh lock. When refresh is needed: acquire lock, check if another thread already refreshed (token may now be valid), refresh if still needed, update DB, release lock. Use PostgreSQL advisory locks or a simple row-level lock on google_integration.

### Pitfall 4: Tasks Conflict With No Resolution Strategy

**What goes wrong:** User edits action item title in the app. Meanwhile, the same item (now a Google Task) has its due date changed in Google Tasks. On next sync, one change overwrites the other.
**Prevention:** Use last-write-wins based on timestamps. Store `google_synced_at` on action items. On sync: compare Google task `updated` timestamp vs `action_item.updated_at` vs `google_synced_at`. If both changed since last sync, the most recent write wins. Consider showing a "modified externally" badge in the UI.

### Pitfall 5: Calendar Event Without Attendees

**What goes wrong:** App creates a calendar event on the manager's calendar but forgets to add the report as an attendee. The report never sees the meeting on their calendar.
**Prevention:** Always set `attendees: [{ email: managerEmail }, { email: reportEmail }]` in Events.insert. Set `sendUpdates: "all"` to trigger email invitations. Handle the case where the report hasn't connected Google Calendar (still add their email as attendee -- Google sends invite regardless).

### Pitfall 6: Timezone Mismatches in Slot Suggestions

**What goes wrong:** Manager in Bucharest (EET/EEST) and report in London (GMT/BST). FreeBusy returns UTC times. Slot suggestion displays wrong local times because timezone conversion is missing or uses a single timezone.
**Prevention:** Always query FreeBusy in UTC. Store meeting timezone from series settings. Convert suggested slots to each user's local timezone for display. Use the user's browser timezone or their profile timezone setting.

## Minor Pitfalls

### Pitfall 1: Google Tasks "My Tasks" Clutter

**What goes wrong:** App creates tasks in the user's default "My Tasks" list. Work action items mix with personal tasks, creating clutter and annoyance.
**Prevention:** On first Tasks sync enable, create a dedicated "1on1 Action Items" task list via `tasklists.insert`. Store the list ID in `google_integration.tasks_list_id`. All sync operations use this list exclusively.

### Pitfall 2: Calendar Event Description Encoding

**What goes wrong:** Event description with markdown or special characters renders as raw text or broken HTML in Google Calendar.
**Prevention:** Google Calendar supports a limited subset of HTML in descriptions: `<b>`, `<i>`, `<br>`, `<a href>`, `<ul>/<li>`. Use only these. Strip all other HTML. Test rendering in Google Calendar web UI and mobile app.

### Pitfall 3: Vercel Cron Timeout for Large User Sets

**What goes wrong:** Vercel cron function processes all users' Tasks sync sequentially. With 500+ users, it exceeds the function timeout (10s Hobby / 60s Pro / 300s max).
**Prevention:** Process users in batches. If >100 users need sync, fan out into multiple function invocations. Use Vercel's `maxDuration` config. Consider processing most-recently-active users first.

### Pitfall 4: Watch Channel Webhook Domain Verification

**What goes wrong:** Calendar push notification setup fails because the webhook URL domain hasn't been verified in Google Search Console.
**Prevention:** Before implementing watch channels, verify your production domain (e.g., `1on1.surmont.co` or the Vercel domain) in Google Search Console and register it in the Google Cloud Console for push notifications.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Workspace OAuth | hd parameter is UI-only hint | Server-side profile.hd validation in signIn callback |
| Token infrastructure | Refresh token not issued on incremental consent | Always pass prompt: "consent" + access_type: "offline" |
| Token infrastructure | Race condition on concurrent refresh | Per-user advisory lock in PostgreSQL |
| Calendar availability | FreeBusy returns busy periods, not free slots | Implement merge-invert-filter-split algorithm |
| Calendar availability | Timezone mismatches | Always work in UTC; convert for display per user |
| Calendar events | Event only on manager's calendar | Add both users as attendees; sendUpdates: "all" |
| Calendar push notifications | Watch channels expire silently after 7 days | Cron for renewal; monitor expiry; log events |
| Calendar push notifications | Webhook domain not verified | Verify domain in Google Search Console first |
| Tasks sync | No webhooks exist (at all) | Polling architecture from day one; set UX expectations |
| Tasks sync | Conflict on bidirectional changes | Last-write-wins with timestamp comparison |
| Tasks sync | Clutter in default task list | Create dedicated "1on1 Action Items" list |
| OAuth verification | Blocks production for 3-5+ business days | Submit during development, not after |

## Sources

- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) - channel expiry, reliability, domain verification - HIGH confidence
- [Auth.js Refresh Token Rotation](https://authjs.dev/guides/refresh-token-rotation) - refresh token behavior and race conditions - HIGH confidence
- [Google OAuth hd parameter discussions](https://github.com/zquestz/omniauth-google-oauth2/issues/220) - hd is UI-only, confirmed multiple sources - HIGH confidence
- [Google Sensitive Scope Verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification) - verification process, 3-5 day timeline - HIGH confidence
- [Google Tasks API Reference](https://developers.google.com/workspace/tasks/reference/rest) - no mention of push/watch - HIGH confidence
- [Google Calendar Quota Management](https://developers.google.com/workspace/calendar/api/guides/quota) - rate limiting behavior - MEDIUM confidence
