# Architecture Patterns: Analytics Everywhere

**Domain:** Contextual analytics surfacing
**Researched:** 2026-03-21

## Recommended Architecture

No architectural changes to the monolith. All new features follow the existing data flow:
- **Reads:** Server Components fetch data via Drizzle query functions
- **Components:** Presentational insight components receive data as props
- **Interactivity:** Client Components for dismissable cards, tooltips, drill-down links

### New Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `src/components/insights/*` | Render insight UI patterns (badges, cards, arrows) | Receives props from page-level Server Components |
| `src/lib/queries/analytics.ts` | New query functions for analytics data | Called by Server Components and API routes |
| `src/lib/queries/dashboard.ts` (extended) | Attention flags, cadence health, velocity queries | Called by overview page Server Component |
| Snapshot job (extended) | Compute anomaly flags, streak counts, score deltas weekly | Writes to `analytics_snapshot` table |

### Data Flow for Contextual Insights

```
Page Load (Server Component)
    |
    +--> getSeriesCardData() [existing, extended with delta]
    |       |
    |       +--> SeriesCard + DeltaBadge + StreakBadge
    |
    +--> getAttentionFlags() [new]
    |       |
    |       +--> AttentionCard (client, dismissable)
    |
    +--> getQuickStats() [existing]
    |       |
    |       +--> QuickStats + SentenceCard
    |
    +--> getCadenceHealth() [new]
            |
            +--> TrafficLightRow
```

### Component Architecture

```
src/components/insights/
  index.ts                 -- Re-exports all insight components
  sentence-card.tsx        -- Text-first KPI insight
  attention-card.tsx       -- Dismissable alert card
  delta-badge.tsx          -- Inline score change (+0.3)
  traffic-light.tsx        -- Status dot with tooltip
  trend-arrow.tsx          -- Directional trend icon
  streak-badge.tsx         -- Flame/snowflake icon
  category-concern-dot.tsx -- Red dot on avatar for low category
```

All are pure presentational components. No data fetching, no state management, no API calls. They accept typed props and render UI.

## Patterns to Follow

### Pattern 1: Server Component Data Fetching + Client Component Rendering

Already the standard in the codebase. Extend to new surfaces.

```typescript
// overview/page.tsx (Server Component)
const attentionFlags = await getAttentionFlags(tx, userId);

return (
  <section>
    {attentionFlags.length > 0 && (
      <AttentionCards flags={attentionFlags} />
    )}
  </section>
);
```

```typescript
// components/insights/attention-cards.tsx (Client Component)
"use client";
export function AttentionCards({ flags }: { flags: AttentionFlag[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    // Restore from localStorage
  });
  const visible = flags.filter(f => !dismissed.has(f.id)).slice(0, 2);
  // ...render
}
```

### Pattern 2: Extend Existing Queries, Don't Create Parallel Ones

The existing `getSeriesCardData()` already fetches `assessmentHistory`. Compute `scoreDelta` from this array rather than adding a new query:

```typescript
// In the SeriesCard component or data mapper
const scoreDelta = assessmentHistory.length >= 2
  ? assessmentHistory[assessmentHistory.length - 1] - assessmentHistory[assessmentHistory.length - 2]
  : null;
```

### Pattern 3: Dismissal State for Attention Cards

Use `localStorage` for MVP, migrate to DB table if cross-device persistence is needed:

```typescript
const STORAGE_KEY = "1on1:dismissed-insights";

function getDismissed(): Record<string, number> {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function dismiss(flagId: string) {
  const data = getDismissed();
  data[flagId] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isDismissed(flagId: string): boolean {
  const data = getDismissed();
  const ts = data[flagId];
  if (!ts) return false;
  // 14-day cooldown
  return Date.now() - ts < 14 * 24 * 60 * 60 * 1000;
}
```

### Pattern 4: Cached AI Narratives

Never generate AI narratives on page load. Pre-generate and store:

```typescript
// In the weekly snapshot job
async function generateWeeklyInsights(tenantId: string) {
  const users = await getActiveUsers(tenantId);
  for (const user of users) {
    const categoryData = await getCategoryBreakdown(user.id);
    const narrative = await generateGrowthNarrative(categoryData);
    await upsertSnapshot({
      userId: user.id,
      metricName: "growth_narrative",
      // Store narrative text in a dedicated column or as JSON
    });
  }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Fetching Analytics Data Client-Side

**What:** Using TanStack Query to fetch analytics data in client components.
**Why bad:** Causes loading spinners on every card. Server Components can fetch in parallel on the server and render instantly.
**Instead:** Fetch all insight data in the Server Component page, pass as props to client components.

### Anti-Pattern 2: One Component, One Query

**What:** Each insight component fetches its own data independently.
**Why bad:** N+1 query problem. Dashboard with 5 insight types = 5 round trips.
**Instead:** Batch all dashboard queries in `Promise.all()` (already done in `overview/page.tsx`).

### Anti-Pattern 3: LLM Calls on Page Load

**What:** Generating AI narrative insights when the dashboard loads.
**Why bad:** 1-3 second latency per generation. Makes the page feel slow.
**Instead:** Pre-generate in background job, serve cached results.

### Anti-Pattern 4: Showing Everything Everywhere

**What:** Adding all possible metrics to every surface.
**Why bad:** Cognitive overload. Research shows 3-5 data points per mobile screen, 15-20 per desktop.
**Instead:** One hero metric per context. Score on cards. Attention on dashboard. Heatmap on team. Trends on profile.

## Scalability Considerations

| Concern | 10 managers | 100 managers | 1000 managers |
|---------|-------------|-------------|-------------|
| Dashboard query count | 5 queries, instant | 5 queries, still instant (indexed) | 5 queries, add connection pooling |
| Attention flag computation | In-query (compare 2 rows per report) | In-query, still cheap | Move to snapshot job, serve from cache |
| AI narrative generation | ~50 users * $0.002 = $0.10/week | ~500 users * $0.002 = $1/week | ~5000 users * $0.002 = $10/week |
| Snapshot table size | ~500 rows/month | ~5000 rows/month | ~50K rows/month, add partition by period_start |

## Sources

- Codebase: `src/app/(dashboard)/overview/page.tsx`, `src/lib/queries/dashboard.ts`, `src/components/dashboard/quick-stats.tsx`
- [Smashing Magazine: UX Strategies for Real-Time Dashboards](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
