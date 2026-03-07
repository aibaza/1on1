# Roadmap: 1on1

## Milestones

- v1.0 MVP -- Phases 1-10 (shipped 2026-03-05)
- v1.1 Internationalization -- Phases 11-14 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-10) -- SHIPPED 2026-03-05</summary>

- [x] Phase 1: Foundation & Infrastructure (3/3 plans) -- completed 2026-03-03
- [x] Phase 2: Authentication & Organization (3/3 plans) -- completed 2026-03-03
- [x] Phase 3: User & Team Management (4/4 plans) -- completed 2026-03-03
- [x] Phase 4: Questionnaire Templates (3/3 plans) -- completed 2026-03-03
- [x] Phase 5: Meeting Series & Session Wizard (5/5 plans) -- completed 2026-03-04
- [x] Phase 6: Action Items & Session History (3/3 plans) -- completed 2026-03-04
- [x] Phase 7: AI Pipeline (5/5 plans) -- completed 2026-03-04
- [x] Phase 8: Manager Dashboard & Analytics (7/7 plans) -- completed 2026-03-04
- [x] Phase 9: Email Notifications (2/2 plans) -- completed 2026-03-05
- [x] Phase 10: Integration & Polish (5/5 plans) -- completed 2026-03-05

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 Internationalization (In Progress)

**Milestone Goal:** Add i18n support with two language layers -- UI language (per-user, browser locale default) and content language (per-company, admin setting) -- starting with English and Romanian.

- [x] **Phase 11: i18n Foundation** - next-intl setup, middleware, DB migration, JWT extension, dual-layer architecture (completed 2026-03-05)
- [x] **Phase 12: UI Translation** - Language switcher, ALL string extraction, locale-aware formatting, validation error translation (completed 2026-03-06)
- [x] **Phase 13: Email Translation** - All email templates in correct language, standalone translator for background jobs (completed 2026-03-06)
- [ ] **Phase 14: Romanian & Quality** - Complete Romanian translations, plural forms, diacritics, layout verification, CI key parity, hardcoded string audit

## Phase Details

### Phase 11: i18n Foundation
**Goal**: Working i18n pipeline where locale resolves correctly for authenticated and unauthenticated users, and both Server and Client Components can render translated strings through independent UI and content language layers
**Depends on**: Phase 10 (v1.0 complete)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. A Server Component can call `getTranslations('namespace')` and render a translated string; a Client Component can call `useTranslations('namespace')` and render the same string
  2. An unauthenticated visitor's browser locale is detected via Accept-Language and the correct language loads on the login page
  3. An authenticated user's DB-stored language preference propagates through JWT and renders the correct locale without extra DB calls on each request
  4. UI language (per-user) and content language (per-company) are stored independently and never conflated in the codebase
  5. Translation files use namespace-based JSON structure with TypeScript type safety via next-intl AppConfig
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — i18n infrastructure: next-intl setup, DB migration, JWT extension, proxy locale detection, translation files
- [x] 11-02-PLAN.md — Proof-of-concept: login page translation (EN+RO), language switcher, formatting demo

### Phase 12: UI Translation
**Goal**: Every user-facing page and component displays translated strings, locale-aware formatting, and translated validation errors -- the entire UI works in any supported language
**Depends on**: Phase 11
**Requirements**: UITR-01, UITR-02, UITR-03, UITR-04, UITR-05, UITR-06, UITR-07, UITR-08, UITR-09, UITR-10, FMT-01, FMT-02, FMT-03, FMT-04, VALD-01, VALD-02
**Success Criteria** (what must be TRUE):
  1. User can open a language picker in the user menu, select Romanian, and see the entire UI update without a full page reload -- preference persists across sessions
  2. All pages display translated strings with no hardcoded English visible: auth pages, dashboard, session wizard, people/teams, templates, analytics, settings, and command palette
  3. A Romanian-locale user sees dates as "05.03.2026", numbers as "1.234,56", and relative times as "acum 3 zile" -- an English-locale user sees US formats -- consistently across all pages including analytics chart axes, tooltips, and labels
  4. A Romanian-locale user submitting an invalid form sees validation errors in Romanian; API error responses (rate limits, permission denied, not found) display in the user's UI language in toast notifications
**Plans**: 6 plans

Plans:
- [x] 12-01-PLAN.md — Validation infrastructure (useZodI18nErrors hook, validation namespace, API error keys) and auth page translations
- [x] 12-02-PLAN.md — Dashboard, history, action items, and series date/number formatting replacement
- [x] 12-03-PLAN.md — Session wizard full translation (all ~20 components, widgets, context panel, dates)
- [x] 12-04-PLAN.md — People/teams management and template builder translation
- [x] 12-05-PLAN.md — Analytics charts locale-aware formatting, settings pages, and verification of nav/command palette
- [x] 12-06-PLAN.md — Gap closure: wire session-started toasts, summary-screen error toast, and .toFixed(1) score formatting

### Phase 13: Email Translation
**Goal**: All email notifications render in the correct language for the recipient, using a standalone translator that works outside the Next.js request lifecycle
**Depends on**: Phase 11
**Requirements**: MAIL-01, MAIL-02
**Success Criteria** (what must be TRUE):
  1. An invite email sent to a new user renders in the company's content language (not the sender's UI language)
  2. A session summary email renders in the company's content language with AI-generated content in the same language
  3. Transactional emails (password reset, email verification) render in the recipient's UI language preference
  4. The email translation system works correctly when called from background jobs outside the Next.js request lifecycle
**Plans**: 3 plans

Plans:
- [x] 13-01-PLAN.md — Foundation: createEmailTranslator utility (use-intl/core standalone), messages/en/emails.json + messages/ro/emails.json namespaces
- [x] 13-02-PLAN.md — Template refactor: all 6 email templates accept translated string props (no hardcoded English, no i18n hooks)
- [x] 13-03-PLAN.md — Call site wiring: locale resolution + createEmailTranslator integration in send.ts, invites routes, summary-email, sender

### Phase 14: Romanian & Quality
**Goal**: Complete, natural-sounding Romanian translations across the entire application with correct grammar, no layout breakage, and automated CI enforcement preventing translation regressions
**Depends on**: Phase 12, Phase 13
**Requirements**: ROLN-01, ROLN-02, ROLN-03, ROLN-04, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. All ~650-800 translation keys in `messages/ro.json` have natural Romanian phrasing -- not machine-translation artifacts
  2. Pluralized strings use correct ICU MessageFormat with three Romanian forms (one/few/other) -- verified with values 0, 1, 2, 5, 19, 20, 21, 100
  3. All Romanian text uses correct comma-below diacritics (U+0219/U+021B), never cedilla variants -- and no UI element overflows or truncates when displaying Romanian text
  4. CI pipeline fails if `en.json` and `ro.json` have different sets of translation keys
  5. A code audit confirms no hardcoded English strings remain in user-facing components -- all strings go through `t()` or formatter APIs
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md — Diacritic fixes (~100 corrections across 6 ro.json files) and ICU plural three-form fixes (add `few` to 6 keys in analytics.json + sessions.json)
- [ ] 14-02-PLAN.md — CI key parity Vitest test, hardcoded English string elimination in 3 components, layout overflow verification

## Progress

**Execution Order:**
Phase 11 first (foundation). Then Phases 12 and 13 are parallelizable. Phase 14 gates on both 12 and 13 (all English keys must be locked).

```
Phase 11 (foundation)
  |
  +---> Phase 12 (UI translation)  ---+
  |                                    +---> Phase 14 (Romanian & QA)
  +---> Phase 13 (email translation) -+
```

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
| 11. i18n Foundation | 2/2 | Complete    | 2026-03-05 | - |
| 12. UI Translation | 6/6 | Complete    | 2026-03-06 | - |
| 13. Email Translation | 3/3 | Complete    | 2026-03-06 | - |
| 14. Romanian & Quality | v1.1 | 0/2 | Not started | - |
