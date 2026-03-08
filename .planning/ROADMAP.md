# Roadmap: 1on1

## Milestones

- ✅ **v1.0 MVP** — Phases 1-10 (shipped 2026-03-05)
- ✅ **v1.1 Internationalization** — Phases 11-14 (shipped 2026-03-07)
- ✅ **v1.2 AI-Ready Templates** — Phases 15-17 (shipped 2026-03-07)
- 🚧 **v1.3 UI/UX Improvements** — Phases 18-23 (in progress)
- 📋 **v1.4 Playwright Testing Suite** — Phases 24+ (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-10) — SHIPPED 2026-03-05</summary>

- [x] Phase 1: Foundation & Infrastructure (3/3 plans) — completed 2026-03-03
- [x] Phase 2: Authentication & Organization (3/3 plans) — completed 2026-03-03
- [x] Phase 3: User & Team Management (4/4 plans) — completed 2026-03-03
- [x] Phase 4: Questionnaire Templates (3/3 plans) — completed 2026-03-03
- [x] Phase 5: Meeting Series & Session Wizard (5/5 plans) — completed 2026-03-04
- [x] Phase 6: Action Items & Session History (3/3 plans) — completed 2026-03-04
- [x] Phase 7: AI Pipeline (5/5 plans) — completed 2026-03-04
- [x] Phase 8: Manager Dashboard & Analytics (7/7 plans) — completed 2026-03-04
- [x] Phase 9: Email Notifications (2/2 plans) — completed 2026-03-05
- [x] Phase 10: Integration & Polish (5/5 plans) — completed 2026-03-05

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Internationalization (Phases 11-14) — SHIPPED 2026-03-07</summary>

- [x] Phase 11: i18n Foundation (2/2 plans) — completed 2026-03-05
- [x] Phase 12: UI Translation (6/6 plans) — completed 2026-03-06
- [x] Phase 13: Email Translation (3/3 plans) — completed 2026-03-06
- [x] Phase 14: Romanian & Quality (2/2 plans) — completed 2026-03-07

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 AI-Ready Templates (Phases 15-17) — SHIPPED 2026-03-07</summary>

- [x] Phase 15: Schema, Spec & Export (4/4 plans) — completed 2026-03-07
- [x] Phase 16: Template Import (5/5 plans) — completed 2026-03-07
- [x] Phase 17: AI Generator & DIY Kit (7/7 plans) — completed 2026-03-07

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 UI/UX Improvements (In Progress)

**Milestone Goal:** Systematically close all findings from the March 2026 UX audit — fix critical rendering bugs, establish design system conventions, improve mobile responsiveness, fix content density and data display issues, add safety and error handling, and apply low-priority polish — elevating the app from 6.5/10 to 8.5/10.

- [x] **Phase 18: Critical Bugs** — Fix 4 rendering bugs breaking content and layout (completed 2026-03-08)
- [x] **Phase 19: Design System** — Establish consistent button colors, badge weights, casing, and empty-state component (completed 2026-03-08)
- [ ] **Phase 20: Mobile Responsiveness** — Fix action bars, touch targets, and table layouts on mobile
- [ ] **Phase 21: Content & Data Display** — Analytics aggregate metrics, score display, session card data density
- [ ] **Phase 22: Safety, Errors & Inputs** — Danger zones, 404 pages, date picker consistency
- [ ] **Phase 23: Low-Priority Polish** — 9 small text, visual, and layout tweaks

## Phase Details

### Phase 18: Critical Bugs
**Goal**: Users see correct content throughout the app — no raw object output, no broken layouts, no missing translations, no dev artifacts in production
**Depends on**: Phase 17
**Requirements**: BUG-01, BUG-02, BUG-03, BUG-04
**Success Criteria** (what must be TRUE):
  1. Wizard recap notes display formatted rich text (paragraphs, bullets, bold) instead of `[object Object]`
  2. AI template editor is usable on screens narrower than 1024px — panels stack vertically or toggle between tabs
  3. Templates schema page renders translated UI text in both English and Romanian — no raw `spec.*` keys visible
  4. Recap screen contains no dashed-border sparkline placeholder div from development
**Plans**: 3 plans
Plans:
- [ ] 18-01-PLAN.md — TDD: Write failing unit tests for contentToHtml helper (Wave 0)
- [ ] 18-02-PLAN.md — Implement contentToHtml, fix recap notes rendering, remove sparkline div (Wave 1)
- [ ] 18-03-PLAN.md — Add spec.json to i18n loader + AI editor mobile responsive layout (Wave 1)

### Phase 19: Design System
**Goal**: Users experience a visually consistent interface — a single primary action color, badge weights that signal importance, consistent section header casing, and empty states instead of blank whitespace
**Depends on**: Phase 18
**Requirements**: DES-01, DES-02, DES-03, DES-04
**Success Criteria** (what must be TRUE):
  1. All primary CTA buttons (auth pages and app pages) use the same color — no inconsistency between auth and app
  2. "In progress" badges are visually heavier (filled) than "completed" badges (outlined), matching semantic importance
  3. Wizard section headers use sentence-case: "Notes", "Talking Points", "Action Items" — no ALL-CAPS headers
  4. Pages that previously showed blank whitespace now show an empty-state component with icon, heading, description, and optional CTA
**Plans**: 3 plans
Plans:
- [ ] 19-01-PLAN.md — Wave 0: Write failing test scaffolds for DES-02, DES-03, DES-04
- [ ] 19-02-PLAN.md — Build EmptyState component and replace all inline empty-state patterns (DES-04)
- [ ] 19-03-PLAN.md — Fix badge variant semantics, remove uppercase section headers, audit button colors (DES-01, DES-02, DES-03)

### Phase 20: Mobile Responsiveness
**Goal**: Users can operate all app surfaces on mobile — action bars fit within viewport, touch targets meet minimum size, and list pages are readable on small screens
**Depends on**: Phase 18
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05
**Success Criteria** (what must be TRUE):
  1. Template list and template detail action bars do not overflow on mobile — secondary actions collapse into an overflow menu below 768px
  2. AI nudge dismiss button is at least 44×44px and tappable on mobile without precision
  3. People list is readable on mobile — shows at minimum Name and Role columns, or renders as cards
  4. Audit log table is readable on mobile — renders as card rows or shows only priority columns
**Plans**: 4 plans
Plans:
- [ ] 20-01-PLAN.md — Wave 0: Write failing unit tests for MOB-03, MOB-04, MOB-05
- [ ] 20-02-PLAN.md — Fix nudge touch target (MOB-03) + template list overflow menu (MOB-01) (Wave 1)
- [ ] 20-03-PLAN.md — People table mobile columns (MOB-04) + audit log mobile columns (MOB-05) (Wave 1)
- [ ] 20-04-PLAN.md — Template editor overflow menu (MOB-02) (Wave 2)

### Phase 21: Content & Data Display
**Goal**: Users see accurate, appropriately dense data — analytics show company-wide aggregate metrics, session cards show scores not stars, the wizard shows section counts, and the team heatmap communicates data requirements
**Depends on**: Phase 18
**Requirements**: CON-01, CON-02, CON-03, CON-04, CON-05, SCORE-01
**Success Criteria** (what must be TRUE):
  1. Analytics overview page shows aggregate company-wide metrics (score trend, sessions completed, action item completion rate) above the team/individual directory
  2. Session list cards with no completed sessions do not show a star rating row
  3. Session list cards with completed sessions show a numeric score badge, not hollow stars
  4. Wizard "Talking Points" and "Action Items" sections display an item count badge and a working expand/collapse chevron
  5. Team heatmap shows a threshold message ("requires ≥3 contributors") when fewer than 3 contributors have session data
  6. Session summary score label displays the correct maximum scale (e.g., "7.5 out of 10")
**Plans**: TBD

### Phase 22: Safety, Errors & Inputs
**Goal**: Users are protected from accidental data loss, see helpful context-aware error pages instead of bare Next.js defaults, and use consistent date picker controls
**Depends on**: Phase 19
**Requirements**: SAFE-01, ERR-01, INP-01
**Success Criteria** (what must be TRUE):
  1. "Delete Team" button appears in a visually distinct "Danger Zone" section at the bottom of the team detail page, styled with outlined red — visually separated from non-destructive actions
  2. Navigating to a session URL that does not exist shows a contextual 404 page with a "Back to Sessions" link, not the bare Next.js error page
  3. Date filter inputs on History and Audit Log pages use the shadcn DatePicker component — no native `<input type="date">` elements remain
**Plans**: TBD

### Phase 23: Low-Priority Polish
**Goal**: Users see a professionally finished product — correct placeholder text, accurate copy, properly styled dividers, centered auth pages, hidden redundant badges, and mobile-optimized layout details
**Depends on**: Phase 19
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07, POL-08, POL-09
**Success Criteria** (what must be TRUE):
  1. Registration company name field shows a company name placeholder ("Acme Corp") — not a person name
  2. Audit log action names use correct acronym casing ("AI Pipeline Completed", not "Ai Pipeline Completed")
  3. Forgot-password page card is vertically centered, matching login and register page alignment
  4. People list hides the "Active" status badge when all users are active — badge only appears for non-default states
  5. Action items "COMPLETED" section divider uses 13px font and a hairline hr — readable and unobtrusive
  6. Team cards have a visible border in dark mode for definition against the page background
  7. Session cards with no sessions show a "Start first session" link below the AI summary placeholder
  8. Mobile history page search input placeholder is short enough to display without truncation
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Infrastructure | v1.0 | 3/3 | Complete | 2026-03-03 |
| 2. Authentication & Organization | v1.0 | 3/3 | Complete | 2026-03-03 |
| 3. User & Team Management | v1.0 | 4/4 | Complete | 2026-03-03 |
| 4. Questionnaire Templates | v1.0 | 3/3 | Complete | 2026-03-03 |
| 5. Meeting Series & Session Wizard | v1.0 | 5/5 | Complete | 2026-03-04 |
| 6. Action Items & Session History | v1.0 | 3/3 | Complete | 2026-03-04 |
| 7. AI Pipeline | v1.0 | 5/5 | Complete | 2026-03-04 |
| 8. Manager Dashboard & Analytics | v1.0 | 7/7 | Complete | 2026-03-04 |
| 9. Email Notifications | v1.0 | 2/2 | Complete | 2026-03-05 |
| 10. Integration & Polish | v1.0 | 5/5 | Complete | 2026-03-05 |
| 11. i18n Foundation | v1.1 | 2/2 | Complete | 2026-03-05 |
| 12. UI Translation | v1.1 | 6/6 | Complete | 2026-03-06 |
| 13. Email Translation | v1.1 | 3/3 | Complete | 2026-03-06 |
| 14. Romanian & Quality | v1.1 | 2/2 | Complete | 2026-03-07 |
| 15. Schema, Spec & Export | v1.2 | 4/4 | Complete | 2026-03-07 |
| 16. Template Import | v1.2 | 5/5 | Complete | 2026-03-07 |
| 17. AI Generator & DIY Kit | v1.2 | 7/7 | Complete | 2026-03-07 |
| 18. Critical Bugs | 3/3 | Complete    | 2026-03-08 | — |
| 19. Design System | 3/3 | Complete    | 2026-03-08 | — |
| 20. Mobile Responsiveness | v1.3 | 0/4 | Not started | — |
| 21. Content & Data Display | v1.3 | 0/? | Not started | — |
| 22. Safety, Errors & Inputs | v1.3 | 0/? | Not started | — |
| 23. Low-Priority Polish | v1.3 | 0/? | Not started | — |
