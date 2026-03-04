---
status: diagnosed
trigger: "Tests 11, 12, 13: Team Analytics Page, Team Heatmap, Anonymization — no category data, no heatmap data, no members visible"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
goal: find_root_cause_only
---

## Current Focus

hypothesis: Team analytics returns empty because getTeamAverages and getTeamHeatmapData query analytics_snapshot exclusively with no live fallback, and analytics_snapshot is never seeded. Member list appears empty on analytics page because the heatmap snapshots are empty, not because teamMembers table is empty.
test: read queries.ts, seed.ts, UAT file
expecting: confirmed — analytics_snapshot has zero rows for team queries, no fallback exists
next_action: return diagnosis

## Symptoms

expected: Team analytics page shows aggregated category score cards and SVG dot matrix heatmap with team members
actual: "No category data available for this period. No heatmap data available for this period." Anonymization toggle has no members to anonymize.
errors: No JS errors — queries succeed but return empty arrays
reproduction: Navigate to /analytics/team/[id] as admin or manager
started: Phase 08 UAT (always broken since implemented)

## Eliminated

- hypothesis: teamMembers table is empty / seeding failed
  evidence: seed.ts seeds 3 members to Engineering team (Bob/lead, Dave/member, Eve/member) and 3 to Product (Carol/lead, Frank/member, Grace/member). The teams detail page /teams/[id] DOES show members correctly via a live query joining teamMembers + users.
  timestamp: 2026-03-04T00:00:00Z

- hypothesis: Authorization check blocks access
  evidence: The team analytics page.tsx correctly validates team existence and manager access before returning data. memberCount is fetched live from teamMembers — it would still show members. The issue is specifically in getTeamAverages / getTeamHeatmapData returning empty arrays.
  timestamp: 2026-03-04T00:00:00Z

## Evidence

- timestamp: 2026-03-04T00:00:00Z
  checked: src/lib/analytics/queries.ts — getTeamAverages() lines 293-341
  found: Queries ONLY analytics_snapshots table. Gets memberIds from teamMembers, then queries analyticsSnapshots filtered by those memberIds + categoryMetricNames. NO fallback to live session_answers query.
  implication: If analytics_snapshots is empty (never computed), returns []. Individual getCategoryAverages() HAS a live fallback; team functions do not.

- timestamp: 2026-03-04T00:00:00Z
  checked: src/lib/analytics/queries.ts — getTeamHeatmapData() lines 351-418
  found: Same pattern — queries analyticsSnapshots for member snapshots. DOES fetch members with user names (line 358-367), but then queries snapshots (line 374-391). Returns members list for name building but the snapshots result is empty, so the final map() on line 409 returns [].
  implication: members array IS populated (teamMembers JOIN users works), but snapshots is empty, so output is []. The "no members" UAT observation is because the UI shows heatmap rows only when there are snapshot data points — no snapshots = no rows = looks like no members.

- timestamp: 2026-03-04T00:00:00Z
  checked: src/lib/db/seed.ts — entire file
  found: seed() calls: seedTenants, seedUsers, seedTeams, seedTemplates, seedMeetingSeries, seedSessions, seedAnswers, seedActionItems, seedPrivateNotes. There is NO seedAnalyticsSnapshots call. The analytics_snapshots table is never populated by the seed.
  implication: All team analytics queries that rely on analytics_snapshots return empty results in dev environment.

- timestamp: 2026-03-04T00:00:00Z
  checked: src/lib/analytics/queries.ts — getTeamAverages() line 334
  found: Results are additionally filtered by r.memberCount >= 3. This enforces anonymization minimum even for non-anonymized requests.
  implication: Even IF snapshots existed for 1-2 members, results would be further suppressed until at least 3 members have data per category. A secondary issue for small teams.

- timestamp: 2026-03-04T00:00:00Z
  checked: src/lib/analytics/queries.ts — individual functions getScoreTrend() and getCategoryAverages()
  found: Both have snapshot-first + live fallback pattern. getScoreTrend() falls back to sessions table. getCategoryAverages() falls back to sessionAnswers + templateQuestions + templateSections join. Team functions have no equivalent fallback.
  implication: Inconsistency by design or oversight. Individual analytics works in dev/early data; team analytics requires a pre-computed snapshot pipeline that has never run.

## Resolution

root_cause: |
  Three compounding issues:

  1. PRIMARY: getTeamAverages() and getTeamHeatmapData() in src/lib/analytics/queries.ts query ONLY
     the analytics_snapshots table with no live data fallback. Individual analytics functions
     (getScoreTrend, getCategoryAverages) both have snapshot-first + live-fallback patterns.
     Team functions were implemented without the fallback, making them silently empty in any
     environment where the analytics snapshot pipeline has not run.

  2. SECONDARY: The seed script (src/lib/db/seed.ts) never populates analytics_snapshots.
     No call to any seedAnalyticsSnapshots() function exists. The snapshot table stays empty
     in all development environments, making the team analytics untestable without running
     a background compute job first.

  3. TERTIARY: getTeamAverages() applies a memberCount >= 3 filter unconditionally (line 334),
     intended as an anonymization guardrail. This filter fires even when anonymize=false,
     meaning a team with fewer than 3 members having data in ANY given period will always
     return zero results — including the 3-person Engineering team if only 1-2 members
     have seeded sessions.

  The "no members visible" observation in test 13 is a UI consequence of #1: heatmap rows
  are rendered only for data points returned by getTeamHeatmapData(). Since that function
  returns [] (empty snapshots), the heatmap has no rows, creating the false appearance that
  team membership itself is broken. The teamMembers table IS correctly populated.

fix: |
  Three-part fix required:

  A. Add live fallback to getTeamAverages():
     Mirror the getCategoryAverages() fallback pattern — if snapshots returns empty,
     fall back to a sessionAnswers JOIN across all team member series.
     Query: sessionAnswers -> sessions -> meetingSeries (where report_id IN memberIds)
     -> templateQuestions -> templateSections, grouped by sectionName.

  B. Add live fallback to getTeamHeatmapData():
     If snapshots returns empty, fall back to per-user sessionAnswers query.
     For each userId in members, compute per-category averages from live session data,
     then build the HeatmapDataPoint array using the same nameMap logic.

  C. Fix the memberCount >= 3 anonymization guardrail in getTeamAverages():
     Move this filter to only apply when anonymize=true is requested (not always).
     The API route (route.ts) has the anonymize flag available — pass it through to
     getTeamAverages() and apply the minimum only conditionally.

  D. Add analytics_snapshots seed data to src/lib/db/seed.ts (optional, for completeness):
     Compute and insert realistic analyticsSnapshot rows for Dave and Eve (Engineering team)
     to enable snapshot-path testing without running the background pipeline.

verification: not applied (diagnosis-only mode)
files_changed: []
