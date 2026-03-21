# Research Summary: Google Workspace Integration

**Domain:** Google Workspace API Integration (OAuth + Calendar + Tasks)
**Researched:** 2026-03-21
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

Google Workspace integration for the 1on1 app involves three distinct capabilities: workspace-only OAuth restriction, Google Calendar availability checking with event creation, and Google Tasks bidirectional sync. The existing Auth.js v5 + Google OAuth setup provides a solid foundation -- the `hd` parameter plus server-side token validation restricts login to workspace domains, and the DrizzleAdapter already stores account records that can hold access/refresh tokens.

Calendar integration is well-supported. The FreeBusy API allows querying multiple calendars simultaneously to find common free slots between manager and report. Push notifications via watch channels enable near-real-time event change detection, though channels expire weekly and require renewal. The Calendar API has granular scopes -- we can use `calendar.events.freebusy` for availability (least privilege) and `calendar.events.owned` for creating meeting events.

Tasks integration is more constrained. The Google Tasks API is a simple CRUD REST API with only two scopes (full access or read-only). Critically, there are NO push notifications or webhooks for Tasks -- this is a significant architectural constraint. Bidirectional sync requires polling, which introduces complexity around conflict resolution, polling intervals, and stale data. The Tasks data model is also limited: title, notes, due date, status (needsAction/completed) -- no priority, no custom fields, no assignee concept.

The Google OAuth verification process is the critical path item. Calendar and Tasks scopes are classified as "sensitive" (not restricted), requiring a 3-5 business day review with a demo video and scope justification. This must be completed before any production user outside the development team can use these features.

## Key Findings

**Stack:** Auth.js v5 Google provider with `access_type: "offline"` + `prompt: "consent"` for refresh tokens. Store tokens in DB via account table. Incremental consent for Calendar/Tasks scopes post-login. Only new dependency: `googleapis` npm package.

**Architecture:** Calendar uses FreeBusy API + watch channels for near-real-time sync. Tasks requires polling (no webhooks exist) with last-write-wins conflict resolution. Separate sync service with per-user sync state tracking.

**Critical pitfall:** Google Tasks API has NO push notification support. Bidirectional sync must use polling, making real-time sync impossible. Design the UX around "sync on demand" + background polling rather than promising instant sync.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase: Workspace OAuth Restriction + Token Infrastructure** - Low complexity, high value
   - Addresses: Domain restriction, token storage, refresh token rotation, encryption
   - Avoids: Scope verification delays (basic profile scopes already verified)
   - Estimate: 1-2 days

2. **Phase: Google Calendar - Availability + Scheduling** - Medium complexity, high value
   - Addresses: FreeBusy API, common slot finding, meeting time suggestion UI
   - Avoids: Full event sync complexity (read-only first)
   - Requires: Sensitive scope verification (calendar.events.freebusy)

3. **Phase: Google Calendar - Event Creation + Push Notifications** - Medium complexity
   - Addresses: Creating calendar events for scheduled sessions, watch channels for change detection
   - Builds on: Phase 2 token infrastructure
   - Requires: Additional scope (calendar.events.owned)

4. **Phase: Google Tasks Sync** - High complexity, medium value
   - Addresses: Action item push to Google Tasks, then bidirectional sync
   - Avoids: Over-promising real-time sync (polling-based)
   - Requires: Polling infrastructure, conflict resolution, sync state management

**Phase ordering rationale:**
- OAuth restriction is prerequisite infrastructure with zero API verification needed
- Calendar availability is the highest-value integration (scheduling is core to 1:1 meetings)
- Calendar event creation builds incrementally on availability infrastructure
- Tasks sync is most complex and least critical -- defer until Calendar is solid

**Research flags for phases:**
- Phase 2-3: Google OAuth sensitive scope verification needed BEFORE production launch (3-5 business days minimum; submit early)
- Phase 4: Needs deeper research into polling strategies and conflict resolution patterns at scale

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| OAuth/hd restriction | HIGH | Well-documented, multiple sources confirm approach |
| Calendar FreeBusy API | HIGH | Official docs clearly document request/response format |
| Calendar push notifications | HIGH | Official docs with full implementation details |
| Tasks API capabilities | HIGH | Confirmed: no webhooks, simple CRUD only |
| Tasks sync patterns | MEDIUM | No official guidance; patterns derived from community experience |
| Auth.js v5 token management | MEDIUM | Official guide exists but incremental consent is under-documented |
| Scope verification timeline | MEDIUM | Google says 3-5 days but community reports vary (days to weeks) |
| Rate limits | LOW | Google does not publish exact per-minute numbers; only viewable in Cloud Console |

## Gaps to Address

- Exact per-minute quota numbers for Calendar API (only visible in Cloud Console per-project)
- Google Tasks API polling best practices at scale (100+ users syncing)
- Auth.js v5 incremental consent implementation -- limited official docs, may need custom signIn flow
- Whether Google Workspace admin consent can be used for org-wide token grant vs per-user consent
- Google Tasks task object full property schema (title, notes, due, status, links, etc.)
