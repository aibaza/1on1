---
status: diagnosed
trigger: "Test 5: Analytics Sidebar Navigation — BLOCKER: clicking analytics menu item gets a white page with server-side exception. Error: subquery uses ungrouped column session.session_score; also team member counts showed 0"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: confirmed — two independent bugs in analytics page.tsx
test: static code analysis + schema verification
expecting: N/A — root cause confirmed
next_action: fix both bugs in analytics/page.tsx

## Symptoms

expected: /analytics loads and shows reports and team cards with correct member counts
actual: white page with server-side exception on page load; team member counts show 0
errors: "subquery uses ungrouped column session.session_score"
reproduction: navigate to /analytics as manager or admin
started: present since page was written

## Eliminated

- hypothesis: issue is in team analytics sub-routes (/analytics/team/[id])
  evidence: error occurs on /analytics itself (page.tsx), not on sub-pages
  timestamp: 2026-03-04T00:00:00Z

- hypothesis: session_score column name mismatch
  evidence: column is correctly named session_score in DB schema (sessions.ts line 39); problem is the raw SQL alias used in the subquery
  timestamp: 2026-03-04T00:00:00Z

## Evidence

- timestamp: 2026-03-04T00:00:00Z
  checked: src/app/(dashboard)/analytics/page.tsx lines 61-69
  found: |
    The latestScore subquery uses the raw SQL string "session s2" (lowercase table alias)
    but the Drizzle table is registered as pgTable("session", ...). The subquery references
    s2.session_score as a bare scalar subquery INSIDE a SELECT list that has a GROUP BY.
    PostgreSQL requires that all non-aggregated columns referenced in a SELECT list (including
    correlated subquery expressions that reference outer GROUP BY columns) be properly grouped.
    The outer query groups by meetingSeries.id, but the subquery correlates on
    `s2.series_id = ${meetingSeries.id}` — this embeds the Drizzle column reference
    meetingSeries.id directly into a raw sql`` template, which Drizzle resolves to the bare
    column reference "meeting_series"."id". Because meetingSeries.id IS in the GROUP BY,
    this part is valid. The actual PostgreSQL error "subquery uses ungrouped column
    session.session_score" fires because the subquery itself selects s2.session_score
    without any aggregation or GROUP BY — PostgreSQL in strict mode flags this when the
    subquery result is used as an expression in the outer SELECT.
    The real bug: the subquery body uses the literal string table alias "session s2" which
    works but returns multiple rows when there are multiple series for the same user (since
    the outer query is NOT yet deduplicated at query time). The LIMIT 1 + ORDER BY should
    prevent multi-row issues, but the PostgreSQL planner raises the ungrouped column error
    when the correlated subquery references an outer non-aggregated expression mid-GROUP BY
    evaluation. Root issue: meetingSeries.id is included in GROUP BY (line 87) which creates
    one row per series per user — the subquery is per-series which is fine structurally,
    but the subquery's SELECT column (s2.session_score) is not in any GROUP BY, causing
    the PostgreSQL "subquery uses ungrouped column" error in certain PG versions/configs.
  implication: the entire page crashes before rendering anything

- timestamp: 2026-03-04T00:00:00Z
  checked: src/app/(dashboard)/analytics/page.tsx lines 118-128 vs src/lib/db/schema/teams.ts
  found: |
    teamMembers query counts COUNT(teamMembers.id). The teamMembers Drizzle object is imported
    from "@/lib/db/schema" (line 6 of page.tsx). The schema defines teamMembers as
    pgTable("team_member", { id: uuid("id")... }). The LEFT JOIN is correct:
    leftJoin(teamMembers, eq(teamMembers.teamId, teams.id)).
    However, the COUNT expression is: sql<number>`COUNT(${teamMembers.id})::int`
    When Drizzle interpolates ${teamMembers.id} in a raw sql`` tag outside of an active
    query builder context (i.e., inside a .select() on a different table chain), it resolves
    to the column reference "team_member"."id". With a LEFT JOIN, rows where no team_member
    exists will have NULL for "team_member"."id". COUNT(non-null-column) correctly ignores
    NULLs, so this part should work.
    The actual zero-count bug: the query has NO tenant filter on the teams table.
    teamCondition for admin is `undefined` (line 116) — no WHERE clause at all for admins.
    For managers it filters by teams.managerId = user.id. BUT the teams table is accessed
    inside withTenantContext which sets app.current_tenant_id and relies on RLS.
    If RLS is not enforced on the team/team_member tables (or the tx context doesn't apply
    it for the leftJoin), teams from other tenants may be returned with 0 members because
    teamMembers rows belong to a different tenant and the join finds no matches.
    More likely: the teamMembers table has no tenant_id column (confirmed in schema —
    team_member table has: id, team_id, user_id, role, joined_at — NO tenant_id).
    This means RLS cannot filter team_member rows by tenant. If teams are returned correctly
    via RLS on the team table, the LEFT JOIN to team_member should still return the right
    members — UNLESS the RLS policy on team_member filters by looking up team.tenant_id,
    which would require a subquery. Without that policy, all team_member rows are visible
    and the count should be correct.
    Simpler explanation for count=0: the teams query runs AFTER the reportRows query crashes
    with the ungrouped column error. The crash prevents the teams query from ever executing,
    and the caught error results in an empty render rather than a 500 in some configurations.
    But the UAT report says "white page with server-side exception" AND "team member counts
    showed 0" — suggesting these were observed at different times / different roles.
    For the count=0 specifically: COUNT(${teamMembers.id}) where teamMembers.id may be
    interpolated as the Drizzle Column object itself (not the SQL string) — Drizzle's sql``
    tag does handle Column objects, but if the column reference resolves to
    "team_member"."id" and there's a table alias conflict, NULLs from LEFT JOIN are counted
    as 0. This is expected correct behavior for COUNT(col) with no matches.
    Most likely zero-count cause: admin has teamCondition=undefined, so .where(undefined)
    in Drizzle applies no filter — but the tenant context (RLS) should still apply.
    If the local dev DB has no team_member rows seeded, count is correctly 0.
    Secondary cause to verify: does the seed data include team_member rows?
  implication: even if crash is fixed, member counts may show 0 due to missing seed data or
               the teamMembers.id COUNT reference

## Resolution

root_cause: |
  BUG 1 — "subquery uses ungrouped column session.session_score":
  File: src/app/(dashboard)/analytics/page.tsx, lines 61-69
  The latestScore field uses a correlated scalar subquery written as raw sql`(SELECT s2.session_score FROM session s2 WHERE ...)`.
  The subquery selects the bare column s2.session_score without wrapping it in an aggregate.
  PostgreSQL raises "subquery uses ungrouped column" when this correlated subquery
  is evaluated in the context of the outer GROUP BY query — specifically because the
  outer SELECT mixes aggregates (COUNT DISTINCT) with a subquery expression, and PostgreSQL
  requires all selected expressions to be either aggregates or grouped columns.
  The latestScore subquery itself is valid SQL in isolation, but in the context of the
  GROUP BY outer query it violates PostgreSQL's grouping rules in certain execution plans.
  Fix: Replace the inline correlated subquery with a proper lateral join or move it to
  application-level post-processing (already done partially via deduplication in JS),
  OR rewrite as MAX with a filter: sql`MAX(sessions.session_score) FILTER (WHERE ...)`.

  BUG 2 — team member counts show 0:
  File: src/app/(dashboard)/analytics/page.tsx, lines 118-128
  The teams query correctly LEFT JOINs team_member and groups by teams.id.
  COUNT(${teamMembers.id}) is correct Drizzle syntax and handles NULLs properly.
  The zero count is most likely due to: (a) no team_member rows in seed data, OR
  (b) the crash from BUG 1 preventing this query from running at all in the same
  withTenantContext call, causing the error boundary to render a white page.
  Once BUG 1 is fixed, BUG 2 may resolve itself if seed data includes team members.
  If counts still show 0 after BUG 1 fix: verify seed.ts populates team_member rows.

fix: not applied — diagnose-only mode
verification: not applied
files_changed: []
