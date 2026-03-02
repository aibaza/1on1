# Analytics & Reporting

## Overview

Analytics is a key differentiator. Each session is structured data collection, enabling longitudinal analysis of employee engagement, wellbeing, and performance.

## Metrics

### Individual Metrics (per employee)

| Metric | Description | Source |
|--------|-------------|--------|
| Session Score | Average normalized score across all numeric answers | `session.session_score` |
| Wellbeing Score | Average of 'wellbeing' category answers | `session_answer` filtered |
| Engagement Score | Average of 'engagement' category answers | `session_answer` filtered |
| Performance Score | Average of 'performance' category answers | `session_answer` filtered |
| Career Score | Average of 'career' category answers | `session_answer` filtered |
| Feedback Score | Average of 'feedback' category answers | `session_answer` filtered |
| Mood Trend | Average mood rating over time | mood answer type |
| Action Item Completion Rate | % completed within due date | `action_item` |
| Meeting Adherence | % scheduled sessions completed | `session` status |

### Team Metrics

| Metric | Description |
|--------|-------------|
| Team Average Score | Mean session score across members |
| Score Distribution | Histogram / box plot of scores |
| Lowest Scorer Alert | Members with declining trends (last 3 vs previous 3) |
| Meeting Cadence Health | Per-series meeting adherence |
| Action Velocity | Average days from creation to completion |

### Company Metrics

| Metric | Description |
|--------|-------------|
| Overall Engagement | Company-wide average engagement score |
| eNPS | Employee Net Promoter Score (from rating_1_10) |
| Meeting Culture | % of all scheduled sessions completed |
| Active Series | Number of active 1:1 relationships |

## Chart Types

### 1. Score Trend Line Chart
- X: time (sessions or periods), Y: score (1-5)
- Multiple lines (employee vs team average)
- Hover tooltips, click-through to session, date range selector

### 2. Category Breakdown Bar Chart
- X: categories, Y: average score (1-5)
- Color-coded bars, reference line at company average, period selector

### 3. Category Radar Chart
- Visual profile across all dimensions
- Current vs previous period comparison

### 4. Team Heatmap (v2)
- Rows: team members, Columns: categories
- Color: Red (1-2) → Yellow (2.5-3.5) → Green (4-5)

### 5. Meeting Adherence Bar Chart
- X: months, Y: % completed
- Stacked: completed / cancelled / missed

### 6. Action Item Completion Funnel
- Created → In Progress → Completed / Cancelled

### 7. Metric Comparison Card
- Single KPI with value, trend indicator, and sample count

## Data Aggregation Strategy

### Real-time Queries (small data)
For single-session views and recent data (last 5 sessions), query `session_answer` directly with normalization CASE expressions.

### Pre-computed Snapshots (large data)
For dashboards spanning months/quarters, read from `analytics_snapshot`.

### Snapshot Computation Schedule
Via Inngest background jobs:
- **Weekly**: every Monday 2:00 AM (tenant timezone)
- **Monthly**: 1st of each month
- **Quarterly**: 1st of Jan, Apr, Jul, Oct

Logic: for each active user/team with sessions in the period, calculate metrics and upsert into `analytics_snapshot`.

## Export

### CSV Export (MVP)
- Individual session data (answers, notes, action items)
- Score trends by period
- Action item list with status

### PDF Reports (v2)
Branded with company logo/colors:
- **Individual**: cover page, executive summary, trend charts, category breakdown, session summaries, action item history
- **Team**: overview, heatmap, individual summaries, completion rates

## Privacy Considerations

1. Private notes never included in analytics (encrypted, inaccessible to jobs)
2. Team analytics anonymizable per tenant config
3. Team averages require minimum 3 data points
4. Data access matrix:

| Data | Employee | Direct Manager | Team Lead | Admin |
|------|----------|---------------|-----------|-------|
| Own session answers | Yes | Yes | No | No |
| Own score trends | Yes | Yes | No | No |
| Team averages | No | Yes (own team) | Yes | Yes |
| Individual scores (other) | No | Yes (own reports) | No* | No* |
| Action items | Own | Own reports | No | No |
| Private notes | Own | Own | No | No |
| Meeting adherence | Own | Own team | Own team | All |

*Unless anonymization disabled at tenant level.
