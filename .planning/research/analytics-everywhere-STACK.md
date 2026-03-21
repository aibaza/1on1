# Technology Stack: Analytics Everywhere

**Project:** Analytics Everywhere
**Researched:** 2026-03-21

## Recommended Stack

No new libraries or dependencies required. This milestone is purely about surfacing existing data through new UI components and extended queries.

### Core (Existing, No Changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Recharts | current | All chart rendering (sparklines, line charts, bar charts, radar) | Already used for all analytics. Supports all needed chart types. |
| shadcn/ui | current | Card, Badge, Tooltip, Avatar components | Already the UI foundation. Insight components extend these primitives. |
| Tailwind CSS 4 | current | Styling for all new insight components | Existing utility classes cover all needed patterns (color, spacing, responsive). |
| TanStack Query | current | Client-side data fetching for interactive analytics | Already used for all client-side data. |
| Drizzle ORM | current | New query functions for analytics data | Existing query patterns in `src/lib/queries/` are the template. |

### AI Pipeline (Existing, Extended)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel AI SDK | current | Generate cached narrative insights | Already configured with Anthropic. Used for session summaries. |
| Anthropic Claude (Haiku) | current | Weekly profile/team insight generation | Haiku model for cost efficiency on templated generation tasks. |

### No New Dependencies

| Category | Considered | Decision |
|----------|-----------|----------|
| Charting library | D3, Nivo, Victory | Recharts handles all needed patterns. No reason to add complexity. |
| Animation library | Framer Motion | Not needed. All analytics are static (no animation per existing pattern). |
| Data grid | AG Grid, TanStack Table | Heatmap is custom component, not a data grid use case. |
| Real-time | WebSockets, SSE | Not needed. Snapshot-based refresh is sufficient for all surfaces. |

## New Components to Create

These are purely presentational components, not library dependencies:

| Component | Location | Uses |
|-----------|----------|------|
| `sentence-card.tsx` | `src/components/insights/` | shadcn Card, Lucide icons |
| `attention-card.tsx` | `src/components/insights/` | shadcn Card, Avatar, Badge, Button |
| `delta-badge.tsx` | `src/components/insights/` | Plain `<span>` with Tailwind classes |
| `traffic-light.tsx` | `src/components/insights/` | Plain `<span>` with Tooltip |
| `trend-arrow.tsx` | `src/components/insights/` | Lucide TrendingUp/TrendingDown/Minus |
| `streak-badge.tsx` | `src/components/insights/` | Lucide Flame/Snowflake |

## New Query Functions

| Function | Location | Existing Pattern to Follow |
|----------|----------|---------------------------|
| `getAttentionFlags()` | `src/lib/queries/dashboard.ts` | Follows `getOverdueActionItems()` pattern |
| `getCadenceHealth()` | `src/lib/queries/dashboard.ts` | Follows `getQuickStats()` pattern |
| `getActionVelocity()` | `src/lib/queries/dashboard.ts` | Follows `getQuickStats()` pattern |
| `getCategoryBreakdown()` | `src/lib/queries/analytics.ts` (new file) | Follows `getStatsTrends()` pattern |
| `getProfileInsights()` | `src/lib/queries/analytics.ts` (new file) | Follows `getRecentSessions()` pattern |

## Sources

- Codebase analysis of existing `src/components/analytics/`, `src/lib/queries/`, and `src/components/dashboard/`
