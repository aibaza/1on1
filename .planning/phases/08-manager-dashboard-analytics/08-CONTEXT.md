# Phase 8: Manager Dashboard & Analytics - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Managers get a home screen that surfaces everything they need (upcoming sessions, overdue items, quick stats, recent sessions) and analytics charts reveal trends across sessions and teams. Includes: dashboard home screen, individual analytics (score trends, category breakdown, session comparison), team analytics (aggregated scores, heatmap), analytics snapshot computation, and CSV export. Does NOT include: email notifications (Phase 9), dark mode (Phase 10), live AI suggestions during sessions (v2).

</domain>

<decisions>
## Implementation Decisions

### Dashboard home layout
- Lead with upcoming sessions (next 7 days) as the primary section
- AI nudges integrated within each upcoming session card — not a separate section. Each card shows the session details + nudge count/preview inline
- AI nudges use full session history as context (not limited to last 3 sessions) for richer, more relevant suggestions
- Overdue action items grouped by report with days overdue count per item (matches DASH-02)
- Recent completed sessions display is configurable via user settings — two modes: compact list (report, date, score, link) or cards with AI summary snippet
- Quick stats section: total reports, sessions this month, average session score
- "Start session" quick action button on today's scheduled sessions (DASH-05)

### Analytics page structure
- Separate pages with deep-linkable URLs: /analytics (overview), /analytics/individual/[id] (per-person), /analytics/team/[id] (per-team)
- Period selector offers fixed presets (Last 30 days, Last 3 months, Last 6 months, Last year) plus a custom date range picker
- Reports (members) can see their own individual analytics (score history, category breakdown) — but NOT team analytics or other members' data
- Managers see analytics for their direct reports; admins see organization-wide
- Session-over-session comparison (ANLT-03): delta table showing each category with +/- score change between two selected sessions

### Chart visual style
- Color palette: Claude's discretion — choose something clean and consistent with the app's design language
- Team heatmap (ANLT-05): dot matrix style — dots with size + color encoding score values. Apple-like, not a traditional colored grid
- Insufficient data handling: show partial chart with what exists + subtle message "More data after 3+ sessions" — never hide data that exists
- Score trend: line chart (ANLT-01), category breakdown: bar chart (ANLT-02)
- Action item velocity (ANLT-06) and meeting adherence (ANLT-07): chart type at Claude's discretion

### CSV export
- Both full export and per-view export available (ANLT-09)
- Full export: one CSV with all session data (answers, scores, dates, action items) for the selected period
- Per-view export: export button on each chart/table exports just the data currently displayed

### Snapshot computation
- Compute analytics snapshots on session completion via Inngest event
- Sessions have an ingestion flag — mark as ingested within the same DB transaction as the snapshot write (atomic: ingest + mark)
- Cron safety net: periodic Inngest job scans for completed sessions not yet marked as ingested, retries ingestion
- This ensures no session data is ever silently lost if the initial Inngest job fails

### Claude's Discretion
- Dashboard section ordering (after upcoming sessions at top)
- AI nudge placement within session cards (inline preview vs expand-on-click)
- Color palette for all charts
- Chart types for action item velocity and meeting adherence
- Live query fallback strategy when snapshots are missing
- Analytics overview page content (what summary to show before drilling into individual/team)
- Responsive behavior for charts on smaller screens
- Empty states for analytics pages with no data yet

</decisions>

<specifics>
## Specific Ideas

- Upcoming session cards with integrated nudges should feel like a "briefing" — manager opens the app, sees what's next, and the AI context is right there. No extra clicks to prepare.
- Full session history as AI context is important — the longer the history, the more valuable the nudges become. This is the core product differentiator.
- Dot matrix heatmap should feel modern and clean — more like a data visualization in a design portfolio than a spreadsheet.
- Configurable recent sessions display acknowledges that different managers have different information density preferences — power users want compact, casual users want richer previews.
- Delta table for session comparison keeps it scannable — managers care about "what changed" not about comparing raw numbers side by side.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NudgeCard` component (`src/components/dashboard/nudge-card.tsx`): Existing nudge display — needs refactoring to integrate into session cards instead of standalone grid
- `NudgeCardsGrid` (`src/components/dashboard/nudge-cards-grid.tsx`): Groups nudges by report — logic reusable for mapping nudges to session cards
- `ScoreSparkline` (`src/components/session/score-sparkline.tsx`): Recharts mini line chart — reusable for dashboard stat cards and analytics
- `SessionTimeline` (`src/components/series/session-timeline.tsx`): Timeline with scores — pattern for recent sessions display
- `SeriesCard` (`src/components/series/series-card.tsx`): Card layout with avatar, badge, button — pattern for upcoming session cards
- `ActionItemsPage` (`src/components/action-items/action-items-page.tsx`): Grouped lists with overdue detection — pattern for overdue items section
- Recharts 3.7 installed, only sparkline used so far — full chart library available
- 26+ shadcn/ui components including Card, Badge, Avatar, Select, Tabs

### Established Patterns
- Server Component data fetch + Client Component interactivity (throughout app)
- TanStack Query for client-side data fetching and mutations
- Card grid pattern (series page, teams page)
- URL-based tab navigation (people/teams)
- Inngest event-driven background functions with durable execution (Phase 7)
- `withTenantContext()` for all DB operations
- API route pattern: auth check → RBAC guard → Zod validation → withTenantContext → audit log

### Integration Points
- Dashboard overview page (`src/app/(dashboard)/overview/page.tsx`): Currently stub with nudges + welcome — needs full rebuild
- Analytics routes: new pages at `src/app/(dashboard)/analytics/`
- Analytics API routes: new at `src/app/api/analytics/` (snapshots, export)
- `analyticsSnapshots` schema (`src/lib/db/schema/analytics.ts`): Fully designed with metric_name/metric_value/period_type — ready to use
- Session schema needs `analyticsIngestedAt` timestamp column (null = not ingested)
- Inngest: add post-session snapshot computation function + cron sweep function
- Sidebar: needs "Analytics" nav item added

</code_context>

<deferred>
## Deferred Ideas

- **AI growth narratives** — "Over Q1, Alex improved communication by 23%..." (v2 feature AI-V2-03). Analytics builds the data foundation for this.
- **AI anomaly detection** — Proactive alerts for score drops (v2 feature AI-V2-04). Could trigger from snapshot computation.
- **Manager scoring/ranking** — Explicitly out of scope (see REQUIREMENTS.md). Show managers their own trends privately, never rank them.
- **PDF export with branding** — Deferred to v2 (MISC-04). CSV export covers v1 needs.

</deferred>

---

*Phase: 08-manager-dashboard-analytics*
*Context gathered: 2026-03-04*
