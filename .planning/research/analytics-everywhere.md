# Analytics Everywhere: Contextual Data Surfacing Patterns

**Domain:** Embedded contextual analytics for 1:1 meeting management SaaS
**Researched:** 2026-03-21
**Overall confidence:** HIGH (grounded in existing codebase analysis + industry patterns)

---

## Executive Summary

The founder's vision -- "make the data be visible always" -- aligns with a clear industry trend: modern SaaS products embed analytics contextually rather than isolating them on report pages. Products like 15Five, Lattice, Stripe, and Linear succeed not because they have better charts, but because they surface the right metric at the moment of decision.

The 1on1 platform already has strong analytics infrastructure: pre-computed `analytics_snapshot` table, sparklines on series cards, quick stats on the dashboard, AI-generated nudges, and sentiment-colored borders. The gap is not data availability -- it is data surfacing breadth. Currently, deep insights require navigating to `/analytics/*` pages. The opportunity is to bring those insights to the five surfaces where managers and reports already spend their time: dashboard, series/person cards, session detail/wizard, team view, and personal profile.

This document provides a surface-by-surface recommendation, a UI pattern catalog, a decision framework for AI narratives vs computed metrics, progressive disclosure strategy, mobile adaptation patterns, accessibility guidelines, and implementation priority ordering.

---

## 1. Surface-by-Surface Recommendations

### 1.1 Manager Dashboard (`/overview`)

**Current state:** Quick stats (3 cards with sparklines), upcoming series cards, overdue action items, recent sessions.

**What to add:**

| Insight | UI Pattern | Data Source | Priority |
|---------|-----------|-------------|----------|
| **Team pulse trend** | Sentence insight card | `analytics_snapshot` (avg engagement across reports) | P0 |
| **Attention needed** callout | Alert card with avatar + reason | Compare last 2 sessions per report, flag drops > 0.5 | P0 |
| **Meeting cadence health** | Traffic light row per report | `meeting_series.next_session_at` vs expected cadence | P1 |
| **Action item velocity** | Single KPI card with trend arrow | `action_items` avg days to completion, period-over-period | P1 |
| **Top improver / decliner** | Sentence insight | Compare 3-session rolling avg per report | P2 |

**Design guidance:**
- "Attention needed" card should appear between Quick Stats and Upcoming Sessions -- it is the highest-value contextual insight for a manager opening the app
- Use a warm amber background (not red) to avoid alarm fatigue. Red is reserved for critical system errors.
- Limit to max 2 attention cards. If 3+ reports need attention, show "2 more" link to analytics page.
- The sentence insight card pattern: `"Your team's average engagement is 3.8, up from 3.5 last month"` -- no chart, just a sentence with a bold number and a trend arrow.

### 1.2 Series / Person Cards (on dashboard + `/sessions` list)

**Current state:** Avatar, star rating, sparkline (assessment history + per-question layers), AI summary blurb with sentiment dot, cadence info, next session date.

**What to add:**

| Insight | UI Pattern | Data Source | Priority |
|---------|-----------|-------------|----------|
| **Score delta badge** | `+0.3` or `-0.5` pill next to stars | Compare last 2 session scores | P0 |
| **Streak indicator** | Small icon (flame/snowflake) | Count consecutive sessions without a miss | P1 |
| **Category concern dot** | Colored dot under avatar (like notification badge) | Lowest category score if < 3.0 | P1 |
| **Days since last session** | Muted text replacing "next session" when overdue | `meeting_series.next_session_at` | P0 |
| **Open action count** | Badge on card footer | `action_items` WHERE status IN ('open','in_progress') | P2 |

**Design guidance:**
- The score delta badge should be subtle: green text for positive, amber for negative, no background. Only show if delta magnitude >= 0.3 (avoid noise from tiny fluctuations).
- The streak indicator: a small flame icon for 5+ consecutive completed sessions. A snowflake for 2+ consecutive missed/cancelled. These are motivational/warning signals, not metrics.
- Do NOT add more sparklines. The existing layered sparkline is already dense. Add metadata badges instead.

### 1.3 Session Detail / Wizard Context Panel

**Current state:** Notes from last 3 sessions, open action items, score trends mini-chart (sparkline of last 6 sessions).

**What to add:**

| Insight | UI Pattern | Data Source | Priority |
|---------|-----------|-------------|----------|
| **Category radar (previous session)** | Small radar chart or horizontal bars | `session_answer` grouped by category | P0 |
| **"Last time" sentence** | Italic text block | AI-generated or template: "Last session (Mar 7): Score 3.8, discussed career growth concerns" | P0 |
| **Trend arrows per category** | Arrow icons next to category labels in wizard steps | Compare current session's category avg vs last 2 | P1 |
| **Relevant nudge inline** | Callout box within the wizard step | `ai_nudge` filtered by series + category match | P1 |
| **Action item follow-up prompt** | Checkbox reminder at top of wizard | Overdue items from this series | P0 |

**Design guidance:**
- The context panel is the "preparation surface" -- insights here should help the manager ask better questions during the session.
- "Last time" sentence is the single highest-value addition to the wizard. A manager glancing at a one-liner recap before starting is vastly more useful than scrolling through past session notes.
- Category trend arrows should be visible but not distracting: a subtle up/down/flat icon (not colored, just directional) next to the category header in the wizard step carousel.
- Nudges should appear contextually within the relevant wizard step (e.g., a career-related nudge appears in the Career step), not as a separate section.

### 1.4 Team View (`/teams/[id]`)

**Current state:** Team member list with basic info.

**What to add:**

| Insight | UI Pattern | Data Source | Priority |
|---------|-----------|-------------|----------|
| **Team heatmap (inline)** | Compact heatmap grid | `analytics_snapshot` by user + category | P0 |
| **Team pulse line** | Single sparkline showing team avg over time | `analytics_snapshot` team-level metric | P1 |
| **Meeting health grid** | Green/amber/red dots per member | Series cadence vs actual completion | P1 |
| **Team-level sentence insight** | Text card at top | Computed: "3 of 5 team members improved this month" | P2 |
| **Distribution mini-chart** | Dot plot or box plot | Session scores across team members | P2 |

**Design guidance:**
- The heatmap is the hero of the team view. It should be the first thing visible after the team name. Use the existing `team-heatmap.tsx` component but make it the default visible element, not hidden behind a tab.
- Meeting health grid: a simple row of circles (green = met cadence, amber = approaching overdue, red = missed last session). One row per member. No labels needed beyond the member name.
- Cap team sentence insights to one per load. Rotate or pick the most significant.

### 1.5 Personal Profile (Report's Own View)

**Current state:** No dedicated analytics surface for the report (member) role.

**What to add:**

| Insight | UI Pattern | Data Source | Priority |
|---------|-----------|-------------|----------|
| **My score trend** | Line chart (last 6 sessions) | `session.session_score` for their series | P0 |
| **Category breakdown** | Horizontal bar chart | `session_answer` grouped by category, last quarter | P0 |
| **My action items summary** | KPI card: X open, Y completed this month | `action_items` filtered by assignee | P1 |
| **Growth sentence** | AI-generated or template sentence | "Your engagement score improved from 3.2 to 4.0 over the last 3 months" | P1 |
| **Session history sparkline** | Mini timeline with dots | All sessions, colored by score band | P2 |

**Design guidance:**
- This is the most underserved surface. Reports currently have no "my analytics" view -- they only see data during active sessions or if they navigate to analytics pages (which are manager/admin oriented).
- Keep it positive and growth-oriented. Reports should feel empowered, not surveilled. Frame as "your growth" not "your scores."
- Limit to data the report already has access to per the privacy matrix (own session answers, own score trends, own action items).

---

## 2. UI Pattern Catalog

### 2.1 Sentence Insight Card

**When to use:** Summarizing a trend or comparison in natural language.
**Anatomy:**
```
+--------------------------------------------------+
|  [Icon]  Your team's engagement is 3.8            |
|          +0.3 vs last month  [arrow-up icon]      |
+--------------------------------------------------+
```
- One sentence, one bold number, one trend indicator
- Background: subtle fill (not bordered card). Use `bg-muted/50` in light mode.
- Icon: relevant Lucide icon at `size-4` in `text-muted-foreground`
- Works on all screen sizes without modification

**Existing pattern in codebase:** The `metric-card.tsx` component is close but chart-oriented. Sentence cards are text-first.

### 2.2 Score Delta Badge

**When to use:** Next to any existing score display to show change.
**Anatomy:** `+0.3` in green or `-0.5` in amber, `text-xs` weight.
```tsx
<span className={cn("text-xs font-medium tabular-nums",
  delta > 0 ? "text-green-600 dark:text-green-400" :
  delta < 0 ? "text-amber-600 dark:text-amber-400" :
  "text-muted-foreground"
)}>
  {delta > 0 ? "+" : ""}{delta.toFixed(1)}
</span>
```
- Only show when `|delta| >= 0.3` to avoid noise
- Position: inline after the score, separated by a thin gap

### 2.3 Traffic Light Indicator

**When to use:** Binary or ternary status at a glance (meeting health, action item status).
**Anatomy:** A `size-2` circle with semantic color.
```tsx
<span className={cn("inline-block size-2 rounded-full",
  status === "good" ? "bg-green-500" :
  status === "warning" ? "bg-amber-500" :
  "bg-red-500"
)} />
```
- Always pair with a tooltip explaining the status
- Never use color alone -- add a tooltip or adjacent text for accessibility

### 2.4 Trend Arrow

**When to use:** Next to a category label or metric name.
**Anatomy:** `TrendingUp`, `TrendingDown`, or `Minus` from Lucide at `size-3.5`.
- Green/amber/neutral coloring matching delta badge rules
- Only show when the trend is statistically meaningful (3+ data points, delta > threshold)

### 2.5 Attention Card

**When to use:** Dashboard-level alerts requiring manager action.
**Anatomy:**
```
+--------------------------------------------------+
| [Avatar] Alex's engagement dropped 0.8 in the    |
|          last 2 sessions. Consider discussing.    |
|                              [View] [Dismiss]     |
+--------------------------------------------------+
```
- Warm amber background: `bg-amber-50 dark:bg-amber-950/30`
- Dismissable (persisted to avoid re-showing). Store in `localStorage` keyed by `userId + metricId + period`.
- Max 2 visible. "See N more" links to analytics.
- NOT a toast or notification. It is a persistent card in the dashboard layout.

### 2.6 Contextual Nudge Inline

**When to use:** Inside the wizard, within a relevant step.
**Anatomy:**
```
+--------------------------------------------------+
| [Sparkles icon] AI suggests: Ask about workload  |
| changes -- Alex mentioned feeling overwhelmed     |
| last session.                   [Dismiss]         |
+--------------------------------------------------+
```
- Uses existing `ai_nudge` data, filtered by category matching the current wizard step
- Muted style: `border-l-2 border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20`
- Already partially implemented via nudge display on series cards. Extend to wizard context panel.

### 2.7 Mini Heatmap

**When to use:** Team view, showing user x category scores.
**Anatomy:** Existing `team-heatmap.tsx` component. Promote from analytics page to team detail page.
- Color scale: Red (1-2), Amber (2.5-3.5), Green (4-5) as already defined in docs
- Requires minimum 3 contributors for privacy

### 2.8 Streak Badge

**When to use:** Series card, showing meeting consistency.
**Anatomy:** Small icon next to cadence text.
- Flame icon (`Flame` from Lucide) at `size-3` for 5+ consecutive completed sessions
- Snowflake or pause icon for 2+ missed
- Only one badge at a time (most recent pattern wins)

---

## 3. AI Narrative vs Computed Metric Decision Framework

### When to Use Computed Metrics (Sparklines, Badges, Numbers)

| Criterion | Computed | AI Narrative |
|-----------|----------|-------------|
| **Latency tolerance** | Instant (pre-computed or simple SQL) | 1-3 seconds (LLM call) |
| **Cost per view** | ~$0 (database query) | $0.002-0.01 per generation (Claude Haiku) |
| **Frequency of viewing** | Every page load | Once per session/day |
| **Data type** | Numeric, trend, comparison | Synthesis, explanation, recommendation |
| **Staleness tolerance** | Can be real-time | Can be cached for hours |

### Decision Matrix

Use **computed metrics** for:
- Score delta badges (instant, every card load)
- Sparklines and trend arrows (instant, every page load)
- Traffic light indicators (instant, binary logic)
- KPI cards with numbers (instant, simple aggregation)
- Meeting adherence dots (instant, date comparison)

Use **AI narratives** for:
- "Last time" session recap sentence (generate once when session completes, cache in `session.ai_summary`)
- Growth sentences on personal profile (generate weekly, cache in `analytics_snapshot` or dedicated column)
- Attention-needed explanations (generate when anomaly detected, cache on the nudge record)
- Team-level sentence insights (generate weekly, cache)

Use **template sentences** (no AI, string interpolation) for:
- "{name}'s engagement is {score}, {delta} vs last month" -- pure data, no interpretation needed
- "3 of 5 team members improved" -- counting, no analysis
- "Next session in 2 days" -- date math

### Cost Projections

For a company with 10 managers, 40 reports, biweekly cadence:
- ~80 sessions/month = 80 AI summary generations = ~$0.80/month (Haiku)
- Weekly profile insights for 50 users = 200 generations/month = ~$2/month
- Weekly team insights for 10 teams = 40 generations/month = ~$0.40/month
- **Total: ~$3-5/month for AI narratives.** Negligible.

The cost concern is not per-generation price but latency. Never make a user wait for an LLM call on page load. Always pre-generate and cache.

### Caching Strategy

| Content | Generation Trigger | Cache Location | TTL |
|---------|-------------------|----------------|-----|
| Session recap sentence | Session completion | `session.ai_summary` (already exists) | Permanent |
| Series-level "last time" blurb | Session completion | `ai_nudge` or `meeting_series` metadata | Until next session |
| Profile growth sentence | Weekly snapshot job | `analytics_snapshot` with metric_name='growth_narrative' | 1 week |
| Team sentence insight | Weekly snapshot job | `analytics_snapshot` with metric_name='team_narrative' | 1 week |
| Attention-needed explanation | Anomaly detection in snapshot job | `ai_nudge` | Until dismissed |

---

## 4. Progressive Disclosure Strategy

### Three Levels

**Level 1 -- Glanceable (0 clicks):**
What the user sees without any interaction.
- Score delta badge on series card
- Trend arrows next to category names
- Traffic light dots for meeting health
- Sentence insight cards on dashboard
- Sparklines (already implemented)

**Level 2 -- Tooltip/Hover (0 clicks, hover):**
Details revealed on hover or long-press (mobile).
- Exact score and date on sparkline hover (already implemented via Recharts tooltip)
- Category breakdown on score badge hover
- Meeting adherence details on traffic light hover
- Explanation text on attention card hover

**Level 3 -- Drill-down (1 click):**
Full analytics view accessed by clicking any Level 1/2 element.
- Click score delta -> opens individual analytics page for that report
- Click attention card -> opens the specific session or series detail
- Click team heatmap cell -> opens individual analytics filtered to that category
- Click "Last time" sentence -> opens previous session detail

### Implementation Pattern

Every contextual insight element should be wrapped in a link or have an `onClick` that navigates to the full analytics view. This is the "always escapable" principle -- the user never feels trapped in a summary view.

```tsx
// Pattern: Every insight is a link to deeper detail
<Link href={`/analytics/individual/${userId}`}>
  <InsightCard metric={score} delta={delta} />
</Link>
```

### What NOT to Progressively Disclose

- Action items that need attention (show count prominently, not hidden)
- Meeting status (scheduled/overdue -- always visible)
- Score direction (up/down -- always visible via arrow)

---

## 5. Anomaly Callouts Without Alert Fatigue

### Detection Rules (Computed, No AI)

| Anomaly | Threshold | Visual Treatment |
|---------|-----------|-----------------|
| Score drop | >= 0.8 drop in single session | Amber attention card on dashboard |
| Score drop trend | 3 consecutive declining sessions | Amber attention card |
| Category crash | Any category drops below 2.5 | Red dot on series card avatar |
| Missed sessions | 2+ consecutive missed | Snowflake badge on series card |
| Action stagnation | 5+ open items with no completions in 30 days | Overdue items section emphasis |

### Fatigue Prevention

1. **Max 2 attention cards per dashboard load.** More than 2 creates noise.
2. **Dismissable with memory.** Dismissed cards do not return for the same metric+period. Store dismissals in `localStorage` (simple) or a `dismissed_insights` table (persistent across devices).
3. **Cooldown period.** After dismissal, same type of anomaly for same person does not resurface for 14 days.
4. **Severity gating.** Only "significant" anomalies surface (thresholds above). A 0.2 score drop is noise, not signal.
5. **Positive anomalies too.** "Alex improved 1.2 points this month" as a green card. Balances the negative bias.
6. **Never red on dashboard.** Use amber for warnings. Red means "system error" in the app's visual language. Anomaly callouts are informational, not critical.

---

## 6. Real-Time vs Snapshot Refresh Cadence

### Current Architecture

The `analytics_snapshot` table is computed weekly (Monday 2 AM), monthly (1st), and quarterly. Session scores are computed on completion.

### Recommended Cadence by Surface

| Surface | Data Source | Refresh Strategy |
|---------|-----------|-----------------|
| **Dashboard quick stats** | Live query (current month) | Real-time via Server Component on page load. Already implemented. |
| **Series card sparklines** | Live query (last 5 session scores) | Real-time. Already implemented via `getSeriesCardData`. |
| **Score delta badges** | Live query (last 2 sessions) | Real-time. Cheap query (2 rows per series). |
| **Attention cards** | Snapshot + live overlay | Weekly snapshot detects anomalies, dashboard checks if still relevant on load. |
| **Team heatmap** | `analytics_snapshot` | Weekly is sufficient. Heatmap data changes slowly. |
| **Category breakdowns** | `analytics_snapshot` | Weekly. |
| **Trend arrows on wizard** | Live query (last 3 sessions) | Real-time. Computed during wizard page load. |
| **Profile growth sentence** | Cached AI narrative | Weekly generation. |
| **Team sentence insight** | Cached AI narrative | Weekly generation. |

### When Real-Time is Worth It

Real-time (computed on page load) is worth it when:
- Data is small (< 10 rows per query)
- User expects freshness (just completed a session, wants to see updated score)
- The metric is tied to immediate action (overdue items, upcoming sessions)

Snapshot is preferred when:
- Aggregation spans many sessions/users (team averages)
- The metric is for trend analysis, not instant action
- Computation is expensive (cross-user comparisons)

### Recommended Addition to Snapshot Job

Add these metrics to the weekly snapshot computation:
- `score_delta` -- difference between last 2 sessions for each user
- `streak_count` -- consecutive completed/missed sessions
- `category_low` -- name of lowest category if below 3.0
- `attention_flag` -- boolean, true if any anomaly threshold is met

This avoids computing anomalies on every page load while keeping dashboard data fresh enough.

---

## 7. Mobile Adaptation Patterns

### Principles

- Desktop shows 15-20 data points simultaneously; mobile shows 3-5
- Replace hover tooltips with tap-to-reveal
- Horizontal swipe replaces date range pickers
- Stack cards vertically, never side-by-side on mobile

### Surface-Specific Mobile Adaptations

**Dashboard:**
- Quick stats: already responsive (3-col grid -> stacked). Good.
- Attention cards: full-width, swipeable carousel if > 1.
- Series cards: already stack vertically. Sparkline background works on mobile.

**Series Cards:**
- Score delta badge: visible by default (no hover-to-reveal on mobile)
- Streak badge: keep, it is small enough
- Category concern dot: keep, it is a simple dot

**Wizard Context Panel:**
- On mobile, context panel is likely collapsed or in a sheet/drawer
- "Last time" sentence: show as the first item in the collapsed summary (most valuable for mobile prep)
- Category radar: replace with simple horizontal bars (radar charts are hard to read on small screens)
- Nudges: show as collapsible cards within the step

**Team View:**
- Heatmap: horizontal scroll on mobile. Each row = one member. Columns = categories. Cells large enough for 44x44px touch target.
- Meeting health grid: stack vertically, one member per row

**Personal Profile:**
- Score trend: horizontal swipe for time navigation
- Category breakdown: horizontal bars (not vertical -- they fill width better on portrait screens)

### Touch Target Compliance

All interactive analytics elements must meet WCAG 2.5.5: minimum 44x44px touch target. This is already enforced for the AI nudge dismiss button (noted in v1.3 release). Extend to:
- Attention card dismiss button
- Heatmap cells (if clickable)
- Trend arrows (if they are links to drill-down)

---

## 8. Accessibility

### Color

- Never use color alone to convey meaning. Every colored element (traffic lights, heatmap cells, trend arrows) must have a text alternative, icon, or pattern.
- Existing heatmap uses emoji indicators (green/yellow/red circles) which partially addresses this. Add text labels for screen readers.
- Score delta badges use `+0.3` text in addition to green color. Good -- text carries the meaning even without color.
- Use the existing `--chart-1` through `--chart-5` CSS variables which are designed for contrast. Verify they pass 3:1 against background (WCAG 1.4.11 for non-text contrast).

### Screen Readers

- Sparklines: add `aria-label` describing the trend. Example: `aria-label="Score trend: increasing from 3.2 to 4.1 over 5 sessions"`.
- Heatmap: provide an accessible data table alternative. Add a toggle: "View as table" that renders the heatmap data as a standard HTML table with proper `<th>` scope attributes.
- Attention cards: use `role="alert"` and `aria-live="polite"` so screen readers announce them.
- Sentence insights: these are naturally accessible since they are plain text.

### Motion

- All Recharts animations are already disabled (`isAnimationActive={false}`). Maintain this -- it is good for `prefers-reduced-motion` users and improves performance.
- Trend arrows should not animate. Static icons only.

### Keyboard

- All drill-down links must be keyboard-navigable (standard `<Link>` or `<button>` elements).
- Attention card dismiss buttons must be focusable and operable via Enter/Space.

---

## 9. Competitive Analysis Summary

### 15Five

**Approach:** Pulse-centric. Every check-in captures a pulse score (1-5 "how did you feel at work"). This single metric is surfaced everywhere: dashboard, manager view, HR outcomes dashboard.

**Contextual surfaces:**
- Pulse Dashboard: trend over time, per-team, per-individual
- HR Outcomes Dashboard: top performers' pulse, engagement trends, retention signals
- AMAYA AI: conversational analytics that cross-references engagement + performance + turnover data
- Check-in question analytics: response rates and engagement by question

**Key insight for 1on1:** 15Five proves that a single pulse metric (our `session_score`) surfaced ubiquitously is more powerful than 10 metrics hidden on report pages. Their "Top Performers pulse" feature (tracking how best performers feel) is a clever pattern -- surface the pulse score of the people who matter most.

### Lattice

**Approach:** Context-at-decision-point. Managers see relevant analytics when having 1:1s, giving feedback, or in review cycles.

**Contextual surfaces:**
- 1:1 meeting page: historical context, past action items, score trends inline
- Adoption Dashboard: meeting cadence adherence, participation rates
- People Analytics: cross-reference performance + engagement + compensation
- Alerts: managers receive alerts when reports show declining trends

**Key insight for 1on1:** Lattice's "Adoption Dashboard" pattern (showing whether 1:1s are actually happening company-wide) is directly applicable. Our `meeting_adherence` metric exists but is only on the analytics page. Surface it on the admin/team views.

### Culture Amp

**Approach:** Survey-first with deep benchmarking. Their strength is comparing your data to industry benchmarks from thousands of companies.

**Contextual surfaces:**
- Survey results page: automated insights highlighting significant changes
- Manager dashboard: team health indicators with explanations
- Focus areas: AI-identified priorities based on survey data

**Key insight for 1on1:** Culture Amp's "Focus Areas" pattern -- automatically identifying the 2-3 categories that would most benefit from attention -- could be adapted. Instead of showing all 5 category scores equally, identify and highlight the 1-2 that represent the biggest opportunity.

### Linear

**Approach:** Velocity is the hero metric. Cycle time, throughput, and backlog health are embedded in every project view, not just in a separate analytics tab.

**Contextual surfaces:**
- Project view: inline velocity chart
- Issue list: cycle time labels per issue
- Dashboard: customizable widgets mixing work items and metrics

**Key insight for 1on1:** Linear's principle of "one hero metric per context" is directly applicable. On the series card, the hero metric is session score + trend. On the team view, it is the heatmap. On the dashboard, it is attention-needed cards. Do not try to show everything everywhere.

### Stripe

**Approach:** Financial clarity through hierarchy. Top-level widgets surface what matters (revenue, payments, balances). Drill into any widget for full detail.

**Contextual surfaces:**
- Dashboard: real-time KPI widgets with sparklines
- Every page: breadcrumb context showing aggregate above detail
- Notifications: smart alerts for unusual activity

**Key insight for 1on1:** Stripe's "top-level widget -> drill-down" pattern perfectly maps to our progressive disclosure strategy. Every insight card should be clickable to its full analytics view.

---

## 10. Implementation Priority

### Phase 1: Quick Wins (1-2 sprints, highest ROI)

These require minimal new data fetching and use existing infrastructure:

1. **Score delta badge on series cards** -- Subtract last 2 `sessionScore` values. Display inline. Data already available in `SeriesCardData`.
2. **"Last time" sentence in wizard context panel** -- Already have `session.ai_summary`. Extract first key takeaway. No new AI call needed.
3. **Days overdue indicator on series cards** -- Compare `nextSessionAt` to now. Red text if overdue.
4. **Report's personal score trend** -- Reuse `ScoreTrendChart` component, scoped to the member's own sessions. New page at `/overview` for member role.

### Phase 2: Dashboard Intelligence (2-3 sprints)

5. **Attention-needed cards on manager dashboard** -- New query: compare last 2 sessions per report, flag drops > 0.8. New UI component.
6. **Meeting cadence health row** -- Compute expected vs actual session dates per series. Traffic light display.
7. **Sentence insight card for team engagement** -- Template sentence using `analytics_snapshot` team-level data. No AI needed.
8. **Action item velocity KPI** -- New query: avg days from creation to completion this month vs last month.

### Phase 3: Team & Profile Views (2-3 sprints)

9. **Promote heatmap to team detail page** -- Move existing `team-heatmap.tsx` to team detail page as default view.
10. **Personal profile analytics page for reports** -- Score trend, category breakdown, action item summary, growth sentence.
11. **Inline nudges in wizard steps** -- Filter existing `ai_nudge` by category, display within relevant wizard step.

### Phase 4: Advanced Patterns (2-3 sprints)

12. **Anomaly detection in snapshot job** -- Add detection rules to weekly computation. Store flags in `analytics_snapshot`.
13. **AI-generated weekly profile insights** -- Generate cached growth sentences per user.
14. **Category focus areas** -- Automatically identify top 2 improvement opportunities per report.
15. **Streak badges on series cards** -- Compute consecutive session streaks.

### Rationale for Ordering

- Phase 1 items require zero new data infrastructure, only UI changes using data already fetched. They are the "free value" tier.
- Phase 2 adds the most differentiated feature (attention cards) which is the founder's core vision of "data visible always."
- Phase 3 addresses the biggest gap (report role sees no analytics, team view is bare).
- Phase 4 involves AI generation costs and more complex computation.

---

## 11. Technical Considerations

### New Queries Needed

| Query | Parameters | Returns | Used By |
|-------|-----------|---------|---------|
| `getScoreDelta(seriesId)` | seriesId | `{ delta: number, direction: 'up'|'down'|'flat' }` | Series card |
| `getAttentionFlags(managerId)` | managerId | `Array<{ reportId, reportName, reason, severity }>` | Dashboard |
| `getCadenceHealth(managerId)` | managerId | `Array<{ seriesId, reportName, status: 'good'|'warning'|'overdue' }>` | Dashboard |
| `getActionVelocity(userId, role)` | userId, role | `{ avgDays: number, delta: number }` | Dashboard KPI |
| `getCategoryBreakdown(userId)` | userId | `Array<{ category, score, trend }>` | Profile, wizard context |
| `getStreakCount(seriesId)` | seriesId | `{ count: number, type: 'completed'|'missed' }` | Series card |

### Extending `getSeriesCardData`

The existing `getSeriesCardData` query in `/src/lib/queries/series.ts` already fetches `assessmentHistory` (last 5 scores). Adding `scoreDelta` is trivial: `assessmentHistory[last] - assessmentHistory[second-to-last]`. No new DB query needed for Phase 1.

### Snapshot Job Extensions

The weekly snapshot job should be extended to compute:
```sql
-- Add to snapshot computation
INSERT INTO analytics_snapshot (metric_name, metric_value, ...)
VALUES
  ('score_delta', last_score - prev_score, ...),
  ('streak_completed', consecutive_completed_count, ...),
  ('attention_flag', CASE WHEN ... THEN 1 ELSE 0 END, ...);
```

### Component Architecture

Create a shared `InsightCard` component family:
```
src/components/insights/
  sentence-card.tsx      -- Text-first insight card
  attention-card.tsx     -- Amber alert card with avatar + dismiss
  delta-badge.tsx        -- Inline score change indicator
  traffic-light.tsx      -- Status dot with tooltip
  trend-arrow.tsx        -- Directional trend icon
  streak-badge.tsx       -- Flame/snowflake icon
```

These are purely presentational components. Data fetching stays in the page-level Server Components and query functions.

---

## Sources

### Competitive Analysis
- [15Five vs Culture Amp comparison](https://www.15five.com/blog/15five-vs.-culture-amp)
- [15Five Pulse Dashboard & Reports](https://success.15five.com/hc/en-us/articles/360002672092-Check-ins-Pulse-dashboard-reports)
- [15Five HR Outcomes Dashboard](https://success.15five.com/hc/en-us/articles/15565145319451-Use-the-HR-Outcomes-Dashboard)
- [Lattice People Analytics](https://lattice.com/analytics)
- [Lattice 1:1 Meeting Software](https://lattice.com/platform/performance/one-on-ones)
- [Lattice vs 15Five vs Culture Amp](https://www.outsail.co/post/lattice-vs-15five-vs-culture-amp-performance)

### Dashboard UX & Embedded Analytics
- [Dashboard UI Best Practices - LogRocket](https://blog.logrocket.com/ux-design/dashboard-ui-best-practices-examples/)
- [Dashboard Design Principles 2025 - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [UX Strategies for Real-Time Dashboards - Smashing Magazine](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [Create High-Impact Dashboards - RevealBI](https://www.revealbi.io/blog/create-high-impact-dashboards-with-embedded-analytics)
- [Dashboard UX Design - Lazarev](https://www.lazarev.agency/articles/dashboard-ux-design)

### Progressive Disclosure & Visualization
- [Progressive Disclosure - NNGroup](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure in Visualization - Dev3lop](https://dev3lop.com/progressive-disclosure-in-complex-visualization-interfaces/)
- [Mobile Data Visualization Best Practices - Boundev](https://www.boundev.com/blog/mobile-data-visualization-design-guide)

### Accessibility
- [10 Guidelines for DataViz Accessibility - Highcharts](https://www.highcharts.com/blog/tutorials/10-guidelines-for-dataviz-accessibility/)
- [Accessible Data Visualizations Checklist - A11Y Collective](https://www.a11y-collective.com/blog/accessible-charts/)
- [Data Charts for Color Blindness - Sigma](https://www.sigmacomputing.com/blog/data-charts-color-blindness)

### AI Analytics Cost
- [AI in SaaS Analytics - IBM](https://www.ibm.com/think/topics/ai-for-saas-analytics)
- [AI Pricing Playbook - Bessemer](https://www.bvp.com/atlas/the-ai-pricing-and-monetization-playbook)
