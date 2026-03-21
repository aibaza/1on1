# AI Behavioral Metrics Taxonomy for 1:1 Meetings

**Domain:** AI-assessed behavioral/professional dimensions from structured 1:1 session text
**Researched:** 2026-03-21
**Overall confidence:** MEDIUM (novel domain intersection; no product does exactly this yet)

---

## 1. Executive Summary

This research defines a practical taxonomy of behavioral metrics that an LLM can automatically assess from structured 1:1 meeting data (questionnaire answers, notes, talking points, action items) over time. The goal is to create "personal vectors" -- longitudinal behavioral dimensions that grow or shrink across sessions, providing managers and employees with objective developmental insight.

The key insight: **we are NOT doing traditional competency assessment** (which relies on 360 feedback, manager ratings, and structured rubrics). We are doing something closer to **longitudinal sentiment/behavioral signal extraction from conversational text**. This constrains what we can reliably measure. The taxonomy below is designed around what LLMs can actually detect from session text with reasonable confidence, not what organizational psychology says would be ideal to measure.

The recommended taxonomy contains **12 core metrics** organized into 3 tiers by assessment reliability from text data.

---

## 2. Established Frameworks Review

### 2.1 Lominger Competencies (Korn Ferry)

67 competencies developed by Lombardo & Eichinger (1991). Industry gold standard for leadership development. Categories span strategic skills, operating skills, courage, energy/drive, organizational positioning, and personal/interpersonal skills.

**Relevance to us:** Too granular (67 is unusable for auto-assessment). Many competencies (e.g., "Command Skills", "Organizational Agility") require observing workplace behavior, not analyzing meeting text. However, the clustering principle -- grouping observable behaviors into named dimensions -- is directly applicable.

**What we borrow:** The principle that competencies should be behaviorally anchored (observable indicators, not abstract traits). We adapt this to "text-observable indicators."

### 2.2 Google Project Oxygen (10 Manager Behaviors)

Data-driven research identifying what makes effective managers. The 10 behaviors:

1. Is a good coach
2. Empowers team, does not micromanage
3. Creates an inclusive team environment
4. Is productive and results-oriented
5. Is a good communicator
6. Supports career development
7. Has a clear vision/strategy for the team
8. Has key technical skills
9. Collaborates across the organization
10. Is a strong decision maker

**Relevance to us:** These are manager behaviors, not report behaviors. But several map to dimensions we CAN detect from 1:1 text: coaching quality, empowerment, career development support, communication quality. The framework validates that soft behavioral dimensions are measurable and predictive.

### 2.3 Gallup Q12 (Employee Engagement)

12 questions mapping to engagement dimensions:

- **Basic Needs:** Role clarity, resources/materials
- **Individual Contribution:** Recognition, feeling cared about, encouragement of development
- **Teamwork:** Opinions count, mission connection, quality commitment from peers, best friend at work
- **Growth:** Progress discussions, learning/growth opportunities

**Relevance to us:** Highest relevance. The Q12 dimensions map almost 1:1 to the kind of signals present in 1:1 meeting text. When someone discusses blockers, that signals resource issues. When they discuss career goals, that signals growth orientation. Our template categories (wellbeing, engagement, performance, career, feedback) already approximate Q12 clusters.

### 2.4 15Five Manager Effectiveness (8 Competencies)

1. Managing Oneself
2. Demonstrating Business Acumen
3. Setting Goals
4. Enabling Productivity
5. Giving and Receiving Feedback
6. Influencing Others
7. Supporting Career Growth
8. Building Strong Teams

Plus engagement measured across 3 dimensions: Focus, Force (drive), Feeling (emotional state).

**Relevance to us:** The Focus/Force/Feeling triad is elegant and maps well to text-assessable dimensions. We adapt this framing.

### 2.5 BetterUp Whole Person Model (25 Dimensions)

Three-layer model:

- **Mindsets:** Growth mindset, optimism, self-awareness, purpose, cognitive agility
- **Behaviors:** Rest, focus, strategic planning, emotional regulation, coaching, alignment
- **Outcomes:** Resilience, productivity, engagement, job satisfaction, belonging

**Relevance to us:** The Mindset layer (growth mindset, self-awareness, optimism) is highly text-assessable. When someone says "I want to learn X" vs "I'm stuck and nothing works," these map to growth mindset and optimism signals. The three-layer structure (mindsets -> behaviors -> outcomes) is a useful organizing principle.

### 2.6 Read.ai (Meeting Behavioral Metrics)

Tracks real-time meeting metrics:

- **Read Score:** Overall meeting quality (sentiment + engagement composite)
- **Engagement:** Participation, talk time balance, active involvement
- **Sentiment:** Positive/neutral/negative emotional tone
- **Coaching dimensions:** Clarity, Inclusion, Impact

**Relevance to us:** Read.ai analyzes live audio/video -- we analyze text. Their "Clarity + Inclusion + Impact" coaching triad is interesting but requires speech analysis. Their engagement/sentiment composite approach validates our existing `overallSentiment` + `objectiveRating` in the unified AI schema.

### 2.7 Culture Amp (9 Ready-Made Competencies)

Transitioned to competency-based development in 2024. Uses behaviorally-anchored proficiency levels. Recommends MECE principle (mutually exclusive, collectively exhaustive) with max ~15 competencies.

**Relevance to us:** The MECE principle and the 15-competency ceiling align with our target of 8-15 metrics. Culture Amp's emphasis on behavioral anchoring (what does "good" look like at each level?) is essential for LLM scoring prompts.

---

## 3. Recommended Taxonomy: 12 Core Behavioral Metrics

Organized into 3 tiers by **text-assessment reliability** -- how confidently an LLM can score the dimension from 1:1 session text alone.

### Tier 1: HIGH Reliability (directly expressed in text)

These dimensions have strong, direct textual signals. The LLM can assess them with reasonable confidence from a single session, and high confidence over 3+ sessions.

| # | Metric | Definition | Text Signals |
|---|--------|------------|-------------|
| 1 | **Engagement** | Active involvement in work, team, and the 1:1 process itself | Answer depth/length, specificity of examples, enthusiasm in language, number of talking points prepared, action item follow-through |
| 2 | **Wellbeing** | Emotional and physical state affecting work capacity | Mood ratings, stress language, work-life balance mentions, energy references, burnout signals |
| 3 | **Accountability** | Ownership of commitments, follow-through on action items | Action item completion rate (hard data), language around ownership vs blame-shifting, acknowledgment of mistakes |
| 4 | **Growth Mindset** | Orientation toward learning, improvement, and challenge-seeking | Skill development mentions, learning goals, response to feedback (defensive vs receptive), "I want to learn" vs "I can't do" patterns |
| 5 | **Communication Quality** | Clarity, depth, and constructiveness of expression in sessions | Answer specificity, structured thinking, constructive framing, question-asking behavior |

### Tier 2: MEDIUM Reliability (inferred from patterns across sessions)

These dimensions require 3-5 sessions of data to assess reliably. Single-session assessment is noisy.

| # | Metric | Definition | Text Signals |
|---|--------|------------|-------------|
| 6 | **Initiative** | Proactive problem-solving and self-direction | Mentions of self-started projects, solutions proposed alongside problems, talking points added proactively, volunteering for work |
| 7 | **Collaboration** | Effectiveness of working with others | Team references, peer interactions mentioned, cross-functional work, conflict resolution language |
| 8 | **Goal Orientation** | Focus on objectives, progress tracking, results delivery | Goal references, progress updates, milestone discussions, OKR/KPI language, "shipped" / "completed" / "delivered" mentions |
| 9 | **Adaptability** | Response to change, uncertainty, and shifting priorities | Language around pivots, comfort with ambiguity, response to organizational changes, reframing challenges |
| 10 | **Self-Awareness** | Accurate self-assessment, recognition of strengths and gaps | Balanced self-evaluation, acknowledgment of both strengths and weaknesses, alignment between self-assessment and manager observations |

### Tier 3: LOW Reliability (weak text signals, supplement with structured data)

These dimensions have weaker text signals and should lean heavily on structured question answers (ratings, yes/no) rather than free-text analysis alone.

| # | Metric | Definition | Text Signals (Weak) | Structured Data Signals (Strong) |
|---|--------|------------|---------------------|----------------------------------|
| 11 | **Alignment** | Connection to team/company mission and strategic direction | Mission references, "why" language, strategic context in discussions | Direct survey questions ("Do you understand team goals?"), rating questions about direction clarity |
| 12 | **Satisfaction** | Overall job and role satisfaction, intent to stay | Explicit satisfaction statements, future-oriented language about the role | Rating questions, eNPS-style questions, mood trends over time |

### Considered and Rejected

| Dimension | Why Rejected |
|-----------|-------------|
| **Technical Skills** | Not assessable from 1:1 text without domain-specific rubrics |
| **Leadership** | Too composite; decomposes into initiative + communication + collaboration |
| **Creativity/Innovation** | Weak text signals; would require observing actual work output |
| **Time Management** | Not reliably expressed in 1:1 text; better measured via calendar/task data |
| **Conflict Resolution** | Rarely surfaces with enough detail in 1:1 text to score meaningfully |
| **Political Savvy** | Requires organizational context beyond what 1:1 text provides |
| **Stress Tolerance** | Subsumed by Wellbeing + Adaptability |

---

## 4. Scoring Methodology

### 4.1 Recommended: 1-5 Continuous Scale with Behavioral Anchors

**Why 1-5:** Matches the existing scoring system in the platform (session scores, category scores, mood ratings all use 1-5). Minimizes cognitive load for users who already understand the scale.

**Why continuous (not discrete levels):** LLMs produce more reliable outputs when they can express nuance (3.2 vs 3.8) rather than being forced into buckets. Discrete levels work for human raters but add unnecessary quantization noise for AI raters.

**Score definitions:**

| Score | Label | Behavioral Anchor |
|-------|-------|-------------------|
| 1.0 | Critical | Active disengagement, concerning patterns, intervention needed |
| 2.0 | Below Baseline | Consistent negative signals, declining trend |
| 3.0 | Baseline | Neutral/average, meeting expectations, no strong signal either way |
| 4.0 | Strong | Positive signals, above-average engagement with this dimension |
| 5.0 | Exceptional | Consistently strong, role-model behavior in this dimension |

### 4.2 Per-Session vs Longitudinal Scoring

**Per-session assessment:** The LLM scores each metric at session completion as part of the unified AI pipeline. This is the raw signal.

**Longitudinal score:** A rolling weighted average over the last N sessions (recommended: last 6 sessions, exponentially weighted toward recent). This is the displayed "vector" value.

```
longitudinal_score = SUM(session_score_i * weight_i) / SUM(weight_i)
where weight_i = decay^(sessions_ago)
decay = 0.8 (configurable)
```

Example with 4 sessions (most recent first):
- Session 4: score 4.0, weight 1.0
- Session 3: score 3.5, weight 0.8
- Session 2: score 3.0, weight 0.64
- Session 1: score 2.5, weight 0.512

Longitudinal = (4.0 + 2.8 + 1.92 + 1.28) / (1.0 + 0.8 + 0.64 + 0.512) = 10.0 / 2.952 = 3.39

### 4.3 Confidence Score Per Metric

Each metric assessment should include a confidence level:

| Confidence | Meaning | Threshold |
|------------|---------|-----------|
| `insufficient` | Not enough data to assess | < 2 sessions OR metric has no relevant text signals in session |
| `low` | Assessment based on weak signals | 2-3 sessions, sparse text, or Tier 3 metric |
| `medium` | Reasonable assessment | 4-6 sessions with relevant text signals |
| `high` | Reliable assessment | 7+ sessions with consistent, strong text signals |

**Display rule:** Never show a metric score to users when confidence is `insufficient`. Show with a visual indicator (dimmed, asterisk) when `low`.

### 4.4 Baseline Calibration

**Cold start problem:** First 3 sessions establish a baseline -- scores should default to 3.0 (neutral) with `insufficient` confidence. The LLM should still assess, but scores are not displayed until session 4.

**Per-relationship baseline:** Metrics are scoped to a manager-report relationship (meeting series), not global. A person may have different behavioral profiles with different managers -- this is expected and valid.

---

## 5. Implementation Architecture

### 5.1 Extension to Existing AI Pipeline

The behavioral metrics assessment naturally extends the existing unified AI pipeline. Currently, the pipeline produces:

- `metrics.overallSentiment` (positive/neutral/mixed/concerning)
- `metrics.objectiveRating` (1-5 session health)
- `metrics.keyTakeaways`
- `publicSummary.*`
- `managerAddendum.*`

**Proposed addition:** A new `behavioralMetrics` section in the unified schema:

```typescript
behavioralMetrics: z.object({
  assessments: z.array(z.object({
    metricId: z.string(), // e.g., "engagement", "growth_mindset"
    score: z.number(),    // 1.0 - 5.0
    confidence: z.enum(["insufficient", "low", "medium", "high"]),
    evidence: z.string(), // 1-sentence justification
    trend: z.enum(["improving", "stable", "declining", "new"]),
  })),
})
```

This keeps the single-LLM-call architecture (no additional API calls) while adding behavioral assessment to the output.

### 5.2 Storage

**Per-session assessments:** Store in the session record alongside existing AI fields (new `ai_behavioral_metrics` JSONB column on the `session` table).

**Longitudinal scores:** Computed by the analytics snapshot job and stored in `analytics_snapshot` with `metric_name` values like `behavioral_engagement`, `behavioral_growth_mindset`, etc. This leverages the existing infrastructure.

### 5.3 Prompt Engineering Considerations

The LLM prompt needs:

1. **Metric definitions with behavioral anchors** -- each metric defined with "what 1 looks like" through "what 5 looks like"
2. **Historical context** -- the LLM already receives previous session data; it needs previous behavioral scores to assess trends
3. **Structured question mapping** -- which template categories map to which metrics (e.g., `category: wellbeing` answers inform the Wellbeing metric)
4. **Guardrails:**
   - "Score 3.0 when you lack evidence. Never infer what isn't expressed."
   - "Base scores on TEXT EVIDENCE, not assumptions about the person."
   - "Provide the specific text that supports each score in the evidence field."
   - "If a metric has no relevant data in this session, set confidence to 'insufficient'."

### 5.4 Metric-to-Template-Category Mapping

| Metric | Primary Template Categories | Also Informed By |
|--------|---------------------------|-----------------|
| Engagement | engagement | answer depth, talking point count |
| Wellbeing | wellbeing | mood answers, stress language |
| Accountability | performance | action item completion (hard data) |
| Growth Mindset | career | feedback responses, learning mentions |
| Communication Quality | (all text answers) | answer specificity, structure |
| Initiative | performance, goals | self-started items, proposed solutions |
| Collaboration | engagement, performance | team references |
| Goal Orientation | goals, performance | progress language, milestone mentions |
| Adaptability | (cross-cutting) | change response language |
| Self-Awareness | feedback, career | self-assessment accuracy |
| Alignment | engagement | mission/strategy references |
| Satisfaction | engagement, wellbeing | eNPS, satisfaction ratings |

---

## 6. Signal vs Noise: Detecting Meaningful Change

### 6.1 What Constitutes a Meaningful Signal?

For a 1-5 scale with LLM assessment:

| Change | Classification | Action |
|--------|---------------|--------|
| +/- 0.0-0.3 | **Noise** | No alert. Normal variation in LLM assessment. |
| +/- 0.3-0.7 | **Noteworthy** | Show as trend arrow (up/down). Include in manager addendum. |
| +/- 0.7-1.0 | **Significant** | Highlight in dashboard. Trigger coaching suggestion. |
| +/- 1.0+ | **Critical** | Alert the manager. Flag for follow-up. |

These thresholds are empirical recommendations based on:
- LLM scoring variance (typically +/- 0.3 on repeated assessments of same text)
- Minimum perceptible difference on a 5-point scale (research suggests 0.5 is the threshold for human perception)
- Practical significance in coaching contexts

### 6.2 Drift Detection Algorithm

**Method:** Compare the longitudinal score over the last 3 sessions against the previous 3 sessions (6-session rolling window comparison).

```
recent_avg = weighted_avg(last 3 sessions)
previous_avg = weighted_avg(sessions 4-6)
delta = recent_avg - previous_avg

if |delta| > 0.7 AND both windows have >= 2 data points:
  trigger trend alert
```

**Why not more sophisticated statistics?** With only 1 data point per metric per session, and sessions occurring biweekly/monthly, we have very few data points. Traditional statistical significance tests (t-tests, etc.) require larger samples. The 6-session window with a 0.7 threshold is a pragmatic approach that balances false positives against responsiveness.

### 6.3 LLM Scoring Stability

**Known issue:** LLMs are not perfectly consistent raters. The same text assessed twice may yield different scores (typically within +/- 0.3).

**Mitigations:**
1. **Behavioral anchors in the prompt** reduce variance by giving the LLM concrete criteria
2. **Evidence requirement** forces the LLM to ground scores in specific text, improving consistency
3. **Longitudinal averaging** smooths out per-session variance
4. **Never display per-session behavioral scores directly** -- always show the longitudinal composite
5. **Temperature 0** for the assessment call (already the case in the current pipeline via Anthropic structured output)

### 6.4 What LLMs Cannot Reliably Do

Be explicit with users about limitations:

- **Cannot assess actual job performance** -- only assesses how someone talks about their work
- **Cannot detect deception** -- someone who always says "great!" will score high on wellbeing regardless of reality
- **Cannot replace manager judgment** -- these are signals to inform conversation, not verdicts
- **Cultural and language bias** -- non-native English speakers may score lower on Communication Quality; Romanian-language sessions need separate calibration
- **Template dependency** -- metrics are only as good as the questions asked. A template with no career questions yields no Growth Mindset signal.

---

## 7. Competitive Analysis Summary

| Product | What They Measure | How They Measure | Our Differentiation |
|---------|-------------------|------------------|---------------------|
| **Lattice** | Competency ratings, engagement surveys, OKR progress | Manager/peer ratings, pulse surveys | We auto-assess from session text; they require manual rating |
| **Culture Amp** | 9 competencies with proficiency levels, engagement drivers | Surveys, reviews, 360 feedback | We generate continuous signal from every session; they snapshot periodically |
| **15Five** | 8 manager competencies, Focus/Force/Feeling engagement | Check-in ratings, engagement surveys, review cycles | We assess from natural conversation; they use structured survey instruments |
| **Leapsome** | Custom competency frameworks (MECE, max 15) | Reviews, 360 feedback, survey data | We provide automated longitudinal tracking without survey fatigue |
| **BetterUp** | 25 Whole Person dimensions (mindsets, behaviors, outcomes) | Assessment surveys, coaching session notes | Closest to our approach but manual + expensive ($300+/user/month coaching) |
| **Read.ai** | Engagement, sentiment, clarity, inclusion, impact | Real-time audio/video analysis of meetings | They analyze meeting behavior; we analyze meeting content and structure |

**Our unique position:** No product currently offers **automated behavioral dimension scoring from structured 1:1 text data over time**. Read.ai is closest (automated meeting analysis) but focuses on speaking behavior, not content. BetterUp is closest conceptually (coaching + behavioral dimensions) but uses human coaches + surveys, not AI. We occupy a genuinely novel intersection.

---

## 8. Phased Rollout Recommendation

### Phase 1: Foundation (add to AI pipeline)

- Add 5 Tier 1 metrics to the unified AI schema
- Include per-session scores in the AI pipeline output
- Store in session JSONB column
- Compute longitudinal scores in analytics snapshot job
- No new UI yet -- data collection only

### Phase 2: Manager-Facing Display

- Radar chart on the report's profile showing 5 Tier 1 metrics
- Trend lines per metric in session history
- Integration into manager addendum ("Engagement trending down over last 3 sessions")
- Confidence indicators (dim when low confidence)

### Phase 3: Full Taxonomy + Employee Visibility

- Add Tier 2 metrics (Initiative, Collaboration, Goal Orientation, Adaptability, Self-Awareness)
- Employee-facing view of their own metrics
- Drift alerts for managers
- Team-level behavioral heatmap

### Phase 4: Tier 3 + Customization

- Add Alignment and Satisfaction (Tier 3, structured-data-heavy)
- Tenant-configurable metric selection (enable/disable metrics)
- Custom behavioral dimensions per company
- Benchmark comparisons (team average, company average)

---

## 9. Naming Considerations for the Product

Avoid jargon. These are for managers and employees, not HR professionals.

| Internal ID | User-Facing Name | Icon Suggestion |
|-------------|-----------------|-----------------|
| `engagement` | Engagement | Spark/flame |
| `wellbeing` | Wellbeing | Heart |
| `accountability` | Follow-Through | Checkmark circle |
| `growth_mindset` | Growth Drive | Seedling/arrow up |
| `communication_quality` | Communication | Speech bubble |
| `initiative` | Initiative | Lightbulb |
| `collaboration` | Teamwork | People/handshake |
| `goal_orientation` | Results Focus | Target/bullseye |
| `adaptability` | Adaptability | Arrows/wind |
| `self_awareness` | Self-Awareness | Mirror/eye |
| `alignment` | Alignment | Compass |
| `satisfaction` | Satisfaction | Smile/thumbs up |

---

## 10. Open Questions for Phase-Specific Research

1. **LLM prompt optimization:** What specific behavioral anchors produce the most stable LLM scoring? Needs A/B testing with real session data.
2. **Cross-language calibration:** How to ensure Romanian-language sessions produce comparable scores to English-language sessions?
3. **Template coverage mapping:** What minimum set of questions must a template contain to enable assessment of each metric? (Guardrail: don't score what the template doesn't ask about.)
4. **User trust:** How to frame AI-assessed behavioral metrics so users trust but don't over-rely on them? UX research needed.
5. **Privacy implications:** Behavioral profiling from work conversations has GDPR and ethical implications. Need legal review, especially for EU deployment.
6. **Decay rate tuning:** The 0.8 exponential decay is a starting point. Real usage data needed to calibrate how quickly old sessions should lose influence.

---

## 11. Sources

### Frameworks
- [Lominger 67 Competencies (Peoplebox)](https://www.peoplebox.ai/blog/lominger-competencies/) -- MEDIUM confidence
- [Google Project Oxygen (FGP)](https://www.fgp.com/blog/great-managers-matter/) -- HIGH confidence
- [Gallup Q12 Employee Engagement (Gallup)](https://www.gallup.com/workplace/356045/q12-question-summary.aspx) -- HIGH confidence
- [15Five Manager Effectiveness Competencies (15Five Help Center)](https://success.15five.com/hc/en-us/articles/24478376373915-What-are-15Five-s-Manager-Effectiveness-Competencies) -- HIGH confidence
- [BetterUp Whole Person Model (BetterUp)](https://www.betterup.com/whole-person-model-faqs) -- MEDIUM confidence (dimensions not fully enumerated)
- [Culture Amp Competency-Based Development (Culture Amp)](https://support.cultureamp.com/en/articles/8349777-moving-to-competency-based-development-planning) -- MEDIUM confidence
- [Leapsome Competency Framework (Leapsome)](https://www.leapsome.com/product/competency-framework) -- MEDIUM confidence

### Meeting Analytics
- [Read.ai Meeting Benchmarks](https://www.read.ai/benchmarks) -- HIGH confidence
- [Read.ai Sentiment/Engagement Methodology](https://support.read.ai/hc/en-us/articles/4406653674003-About-Sentiment-Engagement-and-the-Read-Score) -- HIGH confidence

### NLP/Text Analysis
- [NLP for Employee Feedback Analysis (ResearchGate)](https://www.researchgate.net/publication/386196346_Leveraging_Natural_Language_Processing_to_Analyze_Employee_Feedback_for_Enhanced_HR_Insights) -- MEDIUM confidence
- [AI Assessment of Soft Skills (EzIntervuez)](https://www.ezintervuez.com/blog/ai-assess-soft-skills-job-interviews/) -- LOW confidence
- [NLP in HR Management (Mad Devs)](https://maddevs.io/blog/nlp-applications-for-human-resource-management/) -- LOW confidence

### Statistical Methods
- [Likert Scale Analysis (Statistics by Jim)](https://statisticsbyjim.com/hypothesis-testing/analyze-likert-scale-data/) -- HIGH confidence
- [Analyzing Likert-Type Data (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3886444/) -- HIGH confidence

### Competitive
- [Lattice vs 15Five vs Culture Amp (OutSail)](https://www.outsail.co/post/lattice-vs-15five-vs-culture-amp-performance) -- MEDIUM confidence
- [15Five Engagement Dimensions (15Five Help Center)](https://success.15five.com/hc/en-us/articles/8325967018907-Engagement-for-managers) -- HIGH confidence
