# Research Summary: Report Pre-fill Workflow

**Domain:** 1:1 meeting management -- employee pre-fill before manager-led session
**Researched:** 2026-03-21
**Overall confidence:** HIGH

## Executive Summary

The report pre-fill workflow is a well-understood pattern in the 1:1/performance management space. The two dominant models are: (1) **15Five-style async check-ins** where the employee fills a questionnaire independently and the manager reviews/comments afterward, and (2) **shared agenda collaboration** (Fellow, Lattice) where both parties contribute talking points to a shared space before meeting. What the founder wants is a hybrid: the structured questionnaire approach of 15Five combined with a live manager-led session wizard that uses the pre-filled answers as context.

The existing data model is 90% ready. The `session_answers` table already has a `respondent_id` column, meaning it was designed with multi-respondent support in mind. The critical gap is a unique index on `(session_id, question_id)` that prevents two people from answering the same question. Changing this to `(session_id, question_id, respondent_id)` is the single most important schema migration.

The workflow state machine needs two new session statuses: `prefill_open` and `prefill_submitted`. The prefill window opens automatically 24-48 hours before the scheduled meeting time, an email invites the report to fill, and the manager sees the report's answers inline during their wizard session. The report's answers are immutable once submitted -- the manager does NOT override them but rather provides their own perspective alongside.

The biggest design decision is **question-level visibility**: should some questions be manager-only? The recommendation is yes -- add a `prefill_visible` boolean to `template_question`. This lets template authors control which questions the report sees (e.g., "Rate this person's performance" is manager-only; "How are you feeling?" is for the report).

## Key Findings

**Stack:** No new dependencies required. Existing email system, wizard UI, and auth model support this feature with targeted extensions.
**Architecture:** Same `session_answers` table with a unique index change from `(session_id, question_id)` to `(session_id, question_id, respondent_id)`. Two new session statuses. One new column on `template_question`.
**Critical pitfall:** The unique index change is a breaking migration -- must be done carefully. Also, scoring/analytics currently assume one answer per question per session; dual answers require deciding whose scores count.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Schema and State Machine** - Migrate unique index, add session statuses, add `prefill_visible` to template questions
   - Addresses: data model for dual answers, workflow states
   - Avoids: building UI on wrong schema

2. **Report Prefill UI** - Standalone prefill wizard for the report (simplified version of session wizard, read-write during prefill window only)
   - Addresses: report-facing experience, mobile-first design
   - Avoids: coupling report UI to manager wizard too early

3. **Email Triggers** - Automated prefill invitation, reminder, and completion notification
   - Addresses: the "automatic invitation 24h before" requirement
   - Avoids: manual workflow dependency

4. **Manager Review Integration** - Show report's pre-filled answers in the session wizard context panel
   - Addresses: manager sees report's perspective during the meeting
   - Avoids: complex side-by-side redesign (use existing context panel pattern)

5. **Analytics and AI Adaptation** - Update scoring to handle dual answers, update AI summary to reference both perspectives
   - Addresses: dual-answer impact on session scores and AI pipeline
   - Avoids: analytics regression

**Phase ordering rationale:**
- Schema must come first (everything depends on it)
- Report UI before manager integration (report needs to fill before manager can see)
- Email triggers can parallel with report UI but needs the states
- Analytics last because it is additive and non-blocking

**Research flags for phases:**
- Phase 2 (Report Prefill UI): Needs mobile UX research -- report likely fills on phone
- Phase 4 (Manager Review Integration): Needs UX prototyping for how dual answers display
- Phase 5 (Analytics): Standard patterns, unlikely to need deep research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new tech needed, verified against existing codebase |
| Features | HIGH | Well-understood pattern from competitors (15Five, Culture Amp, Small Improvements) |
| Architecture | HIGH | Existing data model already has `respondent_id` -- minimal schema changes |
| Pitfalls | MEDIUM | Scoring/analytics dual-answer handling needs careful design |

## Gaps to Address

- Exact timing configuration: should prefill window be configurable per-series or tenant-wide?
- Report access control: does the report get a special URL/token or must they be logged in?
- Partial prefill: what happens if report fills 3 of 8 questions and submits?
- Notification preferences: can users opt out of prefill reminders?
