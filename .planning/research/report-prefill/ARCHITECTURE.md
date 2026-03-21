# Architecture Patterns

**Domain:** Report Pre-fill Workflow for 1:1 Sessions
**Researched:** 2026-03-21

## Recommended Architecture

### Data Model Changes

**The existing `session_answers` table already supports multi-respondent answers** via `respondent_id`. The only blocker is the unique index.

#### Migration: Unique Index Change

```sql
-- Drop the current unique index (allows only 1 answer per question per session)
DROP INDEX session_answer_session_question_unique_idx;

-- Create new unique index (allows 1 answer per question per session PER RESPONDENT)
CREATE UNIQUE INDEX session_answer_session_question_respondent_unique_idx
  ON session_answer (session_id, question_id, respondent_id);
```

This is the single most critical change. Everything else builds on it.

#### New Session Status Values

```
session_status enum:
  'scheduled'         -- session created, not yet actionable
  'prefill_open'      -- prefill window active, report can fill
  'prefill_submitted' -- report submitted, waiting for meeting
  'in_progress'       -- manager started the wizard
  'completed'         -- session done
  'cancelled'         -- cancelled
  'missed'            -- nobody showed up
```

#### New Columns

```sql
-- On session table
ALTER TABLE session ADD COLUMN prefill_submitted_at TIMESTAMPTZ;
ALTER TABLE session ADD COLUMN prefill_reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- On template_question table
ALTER TABLE template_question ADD COLUMN prefill_visible BOOLEAN NOT NULL DEFAULT true;

-- On meeting_series table (optional, for configurable window)
ALTER TABLE meeting_series ADD COLUMN prefill_hours_before INTEGER NOT NULL DEFAULT 24;
```

### State Machine

```
                    +---------------+
                    |   scheduled   |
                    +-------+-------+
                            | (prefill window opens: scheduled_at - 24h)
                            v
                    +----------------+
              +-----|  prefill_open  |-----+
              |     +-------+--------+     |
              |             |              | (report doesn't fill,
              |             |              |  meeting time arrives)
              |             | (report      |
              |             |  submits)    |
              |             v              |
              |  +---------------------+   |
              |  | prefill_submitted   |   |
              |  +---------+-----------+   |
              |            |               |
              |            v               v
              |     +---------------+
              +---->|  in_progress  | (manager starts wizard)
                    +-------+-------+
                            | (manager completes)
                            v
                    +---------------+
                    |   completed   |
                    +---------------+

  At any point: -> cancelled / missed
```

**Key transitions:**
- `scheduled` -> `prefill_open`: Automatic, triggered by cron or on-access check when `now() >= scheduled_at - prefill_hours_before`
- `prefill_open` -> `prefill_submitted`: Report clicks "Submit" in prefill wizard
- `prefill_open` -> `in_progress`: Manager starts wizard (report didn't fill -- that is OK)
- `prefill_submitted` -> `in_progress`: Manager starts wizard
- `in_progress` -> `completed`: Manager clicks "Complete Session"

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Prefill Scheduler | Opens prefill window (cron or lazy) | Session table, Email service |
| Prefill Wizard UI | Report fills questionnaire | Session API, Answer API |
| Prefill API Routes | CRUD for report's answers during window | Session table, Answer table |
| Manager Wizard (enhanced) | Shows report answers in context | Answer API (read report's), Session API |
| Email Templates (new) | Prefill invitation, reminder, completion | Email service |
| Analytics (adapted) | Dual-answer scoring | Answer table (filter by respondent) |

### Data Flow

#### Report Prefills

```
1. Cron job or lazy check: session.scheduled_at - 24h has passed?
   YES -> Update status to 'prefill_open'
       -> Send prefill invitation email to report

2. Report opens prefill wizard (must be logged in)
   -> GET /api/sessions/[id]/prefill
   -> Returns questions where prefill_visible = true
   -> Returns any existing draft answers by this respondent

3. Report fills answers (auto-save)
   -> PUT /api/sessions/[id]/prefill/answers
   -> Upserts into session_answer with respondent_id = report's user ID
   -> Guards: status must be 'prefill_open', user must be the report

4. Report submits
   -> POST /api/sessions/[id]/prefill/submit
   -> Sets status to 'prefill_submitted', sets prefill_submitted_at
   -> Sends notification email to manager
```

#### Manager Reviews During Session

```
1. Manager starts wizard (status -> 'in_progress')
   -> GET /api/sessions/[id] (existing endpoint, enhanced)
   -> Returns all questions + report's prefill answers (if any)

2. Manager sees report's answers in context panel or inline
   -> Read-only display of report's answers per question
   -> Manager fills their own answers normally

3. Manager completes session
   -> Both sets of answers persist in session_answer
   -> Session score computed from manager's answers (primary)
   -> AI summary references both perspectives
```

### Manager Review UX: Context Panel Approach (Recommended)

Use the existing **context panel** (right sidebar) pattern. During the wizard, for each question/category:

```
+-------------------------------+--------------------------+
|  WIZARD STEP: Wellbeing       |  CONTEXT PANEL           |
|                               |                          |
|  Q: How are you feeling?      |  [Report's Pre-fill]     |
|  [sad] [meh] [ok] [good] [!] |  Report answered: ok     |
|                               |  "Feeling good but       |
|  Q: Rate your workload        |   workload is heavy"     |
|  [1] [2] [3] [4] [5]         |                          |
|                               |  Report rated: 4/5       |
|                               |  -------------------------+
|                               |  [Previous Session Notes]|
|                               |  [Open Action Items]     |
|                               |  [Score Trends]          |
+-------------------------------+--------------------------+
```

**Why context panel instead of side-by-side or inline:**
- Matches existing UX patterns (notes, action items, trends already in context panel)
- Non-disruptive: manager focuses on their own assessment in the main area
- Report's answers are reference material, not the primary input
- Works well on desktop; can be a bottom sheet on mobile
- Avoids the visual complexity of split-screen dual forms

### Permission Model

| Action | Who | When | Guard |
|--------|-----|------|-------|
| Read prefill questions | Report | `prefill_open` or `prefill_submitted` | Must be the report on this series |
| Write prefill answers | Report | `prefill_open` only | Status check + respondent_id check |
| Submit prefill | Report | `prefill_open` only | Transitions to `prefill_submitted` |
| Read report's prefill answers | Manager | Any status after prefill_open | Must be the manager on this series |
| Write manager answers | Manager | `in_progress` only | Existing wizard guards |
| Complete session | Manager | `in_progress` only | Existing completion guards |
| Read both answer sets | Admin | Any time | Existing admin access |

### Email Trigger Map

| Trigger | Recipient | Timing | Template |
|---------|-----------|--------|----------|
| Prefill window opens | Report | `scheduled_at - prefill_hours_before` | `prefill-invitation` |
| Prefill not completed | Report | `scheduled_at - 6h` (if still `prefill_open`) | `prefill-reminder` |
| Report submits prefill | Manager | Immediately after submit | `prefill-completed` |
| Session completed | Both | After manager completes | Existing `session-summary` (enhanced with dual answers) |

### Scoring Strategy for Dual Answers

**Primary score = manager's answers.** This maintains backward compatibility and consistency with how scores have always been computed.

**Report's answers are tracked separately** for:
- Perception gap analysis (AI feature)
- Self-assessment trends in analytics (future)
- Conversation quality metrics

```sql
-- Session score: manager only (backward compatible)
SELECT AVG(answer_numeric)
FROM session_answer sa
JOIN session s ON s.id = sa.session_id
JOIN meeting_series ms ON ms.id = s.series_id
WHERE sa.session_id = :session_id
  AND sa.respondent_id = ms.manager_id
  AND sa.answer_numeric IS NOT NULL;

-- Perception gap: difference between report and manager
SELECT
  tq.question_text,
  manager_ans.answer_numeric AS manager_score,
  report_ans.answer_numeric AS report_score,
  ABS(manager_ans.answer_numeric - report_ans.answer_numeric) AS gap
FROM template_question tq
LEFT JOIN session_answer manager_ans ON manager_ans.question_id = tq.id
  AND manager_ans.session_id = :session_id
  AND manager_ans.respondent_id = :manager_id
LEFT JOIN session_answer report_ans ON report_ans.question_id = tq.id
  AND report_ans.session_id = :session_id
  AND report_ans.respondent_id = :report_id
WHERE tq.template_id = :template_id
  AND tq.is_archived = false;
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate Prefill Table
**What:** Creating a `prefill_answers` table mirroring `session_answers`
**Why bad:** Duplicates schema, requires syncing logic, complicates analytics queries
**Instead:** Use the existing `session_answers` table with `respondent_id` discrimination

### Anti-Pattern 2: Overriding Report Answers
**What:** Manager's answer replaces report's answer in the same row
**Why bad:** Loses report's perspective, breaks trust, destroys data for gap analysis
**Instead:** Both answers coexist as separate rows (different `respondent_id`)

### Anti-Pattern 3: Blocking Session on Prefill
**What:** Requiring report to prefill before manager can start the session
**Why bad:** Report might be unavailable, sick, or simply forget. Meeting must happen regardless.
**Instead:** Prefill is always optional. Manager wizard works with or without prefill data.

### Anti-Pattern 4: Complex Sub-Statuses
**What:** Adding `prefill_status` as a separate column alongside `session_status`
**Why bad:** Two status fields create state explosion and ambiguity
**Instead:** Linear status progression in one enum field

### Anti-Pattern 5: Client-Side Visibility Filtering
**What:** Sending all questions to the report and hiding manager-only ones in React
**Why bad:** Questions leak to the network tab; report can see them in devtools
**Instead:** Filter `prefill_visible` in the server-side database query

## Sources

- Codebase: `src/lib/db/schema/answers.ts` -- unique index `(session_id, question_id)` discovery
- Codebase: `src/lib/db/schema/enums.ts` -- current session_status values
- Codebase: `docs/data-model.md` -- session_answer table with respondent_id
- [15Five Check-in Review](https://success.15five.com/hc/en-us/articles/360002681112-Review-a-Check-in)
- [Small Improvements Manager Perspective](https://help.small-improvements.com/article/247-performance-reviews-the-managers-perspective)
- [MIT Performance Review Form](https://hr.mit.edu/performance/prf)
