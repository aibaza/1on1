# Sprint 11 — Manager Dashboard

**Duration**: 2 weeks
**Dependencies**: Sprint 10
**Parallelizable with**: Sprint 12

## Goals

Build the manager dashboard (overview/home page) with upcoming sessions, overdue action items, quick stats, recent sessions, and a team score trends chart.

## Deliverables

1. **Upcoming sessions widget** (next 7 days):
   - Cards showing: report name, date/time, template name, agenda readiness
   - Status indicators: green (prepared), yellow (not prepared), red (overdue/missed)
   - [Start] button for today's sessions, [Prepare] for future sessions
2. **Overdue action items widget**:
   - Grouped by report
   - Shows: item title, due date, days overdue
3. **Quick stats cards**:
   - Total reports count
   - Sessions this month count
   - Average session score
   - Open action items count
4. **Recent sessions list**: last 5 completed sessions with report name, date, score
5. **Team score trends chart**:
   - Line chart (Recharts) showing last 8 weeks
   - One line per direct report
   - Hover tooltips with exact values
6. **Member dashboard variant**: simpler view for non-manager users showing their upcoming sessions and action items
7. **Dashboard API**: `GET /api/dashboard` returning all widget data in one request

## Acceptance Criteria

- [ ] Dashboard loads as the home page after login (`/overview`)
- [ ] Upcoming sessions shows all sessions in the next 7 days
- [ ] Session cards show correct status indicators (green/yellow/red)
- [ ] [Start] button on today's sessions navigates to session wizard
- [ ] Overdue action items display grouped by report with days overdue
- [ ] Quick stats show correct counts for reports, sessions, score, action items
- [ ] Recent sessions list shows last 5 completed sessions with scores
- [ ] Team score trends chart renders with one line per report
- [ ] Chart tooltips show exact values on hover
- [ ] Member users see a simplified dashboard (their sessions + action items only)
- [ ] Dashboard API returns all data in a single request (no waterfall)
- [ ] Dashboard handles empty state gracefully (new accounts with no data)

## Key Files

```
src/app/(dashboard)/overview/page.tsx
src/app/api/dashboard/route.ts
src/components/layout/sidebar.tsx               # Updated with active nav
src/components/layout/header.tsx                # Updated with user info
src/components/analytics/score-trend-chart.tsx  # Recharts line chart
src/components/analytics/metric-card.tsx        # KPI card component
```
