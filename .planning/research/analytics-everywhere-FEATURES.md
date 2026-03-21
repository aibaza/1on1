# Feature Landscape: Analytics Everywhere

**Domain:** Contextual analytics surfacing for 1:1 meeting management
**Researched:** 2026-03-21

## Table Stakes

Features users expect when analytics are promised to be "everywhere." Missing = feels like a half-measure.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Score delta on series cards | Every competitor shows change, not just current value | Low | Subtract last 2 scores from existing data |
| "Last time" recap in wizard | Lattice and 15Five both show context during 1:1s | Low | Data already in `session.ai_summary` |
| Overdue session indicator | Basic accountability signal | Low | Date comparison, no query |
| Personal analytics for reports | Reports need to see their own growth | Medium | New page, reuses existing chart components |
| Trend arrows on category labels | Directional indicators are baseline in any analytics product | Low | Simple comparison, icon display |
| Drill-down from any insight to full view | Progressive disclosure is expected, dead-end summaries frustrate | Low | Wrap insights in `<Link>` components |

## Differentiators

Features that set the product apart. Not expected, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Attention-needed cards | "Your dashboard tells you who needs help" -- proactive, not reactive | Medium | New query + component, key differentiator |
| Contextual nudges in wizard steps | AI coaching appears exactly when relevant, not in a separate section | Medium | Filter existing nudges by category, display inline |
| Meeting cadence health grid | Visual accountability for manager consistency | Medium | New query, traffic light display |
| Streak badges | Gamification of meeting consistency | Low | Fun motivational signal |
| Team sentence insights | "3 of 5 improved" -- instant team pulse without opening analytics | Low | Template sentence, no AI needed |
| Focus areas identification | Auto-identify top 2 improvement categories per report | Medium | AI or rules-based ranking |
| Positive anomaly callouts | "Alex improved 1.2 points!" -- balances warning bias | Low | Same detection logic, different framing |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time score updates during session | Session is in progress, score is incomplete and misleading | Show score only after session completion |
| Auto-generated recommendations without context | Generic "improve engagement" suggestions add no value | AI nudges should reference specific session data |
| Leaderboard / ranking of reports | Creates toxic competition, not growth culture | Show individual trends, never comparative rankings |
| Score notifications to reports via email | Feels like surveillance, creates anxiety | Reports access their own data on their profile, at their pace |
| Dashboard-level charts (line charts, bar charts) | Dashboard is for action, not analysis | Charts live on analytics pages; dashboard shows KPI cards and sentence insights only |
| Animated counters or transitions | Against existing codebase pattern (`isAnimationActive={false}`) | Static rendering, faster page loads |
| Color-coded everything | Alert fatigue + accessibility issues | Use color sparingly: amber for warnings, green for positive. Most elements use muted/neutral colors. |

## Feature Dependencies

```
Score delta badge -> (no dependency, Phase 1)
"Last time" recap -> session.ai_summary exists (already shipped)
Attention cards -> Score delta computation (simple, same query)
Cadence health -> meeting_series.next_session_at (already exists)
Personal profile -> ScoreTrendChart + CategoryBreakdown components (already exist)
Inline wizard nudges -> ai_nudge table with category (already exists)
Team sentence insight -> analytics_snapshot team-level data (already computed)
Focus areas -> Category breakdown data (depends on getCategoryBreakdown query)
Anomaly detection -> Extended snapshot job (Phase 4)
AI weekly insights -> Extended snapshot job + AI pipeline (Phase 4)
Streak badges -> Session history (already queried for sparklines)
```

## MVP Recommendation

Prioritize:
1. **Score delta badge** -- lowest effort, highest visibility improvement (every series card)
2. **"Last time" recap** -- transforms wizard preparation experience
3. **Personal profile for reports** -- addresses biggest gap (member role has no analytics)
4. **Attention-needed cards** -- the headline differentiator

Defer:
- **AI weekly insights**: valuable but requires snapshot job extension and AI cost budgeting
- **Focus areas**: needs anomaly detection foundation first
- **Streak badges**: nice-to-have, not core value

## Sources

- [15Five Pulse Dashboard](https://success.15five.com/hc/en-us/articles/360002672092-Check-ins-Pulse-dashboard-reports)
- [Lattice 1:1 Features](https://lattice.com/platform/performance/one-on-ones)
- [NNGroup Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)
