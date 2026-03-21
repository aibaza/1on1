# Research: SMART Objectives Integration & Automatic Tracking

**Domain:** Goal/objective tracking within a 1:1 meeting management platform
**Researched:** 2026-03-21
**Overall Confidence:** MEDIUM-HIGH

---

## Executive Summary

SMART objectives occupy a distinct layer above action items but below full OKR/goal management systems. The founder's instinct is correct: this should NOT become an OKR tool. The right approach is "objectives as context for conversations" -- lightweight goal references that enrich 1:1 sessions without requiring a separate goal-management workflow.

The competitive landscape shows a clear pattern: Lattice, Culture Amp, and 15Five all surface goals in a sidebar/context panel during 1:1s rather than making them a wizard step. Goals exist as standalone entities that are *referenced* during meetings, not *managed* through meetings. This is the correct model for 1on1.

AI can reliably assess progress on objectives that have quantifiable success criteria (behavioral frequency, numeric targets, completion of milestones). For soft objectives like "improve communication," the key is forcing SMART decomposition at creation time -- converting vague aspirations into specific, observable behaviors with measurable indicators. The AI then tracks those indicators across session data rather than trying to grade the abstract goal.

The recommended scope is: **Create objectives with SMART criteria. Surface them during sessions. Let AI assess progress post-session. Do NOT build cascading goal hierarchies, team-level OKRs, or goal alignment trees.**

---

## 1. Objectives vs Action Items: The Relationship

### Hierarchy

```
OBJECTIVE (quarter-level, outcome-oriented)
  "Improve cross-team communication effectiveness"
  ├── Key Result / Success Criteria (measurable indicator)
  │   "Receive positive feedback on communication from 3+ peers by Q2"
  │   "Reduce meeting misunderstandings reported in retros by 50%"
  │
  ├── ACTION ITEM (session-level, task-oriented)
  │   "Schedule intro meeting with design team lead" [from Session #4]
  │   "Send weekly status update to stakeholders" [from Session #6]
  │   "Practice active listening exercise before next 1:1" [from Session #7]
  │
  └── SESSION SIGNALS (AI-detected evidence of progress/regression)
      "Session #5: Report mentioned better collaboration with design"
      "Session #8: Manager noted improved presentation clarity"
```

### Key Distinction

| Dimension | Objective | Action Item |
|-----------|-----------|-------------|
| **Scope** | Outcome (what to achieve) | Task (what to do) |
| **Duration** | Weeks to months (quarter) | Days to weeks (session-to-session) |
| **Ownership** | Collaborative (manager + report agree) | Individual (assigned to one person) |
| **Tracking** | Progress % or status milestones | Binary (done / not done) |
| **Creation** | Deliberate planning moment | Emerges from session discussions |
| **AI role** | Assess progress from session data | Suggest new items, track completion |

### How Competitors Model This

- **Lattice**: Goals are a separate module. During 1:1s, the report's active goals appear in a sidebar context panel. Managers can click "Active goals" from the meeting view. Goals are NOT inline with meeting content.
- **Culture Amp**: Goals live in a "goal tree" that connects individual -> team -> company. In 1:1s, goals surface as reference context. The 1:1 is the *conversation* about goals, not the *management* of goals.
- **15Five**: Objectives appear in check-ins and are referenced in 1:1 agendas. The meeting is where you *discuss* objective progress, not where you *define* objectives.
- **Fellow**: Lightweight goal tracking within 1:1 context. Can connect agenda items to goals.

**Pattern:** Goals are created/managed elsewhere (dedicated page). 1:1 meetings *reference* and *discuss* them. Post-session AI/analytics *update* progress signals.

**Confidence:** HIGH (consistent across all competitors studied)

---

## 2. Recommended Scope: What to Build vs What to Leave Out

### BUILD (Minimal Viable Objective Tracking)

| Feature | Rationale |
|---------|-----------|
| **Objective CRUD** on a dedicated page | Users need a place to create/edit/archive objectives separate from sessions |
| **SMART criteria fields** at creation | Forces specificity; gives AI measurable hooks |
| **Link action items to objectives** | Shows tactical work rolling up to strategic goals |
| **Surface objectives in session context panel** | The "reference during conversation" pattern all competitors use |
| **AI progress assessment post-session** | The differentiator -- automatic tracking from session signals |
| **Objective progress timeline** | Visual history of AI assessments + manual check-ins |
| **Objective review cadence prompts** | Nudge to review objectives periodically (not every session) |

### DO NOT BUILD

| Anti-Feature | Why Not | What to Do Instead |
|--------------|---------|-------------------|
| **Goal alignment trees** (individual -> team -> company) | Separate product category (OKR tool). Massive scope. | Flat list of individual objectives, optional category tag |
| **Cascading OKRs** | Requires organizational goal setting workflow | Keep objectives scoped to the manager-report pair |
| **Goal weighting / scoring formulas** | Over-engineering for a 1:1 tool | Simple progress: 0-100% or status milestones |
| **Team-level objectives dashboard** | Admin analytics feature creep | Individual objectives visible to the direct manager only |
| **Goal-based performance reviews** | Performance management = different product | Objectives inform 1:1 conversations, not review scores |
| **Peer goal visibility** | Privacy concern, scope creep | Only manager + report see the objectives |
| **Key Result sub-items** | Too much OKR structure | Success criteria as text fields on the objective |

### The Boundary Test

> If a feature requires an admin to configure company-wide goal cycles, it's out of scope.
> If a feature helps a manager and report have a better conversation about growth, it's in scope.

**Confidence:** HIGH (clear from founder's guidance + competitive analysis)

---

## 3. Data Model Proposal

### New Table: `OBJECTIVE`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | |
| `tenant_id` | `UUID` | FK -> TENANT, NOT NULL | RLS isolation |
| `series_id` | `UUID` | FK -> MEETING_SERIES, NOT NULL | Scoped to manager-report pair |
| `created_by_id` | `UUID` | FK -> USER, NOT NULL | Who created it (manager or report) |
| `owner_id` | `UUID` | FK -> USER, NOT NULL | Who owns achievement (usually the report) |
| `title` | `VARCHAR(500)` | NOT NULL | The objective statement |
| `description` | `TEXT` | | Expanded context |
| `category` | `VARCHAR(50)` | | Reuse existing categories: wellbeing, performance, career, etc. |
| `status` | `ENUM` | NOT NULL, default 'active' | `draft`, `active`, `achieved`, `abandoned`, `paused` |
| `progress` | `INTEGER` | NOT NULL, default 0 | 0-100 percentage |
| `target_date` | `DATE` | | When this should be achieved |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |
| `achieved_at` | `TIMESTAMPTZ` | nullable | When marked achieved |
| `review_cadence` | `ENUM` | default 'monthly' | `every_session`, `biweekly`, `monthly`, `quarterly` |
| `next_review_at` | `DATE` | nullable | Computed from cadence |

**Indexes:**
- `INDEX(tenant_id, series_id, status)` -- active objectives per series
- `INDEX(tenant_id, owner_id, status)` -- "my objectives" queries
- `INDEX(tenant_id, next_review_at)` -- review reminder scheduling

### New Table: `OBJECTIVE_CRITERION`

SMART success criteria -- the "Measurable" part. Each objective has 1-5 criteria.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | |
| `objective_id` | `UUID` | FK -> OBJECTIVE, NOT NULL | |
| `description` | `TEXT` | NOT NULL | The measurable criterion |
| `measurement_type` | `ENUM` | NOT NULL | `binary` (done/not), `numeric` (target value), `milestone` (ordered steps) |
| `target_value` | `DECIMAL(8,2)` | nullable | For numeric type: the target number |
| `current_value` | `DECIMAL(8,2)` | nullable | For numeric type: current progress |
| `unit` | `VARCHAR(50)` | nullable | For numeric type: "presentations", "feedbacks", "%" |
| `is_met` | `BOOLEAN` | NOT NULL, default false | Has this criterion been satisfied? |
| `sort_order` | `INTEGER` | NOT NULL | Display order |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

### New Table: `OBJECTIVE_PROGRESS_LOG`

Tracks progress changes over time (both manual and AI-assessed).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK | |
| `objective_id` | `UUID` | FK -> OBJECTIVE, NOT NULL | |
| `session_id` | `UUID` | FK -> SESSION, nullable | Which session triggered this (null for manual) |
| `source` | `ENUM` | NOT NULL | `manual`, `ai_assessment`, `criterion_update` |
| `previous_progress` | `INTEGER` | NOT NULL | Progress before this update |
| `new_progress` | `INTEGER` | NOT NULL | Progress after this update |
| `assessment_text` | `TEXT` | | AI explanation or manual note |
| `confidence` | `ENUM` | nullable | `high`, `medium`, `low` -- AI confidence in its assessment |
| `signals` | `JSONB` | nullable | AI-detected evidence from session data |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `created_by_id` | `UUID` | FK -> USER, nullable | Null for AI assessments |

**Indexes:**
- `INDEX(objective_id, created_at DESC)` -- progress timeline
- `INDEX(session_id)` -- "what objectives were assessed in this session?"

### Modified Table: `ACTION_ITEM` (add column)

| Column | Type | Description |
|--------|------|-------------|
| `objective_id` | `UUID` | FK -> OBJECTIVE, nullable. Links this action item to a parent objective. |

This is the minimal linkage. An action item can optionally belong to an objective. No migration risk -- it's a nullable FK addition.

### Relationship Diagram

```
MEETING_SERIES
  └── OBJECTIVE (1:many per series)
        ├── OBJECTIVE_CRITERION (1:many, the "M" in SMART)
        ├── OBJECTIVE_PROGRESS_LOG (1:many, timeline)
        └── ACTION_ITEM (many objectives can link many action items)
              └── linked via objective_id on ACTION_ITEM
```

**Confidence:** HIGH (follows existing schema patterns, minimal surface area)

---

## 4. AI Assessment Strategy

### How It Works

After each session completion, the existing AI pipeline already runs `generateUnifiedOutput()`. The objective assessment extends this pipeline with an additional step (or additional output fields in the unified schema).

### Assessment Flow

```
Session Completed
  │
  ├─> [Existing] generateUnifiedOutput() -- summary, addendum, suggestions
  │
  └─> [New] assessObjectiveProgress()
        │
        ├── Input: active objectives + criteria + session answers + notes + action items
        │
        ├── AI evaluates each active objective:
        │   - Evidence of progress from this session's discussion?
        │   - Any criteria partially/fully met?
        │   - Suggested progress update (delta, not absolute)
        │   - Confidence level for assessment
        │
        └── Output: OBJECTIVE_PROGRESS_LOG entries (pending manager approval)
```

### What AI Can Reliably Assess

| Signal Type | Reliability | Example |
|-------------|-------------|---------|
| **Action item completion** related to objective | HIGH | "Completed 'Give presentation to stakeholders' -> supports 'Improve public speaking'" |
| **Numeric answer trends** in relevant categories | HIGH | "Performance score went from 3.2 to 4.1 over 3 sessions" |
| **Explicit mentions** in text answers / notes | MEDIUM | "Report said 'I've been practicing active listening'" |
| **Behavioral pattern changes** across sessions | MEDIUM | "Report's engagement scores consistently above 4 for 4 sessions" |
| **Absence of negative signals** | LOW | "No blockers mentioned related to communication" |

### Quantifying Soft Objectives

The key insight from research: **You don't measure "improve communication" -- you measure the SMART decomposition of it.**

**Bad objective:** "Improve communication skills"
**SMART decomposition (forced at creation):**
- Criterion 1: "Lead at least 2 team standup meetings per month" (numeric, target: 2/month)
- Criterion 2: "Receive 'good' or better feedback on clarity from 3 peers" (numeric, target: 3)
- Criterion 3: "Complete active listening workshop" (binary)

The AI template co-author can help users decompose vague goals into SMART criteria at creation time. This is where the existing AI infrastructure pays off.

### AI SMART Decomposition Prompt (at objective creation)

When a user types a vague objective, offer an "AI Assist" button that:
1. Takes the vague objective text
2. Suggests 2-4 SMART criteria with measurement types
3. User accepts/edits/rejects each suggestion

This is a single `generateObject()` call with a Zod schema -- exactly the pattern used in the template AI editor.

### AI Progress Assessment Schema (addition to unified output)

```typescript
const objectiveAssessmentSchema = z.object({
  objectiveId: z.string(),
  progressDelta: z.number()
    .describe("Suggested change to progress percentage. Positive = forward, negative = regression. Range: -20 to +20 per session."),
  confidence: z.enum(["high", "medium", "low"]),
  evidence: z.array(z.string())
    .describe("1-3 specific signals from this session supporting the assessment"),
  criteriaUpdates: z.array(z.object({
    criterionId: z.string(),
    isMet: z.boolean().optional(),
    currentValue: z.number().optional(),
    note: z.string().describe("Brief explanation"),
  })).optional(),
});
```

### Approval Model: AI-Suggested, Human-Confirmed

AI assessments should NOT auto-update progress. Instead:
1. AI suggests a progress update with evidence
2. Manager sees suggestion in post-session review (or next session's context panel)
3. Manager accepts, adjusts, or dismisses the suggestion
4. Accepted suggestions become OBJECTIVE_PROGRESS_LOG entries

This avoids the trust problem of fully automated assessment and keeps the human in the loop.

**Confidence:** MEDIUM-HIGH (the approach is sound but AI accuracy on soft objectives will vary; the approval model mitigates risk)

---

## 5. Session Integration Points

### Where Objectives Appear

Based on competitive analysis, objectives should appear in **three places**:

#### A. Context Panel (During Session) -- READ ONLY

The existing context panel already shows:
- Notes from last 3 sessions
- Open action items
- Score trends (sparkline)

**Add:** Active objectives section showing:
- Objective title + progress bar
- Next review date indicator
- Linked open action items count
- "Due soon" flag if target_date is within 2 weeks

This is the Lattice/Culture Amp pattern. The session is where you *discuss* objectives, not *manage* them.

#### B. Post-Session AI Summary -- NEW SECTION

After the unified AI pipeline runs, add an "Objective Progress" section to the summary:
- For each active objective with detected signals:
  - AI assessment with confidence badge
  - Evidence citations from session data
  - Suggested progress update (accept/dismiss buttons)

#### C. Dedicated Objectives Page -- STANDALONE

A new page at `/(dashboard)/objectives/` showing:
- All objectives grouped by series (manager-report pair)
- Status filters (active, achieved, abandoned)
- Progress timeline per objective
- Quick-create with AI SMART assist

### Where Objectives Do NOT Appear

- **NOT a wizard step.** Objectives are long-term context, not per-session input. Making them a wizard step would force discussion every session, which is wrong for monthly/quarterly objectives.
- **NOT in the template builder.** Objectives are per-series, not per-template.
- **NOT in team analytics.** Keep objectives private between manager and report.

**Confidence:** HIGH (consistent with all competitor UX patterns)

---

## 6. Lifecycle and Cadence

### Objective Lifecycle

```
DRAFT ──> ACTIVE ──> ACHIEVED
              │            │
              ├──> PAUSED ─┘ (resume later)
              │
              └──> ABANDONED (didn't work out, and that's OK)
```

### Creation Cadence

**When to create objectives:**
- Dedicated "goal setting" session (quarterly -- the manager schedules a specific 1:1 for this)
- Ad-hoc during any session (link emerges from conversation)
- From the objectives page directly

**Recommendation:** Don't enforce a cadence for creation. Provide a quarterly nudge: "It's been 3 months since you set objectives for [Report]. Would you like to review and refresh?"

### Review Cadence

| Cadence | When to Use | How It Works |
|---------|-------------|--------------|
| **Every session** | Short-term tactical objectives (1-4 weeks) | Objective appears highlighted in context panel |
| **Biweekly** | Development goals in active pursuit | Objective appears highlighted every other session |
| **Monthly** | Standard growth objectives | Monthly nudge to review; AI assesses silently each session |
| **Quarterly** | Long-term strategic objectives | Quarterly review prompt; AI accumulates signals |

The AI assesses progress after EVERY session regardless of review cadence. The cadence controls when the manager is **prompted** to explicitly discuss/review the objective.

### Target Date Handling

- Objectives approaching target date (< 2 weeks): "Due soon" badge in context panel
- Objectives past target date but still active: "Overdue" indicator + nudge to either extend, achieve, or abandon
- No automatic status changes -- the manager decides

**Confidence:** HIGH (straightforward lifecycle, cadence matches existing session patterns)

---

## 7. Manager vs Report Ownership

### Collaborative Model (Recommended)

| Action | Who Can Do It |
|--------|---------------|
| **Create objective** | Manager OR report (either can propose) |
| **Edit objective** | Manager OR report |
| **Set SMART criteria** | Manager OR report (AI assists both) |
| **Update progress manually** | Manager OR report |
| **Accept AI progress assessment** | Manager only (they're the reviewer) |
| **Mark achieved/abandoned** | Manager only (official status change) |
| **Link action items** | Manager OR report |

### Why Manager Approves AI Assessments

The manager has the broader context: is the AI reading the signals correctly? Did the report actually improve, or are they just saying the right things? Manager approval adds judgment that AI cannot provide.

### Why Reports Can Create Objectives

Bottom-up goal setting is critical for engagement. A report should be able to say "I want to work on X" and propose it. The manager can discuss, refine, and activate it in the next session.

**Confidence:** HIGH (standard in Lattice, Culture Amp, 15Five)

---

## 8. Competitive Analysis Summary

| Platform | Goals in 1:1 | Integration Style | AI Assessment | Scope |
|----------|-------------|-------------------|---------------|-------|
| **Lattice** | Sidebar panel, "Active goals" link | Reference-only during meeting. Goals managed in separate module. | No automatic assessment. AI Meeting Agent captures notes but doesn't grade goals. | Full OKR + goal alignment trees. Heavy. |
| **Culture Amp** | Goal tree reference in 1:1 context | Goals align to company objectives. 1:1s are conversations about goals. | Skills Coach provides coaching suggestions. No automatic goal grading. | Full goal management with cascading alignment. |
| **15Five** | Objectives in check-ins + 1:1 agendas | Objectives surface in weekly check-ins. Referenced in 1:1 meeting context. | No automatic assessment. | OKR-style with key results. |
| **Fellow** | Lightweight goal linking from agenda items | Goals tracked in-platform, linked to meeting topics. | No automatic assessment. | Lightweight -- closest to our target scope. |
| **Teamflect** | Goals connected to 1:1 agenda in MS Teams | Direct connection between conversation items and goals. | No automatic assessment. | Moderate -- Teams-native. |

### Our Differentiator

**None of the competitors do automatic AI progress assessment.** This is the unique value proposition. While competitors let you *reference* goals during 1:1s, nobody automatically *analyzes* session data to *assess* goal progress. This is where our existing AI pipeline creates a genuine advantage.

**Confidence:** MEDIUM (competitive landscape analysis from web search; specifics may be dated)

---

## 9. Linking Objectives to Behavioral Metrics

If the platform adds behavioral metrics and personal profiles (pgvector), objectives create a natural bridge:

### The Connection

```
OBJECTIVE: "Improve technical leadership"
  │
  ├── SMART Criteria: "Lead 3 architecture reviews this quarter"
  │
  ├── BEHAVIORAL METRIC: "technical_leadership" score trend
  │   (computed from session answers in 'performance' category)
  │
  └── AI SIGNAL: "Session answers about collaboration and mentoring
       show consistent improvement over 4 sessions"
```

### How It Works

1. When an objective is created with a `category` (e.g., "performance", "career"), it maps to the existing analytics category scores.
2. The AI pipeline can reference the category score trend when assessing objective progress.
3. pgvector personal profiles can store "objective achievement patterns" -- what types of support/conversation topics correlate with objective progress for this individual.

### Implementation Note

This is a v2+ concern. The objective model should store `category` from day one (it's in the proposed schema), but the behavioral metric linkage doesn't need to ship in the first version. The category field enables it later without migration.

**Confidence:** MEDIUM (speculative -- depends on behavioral metrics implementation)

---

## 10. Implementation Complexity Estimate

### Phase 1: Foundation (Medium complexity, ~2-3 sprints)

- [ ] `OBJECTIVE` table + schema + migrations
- [ ] `OBJECTIVE_CRITERION` table + schema
- [ ] `OBJECTIVE_PROGRESS_LOG` table + schema
- [ ] `objective_id` nullable FK on `ACTION_ITEM`
- [ ] Objectives CRUD API routes
- [ ] Objectives list page (/(dashboard)/objectives/)
- [ ] Objective detail/edit page
- [ ] RLS policies for new tables

### Phase 2: Session Integration (Medium complexity, ~2 sprints)

- [ ] Context panel: objectives section (read-only)
- [ ] AI SMART decomposition assist at creation
- [ ] Link action items to objectives (UI in action item form)
- [ ] "Due soon" / "Overdue" badges in context panel

### Phase 3: AI Assessment (High complexity, ~2-3 sprints)

- [ ] Extend AI pipeline: objective assessment schema
- [ ] Extend AI context: include active objectives + criteria in prompt
- [ ] Post-session: generate objective progress assessments
- [ ] Post-session summary: objective progress section
- [ ] Manager approval UI for AI assessments
- [ ] Progress timeline visualization (Recharts)

### Phase 4: Polish (Low complexity, ~1 sprint)

- [ ] Review cadence nudges
- [ ] Quarterly review prompts
- [ ] Objective achievement celebrations (toast/confetti)
- [ ] Analytics integration (objective completion rate metric)
- [ ] i18n for all new strings

### Total Estimate: ~7-9 sprints

This is significant scope. The recommendation is to ship Phase 1 + 2 first (foundation + session integration), validate with users, then add AI assessment in a follow-up milestone.

---

## 11. Roadmap Implications

### Suggested Phase Structure

1. **Objectives Foundation** -- Schema, CRUD, dedicated page
   - No AI dependency. Pure data model + UI.
   - Ship quickly to establish the pattern.

2. **Session Integration** -- Context panel, action item linking
   - Depends on Phase 1. Relatively straightforward since context panel already exists.
   - This is where users start seeing value.

3. **AI SMART Assist** -- Help users write better objectives
   - Can ship independently of progress assessment.
   - Uses existing AI infrastructure (generateObject pattern).
   - Quick win with high perceived value.

4. **AI Progress Assessment** -- Automatic tracking from session data
   - The hardest and most valuable part.
   - Requires extending the unified AI pipeline.
   - Ship with manager approval model, iterate on AI accuracy.

### Dependencies

- Phase 1 has no dependencies (new tables, new pages)
- Phase 2 depends on Phase 1 + existing context panel
- Phase 3 depends on Phase 1 + existing AI pipeline
- Phase 4 depends on Phases 1-3

### Risk Areas

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI assessment accuracy on soft objectives | HIGH | Force SMART decomposition at creation; manager approval model |
| Scope creep toward OKR tool | HIGH | Hard boundary: no cascading goals, no team-level objectives, no goal alignment |
| Token budget for AI context | MEDIUM | Objectives add ~200-500 tokens to prompt; test with real data |
| User adoption (will people create objectives?) | MEDIUM | Default templates, AI SMART assist, quarterly nudges |

---

## Sources

- [Lattice 1:1 Navigation for Managers](https://help.lattice.com/hc/en-us/articles/360059920054-Navigate-1-1s-as-a-Manager) -- Goals sidebar integration
- [Lattice Goals Homepage](https://help.lattice.com/hc/en-us/articles/4402501400855-Goals-Homepage-Quick-Create-Actions) -- Goal management UX
- [Culture Amp Goals Tree](https://support.cultureamp.com/en/articles/9798545-working-with-the-goals-tree) -- Cascading goal alignment
- [Culture Amp 1:1 Meeting Software](https://www.cultureamp.com/platform/perform/1-1-meeting-software) -- Goals in 1:1 context
- [Culture Amp Creating Individual Goals](https://support.cultureamp.com/en/articles/9393208-creating-and-aligning-individual-goals) -- Goal creation UX
- [15Five 1-on-1 Feature Overview](https://success.15five.com/hc/en-us/articles/360002880911-1-on-1s-Feature-Overview) -- Objectives in check-ins
- [Fellow: Best 1:1 Meeting Tools](https://fellow.ai/blog/best-one-on-one-meeting-tools-a-guide-for-managers-and-leaders/) -- Lightweight goal tracking
- [Lattice Fall/Winter 2025 Release](https://lattice.com/blog/lattice-fall-winter-2025-product-release) -- AI Meeting Agent
- [SMART Goals for Communication (Indeed)](https://www.indeed.com/career-advice/career-development/smart-goals-for-communication) -- Quantifying soft goals
- [OKRs in Product Management (Roman Pichler)](https://www.romanpichler.com/blog/okrs-in-product-management/) -- Goals vs action items hierarchy
- [Tability: AI SMART Goals](https://www.tability.io/odt/articles/ai-smart-goals) -- AI goal writing patterns
