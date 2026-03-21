# Feature Landscape

**Domain:** Report Pre-fill Workflow for 1:1 Sessions
**Researched:** 2026-03-21

## Table Stakes

Features users expect for a pre-fill workflow. Missing = feels half-baked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email invitation when prefill opens | 15Five, Lattice all notify automatically | Low | Existing email infra, new template |
| Prefill wizard matching session questionnaire | Report needs same question widgets | Med | Reuse existing wizard components |
| Auto-save during prefill | Manager wizard already auto-saves | Low | Same debounced pattern |
| Manager sees prefill answers during session | The entire point of prefilling | Med | Context panel or inline display |
| Prefill window with clear deadline | Must know when to fill and when it closes | Low | Derived from `scheduled_at` |
| Report cannot edit after submission | Immutability is critical for trust | Low | Status-based write guard |
| Manager cannot edit report's answers | Data integrity, psychological safety | Low | `respondent_id` check on API |
| Prefill reminder email | If not filled within window | Low | Cron or scheduled check |
| Question-level visibility (prefill_visible) | Some questions are manager-only | Low | Boolean on template_question |

## Differentiators

Features that set the product apart from competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-powered gap analysis | AI compares report vs manager answers, highlights perception gaps | Med | Leverages existing AI pipeline |
| Dual-perspective scoring | Show both report self-score and manager score side by side in analytics | Med | Enriches trend data significantly |
| Prefill insights in context panel | During the live session, show "Report said X, you scored Y" per question | Med | Drives better conversations |
| Partial prefill support | Report can save progress and return later | Low | Auto-save already handles this |
| Configurable prefill window | Per-series setting for how far in advance to open | Low | Add column to `meeting_series` |
| Report can add talking points during prefill | While filling, surface "Add a talking point" option | Low | Existing talking points feature |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Report completes the session | Only manager can mark complete -- this is a firm requirement | Manager reviews and completes |
| Real-time collaborative editing | Both editing answers simultaneously like Google Docs | Async: report fills first, manager reviews during meeting |
| Report sees manager's answers during session | Creates anchoring bias, undermines candid self-assessment | Report sees only their own submitted answers |
| Manager can modify report's answers | Destroys psychological safety and data integrity | Manager provides their own separate answers |
| Mandatory prefill (blocking session start) | Report might not fill; meeting should still happen | Prefill is always optional. Wizard works fine without it |
| Anonymous prefill | Answers must be attributed for analytics and AI | Always tied to `respondent_id` |

## Feature Dependencies

```
Schema migration (unique index + enum) --> everything else
  |
  +--> Report Prefill UI --> Email triggers (invitation)
  |                     +--> Prefill reminder (needs status tracking)
  |
  +--> Manager Review Integration (needs prefill answers to exist)
  |     +--> AI gap analysis (needs both answer sets)
  |
  +--> Analytics adaptation (needs dual answers in session_answers)
```

## MVP Recommendation

Prioritize for first release:

1. **Schema migration** -- unique index, enum values, new columns
2. **Report prefill wizard** -- simplified wizard, auto-save, submit action
3. **Prefill invitation email** -- triggered when window opens
4. **Manager inline view** -- show report's answers in wizard context panel
5. **Immutability guards** -- API-level enforcement of who can write when

Defer:
- **AI gap analysis**: Ship in a follow-up; requires AI prompt engineering
- **Dual-perspective analytics**: Analytics already works with manager answers; dual view is additive
- **Configurable prefill window**: Start with 24h hardcoded, make configurable later
- **Prefill reminder email**: Nice to have but not blocking

## Competitive Analysis

### 15Five (Closest Model)

The most directly relevant competitor pattern. 15Five's weekly Check-ins are the exact workflow:

1. **Employee fills** a structured questionnaire (15 minutes, weekly cadence)
2. **Manager reviews** submitted check-in, can like/comment on individual answers
3. **Manager pushes** important items to the 1:1 agenda for live discussion
4. **Key detail**: Employee fills and submits; manager reads and responds asynchronously

**What to adopt:** The structured questionnaire pre-fill by the employee, notification on submission, manager review.
**What to differ:** We have a live wizard session (not just async review). The manager fills their own answers too, not just comments.

### Culture Amp (Self-Reflection Pattern)

Uses a "Developmental Self-Reflection" template:

1. Employee completes self-reflection with structured questions
2. Manager receives notification, reviews self-reflection
3. Manager writes their own assessment with the self-reflection visible
4. Both meet to discuss, using the dual perspective as conversation starter

**What to adopt:** The dual-perspective model. Manager sees employee's answers while writing their own.
**What to differ:** We do this within a session wizard, not a separate review cycle.

### Small Improvements (Side-by-Side Display)

Shows employee self-assessment on the LEFT and manager assessment on the RIGHT:

1. Employee writes self-assessment first
2. Manager is notified, sees self-assessment on left side
3. Manager fills their assessment on the right side
4. Follow-up 1:1 meeting created automatically

**What to adopt:** The side-by-side display pattern for review.
**What to differ:** We use context panel (right sidebar) instead of full split-screen.

### Lattice (Shared Agenda + Context)

Less structured than 15Five. Lattice uses shared agendas:

1. Both parties add talking points throughout the week
2. 2 hours before meeting, both get email with agenda summary
3. Meeting happens with collaborative notes
4. Action items tracked and surfaced in next meeting

**What to adopt:** The pre-meeting notification timing pattern.
**What to differ:** We have structured questionnaires, not just agendas.

### Fellow (Collaborative Agenda)

Pure shared-agenda model, no structured questionnaires:

1. Shared agenda created per meeting
2. Both parties add items asynchronously throughout the week
3. 24h before meeting, agenda snapshot emailed to both
4. Meeting uses agenda as guide

**What to adopt:** The 24h notification timing.
**What to differ:** We provide structured questions with typed answers, not free-form agendas.

## Sources

- [15Five Check-ins Feature Overview](https://success.15five.com/hc/en-us/articles/360002698971-Check-ins-Feature-Overview)
- [15Five Review a Check-in](https://success.15five.com/hc/en-us/articles/360002681112-Review-a-Check-in)
- [Culture Amp Self-Reflection Guide](https://support.cultureamp.com/en/articles/7048428-guide-to-the-developmental-self-reflection-template)
- [Small Improvements Manager Review Perspective](https://help.small-improvements.com/article/247-performance-reviews-the-managers-perspective)
- [Fellow 1:1 Meeting Software](https://fellow.ai/use-cases/one-on-one-meetings)
- [Lattice Navigate 1:1s as Manager](https://help.lattice.com/hc/en-us/articles/360059920054-Navigate-1-1s-as-a-Manager)
