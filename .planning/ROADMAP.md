# Roadmap: 1on1

## Milestones

### Shipped

- ✅ **v1.0 MVP** — Phases 1-10 (shipped 2026-03-05)
- ✅ **v1.1 Internationalization** — Phases 11-14 (shipped 2026-03-07)
- ✅ **v1.2 AI-Ready Templates** — Phases 15-17 (shipped 2026-03-07)
- ✅ **v1.3 UI/UX Improvements** — Phases 18-22 (shipped 2026-03-16)
- ✅ **v1.4 Session Corrections & Accountability** — Phases 24-27 (shipped 2026-03-13)
- ✅ **v1.5 Playwright E2E Test Suite** — Phase 28 (shipped 2026-03-13)
- ✅ **v1.6 Polish + Versioning** — Phases 23, 24, 29 (shipped 2026-03-20)
- ✅ **v1.7.0 Unified AI + Infrastructure** — No GSD phases (released 2026-03-21)

### Planned

- 📋 **v1.8 UI/UX Review + Report Pre-fill** — Phases 30-35
- 📋 **v1.9 AI Intelligence Layer** — Phases 36-41
- 📋 **v2.0 Google Workspace** — Phases 42-45
- 📋 **v2.1 Analytics & Objectives** — Phases 46-49
- 📋 **v2.2+ Later** — AI live suggestions, PDF export, SSO, system templates, Outlook

---

## v1.8 UI/UX Review + Report Pre-fill

**Goal:** Audit and polish the entire UI/UX to Apple-level quality, then ship the report pre-fill feature — letting the person being reviewed prepare answers before the meeting.

### Phase 30: UI/UX Audit
**Goal**: Comprehensive visual and interaction audit — design language consistency, mobile responsiveness, accessibility, dark mode, component coherence
**Depends on**: None (clean start)
**Deliverable**: Scored audit report with prioritized fix list

### Phase 31: UI/UX Fixes
**Goal**: Implement all fixes from the audit — design consistency, accessibility, responsive gaps, interaction polish
**Depends on**: Phase 30
**Deliverable**: All audit items resolved, verified against audit criteria

### Phase 32: Report Pre-fill Schema
**Goal**: Unique index migration `(session_id, question_id, respondent_id)`, new session statuses (`prefill_open`, `prefill_submitted`), `prefill_submitted_at` column, `prefill_visible` on questions, `prefill_hours_before` on series
**Depends on**: Phase 31
**Research**: `.planning/research/report-prefill/ARCHITECTURE.md`

### Phase 33: Report Pre-fill UI
**Goal**: Simplified wizard for the report role (mobile-first), status transitions, auto-save, submit flow
**Depends on**: Phase 32

### Phase 34: Pre-fill Email Triggers
**Goal**: Automated email when prefill opens (24h before due), reminder if not filled, notification to manager when prefill is complete
**Depends on**: Phase 33

### Phase 35: Manager Review Integration
**Goal**: Report's pre-filled answers shown in wizard context panel; manager can see report's perspective while conducting the session; analytics and AI pipeline adapted for dual-respondent answers
**Depends on**: Phase 34

---

## v1.9 AI Intelligence Layer

**Goal:** Build the AI backbone — pgvector embeddings, behavioral metrics, anomaly detection, and growth narratives. This is the core differentiator: no competitor does automated behavioral scoring from 1:1 text.

### Phase 36: pgvector Foundation
**Goal**: Enable pgvector on Neon, create `session_embedding` table (512-dim vectors), build embedding service using OpenAI `text-embedding-3-small`, integrate into post-session AI pipeline as non-fatal step
**Depends on**: Phase 35
**Research**: `.planning/research/ai-profiles-pgvector.md`
**Key decisions**: Append-only chunks (3-6 per session), HNSW index, 512 dimensions

### Phase 37: Profile Retrieval & AI Context
**Goal**: Integrate vector similarity search into AI prompt construction — retrieve relevant historical chunks when generating summaries, nudges, and action items; replace full-text search context retrieval
**Depends on**: Phase 36

### Phase 38: Behavioral Metrics — Tier 1
**Goal**: Add `behavioralMetrics` section to unified AI pipeline Zod schema; collect 5 HIGH-reliability metrics silently (Engagement, Wellbeing, Accountability, Growth Mindset, Communication Quality); store in `analytics_snapshot`; 1-5 scale with exponential decay averaging
**Depends on**: Phase 37
**Research**: `.planning/research/behavioral-metrics-taxonomy.md`
**Key decisions**: 0.7+ drift = meaningful signal, 6-session rolling window

### Phase 39: Behavioral Metrics UI
**Goal**: Radar chart + trend lines for managers; per-person metric detail view; category-level breakdown; requires 3+ months of Tier 1 data (can ship UI with seed/historical data)
**Depends on**: Phase 38

### Phase 40: AI Anomaly Detection
**Goal**: Detect significant deviations from baseline across behavioral metrics and session scores; surface as "attention needed" cards on manager dashboard; amber-not-red, max 2 cards, dismissable with 14-day cooldown
**Depends on**: Phase 39
**Research**: `.planning/research/analytics-everywhere.md`

### Phase 41: AI Growth Narratives
**Goal**: Generate periodic narrative summaries of behavioral metric trajectories ("Over Q1, Alex's communication quality improved from 3.1 to 4.2, driven by..."); pre-generated and cached, not blocking page loads; visible on personal profile and manager dashboard
**Depends on**: Phase 40

---

## v2.0 Google Workspace

**Goal:** Deep Google Workspace integration — workspace-only OAuth, calendar availability with free slot suggestions, event creation, and bidirectional task sync.

### Phase 42: Workspace OAuth + Token Infrastructure
**Goal**: Restrict Google OAuth to workspace accounts (server-side `hd` validation), token encryption and refresh, `google_integration` table, incremental consent flow, submit for Google OAuth sensitive scope verification
**Depends on**: Phase 41
**Research**: `.planning/research/google-workspace/ARCHITECTURE.md`
**Critical**: Submit for scope verification during this phase (3-5+ day review)

### Phase 43: Calendar Availability & Scheduling
**Goal**: FreeBusy API for both participants, free-slot-finding algorithm, "Schedule Session" UI showing common availability, time zone handling
**Depends on**: Phase 42

### Phase 44: Calendar Events + Push Notifications
**Goal**: Create Google Calendar events when sessions are scheduled, calendar watch channels with 7-day renewal cron, push notification webhook for event changes
**Depends on**: Phase 43

### Phase 45: Google Tasks Sync
**Goal**: Action items synced to Google Tasks (start with one-way push, then bidirectional); polling-based sync (5-min intervals — Tasks API has no webhooks); conflict resolution; Vercel cron for sync orchestration
**Depends on**: Phase 44
**Key constraint**: No webhooks on Tasks API, design UX around polling latency

---

## v2.1 Analytics & Objectives

**Goal:** Surface analytics everywhere (not just report pages) and add lightweight SMART objectives with AI auto-assessment.

### Phase 46: Analytics Quick Wins
**Goal**: Score delta badges on series cards, "last time" recap sentence in wizard context panel, overdue day count, member self-service analytics view; zero new DB queries for most items
**Depends on**: Phase 45
**Research**: `.planning/research/analytics-everywhere.md`

### Phase 47: Dashboard Intelligence
**Goal**: Attention cards (max 2, amber, dismissable), cadence health traffic lights, team pulse sentence insight, action item velocity KPI; new queries with simple aggregations
**Depends on**: Phase 46

### Phase 48: SMART Objectives — Foundation
**Goal**: `objective` table with SMART criteria fields, CRUD pages, link action items to objectives, surface objectives in session wizard context panel (sidebar reference pattern)
**Depends on**: Phase 47
**Research**: `.planning/research/smart-objectives.md`
**Scope boundary**: No cascading hierarchies, no team-level OKRs, no goal alignment trees

### Phase 49: SMART Objectives — AI Assessment
**Goal**: AI auto-assesses objective progress from session data post-session; manager approval as safety net; AI SMART decomposition assist at creation time (reuse template co-author pattern); objective progress timeline
**Depends on**: Phase 48

---

## v2.2+ Later

| Feature | Notes |
|---------|-------|
| AI live suggestions | Streaming during active sessions, low latency |
| Behavioral Metrics Tier 2 | Add 5 MEDIUM-reliability metrics after Tier 1 validation |
| PDF export | Organization-branded performance review reports |
| SSO (SAML 2.0, OIDC) | Enterprise authentication |
| System template library | Pre-built questionnaire templates |
| Outlook/O365 calendar sync | After Google Workspace proves the pattern |
| Tenant-configurable metrics | Custom behavioral dimensions per company |

---

## Archived Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1-10) — SHIPPED 2026-03-05</summary>

- [x] Phase 1: Foundation & Infrastructure (3/3 plans)
- [x] Phase 2: Authentication & Organization (3/3 plans)
- [x] Phase 3: User & Team Management (4/4 plans)
- [x] Phase 4: Questionnaire Templates (3/3 plans)
- [x] Phase 5: Meeting Series & Session Wizard (5/5 plans)
- [x] Phase 6: Action Items & Session History (3/3 plans)
- [x] Phase 7: AI Pipeline (5/5 plans)
- [x] Phase 8: Manager Dashboard & Analytics (7/7 plans)
- [x] Phase 9: Email Notifications (2/2 plans)
- [x] Phase 10: Integration & Polish (5/5 plans)

</details>

<details>
<summary>✅ v1.1 Internationalization (Phases 11-14) — SHIPPED 2026-03-07</summary>

- [x] Phase 11: i18n Foundation (2/2 plans)
- [x] Phase 12: UI Translation (6/6 plans)
- [x] Phase 13: Email Translation (3/3 plans)
- [x] Phase 14: Romanian & Quality (2/2 plans)

</details>

<details>
<summary>✅ v1.2 AI-Ready Templates (Phases 15-17) — SHIPPED 2026-03-07</summary>

- [x] Phase 15: Schema, Spec & Export (4/4 plans)
- [x] Phase 16: Template Import (5/5 plans)
- [x] Phase 17: AI Generator & DIY Kit (7/7 plans)

</details>

<details>
<summary>✅ v1.3 UI/UX Improvements (Phases 18-22) — SHIPPED 2026-03-16</summary>

- [x] Phase 18: Critical Bugs (3/3 plans)
- [x] Phase 19: Design System (3/3 plans)
- [x] Phase 20: Mobile Responsiveness (4/4 plans)
- [x] Phase 21: Content & Data Display (4/4 plans)
- [x] Phase 22: Safety, Errors & Inputs (4/4 plans)

</details>

<details>
<summary>✅ v1.4 Session Corrections (Phases 24-27) — SHIPPED 2026-03-13</summary>

- [x] Phase 24: Schema Foundation (2/2 plans)
- [x] Phase 25: Core API & Business Logic (3/3 plans)
- [x] Phase 26: Email Notification & i18n (3/3 plans)
- [x] Phase 27: UI Integration (4/4 plans)

</details>

<details>
<summary>✅ v1.5 Playwright E2E (Phase 28) — SHIPPED 2026-03-13</summary>

- [x] Phase 28: Playwright E2E Test Suite (6/6 plans)

</details>

<details>
<summary>✅ v1.6 Polish + Versioning (Phases 23, 24, 29) — SHIPPED 2026-03-20</summary>

- [x] Phase 23: Low-Priority Polish (2/2 plans)
- [x] Phase 24: Sessions Access Control & Talking Points (3/3 plans)
- [x] Phase 29: Template Versioning & Answer Remapping (3/3 plans)

</details>

<details>
<summary>✅ v1.7.0 Unified AI + Infrastructure — RELEASED 2026-03-21</summary>

No GSD phases — unified AI pipeline, company context, Vercel analytics, Frankfurt serverless, dev preview environment, AI score migration.

</details>
