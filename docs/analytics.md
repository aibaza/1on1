# Analytics & Reporting

## Overview

Analytics is a key differentiator for 1on1. While competitors focus on meeting management, 1on1 treats each session as structured data collection, enabling longitudinal analysis of employee engagement, wellbeing, and performance.

## Metrics Tracked

### Individual Metrics (per employee)

| Metric | Description | Source | Aggregation |
|--------|-------------|--------|-------------|
| **Session Score** | Average normalized score across all numeric answers in a session | `session.session_score` | Direct value per session |
| **Wellbeing Score** | Average of answers in the 'wellbeing' category | `session_answer` filtered by category | AVG, normalized to 1-5 |
| **Engagement Score** | Average of answers in the 'engagement' category | `session_answer` filtered by category | AVG, normalized to 1-5 |
| **Performance Score** | Average of answers in the 'performance' category | `session_answer` filtered by category | AVG, normalized to 1-5 |
| **Career Score** | Average of answers in the 'career' category | `session_answer` filtered by category | AVG, normalized to 1-5 |
| **Feedback Score** | Average of answers in the 'feedback' category | `session_answer` filtered by category | AVG, normalized to 1-5 |
| **Mood Trend** | Average mood rating over time | `session_answer` where type = 'mood' | AVG per period |
| **Action Item Completion Rate** | % of action items completed within due date | `action_item` | completed / total per period |
| **Meeting Adherence** | % of scheduled sessions that were completed | `session` | completed / (completed + missed + cancelled) |

### Team Metrics (aggregated across reports)

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Team Average Score** | Mean session score across all team members | AVG of individual session scores |
| **Score Distribution** | How scores are distributed across the team | Histogram / box plot data |
| **Lowest Scorer Alert** | Identify team members with declining trends | Compare last 3 sessions vs previous 3 |
| **Meeting Cadence Health** | Which manager-report pairs are meeting regularly | meeting_adherence per series |
| **Action Velocity** | Average days from creation to completion | AVG(completed_at - created_at) |

### Company Metrics (tenant-wide)

| Metric | Description |
|--------|-------------|
| **Overall Engagement** | Company-wide average engagement score |
| **eNPS** | Employee Net Promoter Score (from rating_1_10 questions) |
| **Meeting Culture** | % of all scheduled sessions that happened |
| **Active Series** | Number of active 1:1 relationships |

---

## Chart Types & Visualizations

### 1. Score Trend Line Chart

**Purpose:** Track any metric for an individual over time.

**Axes:**
- X: Time (sessions or calendar periods)
- Y: Score (1-5 normalized)

**Features:**
- Multiple lines (employee vs team average)
- Hover tooltip showing exact value and session date
- Click-through to the specific session
- Date range selector

**Data source:** `analytics_snapshot` for periodic view, `session.session_score` for per-session view.

```
Score
5 │              ·  ·
  │      *──*   ·    ·
4 │   *──    *──*     *──*
  │  ·               ·     ── Employee
3 │·                       ·· Team avg
  │
2 │
  └──────────────────────────
   Sep  Oct  Nov  Dec  Jan  Feb
```

### 2. Category Breakdown Bar Chart

**Purpose:** Show current standing across all question categories for one employee.

**Axes:**
- X: Categories (wellbeing, engagement, performance, career, feedback)
- Y: Average score (1-5)

**Features:**
- Color-coded bars per category
- Reference line at company average
- Period selector (last month, last quarter, last 6 months)

```
Wellbeing      ████████████████████░░░░  4.2
Engagement     ███████████████████░░░░░  3.8
Performance    ████████████████████░░░░  4.0
Career         ██████████████░░░░░░░░░░  3.5
Feedback       ████████████████████░░░░  4.1
               0    1    2    3    4    5
```

### 3. Category Radar Chart

**Purpose:** Visual snapshot of an employee's profile across all dimensions.

**Features:**
- One polygon per period (current vs previous) for comparison
- Fill opacity to show improvement/decline areas

```
          Wellbeing
              │
              4.2
             / \
    Career──3.5   3.8──Engagement
             \ /
              4.0
              │
         Performance
```

### 4. Team Heatmap (v2)

**Purpose:** At-a-glance view of team health across categories.

**Axes:**
- Rows: Team members
- Columns: Question categories

**Color scale:** Red (1-2) → Yellow (2.5-3.5) → Green (4-5)

```
                  Wellbeing  Engagement  Performance  Career
Ion Popescu         🟢 4.2     🟡 3.8      🟢 4.0     🟡 3.5
Ana Marin           🟢 4.5     🟢 4.2      🟡 3.6     🟢 4.1
Mihai Radu          🟡 3.3     🟡 3.1      🟢 4.4     🔴 2.8
Elena Pop           🟢 4.0     🟡 3.5      🟡 3.5     🟡 3.2
```

### 5. Meeting Adherence Bar Chart

**Purpose:** Track meeting consistency per manager or per series.

**Axes:**
- X: Months
- Y: % of scheduled sessions completed

**Stacked bars:** Completed / Cancelled / Missed

```
100% │ ██  ██      ██  ██
     │ ██  ██  ██  ██  ██
 75% │ ██  ██  ██  ██  ██
     │ ██  ██  ██  ██  ██
 50% │ ██  ██  ██  ██  ██
     │ ██  ██  ██  ██  ██
 25% │ ██  ██  ██  ██  ██
     │ ██  ██  ██  ██  ██
  0% └──────────────────────
      Oct  Nov  Dec  Jan  Feb

     ██ Completed  ░░ Cancelled  ▒▒ Missed
```

### 6. Action Item Completion Funnel

**Purpose:** Show action item lifecycle and velocity.

```
Created (23)      ████████████████████████████████
In Progress (3)   ████████
Completed (18)    ██████████████████████████
Cancelled (2)     ████
```

### 7. Metric Comparison Card

**Purpose:** Single KPI with trend indicator.

```
┌────────────────────┐
│  Wellbeing Score    │
│  4.2 / 5.0         │
│  ▲ +0.3 vs last    │
│  ────────          │
│  12 sessions       │
└────────────────────┘
```

---

## Data Aggregation Strategy

### Real-time Queries (Small Data)

For single-session views and recent data (last 5 sessions), query directly from `session_answer`:

```sql
SELECT
  tq.category,
  AVG(CASE
    WHEN tq.answer_type = 'rating_1_5' THEN sa.answer_numeric
    WHEN tq.answer_type = 'rating_1_10' THEN (sa.answer_numeric - 1) / 9 * 4 + 1
    WHEN tq.answer_type = 'yes_no' THEN sa.answer_numeric * 4 + 1
    WHEN tq.answer_type = 'mood' THEN sa.answer_numeric
  END) as avg_score,
  COUNT(*) as answer_count
FROM session_answer sa
JOIN template_question tq ON tq.id = sa.question_id
JOIN session s ON s.id = sa.session_id
WHERE s.series_id = :series_id
  AND sa.answer_numeric IS NOT NULL
  AND sa.skipped = false
GROUP BY tq.category
ORDER BY tq.category;
```

### Pre-computed Snapshots (Large Data)

For dashboards and trend charts spanning months/quarters, read from `analytics_snapshot`:

```sql
SELECT
  period_start,
  metric_name,
  metric_value,
  sample_count
FROM analytics_snapshot
WHERE user_id = :user_id
  AND metric_name IN ('wellbeing_score', 'engagement_score', 'performance_score')
  AND period_type = 'month'
  AND period_start >= :start_date
ORDER BY period_start;
```

### Snapshot Computation Job

Runs as a background job (via Inngest) on a schedule:

**Frequency:**
- Weekly snapshots: computed every Monday at 2:00 AM (tenant timezone)
- Monthly snapshots: computed on the 1st of each month
- Quarterly snapshots: computed on the 1st of Jan, Apr, Jul, Oct

**Logic:**
1. For each active user with sessions in the period:
   - Calculate each metric (wellbeing_score, engagement_score, etc.)
   - Upsert into `analytics_snapshot`
2. For each active team:
   - Aggregate individual scores → team averages
   - Upsert team-level snapshots
3. For each active series:
   - Calculate meeting_adherence
   - Calculate action_completion_rate

---

## Export Capabilities

### CSV Export (MVP)

Available from any analytics view:
- Individual session data (all answers, notes, action items)
- Score trends by period (one row per period per metric)
- Action item list with status and dates

### PDF Reports (v2)

Generated on-demand, styled with company branding:

**Individual Report Contents:**
1. Cover page: Employee name, period, company logo
2. Executive summary: Key metrics with trend arrows
3. Score trend charts (last 6 months or custom range)
4. Category breakdown
5. Session-by-session summaries (condensed)
6. Action item history
7. Manager notes (optional, requires manager approval)

**Team Report Contents:**
1. Team overview: Average scores, meeting adherence
2. Heatmap: Team × categories
3. Individual summaries (1 page each)
4. Action item completion rates

---

## Privacy Considerations for Analytics

1. **Private notes are never included in analytics** — they're encrypted and inaccessible to aggregation jobs
2. **Team analytics can be anonymized** — configurable per tenant. When enabled, individual scores are visible only to the direct manager, not to team leads or admins
3. **Minimum sample size** — team averages require at least 3 data points to prevent individual identification
4. **Data access matrix:**

| Data | Employee | Direct Manager | Team Lead | Admin |
|------|----------|---------------|-----------|-------|
| Own session answers | Yes | Yes | No | No |
| Own score trends | Yes | Yes | No | No |
| Team averages | No | Yes (own team) | Yes | Yes |
| Individual scores (other) | No | Yes (own reports) | No* | No* |
| Action items | Own only | Own reports | No | No |
| Private notes | Own only | Own only | No | No |
| Meeting adherence | Own only | Own team | Own team | All |

*Unless anonymization is disabled at the tenant level.
