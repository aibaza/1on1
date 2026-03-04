---
status: diagnosed
trigger: "Wizard context panel shows Nudges section for managers with coaching nudges - user sees no nudges section in wizard context panel, even though dashboard shows them"
created: 2026-03-04T20:30:00Z
updated: 2026-03-04T20:35:00Z
---

## Current Focus

hypothesis: CONFIRMED - NudgeList passes `upcoming=true` to API which filters by targetSessionAt date range, excluding nudges that are null or past-dated
test: Compared dashboard query (no date filter) vs wizard API call (upcoming=true date filter)
expecting: Different filter conditions explain why dashboard shows nudges but wizard does not
next_action: Return diagnosis

## Symptoms

expected: Open the session wizard as a manager. The context panel (right sidebar) should show a "Nudges" section as its first element, listing coaching nudges relevant to this series. Each nudge can be dismissed. Members/reports should NOT see the nudge section.
actual: No nudges section visible for any session in the wizard, even though nudges appear on the dashboard
errors: None reported
reproduction: Open any session wizard as a manager - nudges section missing from context panel
started: Discovered during UAT (Test 6)

## Eliminated

- hypothesis: NudgeList component is missing from context panel
  evidence: context-panel.tsx line 508 renders `<NudgeList>` when isManager && seriesId && sessionId
  timestamp: 2026-03-04T20:31:00Z

- hypothesis: isManager/seriesId/sessionId props not being passed
  evidence: wizard-shell.tsx lines 758-760 pass all three props correctly from session data
  timestamp: 2026-03-04T20:31:00Z

## Evidence

- timestamp: 2026-03-04T20:31:00Z
  checked: context-panel.tsx lines 507-511
  found: NudgeList IS rendered when isManager && seriesId && sessionId -- component exists and is wired up
  implication: The component exists; the issue is downstream in data fetching

- timestamp: 2026-03-04T20:31:00Z
  checked: wizard-shell.tsx lines 758-760
  found: seriesId={data.session.seriesId}, sessionId={data.session.id}, isManager={isManager} all passed
  implication: Props are supplied correctly; issue is not in prop passing

- timestamp: 2026-03-04T20:32:00Z
  checked: nudge-list.tsx line 41
  found: NudgeList fetches from `/api/nudges?seriesId=${seriesId}&upcoming=true` -- always passes upcoming=true
  implication: The `upcoming=true` flag triggers date-range filtering in the API

- timestamp: 2026-03-04T20:33:00Z
  checked: /api/nudges/route.ts lines 44-55
  found: When upcoming=true, API adds TWO conditions: `targetSessionAt >= NOW()` AND `targetSessionAt <= NOW()+7days`
  implication: Nudges are only returned if targetSessionAt falls within a 7-day future window

- timestamp: 2026-03-04T20:33:00Z
  checked: dashboard.ts lines 170-175 (dashboard nudge query)
  found: Dashboard query filters ONLY by isDismissed=false, tenantId, and seriesId IN (...) -- NO date filtering
  implication: This is WHY dashboard shows nudges but wizard does not -- different filter conditions

- timestamp: 2026-03-04T20:34:00Z
  checked: post-session.ts line 169, pipeline.ts line 102
  found: Nudges are stored with `targetSessionAt: seriesData?.nextSessionAt ?? null`
  implication: targetSessionAt can be NULL (if no nextSessionAt), or point to a date that is now past (the current session being opened IS the target session)

- timestamp: 2026-03-04T20:34:00Z
  checked: nudge-list.tsx lines 70-73
  found: NudgeList returns null when `!data || visibleNudges.length === 0` -- empty API response = hidden section
  implication: The section silently hides itself when the API returns no nudges, making it appear as if it doesn't exist

## Resolution

root_cause: |
  The NudgeList component in the wizard context panel always fetches nudges with `upcoming=true` query parameter
  (nudge-list.tsx line 41). The API endpoint (/api/nudges/route.ts lines 44-55) interprets this by adding strict
  date-range filters: `targetSessionAt >= NOW()` AND `targetSessionAt <= NOW() + 7 days`. This excludes nudges where:

  1. targetSessionAt is NULL (SQL comparison with NULL yields NULL/false) -- happens when series has no nextSessionAt
  2. targetSessionAt is in the past -- happens when the current session IS the targeted session (the date has arrived/passed)

  The dashboard query (dashboard.ts lines 170-175) does NOT apply any date filtering, which is why nudges appear
  there but not in the wizard. The NudgeList component silently returns null when the API returns zero nudges
  (nudge-list.tsx lines 70-73), making the entire section invisible.

fix:
verification:
files_changed: []
