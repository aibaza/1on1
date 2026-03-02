# Questionnaires & Answer Types

## Overview

The questionnaire system is the differentiating core. Each session is a structured data collection opportunity producing quantifiable, trackable metrics over time while still allowing free-form discussion.

## Template System

### Hierarchy

- **System Templates** (`tenant_id = NULL`): read-only, available to all tenants, can be cloned
- **Tenant Templates** (`tenant_id = company`): created by admins/managers, can be published or draft, can be set as default

### Lifecycle

```
Draft → Published → Archived
```

- **Draft**: only visible to creator, not selectable for sessions
- **Published**: available for selection by managers; when edited, version increments
- **Archived**: hidden from selection but still linked to past sessions

### Versioning Strategy

1. `version` column increments on edit
2. Questions are never deleted — only `is_archived = true`
3. New/modified questions get new UUIDs
4. Past sessions retain their references — data always valid
5. Analytics track trends via question `category`, not individual question IDs

## Answer Types

### 1. Free Text (`text`)
- **Stored in**: `answer_text`
- **UI**: Multi-line text area (3-5 rows, expandable)
- **Aggregation**: Not directly aggregatable; qualitative analysis, AI sentiment in v3
- **Examples**: "What blockers are you facing?", "Any feedback for me?"

### 2. Rating 1-5 (`rating_1_5`)
- **Config**: `{"labels": {"1": "Very Poor", "2": "Poor", "3": "OK", "4": "Good", "5": "Excellent"}}`
- **Stored in**: `answer_numeric` (1.00 - 5.00)
- **UI**: Five clickable circles/stars with labels on hover
- **Aggregation**: AVG(), trend over time

### 3. Rating 1-10 (`rating_1_10`)
- **Config**: `{"labels": {"1": "Not at all", "10": "Absolutely"}}`
- **Stored in**: `answer_numeric` (1.00 - 10.00)
- **UI**: Horizontal slider or 10 numbered buttons with endpoint labels
- **Aggregation**: AVG(), eNPS-style calculation

### 4. Yes/No (`yes_no`)
- **Stored in**: `answer_numeric` (1 = Yes, 0 = No)
- **UI**: Two large buttons
- **Aggregation**: AVG() gives % of "Yes" over time

### 5. Multiple Choice (`multiple_choice`)
- **Config**: `{"options": [...], "allow_multiple": true/false}`
- **Stored in**: `answer_json` (`{"selected": [...]}`)
- **UI**: Radio buttons (single) or checkboxes (multi)
- **Aggregation**: Option frequency counts, distribution charts

### 6. Mood (`mood`)
- **Config**: `{"scale": ["😞", "😐", "😊", "😄", "🤩"]}`
- **Stored in**: `answer_numeric` (1-5 mapping)
- **UI**: Five large emoji buttons with highlight ring
- **Aggregation**: AVG() mood trend

### 7. Custom Scale (`scale_custom`) — v2
- **Config**: `{"min": 0, "max": 100, "step": 10, "unit": "%", "min_label": "...", "max_label": "..."}`
- **Stored in**: `answer_numeric`
- **UI**: Slider with numeric display and endpoint labels

## Pre-built System Templates

### Weekly Check-in (6 questions)
| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How are you feeling this week? | mood | wellbeing | Yes |
| 2 | Rate your workload | rating_1_5 | wellbeing | Yes |
| 3 | What wins did you have this week? | text | recognition | No |
| 4 | What's blocking your progress? | text | performance | No |
| 5 | Is there anything I can help you with? | text | feedback | No |
| 6 | Any topics for next time? | text | custom | No |

### Monthly Deep-Dive (10 questions)
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

### Career Development (8 questions, quarterly)
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

### New Hire Onboarding (7 questions, first 90 days)
| # | Question | Type | Category | Required |
|---|----------|------|----------|----------|
| 1 | How comfortable do you feel in your role so far? | rating_1_5 | wellbeing | Yes |
| 2 | Is the onboarding process clear and helpful? | rating_1_5 | feedback | Yes |
| 3 | Do you have the tools and resources you need? | yes_no | performance | Yes |
| 4 | How well do you understand the team's goals? | rating_1_5 | performance | Yes |
| 5 | What has been confusing or unclear? | text | feedback | No |
| 6 | Who have you connected with on the team? | text | engagement | No |
| 7 | What can we do to make your onboarding better? | text | feedback | No |

## Scoring & Aggregation

### Session Score
Average of all numeric answers normalized to 1-5:
- `rating_1_5`: direct value
- `rating_1_10`: `(value - 1) / 9 * 4 + 1`
- `yes_no`: `value * 4 + 1` (No=1, Yes=5)
- `mood`: direct value (already 1-5)
- `scale_custom`: normalize(value, min, max, 1, 5)

Only non-NULL, non-skipped answers included.

### Category Score
Same normalization, filtered by `template_question.category`.

### Trend Computation
Background job (Inngest) computes periodic aggregates into `ANALYTICS_SNAPSHOT` table — powers dashboard charts without querying raw data.

## Template Builder UX

1. Drag-and-drop reordering via handle (≡)
2. Inline live preview as admin configures
3. Quick duplicate action per question
4. Category color badges for scanning
5. Validation: at least 1 question, name required, multiple choice needs 2+ options
6. Template preview mode showing wizard appearance
