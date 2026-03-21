# Feature Landscape: Google Workspace Integration

**Domain:** Google Workspace Integration for 1:1 Meeting SaaS
**Researched:** 2026-03-21

## Table Stakes

Features users expect from a "Google Workspace integration."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Workspace-only login restriction | B2B SaaS targeting companies; personal Gmail should not work | Low | `hd` param + server-side validation in signIn callback |
| View calendar availability | "See when we're both free" is the core scheduling need | Medium | FreeBusy API for both manager + report |
| Suggest meeting times | Finding common free slots between manager + report | Medium | Algorithm on top of FreeBusy response data |
| Create calendar events | Sessions should appear on Google Calendar | Medium | Calendar Events API with attendees |
| Action items in Google Tasks | Users live in Google; action items should follow them there | High | One-way push is table stakes; bidirectional is differentiator |

## Differentiators

Features that set the product apart from basic calendar integrations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Smart scheduling with cadence awareness | Suggest slots that match the series cadence (e.g., every other Tuesday at 2pm) | Medium | Combine FreeBusy with series cadence metadata |
| Pre-populated calendar event with agenda | Event description includes talking points, template name, session link back to app | Low | Template string in event.description (supports basic HTML) |
| Calendar event auto-update on reschedule | If session is rescheduled in-app, calendar event updates automatically | Medium | Store eventId in sessions table, use Events.patch |
| Two-way task status sync | Complete in Google Tasks -> completes in app (and vice versa) | High | Polling + conflict resolution (no webhooks on Tasks) |
| Task context enrichment | Google Task notes include session context link and assignee info | Low | Append metadata to task.notes field |
| Availability-aware nudges | "You have a 1:1 with X tomorrow but no free slot -- reschedule?" | Medium | Combine session schedule with FreeBusy check |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full calendar sync (read all events) | Privacy nightmare; we need availability, not event details | Use FreeBusy API -- returns only busy/free, not event titles or details |
| Google Workspace Add-on / sidebar | Massive development overhead, separate Marketplace review, limited embedded UI | Standalone OAuth app; include deep links in calendar event descriptions |
| Admin-consented org-wide access | Requires Workspace Marketplace listing, admin approval flow, complex setup | Per-user consent; each user grants their own calendar/tasks access in settings |
| Real-time Tasks sync | Google Tasks has NO webhooks; cannot receive push notifications | Sync on session start/end + periodic background poll (5 min) + manual "Sync Now" |
| Google Meet auto-creation | Scope creep; video conferencing is not our value prop | Let users add their own Meet/Zoom link in meeting series settings |
| Shared "1on1" calendar creation | Creates clutter; users don't want another calendar | Put events on user's primary calendar |
| Reading event titles/details | Only need free/busy status; reading events requires broader scope | calendar.events.freebusy scope is sufficient and less scary for users |

## Feature Dependencies

```
Workspace OAuth Restriction
  └── (standalone, no dependencies)

Token Infrastructure (refresh, encrypt, store)
  ├── Calendar Availability (FreeBusy API)
  │   └── Calendar Event Creation (Events.insert)
  │       └── Calendar Push Notifications (watch channels)
  │           └── Calendar Event Auto-Update (Events.patch on change)
  │
  └── Tasks One-Way Push (app -> Google Tasks)
      └── Tasks Bidirectional Sync (polling + conflict resolution)
```

## MVP Recommendation

**Build in this order:**

1. **Workspace-only OAuth restriction** - Zero new API scopes, immediate value for B2B positioning, low effort
2. **Token infrastructure** - Encrypted storage, refresh rotation, scope tracking -- foundation for everything
3. **Calendar availability + slot suggestion** - Core scheduling value; uses minimal scope (freebusy only)
4. **Calendar event creation** - Sessions appear on both users' calendars with agenda in description
5. **One-way Tasks push** (app -> Google Tasks) - Action items appear in Google Tasks; no conflict resolution needed yet

**Defer to post-MVP:**
- **Bidirectional Tasks sync**: High complexity, requires polling infra and conflict resolution. Ship one-way push first, validate demand, add pull later.
- **Calendar push notifications (watch channels)**: Optimization, not MVP. Poll on session page load instead. Watch channels add operational complexity (renewal cron, failure handling).
- **Calendar event auto-update on reschedule**: Ship after event creation is stable and tested.

## Sources

- [Google Calendar FreeBusy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy) - HIGH confidence
- [Google Tasks API Reference](https://developers.google.com/workspace/tasks/reference/rest) - HIGH confidence
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) - HIGH confidence
- [Google OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes) - HIGH confidence
