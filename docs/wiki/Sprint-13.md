# Sprint 13 — Basic Analytics

**Duration**: 2 weeks
**Dependencies**: Sprint 12
**Parallelizable with**: Sprint 14

## Goals

Implement the analytics page with individual score trends, category breakdown charts, session-over-session comparison, analytics snapshot computation (background job), and CSV export.

## Deliverables

1. **Analytics overview page** (`/analytics`):
   - Select individual or view aggregate
   - Period selector (last 3 months, 6 months, 1 year)
2. **Individual analytics page** (`/analytics/individual/[id]`):
   - Score trend line chart (Recharts): session score over time, optional comparison with team average
   - Category breakdown: bar chart showing average per category (wellbeing, engagement, performance, career, feedback)
   - Meeting stats: sessions held, adherence %, avg duration, action items total, completion rate
   - Category detail trend: per-category line chart with session granularity
3. **Session-over-session comparison**: show how each category score changed from the last session (arrow up/down + delta)
4. **Analytics snapshot computation**:
   - Inngest background job: compute weekly/monthly snapshots
   - Upsert into `analytics_snapshot` table
   - Metrics: avg_session_score, wellbeing_score, engagement_score, performance_score, career_score, meeting_adherence, action_completion_rate
5. **CSV export**: download session data, score trends, and action items as CSV
6. **People profile analytics tab**: show score trend + category radar for a specific user
7. **API routes**: `GET /api/analytics/individual/[id]`, `GET /api/analytics/export/csv`

## Acceptance Criteria

- [ ] Analytics overview page shows list of reports with summary scores
- [ ] Individual analytics shows score trend line chart with correct data
- [ ] Line chart supports comparison with team average
- [ ] Category breakdown bar chart shows averages for all categories
- [ ] Meeting stats section shows correct adherence %, avg duration, action completion rate
- [ ] Session-over-session comparison shows deltas with directional arrows
- [ ] Analytics snapshot job runs successfully and populates analytics_snapshot table
- [ ] Snapshot computation handles edge cases: no sessions in period, single session
- [ ] CSV export downloads a valid CSV file with session data
- [ ] CSV export includes: date, score, category scores, action items
- [ ] People profile analytics tab renders charts correctly
- [ ] Period selector filters all charts to the selected date range
- [ ] Charts handle empty data gracefully (no data message instead of broken chart)
- [ ] Manager can only see analytics for their own reports
- [ ] Admin can see analytics for all users

## Key Files

```
src/app/(dashboard)/analytics/page.tsx
src/app/(dashboard)/analytics/individual/[id]/page.tsx
src/app/(dashboard)/people/[id]/page.tsx           # Updated analytics tab
src/app/api/analytics/individual/[id]/route.ts
src/app/api/analytics/export/csv/route.ts
src/components/analytics/score-trend-chart.tsx
src/components/analytics/category-radar.tsx
src/components/analytics/completion-rate.tsx
src/components/analytics/metric-card.tsx
src/lib/jobs/compute-analytics.ts                  # Inngest job
src/lib/utils/scoring.ts                           # Updated with normalization
```
