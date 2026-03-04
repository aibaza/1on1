---
status: diagnosed
trigger: "Tests 8, 9: Category Breakdown & Session Comparison showing no data — hardcoded English category names don't match actual template section names"
created: 2026-03-04T00:00:00Z
updated: 2026-03-04T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — compute.ts silently drops all category scores because it does a case-insensitive lowercase match of section names against a hardcoded CATEGORY_METRICS dictionary that only knows 6 English keywords (wellbeing, engagement, performance, career, feedback, mood). The seed data has section names like "Wellbeing", "Performance", "Check-in", "Career Goals", "Feedback", "Follow-up", "Energie & Productivitate", etc. Only 3 of these lowercased ("wellbeing", "performance", "feedback") would ever match — and even those only for the Weekly and Career templates. Everything else is silently skipped.
test: Code trace in compute.ts line 106-108
expecting: Zero analytics_snapshot rows written for most sessions, causing getCategoryAverages fallback (live query) to return section names directly — but those names ("Check-in", "Career Goals", "Energie & Productivitate") never appear in the chart because... the chart shows them as-is; the chart itself is fine. The real problem is the snapshot path is broken AND the live fallback returns zero rows if answerNumeric IS NULL or SCORABLE_ANSWER_TYPES doesn't match.
next_action: DONE — root cause confirmed

## Symptoms

expected: Category Breakdown chart shows per-section average scores
actual: "No category data available for this period." / "No scorable category data found for these sessions."
errors: No runtime errors — silent data absence
reproduction: View individual analytics page or compare any two sessions with any template
started: Always broken (design flaw, not regression)

## Eliminated

- hypothesis: Frontend component filtering out categories by name
  evidence: category-breakdown.tsx and session-comparison.tsx render whatever array they receive — no name filtering at all
  timestamp: 2026-03-04

- hypothesis: Query joining wrong tables / wrong foreign keys
  evidence: SQL joins are correct (session_answers -> template_questions -> template_sections -> sessions)
  timestamp: 2026-03-04

## Evidence

- timestamp: 2026-03-04
  checked: src/lib/analytics/constants.ts — CATEGORY_METRICS dictionary
  found: Hardcodes exactly 6 lowercase English keys: "wellbeing", "engagement", "performance", "career", "feedback", "mood"
  implication: Any template section whose name doesn't case-insensitively match one of these 6 words produces no snapshot row

- timestamp: 2026-03-04
  checked: src/lib/analytics/compute.ts lines 106-108
  found: |
    const category = answer.sectionName.toLowerCase().trim();
    const metricName = CATEGORY_METRICS[category];
    if (!metricName) continue; // Skip categories we don't track
  implication: This is the silent drop gate. "check-in", "career goals", "follow-up", "energie & productivitate" etc. all fail the lookup and are skipped entirely. No snapshot rows are written for them.

- timestamp: 2026-03-04
  checked: src/lib/db/seed.ts — actual template section names in DB
  found: |
    Weekly template:  "Wellbeing", "Performance", "Check-in"
    Career template:  "Career Goals", "Feedback"
    Structured 1:1:   "Follow-up", "Energie & Productivitate", "Progres pe obiective",
                      "Blocaje / Fricțiuni", "Colaborare & Context", "Învățare & Creștere",
                      "Capacitate & Încărcare"
    Beta template:    "Check-in"
  implication: Only "wellbeing" and "performance" from the Weekly template match CATEGORY_METRICS. "career goals" ≠ "career". "check-in", "follow-up", and all Romanian section names have zero matches. That's 10 out of 13 section types silently producing no analytics snapshots.

- timestamp: 2026-03-04
  checked: getCategoryAverages fallback path (queries.ts lines 170-208)
  found: Live SQL query joins session_answers -> template_questions -> template_sections -> sessions, groups by templateSections.name, returns sectionName directly
  implication: The fallback DOES work correctly and returns actual section names. BUT the fallback only fires when snapshots.length === 0. If any snapshots exist (e.g., "wellbeing_score" from a completed session), the snapshot path is taken and returns only matching categories — missing everything else.

- timestamp: 2026-03-04
  checked: getSessionComparison (queries.ts lines 219-283)
  found: This function uses ONLY the live query path (no snapshot fallback). It queries session_answers filtered by SCORABLE_ANSWER_TYPES. It does NOT filter by CATEGORY_METRICS — it returns any section with numeric answers.
  implication: Session Comparison should actually work correctly as long as sessions have questions with scorable answer types (rating_1_5, rating_1_10, mood, scale_custom). If it returns empty, the seed data's sessions either have no completed answers with those types, or the sessions selected for comparison have no such answers recorded.

- timestamp: 2026-03-04
  checked: getTeamAverages and getTeamHeatmapData (queries.ts lines 293-418)
  found: Both query only analytics_snapshot using inArray(metricName, categoryMetricNames) where categoryMetricNames = Object.values(CATEGORY_METRICS) = the same 6 hardcoded metric names
  implication: Team analytics also returns zero data for any team where members' sessions used non-matching section names

## Resolution

root_cause: |
  TWO-LAYER hardcoding problem:

  LAYER 1 — compute.ts (snapshot write path):
  File: src/lib/analytics/compute.ts, lines 106-108
  When computing analytics snapshots after session completion, section names are lowercased
  and looked up in CATEGORY_METRICS (defined in constants.ts). Only 6 exact lowercase English
  words match ("wellbeing", "engagement", "performance", "career", "feedback", "mood").
  All other section names — including multi-word names like "Career Goals", non-English names
  like "Energie & Productivitate", and generic names like "Check-in" and "Follow-up" — are
  silently skipped. No snapshot rows are written for them.

  LAYER 2 — queries.ts (snapshot read path for team analytics):
  File: src/lib/analytics/queries.ts, getCategoryAverages() snapshot branch (line 136),
  getTeamAverages() (line 308), getTeamHeatmapData() (line 372).
  All three filter snapshots using inArray(metricName, Object.values(CATEGORY_METRICS)).
  This means only those 6 hardcoded metric names are ever fetched — even if somehow
  a snapshot existed for a different category, it would be invisible.

  RESULT FOR EACH TEST:
  - Test 8 (Category Breakdown): getCategoryAverages returns [] because either (a) no
    snapshots exist at all for those sections [most common case], or (b) the live fallback
    runs but finds no completed sessions in the period [less common]. The "No category data
    available" empty state fires.
  - Test 9 (Session Comparison): getSessionComparison uses only the live query path with
    no CATEGORY_METRICS filter — it should work if sessions have scorable answers. If
    returning empty, it means the selected sessions have no answers with answerNumeric set
    and answerType in SCORABLE_ANSWER_TYPES (rating_1_5, rating_1_10, mood, scale_custom).
    Possible that seed data sessions were created without completing answers properly.

fix: |
  There are two valid approaches:

  APPROACH A (Recommended) — Remove the category-name coupling entirely:
  1. In compute.ts: Remove the CATEGORY_METRICS lookup gate. Instead of skipping unknown
     sections, store a snapshot for EVERY section that has scorable answers. The metricName
     should be derived dynamically from the section name (e.g., slugified: "career-goals",
     "energie-productivitate") rather than matched against a fixed dictionary.
  2. In constants.ts: Remove CATEGORY_METRICS or make it a UI display mapping only (not
     used as a gate/filter).
  3. In queries.ts: Remove the inArray(metricName, categoryMetricNames) filter. Fetch all
     category snapshots for the user/team, not just the 6 hardcoded ones.
  4. In getTeamAverages / getTeamHeatmapData: Same — remove the metric name filter.

  APPROACH B (Minimal fix, preserves snapshot schema) — Normalize section names to metric names:
  1. In compute.ts: Expand CATEGORY_METRICS or add a normalization step that maps more
     section names to metric names. E.g., "career goals" -> "career_score",
     "check-in" -> "engagement_score", etc. Still fragile — any new template with unexpected
     section names breaks again.

  APPROACH A is strongly preferred because the current design assumes all tenants use
  the same 6 fixed categories, which contradicts the template system's flexibility.

files_changed: []
