---
status: complete
phase: 08-manager-dashboard-analytics
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md
started: 2026-03-04T20:10:00Z
updated: 2026-03-04T22:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Overview - Upcoming Sessions
expected: Navigate to /overview. See "Upcoming Sessions" section with session cards. Each card shows report name, series name, scheduled date. Today's sessions have Start/Resume button. Cards with AI nudges show inline nudge preview with expandable "+N more".
result: pass

### 2. Dashboard Overview - Overdue Action Items
expected: On /overview, see "Overdue Items" section. Action items are grouped by report name. Each item shows a red badge with the number of days overdue.
result: pass

### 3. Dashboard Overview - Quick Stats
expected: On /overview, see three stat cards: number of direct reports, sessions this month, and average score. Values should reflect your actual data.
result: pass

### 4. Dashboard Overview - Recent Sessions
expected: On /overview, see "Recent Sessions" section. Each entry shows session date, report name, a color-coded score badge (green for high, red for low), and a short AI summary snippet.
result: issue
reported: "recent sessions are listed on the dashboard, but when i click on them, i get a 404 page. Link used /sessions/{seriesId}/history/{id} instead of /sessions/{id}/summary"
severity: major

### 5. Analytics Sidebar Navigation
expected: Sidebar shows an "Analytics" link with a bar chart icon. Clicking it navigates to /analytics. Visible to all roles (admin, manager, member).
result: issue
reported: "clicking analytics menu item gets a white page with server-side exception. Error: subquery uses ungrouped column session.session_score; also team member counts showed 0"
severity: blocker

### 6. Analytics Overview Page
expected: Navigate to /analytics. See a list of report cards — each shows the person's name, latest score, and session count. Clicking a card navigates to their individual analytics page.
result: pass

### 7. Individual Analytics - Score Trend Chart
expected: On an individual analytics page (/analytics/individual/[id]), see a line chart showing session scores over time. Y-axis ranges 1-5. Hovering data points shows date and score tooltip. If fewer than 3 sessions, a "More data after 3+ sessions" hint appears.
result: issue
reported: "the chart only displays the 3 existing data points, but no line"
severity: major

### 8. Individual Analytics - Category Breakdown
expected: Below the score trend, see a horizontal bar chart showing per-category averages (wellbeing, engagement, performance, etc.). Each bar has a distinct color. Categories with limited data show a dashed/faded visual treatment.
result: issue
reported: "No category data available for this period. Hardcoded English category names didn't match actual template section names."
severity: major

### 9. Individual Analytics - Session Comparison
expected: Below category breakdown, see a session comparison table. Two dropdown selectors let you pick sessions to compare. Table shows each category with scores from both sessions and a green/red/gray delta indicator.
result: issue
reported: "No scorable category data found for these sessions. Same hardcoded category filter bug."
severity: major

### 10. Period Selector
expected: On individual analytics page, see period selector with preset buttons (30d, 3mo, 6mo, 1yr) and a custom date range option. Changing the period updates all charts without a full page reload.
result: pass

### 11. Team Analytics Page
expected: From /analytics, see a "Teams" section with team cards. Click a team to navigate to /analytics/team/[id]. See aggregated category score cards with bar visualizations and a dot matrix heatmap below.
result: issue
reported: "No category data available for this period. No heatmap data available for this period. Team queries only use analytics_snapshot table with no live fallback."
severity: major

### 12. Team Heatmap
expected: On team analytics page, see an SVG dot matrix where rows are team members, columns are categories. Dot size reflects sample count, dot color reflects score (green >= 4, amber 3-3.9, red < 3). Hollow circles appear for insufficient data (< 3 samples). Hovering shows exact score and sample count.
result: issue
reported: "No category data available for this period. No heatmap data available for this period. Only has sessions for two people but team shows 5 members. Team queries only use analytics_snapshot with no live fallback."
severity: major

### 13. Anonymization Toggle
expected: On team analytics page, see an anonymization switch/toggle. Turning it on replaces member names with "Member 1", "Member 2", etc. across the heatmap and overview.
result: issue
reported: "No members visible on the team page, so there's nothing to anonymize"
severity: major

### 14. Velocity Chart
expected: On individual analytics page, see an area chart showing average days to complete action items per month. Chart has a gradient fill and a horizontal dashed reference line at 7 days (target).
result: issue
reported: "Velocity chart is empty: No action item velocity data available for this period."
severity: major

### 15. Adherence Chart
expected: On individual analytics page, see a stacked bar chart showing meeting adherence per month — green bars for completed sessions, amber for cancelled, red for missed. Tooltip shows adherence percentage.
result: pass

### 16. CSV Export
expected: On individual analytics page, see small download/export icon buttons on each chart section header. Also see an "Export All Data" button. Clicking any export button downloads a CSV file. The file opens correctly in a spreadsheet app with proper column headers and data.
result: issue
reported: "CSV saves but encoding is all wrong — Romanian characters garbled: Aplica»õie finalizatƒÉ etc."
severity: major

## Summary

total: 16
passed: 6
issues: 10
pending: 0
skipped: 0

## Gaps

- truth: "Clicking a recent session navigates to session summary page"
  status: resolved
  reason: "User reported: recent sessions link used /sessions/{seriesId}/history/{id} instead of /sessions/{id}/summary — resulted in 404"
  severity: major
  test: 4
  root_cause: "Incorrect href template in recent-sessions.tsx — used seriesId/history/id pattern instead of id/summary"
  artifacts:
    - path: "src/components/dashboard/recent-sessions.tsx"
      issue: "Wrong URL pattern in Link href"
  missing: []
  debug_session: ""

- truth: "Team heatmap shows SVG dot matrix with members, categories, color-coded scores"
  status: failed
  reason: "User reported: No category data or heatmap data available. Only 2 people have sessions but team shows 5 members. Team queries only use analytics_snapshot with no live fallback."
  severity: major
  test: 12
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Anonymization toggle replaces member names with Member 1, Member 2, etc."
  status: failed
  reason: "User reported: No members visible on the team page, so there's nothing to anonymize"
  severity: major
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Velocity chart shows area chart of average days to complete action items per month"
  status: failed
  reason: "User reported: Velocity chart is empty — No action item velocity data available for this period."
  severity: major
  test: 14
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "CSV export downloads correctly encoded file with proper column headers and data"
  status: failed
  reason: "User reported: CSV saves but encoding is all wrong — Romanian characters garbled"
  severity: major
  test: 16
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
