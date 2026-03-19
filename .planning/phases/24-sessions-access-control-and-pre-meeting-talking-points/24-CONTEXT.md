# Phase 24: Sessions Access Control and Pre-Meeting Talking Points - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Two features:
1. **Sessions page access control** — role-based filtering so each user sees only the series relevant to them, grouped by manager. Admins see all series grouped by manager name (own team first). Managers see two sections: their own team + series where they are the report. Members see only series where they are the report.
2. **Pre-meeting talking points** — both the manager and the report can add/manage talking points for an upcoming (scheduled) session directly from the sessions list page, via a sheet/drawer, without entering the wizard.

</domain>

<decisions>
## Implementation Decisions

### Sessions page — Admin view
- All series grouped by manager name, each manager is a section header
- If the logged-in admin is also a manager (has direct reports), their group appears first with a "(You)" label beside their name
- Remaining groups sorted alphabetically by manager name
- Admin with no direct reports still sees all other managers' groups (no "You" group shown)

### Sessions page — Manager view
- Two distinct sections:
  1. **My Team** — series where the logged-in user is the manager
  2. **My 1:1s** — series where the logged-in user is the report (they are being managed)
- A user can appear in multiple "My 1:1s" entries (multiple managers is supported)
- On cards in the "My 1:1s" section: the logged-in user's name is shown as primary, manager's name shown in top-right in reduced-contrast (muted) text

### Sessions page — Member view
- Members see only series where they are the report — no grouping needed, flat list

### Pre-meeting talking points — Entry point
- An "Agenda" icon button is shown on the series card when a **scheduled** (upcoming, not yet started) session exists for that series
- Clicking opens a **sheet/drawer** with the pre-meeting agenda for that session
- Sheet header: person's name · Session N · date
- If no scheduled session exists for the series, the button is not shown

### Pre-meeting talking points — Categories
- Same category grouping as the wizard's context panel (General, Wellbeing, etc.)
- Points are grouped by category, same TalkingPointList component behaviour as inside the wizard

### Pre-meeting talking points — API change
- The POST `/api/sessions/[id]/talking-points` currently requires `status === "in_progress"` — this must be relaxed to also allow `status === "scheduled"` so pre-meeting agenda items can be added before the wizard is opened
- Both the manager and the report are allowed to add/edit/delete (already handled by `isSeriesParticipant` check)

### Claude's Discretion
- Exact sheet/drawer width and animation style
- Talking points count badge on the Agenda button (show count if points exist)
- Empty state messaging inside the sheet
- Whether to show the "discussed" toggle in pre-meeting mode (discussing before the meeting starts is unlikely but harmless — Claude may keep it or hide it with `readOnly` for `scheduled` status, and only allow full interaction when `in_progress`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sessions page
- `src/app/(dashboard)/sessions/page.tsx` — current sessions page (Server Component, calls getSeriesCardData with no user filter)
- `src/lib/queries/series.ts` — getSeriesCardData already has managerId/role/userId options; admin currently gets unfiltered results
- `src/components/series/series-list.tsx` — renders the series cards list
- `src/components/series/series-card.tsx` — individual series card component (where Agenda button will be added)

### Talking points
- `src/app/api/sessions/[id]/talking-points/route.ts` — talking points API (POST requires status === "in_progress" — must relax to "scheduled" too)
- `src/components/session/talking-point-list.tsx` — reusable TalkingPointList component (accepts sessionId, category, initialPoints, readOnly)
- `src/components/session/context-panel.tsx` — existing usage of TalkingPointList inside the wizard (reference for category structure)

### Auth / RBAC
- `src/lib/auth/rbac.ts` — isAdmin, isSeriesParticipant, canManageSeries helpers
- `src/lib/auth/config.ts` — auth() returns session with user.role, user.id, user.tenantId

### Data model
- `src/lib/db/schema/sessions.ts` — session statuses: "scheduled" | "in_progress" | "completed"
- `src/lib/db/schema/index.ts` — talkingPoints table export

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TalkingPointList` (`src/components/session/talking-point-list.tsx`): Fully built, handles create/toggle/delete optimistically. Takes `sessionId`, `category`, `initialPoints`, `readOnly`. Reuse directly in the pre-meeting sheet — no new component needed for the list itself.
- `getSeriesCardData()` (`src/lib/queries/series.ts`): Already supports `managerId`, `role`, `userId` filter options. The sessions page just needs to pass `{ role: session.user.role, userId: session.user.id }` and let the query handle filtering. The admin grouping by manager requires fetching manager user info alongside each series.
- `Sheet` / `Drawer` (shadcn/ui): Available in `src/components/ui/` — use for the pre-meeting agenda panel.

### Established Patterns
- Server Components fetch data directly; mutations via API routes with TanStack Query — talking points sheet will follow this pattern (SSR initial data, client mutations)
- `withTenantContext` wraps all DB operations — maintain this
- `isSeriesParticipant` already allows both manager and report — POST route only needs the status check loosened

### Integration Points
- `series-card.tsx` needs the Agenda button added, conditionally shown when `latestSession?.status === "scheduled"` or when a future scheduled session exists in the series data
- `getSeriesCardData()` returns `latestSession.id` and `latestSession.status` — can use this to gate the Agenda button; may need to also pass `latestSession.scheduledAt` for the sheet header date
- Sessions page needs to pass `userId` and `role` to `getSeriesCardData()` so filtering kicks in

</code_context>

<specifics>
## Specific Ideas

- Manager's name in "My 1:1s" card: shown top-right, small text, muted/reduced contrast — top-right corner of the card is currently free
- Admin's own group: labeled "FirstName LastName (You)" to distinguish
- Pre-meeting sheet header: "Alex Johnson · Session 4 · Mar 20" format (same as wizard header pattern)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-sessions-access-control-and-pre-meeting-talking-points*
*Context gathered: 2026-03-19*
