# Questionnaires & Answer Types

## Overview

The questionnaire system is the differentiating core of the platform. Unlike competitors that focus on free-form agendas, 1on1 treats each session as a structured data collection opportunity — producing quantifiable, trackable metrics over time while still allowing free-form discussion.

## Template System

### Template Hierarchy

```
System Templates (tenant_id = NULL)
  └── Read-only, available to all tenants
  └── Can be cloned into tenant-specific templates

Tenant Templates (tenant_id = company)
  └── Created by admins or managers
  └── Can be published (visible to all managers) or draft
  └── Can be set as default for new meeting series
```

### Template Lifecycle

```
Draft ──► Published ──► Archived
  │          │              │
  │          │              └── Hidden from selection
  │          │                  but still linked to past sessions
  │          │
  │          └── Available for selection by managers
  │              When edited: version increments, past data preserved
  │
  └── Only visible to creator, not selectable for sessions
```

### Template Versioning Strategy

When a published template is edited:
1. The `version` column increments
2. Questions are **never deleted** — only marked as `is_archived = true`
3. New/modified questions get new UUIDs
4. Past sessions retain their `template_id` and `question_id` references — their data is always valid
5. Analytics can track trends across versions because question `category` is the aggregation unit, not individual question IDs

This means a company can evolve their questionnaires over time without losing historical comparability at the category level.

---

## Answer Types (Detailed)

### 1. Free Text (`text`)

Open-ended text response.

**Config:** `{}`
**Stored in:** `answer_text`
**Aggregation:** Not directly aggregatable. Used for qualitative analysis. In v3, AI can extract sentiment.

**UI widget:** Multi-line text area (3-5 rows default, expandable)

**Use cases:**
- "What blockers are you facing?"
- "What would you like to discuss next time?"
- "Any feedback for me?"

---

### 2. Rating 1-5 (`rating_1_5`)

Five-point Likert scale.

**Config:**
```json
{
  "labels": {
    "1": "Very Poor",
    "2": "Poor",
    "3": "OK",
    "4": "Good",
    "5": "Excellent"
  }
}
```
**Stored in:** `answer_numeric` (1.00 - 5.00)
**Aggregation:** `AVG()`, trend over time, category averages

**UI widget:** Five clickable circles/stars/buttons with labels appearing on hover/select

**Use cases:**
- "Rate your workload this week"
- "How well is the team collaborating?"
- "How satisfied are you with your current project?"

---

### 3. Rating 1-10 (`rating_1_10`)

Ten-point numeric scale. Used for higher granularity metrics.

**Config:**
```json
{
  "labels": {
    "1": "Not at all",
    "10": "Absolutely"
  }
}
```
**Stored in:** `answer_numeric` (1.00 - 10.00)
**Aggregation:** `AVG()`, trend over time, eNPS-style calculation

**UI widget:** Horizontal slider or 10 numbered buttons. Endpoint labels visible.

**Use cases:**
- "How likely are you to recommend working here to a friend?" (eNPS)
- "How satisfied are you with your career growth?"
- "How confident are you in the team's direction?"

---

### 4. Yes/No (`yes_no`)

Binary choice.

**Config:** `{}`
**Stored in:** `answer_numeric` (1 = Yes, 0 = No)
**Aggregation:** `AVG()` gives % of "Yes" answers over time. Useful for tracking binary conditions.

**UI widget:** Two large buttons: "Yes" and "No"

**Use cases:**
- "Do you feel supported by your manager?"
- "Are you aware of the team's current goals?"
- "Did you complete the training from last session?"

---

### 5. Multiple Choice (`multiple_choice`)

Select from predefined options. Supports single-select and multi-select.

**Config:**
```json
{
  "options": [
    "More autonomy",
    "Better tools",
    "Clearer goals",
    "More recognition",
    "Better communication"
  ],
  "allow_multiple": true
}
```
**Stored in:** `answer_json`
```json
{
  "selected": ["More autonomy", "Better tools"]
}
```
**Aggregation:** Count frequency of each option over time. Distribution charts.

**UI widget:** Radio buttons (single-select) or checkboxes (multi-select)

**Use cases:**
- "What would improve your work satisfaction the most?"
- "Which areas would you like more training in?"
- "What best describes your current focus?"

---

### 6. Mood (`mood`)

Five-point emoji scale for quick wellbeing checks.

**Config:**
```json
{
  "scale": ["😞", "😐", "😊", "😄", "🤩"]
}
```
**Stored in:** `answer_numeric` (1.00 - 5.00, mapping 😞=1, 😐=2, 😊=3, 😄=4, 🤩=5)
**Aggregation:** `AVG()` gives mood trend. Display as emoji in UI, numeric in charts.

**UI widget:** Five large emoji buttons, horizontally arranged. Selected one gets a highlight ring.

**Use cases:**
- "How are you feeling this week?"
- "How was your energy level today?"

---

### 7. Custom Scale (`scale_custom`) — v2

Configurable numeric scale with custom range, step, and labels.

**Config:**
```json
{
  "min": 0,
  "max": 100,
  "step": 10,
  "unit": "%",
  "min_label": "Not at all",
  "max_label": "Completely"
}
```
**Stored in:** `answer_numeric`
**Aggregation:** Same as other numeric types. Normalize to 0-1 range for cross-question comparison.

**UI widget:** Slider with numeric display. Labels at endpoints.

**Use cases:**
- "What percentage of your time is spent on meaningful work?"
- "How much progress have you made on your quarterly goal?"

---

## Pre-built System Templates

### Template 1: Weekly Check-in

**Category:** `check_in`
**Intended cadence:** Weekly
**Questions (6):**

| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How are you feeling this week? | mood | wellbeing | Yes |
| 2 | Rate your workload | rating_1_5 | wellbeing | Yes |
| 3 | What wins did you have this week? | text | recognition | No |
| 4 | What's blocking your progress? | text | performance | No |
| 5 | Is there anything I can help you with? | text | feedback | No |
| 6 | Any topics for next time? | text | custom | No |

---

### Template 2: Monthly Deep-Dive

**Category:** `check_in`
**Intended cadence:** Monthly
**Questions (10):**

| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How are you feeling about work overall? | mood | wellbeing | Yes |
| 2 | How satisfied are you with your work-life balance? | rating_1_5 | wellbeing | Yes |
| 3 | How motivated are you by your current projects? | rating_1_5 | engagement | Yes |
| 4 | Do you feel challenged in your role? | yes_no | engagement | Yes |
| 5 | Rate your satisfaction with team collaboration | rating_1_5 | performance | Yes |
| 6 | What achievements are you most proud of this month? | text | recognition | No |
| 7 | What skills would you like to develop? | text | career | No |
| 8 | How likely are you to recommend working here? | rating_1_10 | engagement | No |
| 9 | What would improve your work experience the most? | multiple_choice | feedback | No |
| 10 | What should we focus on next month? | text | goals | No |

---

### Template 3: Career Development

**Category:** `career`
**Intended cadence:** Quarterly
**Questions (8):**

| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How satisfied are you with your career growth? | rating_1_10 | career | Yes |
| 2 | Do you see a clear path for advancement here? | yes_no | career | Yes |
| 3 | What role do you see yourself in 2 years? | text | career | No |
| 4 | What new skills would you like to learn? | text | career | No |
| 5 | Are there training or events you'd like to attend? | text | career | No |
| 6 | Do you feel your strengths are being utilized? | rating_1_5 | engagement | Yes |
| 7 | What type of projects would you like to work on? | text | career | No |
| 8 | How can I better support your career goals? | text | feedback | No |

---

### Template 4: New Hire Onboarding (First 90 Days)

**Category:** `onboarding`
**Intended cadence:** Weekly (first month), biweekly (months 2-3)
**Questions (7):**

| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How comfortable do you feel in your role so far? | rating_1_5 | wellbeing | Yes |
| 2 | Is the onboarding process clear and helpful? | rating_1_5 | feedback | Yes |
| 3 | Do you have the tools and resources you need? | yes_no | performance | Yes |
| 4 | How well do you understand the team's goals? | rating_1_5 | performance | Yes |
| 5 | What has been confusing or unclear? | text | feedback | No |
| 6 | Who have you connected with on the team? | text | engagement | No |
| 7 | What can we do to make your onboarding better? | text | feedback | No |

---

## Scoring & Aggregation Logic

### Session Score

The session score is the average of all numeric answers in a session, normalized to a 1-5 scale:

```
session_score = AVG(
  CASE answer_type
    WHEN 'rating_1_5' THEN answer_numeric
    WHEN 'rating_1_10' THEN (answer_numeric - 1) / 9 * 4 + 1  -- normalize to 1-5
    WHEN 'yes_no' THEN answer_numeric * 4 + 1                   -- 0→1, 1→5
    WHEN 'mood' THEN answer_numeric                              -- already 1-5
    WHEN 'scale_custom' THEN normalize(answer_numeric, min, max, 1, 5)
  END
)
WHERE answer_numeric IS NOT NULL AND skipped = false
```

### Category Score

Same as session score but filtered by question category:

```
category_score(category) = AVG(normalized_answer)
  WHERE template_question.category = category
    AND answer_numeric IS NOT NULL
    AND skipped = false
```

### Trend Computation

For each metric and user, the `ANALYTICS_SNAPSHOT` table stores periodic aggregates:

```
INSERT INTO analytics_snapshot (user_id, period_type, period_start, period_end, metric_name, metric_value, sample_count)
SELECT
  sa.respondent_id,
  'month',
  date_trunc('month', sa.answered_at),
  date_trunc('month', sa.answered_at) + interval '1 month',
  'wellbeing_score',
  AVG(CASE WHEN tq.answer_type = 'rating_1_5' THEN sa.answer_numeric ... END),
  COUNT(*)
FROM session_answer sa
JOIN template_question tq ON tq.id = sa.question_id
WHERE tq.category = 'wellbeing'
GROUP BY sa.respondent_id, date_trunc('month', sa.answered_at);
```

This runs as a background job (nightly or weekly) and powers the dashboard charts without hitting the raw data tables.

---

## Template Builder UX Guidelines

1. **Drag-and-drop reordering**: Questions can be reordered by dragging the handle (≡)
2. **Inline preview**: As the admin configures a question, a live preview shows how it will appear in the session wizard
3. **Duplicate question**: Quick action to clone a question with its configuration
4. **Question categories are visual**: Each category has a distinct color badge for easy scanning
5. **Validation rules**:
   - Template must have at least 1 question
   - Template name is required
   - Rating labels are optional (defaults provided)
   - Multiple choice requires at least 2 options
6. **Template preview mode**: "Preview" button shows the template as it would appear in the session wizard, step by step
