# Domain Pitfalls: Analytics Everywhere

**Domain:** Contextual analytics surfacing
**Researched:** 2026-03-21

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Alert Fatigue

**What goes wrong:** Surfacing too many attention signals overwhelms managers. They start ignoring all insights, defeating the entire purpose. 15Five and Lattice both had to dial back notification frequency based on user feedback.
**Why it happens:** Engineers tend to surface every available metric because "more data = better." In reality, more signals = noise.
**Consequences:** Managers dismiss all cards, disable notifications, or stop checking the dashboard. The "analytics everywhere" vision backfires into "analytics nowhere" because everything is ignored.
**Prevention:**
- Hard cap: max 2 attention cards per dashboard load
- Severity gating: only flag drops >= 0.8 (not every tiny fluctuation)
- Dismissal with 14-day cooldown
- Balance negative with positive anomalies ("Alex improved!" alongside "Sam declined")
- Use amber, never red. Red = system error in the app's visual language.
**Detection:** Track attention card dismissal rates. If > 70% of cards are dismissed within 5 seconds, thresholds are too sensitive.

### Pitfall 2: Surveillance Perception by Reports

**What goes wrong:** Reports (members) feel monitored rather than supported when scores, trends, and AI insights are visible everywhere. Trust breaks down.
**Why it happens:** Analytics naturally create a power asymmetry -- managers see data about reports, but not vice versa.
**Consequences:** Reports game their answers (inflate scores), stop being honest in sessions, or complain to HR.
**Prevention:**
- Reports MUST have their own analytics view showing their growth positively framed
- Never email score data to reports (they access it at their own pace)
- Never show comparative rankings ("you're the lowest on the team")
- Frame all report-facing analytics as "your growth" not "your performance"
- Keep the privacy matrix sacred: reports see only their own data
**Detection:** Watch for score inflation trends (steadily rising scores without corresponding behavior change).

### Pitfall 3: LLM Latency on Critical Path

**What goes wrong:** Dashboard page load takes 3-5 seconds because AI narrative generation blocks rendering.
**Why it happens:** Developer puts AI generation in the Server Component's data fetch, which runs on every page load.
**Consequences:** Dashboard feels broken. Users refresh, doubling LLM costs. Core UX degraded.
**Prevention:**
- NEVER generate AI narratives on page load
- Pre-generate in weekly snapshot job, cache in database
- Template sentences (string interpolation) for real-time data: "{name}'s engagement is {score}"
- Reserve AI for synthesis tasks that run in background
**Detection:** Monitor page load times via Vercel Analytics (already integrated). Alert if p95 > 2 seconds.

## Moderate Pitfalls

### Pitfall 4: Inconsistent Insight Behavior Across Surfaces

**What goes wrong:** Score delta shows +0.3 on the series card but the analytics page computes differently (different time window, different rounding), showing +0.28. Users lose trust in the data.
**Prevention:**
- Define a single `computeScoreDelta()` utility function used by all surfaces
- All score formatting uses the same `format.number(score, { maximumFractionDigits: 1 })` pattern (already established in codebase)
- Document time windows: delta always compares last 2 completed sessions for a series

### Pitfall 5: Mobile Analytics Are Unreadable

**What goes wrong:** Sparklines, heatmaps, and multi-element cards become cramped or broken on mobile viewports.
**Prevention:**
- Replace radar charts with horizontal bars on mobile
- Heatmap cells must be >= 44x44px (WCAG 2.5.5 touch target)
- Stack all cards vertically, never side-by-side below `sm` breakpoint
- Test on actual devices, not just browser responsive mode
- Swipe gestures for time navigation replace dropdowns

### Pitfall 6: Snapshot Staleness Creates Confusion

**What goes wrong:** Manager completes a session, immediately checks dashboard, but attention cards still reflect pre-session state because snapshots are weekly.
**Prevention:**
- Dashboard quick stats and series card data use live queries (already implemented)
- Only team heatmaps and trend charts use snapshots
- Add a "Last updated" timestamp to any snapshot-based insight
- Consider triggering a targeted snapshot refresh on session completion (for the affected series/user only)

### Pitfall 7: N+1 Query Proliferation

**What goes wrong:** Adding 5 new insight types means 5 new queries, making the dashboard page 10 queries instead of 5.
**Prevention:**
- Batch all dashboard queries in `Promise.all()` (existing pattern in `overview/page.tsx`)
- Compute derived data in JavaScript, not as separate queries (e.g., score delta from existing assessment history array)
- Consider a single `getDashboardInsights()` function that returns all insight data in one call

## Minor Pitfalls

### Pitfall 8: Tooltip Overload

**What goes wrong:** Every metric has a tooltip, every card has hover details, the page becomes a minefield of popups.
**Prevention:** Tooltips only for abbreviated or ambiguous data. If the text is self-explanatory ("Your engagement: 3.8"), no tooltip needed.

### Pitfall 9: Sparkline Gradient ID Collisions

**What goes wrong:** Multiple sparklines on the same page use the same SVG gradient IDs, causing visual glitches.
**Prevention:** Already handled in the codebase -- `series-card.tsx` uses `id={sparkGrad-${id}}` per card. Follow this pattern for any new sparklines.

### Pitfall 10: Accessibility Regression

**What goes wrong:** New visual indicators (dots, arrows, badges) are invisible to screen readers.
**Prevention:**
- Every colored indicator has an `aria-label`
- Every sparkline has an `aria-label` describing the trend
- Traffic lights have tooltips AND `aria-label`
- Test with VoiceOver/NVDA after each phase

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Score delta badges | Threshold too low, showing +0.1 changes | Set minimum display threshold at 0.3 |
| Attention cards | Too many flags on large teams | Hard cap at 2, severity gating |
| Personal profile view | Report sees data they shouldn't per privacy matrix | Audit every query against `docs/analytics.md` access matrix |
| Team heatmap promotion | Privacy violation if < 3 contributors | Already handled in `team-heatmap.tsx` with minimum sample check |
| Inline wizard nudges | Nudge category doesn't match wizard step category | Need category mapping between `ai_nudge` and `template_section` |
| AI weekly insights | Costs spike if generation runs too frequently | Weekly cap, Haiku model only, monitor via API dashboard |
| Anomaly detection | False positives for seasonal patterns | Allow admin to set "expected low" periods that suppress anomaly flags |

## Sources

- [Alert Fatigue and Anomaly Detection](https://oneuptime.com/blog/post/2026-03-05-alert-fatigue-ai-on-call/view)
- [Progressive Disclosure - NNGroup](https://www.nngroup.com/articles/progressive-disclosure/)
- [Accessible Data Visualizations Checklist](https://www.a11y-collective.com/blog/accessible-charts/)
