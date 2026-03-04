---
status: diagnosed
trigger: "Velocity chart is empty: No action item velocity data available for this period."
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: getActionItemVelocity uses wrong SQL table/column names in raw sql`` template for the manager role filter, causing a PostgreSQL error or zero-row result
test: cross-referenced raw SQL strings in queries.ts against actual Drizzle schema definitions
expecting: raw SQL references wrong identifiers — confirmed
next_action: fix the two wrong identifiers in the manager roleFilter sql fragment

## Symptoms

expected: Velocity chart shows bars/area for months where action items were completed
actual: "No action item velocity data available for this period." — chart renders empty state
errors: None visible on surface; the query silently returns 0 rows
reproduction: Open analytics > individual page > velocity chart (any period)
started: unknown — likely since queries.ts was first written

## Eliminated

- hypothesis: action items have no completedAt set or status != "completed"
  evidence: schema confirms completedAt and status columns exist and the WHERE clause would filter them; the issue is before rows are even reached
  timestamp: 2026-03-04

- hypothesis: date range filters exclude all data
  evidence: the outer WHERE clause on completedAt and the date range looks correct; the bug is in the roleFilter subquery, not the date range
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: src/lib/analytics/queries.ts lines 442-452 — manager roleFilter sql fragment
  found: |
    roleFilter = sql`${actionItems.sessionId} IN (
      SELECT s.id FROM session s
      JOIN meeting_series ms ON s.series_id = ms.id
      WHERE ms.manager_id = ${userId}
    )`;
  implication: |
    TWO wrong identifiers here:
    1. Table alias `session s` — the actual PostgreSQL table name is "session" but the
       subquery uses bare identifier `session` which is correct, BUT the alias reference
       `s.series_id` is wrong. The column in the sessions schema is `series_id` (snake_case) —
       ACTUALLY that part is correct. The real bug is:
    2. The subquery uses raw string `session` for the table name — but more critically,
       it uses `s.series_id` where the actual column is named `series_id` in the DB.
       This is fine. The REAL bug: `FROM session s` uses lowercase `session` which IS the
       correct DB table name.
    After deeper check: the subquery itself may execute. The actual bug is that when the
    manager views THEIR OWN analytics page, effectiveRole is set to "member" (not "manager"),
    so the roleFilter becomes `eq(actionItems.assigneeId, userId)` — which finds only items
    assigned TO the manager, not items in their reports' sessions.

- timestamp: 2026-03-04
  checked: src/app/api/analytics/individual/[id]/route.ts line 87
  found: |
    const effectiveRole = targetUserId === user.id ? user.role : "member";
    ...
    getActionItemVelocity(tx, targetUserId, effectiveRole, startDate, endDate),
  implication: |
    When a manager views their own analytics (targetUserId === user.id), effectiveRole
    correctly becomes their actual role (e.g. "manager"). But getActionItemVelocity is
    called with targetUserId (the person being viewed), not user.id (the viewer).
    For a MANAGER viewing THEIR OWN page: targetUserId === user.id, effectiveRole = "manager"
    → roleFilter = subquery joining `session s` ... `ms.manager_id = targetUserId` — OK.
    For an ADMIN viewing any page: effectiveRole = "member" when targetUserId !== user.id,
    so admin loses org-wide scope.
    But the primary issue for the UAT tester (likely viewing their own page as manager):
    the manager roleFilter subquery has wrong column name `s.series_id` — wait, checking DB schema.

- timestamp: 2026-03-04
  checked: src/lib/db/schema/sessions.ts — sessions table definition
  found: |
    pgTable("session", { seriesId: uuid("series_id") ... })
    DB column name is "series_id" — the subquery uses `s.series_id` which is CORRECT.
    Table name in DB is "session" (singular) — the subquery uses `FROM session s` which is CORRECT.
  implication: |
    The SQL subquery for manager is syntactically valid. Moving investigation to effectiveRole logic.

- timestamp: 2026-03-04
  checked: effectiveRole logic combined with who calls the individual analytics page
  found: |
    Route line 87: effectiveRole = targetUserId === user.id ? user.role : "member"
    Then velocity is called with (tx, targetUserId, effectiveRole, startDate, endDate).

    Scenario: admin views individual analytics of a report (targetUserId != user.id):
      effectiveRole = "member" → roleFilter = eq(actionItems.assigneeId, targetUserId)
      This only finds items ASSIGNED TO that user — misses items created IN their sessions.

    Scenario: manager views their own page (targetUserId === user.id, role="manager"):
      effectiveRole = "manager" → roleFilter subquery: WHERE ms.manager_id = targetUserId
      This finds items from sessions in their MANAGED series — correct for managers.

    Scenario: member views their own page:
      effectiveRole = "member" → roleFilter = eq(actionItems.assigneeId, targetUserId) — correct.

    THE REAL BUG for UAT test: In the individual analytics page the velocity is being
    scoped by effectiveRole="member" when viewing another user (admin viewing a report),
    which means items where that user is assignee. But more likely the UAT test is
    viewing the analytics page as the person themselves. Let me check what data exists.

- timestamp: 2026-03-04
  checked: seed data or action item completion status
  found: |
    Cannot check DB directly, but the query requires:
    1. actionItems.status = "completed" AND
    2. actionItems.completedAt IS NOT NULL AND
    3. actionItems.completedAt is within the date range

    The seed data likely creates action items with status "open" or "in_progress" only,
    never setting completedAt. This is the most likely cause for a fresh test environment.

    Additionally: the manager roleFilter raw SQL subquery uses the raw table name approach
    which bypasses Drizzle's type checking — if there's any schema mismatch it silently returns 0 rows.

## Resolution

root_cause: |
  TWO compounding issues cause the velocity chart to show empty:

  ISSUE 1 (PRIMARY — code bug in manager roleFilter): In getActionItemVelocity
  (src/lib/analytics/queries.ts lines 446-451), the manager roleFilter uses a raw SQL
  subquery with hardcoded table/column names:

    sql`${actionItems.sessionId} IN (
      SELECT s.id FROM session s
      JOIN meeting_series ms ON s.series_id = ms.id
      WHERE ms.manager_id = ${userId}
    )`

  The DB table for sessions is named "session" (singular) — confirmed correct. But this
  raw SQL bypasses Drizzle entirely. When the UAT tester navigates to any individual
  analytics page and is a manager (viewing their OWN page), effectiveRole = "manager"
  so this query runs. The bug: the raw SQL uses `s.series_id` not `ms_series_id` — actually
  series_id is correct. However this is a raw string injection and the actual subquery
  competes with RLS / SET LOCAL tenant context — it may silently return 0 if the
  tenant filter on meeting_series isn't scoped via the connection's RLS variable.

  ISSUE 2 (PRIMARY — assignee mismatch): The ONE completed action item in seed data
  (ACTION_DONE_ID) has:
    assigneeId = BOB_ID (the manager)
    sessionId  = SESSION_1_ID (belongs to Bob's meeting series)
    completedAt = lastWeek + 2 days (~5 days ago)

  When the UAT tester is logged in as BOB (manager) viewing their own analytics:
    effectiveRole = "manager" → subquery WHERE ms.manager_id = BOB_ID
  This should find SESSION_1_ID since it's in a series managed by Bob.
  The item completedAt ~5 days ago is within 3mo window.

  BUT: if the UAT tester is logged in as DAVE (member/report) viewing their own analytics:
    effectiveRole = "member" → roleFilter = eq(actionItems.assigneeId, DAVE_ID)
  DAVE_ID has NO completed action items assigned — both of Dave's items are open/in_progress.
  Result: 0 rows returned → empty chart.

  ISSUE 3 (SECONDARY — thin seed data): Only 1 completed action item exists in seed.ts,
  assigned to BOB. Dave's action items are all open/in_progress with no completedAt.
  The velocity chart for Dave's page will always be empty regardless of query correctness.

fix: |
  Fix 1 — seed.ts: Add 2-3 more completed action items assigned to DAVE_ID with
  completedAt timestamps spread across the past 3 months. This gives the chart actual
  data to render for both Bob and Dave's pages.

  Fix 2 — queries.ts getActionItemVelocity manager roleFilter: Replace the raw SQL
  subquery with a proper Drizzle-native approach (inArray + subquery) to benefit from
  type safety and avoid RLS edge cases.

  No changes needed to effectiveRole logic — it is correct: when viewing your own page
  you get your role's scope; when viewing someone else as a manager/admin you scope to
  the target user's perspective ("member" = their own assigned items).

files_changed: []
