# Phase 6: Action Items & Session History - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Action items carry over between sessions creating accountability, and users can browse and search their complete session history. Includes: action item status management (open/done), dedicated action items page, automatic carry-over display, session history timeline, session summary detail view, global history page, full-text search via command palette, and History page search/filters. Does NOT include: AI-generated summaries (Phase 7), analytics charts or session comparison (Phase 8), email notifications (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Action item management
- Dedicated top-level nav item: "Action Items" page showing all open items across all series
- Items grouped by series (report name) on the dedicated page
- Simple status toggle: Open or Done (two states only, not the full 4-state flow)
- Action items are always editable after session completion — title, description, assignee, due date, status can be updated anytime
- Overdue items surfaced prominently within each series group

### Carry-over mechanics
- No explicit carry-over mechanism — open items are queried by series + status (always visible, not copied)
- `carriedToSessionId` column in schema not used for linking; open items from any session in the series appear in the context panel
- Items show a "from Session #X" badge with age/overdue indicator in the wizard context panel
- Items persist until explicitly marked done or cancelled — no auto-expiry

### Session history detail
- Clicking a completed session opens a **summary page** (single scrollable page, not a wizard replay)
- Summary shows everything: all answers grouped by category, shared notes, action items created, session score, duration, date
- Action items on summary page show **current/live status** (not historical snapshot)
- AI summary placeholder section included — ready for Phase 7 to populate
- In-progress (abandoned) sessions appear in timeline with a direct "Resume" button that reopens the wizard where user left off
- Both manager and report can view session history, but report does not see private notes or manager-only fields
- Session comparison deferred to Phase 8 analytics

### Global History page
- Separate top-level nav item: "History" — distinct from the "Sessions" (series card grid) page
- Sessions grouped by series, with a score trend sparkline per series group header
- Each session row shows: session number, date, score, status, duration
- Search bar + filters on the History page for focused browsing (date range, status, series/report)

### Command palette (Cmd+K)
- Global universal search accessible from anywhere in the app via Cmd+K
- Searches everything text-based: session notes, talking points, free-text answers, action item titles/descriptions, templates, people
- Role-based visibility — users only see results they have access to (report sees own sessions, manager sees reports' sessions, admin sees all)
- Search results show inline preview snippet, clicking navigates to the full session summary or relevant page
- Results grouped by type (sessions, action items, templates, people)

### History page search & filters
- History page has its own search bar in addition to the command palette (redundant but convenient for focused browsing)
- Filters: date range, session status (completed/in-progress), series/report
- Full-text search covers: shared notes, talking points, free-text answers, action item titles/descriptions

### Claude's Discretion
- Command palette component implementation (cmdk library or custom)
- Full-text search implementation approach (PostgreSQL tsvector vs application-level)
- Action items page layout details (table vs cards, sorting options)
- Session summary page layout and typography
- History page pagination approach
- Empty states across all new pages
- Mobile responsive behavior for command palette and new pages

</decisions>

<specifics>
## Specific Ideas

- Action items are a communication tool, not a project management feature (carried forward from Phase 5) — the dedicated page provides visibility, not workflow management
- "Simple toggle" for status reflects the philosophy: capture and track completion, outsource detailed management to Jira/Asana/etc.
- Command palette as the universal search entry point — gives the app a power-user feel while the History page search serves casual browsing
- Sparkline per series on History page gives quick visual trend without needing to go to analytics
- AI summary placeholder on session detail page ensures Phase 7 integration is seamless

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `action_item` schema (`src/lib/db/schema/action-items.ts`): Full schema with status enum, assigneeId, dueDate, category, carriedToSessionId — status enum has 4 values but we'll use only open/completed (done)
- Action item API (`src/app/api/sessions/[id]/action-items/route.ts`): GET, POST, PATCH already implemented with auth + RBAC checks
- `SessionTimeline` component (`src/components/series/session-timeline.tsx`): Basic timeline with status dots, scores, dates — needs click-through added
- `ContextPanel` component (`src/components/session/context-panel.tsx`): Shows open action items per category with session number badges — pattern for "from Session #X" display
- `ScoreSparkline` component (`src/components/session/score-sparkline.tsx`): Recharts sparkline — reusable for History page series headers
- Wizard shell and session page (`src/components/session/wizard-shell.tsx`, `src/app/(dashboard)/sessions/[id]/page.tsx`): Resume functionality can reuse existing wizard entry point
- `createActionItemSchema` / `updateActionItemSchema` in `src/lib/validations/session.ts`: Existing Zod validation schemas

### Established Patterns
- Card grid pattern (series page, teams page) — reusable for action items if card layout chosen
- Table pattern with client-side filtering (people directory) — reusable for action items list
- URL-based tab navigation (people/teams) — pattern for History page filters
- Server Component data fetch + Client Component interactivity (throughout app)
- Sidebar nav structure with sections (`src/components/layout/sidebar.tsx`) — needs "Action Items" and "History" items added

### Integration Points
- Sidebar: needs two new nav items (Action Items, History)
- Session detail page: needs new route `/sessions/[id]/summary` for read-only summary view
- Series detail page: SessionTimeline needs click handlers added
- Wizard: context panel already shows action items — add "from Session #X" badge with overdue indicator
- PostgreSQL: full-text search may need tsvector columns or pg_trgm extension for notes search
- No command palette library installed — needs `cmdk` or similar

</code_context>

<deferred>
## Deferred Ideas

- **Session comparison side-by-side** — Phase 8 analytics feature, not Phase 6 history
- **Action item velocity charts** — Phase 8 analytics, not Phase 6
- **Auto-cancel stale action items** — User decided to keep showing until resolved. Could revisit if clutter becomes an issue.
- **Background carry-over job** — Not needed since items are queried live by series + status. If performance becomes an issue, could pre-link items.

</deferred>

---

*Phase: 06-action-items-session-history*
*Context gathered: 2026-03-04*
