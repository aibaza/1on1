# Roadmap: 1on1

## Milestones

- v1.0 MVP -- Phases 1-10 (shipped 2026-03-05)
- v1.1 Internationalization -- Phases 11-14 (complete 2026-03-07)
- v1.2 AI-Ready Templates -- Phases 15-17 (in progress)

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

<details>
<summary>v1.1 Internationalization (Phases 11-14) -- COMPLETE 2026-03-07</summary>

**Milestone Goal:** Add i18n support with two language layers -- UI language (per-user, browser locale default) and content language (per-company, admin setting) -- starting with English and Romanian.

- [x] **Phase 11: i18n Foundation** - next-intl setup, middleware, DB migration, JWT extension, dual-layer architecture (completed 2026-03-05)
- [x] **Phase 12: UI Translation** - Language switcher, ALL string extraction, locale-aware formatting, validation error translation (completed 2026-03-06)
- [x] **Phase 13: Email Translation** - All email templates in correct language, standalone translator for background jobs (completed 2026-03-06)
- [x] **Phase 14: Romanian & Quality** - Complete Romanian translations, plural forms, diacritics, layout verification, CI key parity, hardcoded string audit (completed 2026-03-07)

</details>

### v1.2 AI-Ready Templates (In Progress)

**Milestone Goal:** Give every user the tools to leverage AI as a template co-author -- in-app generator, portable JSON export/import, and a DIY prompt kit for external AI tools. All content in the company's language.

- [x] **Phase 15: Schema, Spec & Export** - JSON schema spec with methodology and weight docs, single-template portable JSON export (completed 2026-03-07)
- [x] **Phase 16: Template Import** - JSON upload with preview, language mismatch warning, conflict resolution, field-specific validation errors (completed 2026-03-07)
- [x] **Phase 17: AI Generator & DIY Kit** - In-app AI template generation in company language, copyable prompt kit for external AI tools (completed 2026-03-07)

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
  2. Pluralized strings use correct ICU MessageFormat with three Romanian forms (one/few/other) -- verified with values 0, 1, 2, 5, 19, 20, 21,100
  3. All Romanian text uses correct comma-below diacritics (U+0219/U+021B), never cedilla variants -- and no UI element overflows or truncates when displaying Romanian text
  4. CI pipeline fails if `en.json` and `ro.json` have different sets of translation keys
  5. A code audit confirms no hardcoded English strings remain in user-facing components -- all strings go through `t()` or formatter APIs
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Diacritic fixes (~100 corrections across 6 ro.json files) and ICU plural three-form fixes (add `few` to 6 keys in analytics.json + sessions.json)
- [x] 14-02-PLAN.md — CI key parity Vitest test, hardcoded English string elimination in 3 components, layout overflow verification

### Phase 15: Schema, Spec & Export
**Goal**: Users can access the canonical JSON schema spec with methodology and weight system documentation, and export any template as a portable, tenant-neutral JSON file that any organization can import
**Depends on**: Phase 14 (v1.1 complete)
**Requirements**: SPEC-01, SPEC-02, SPEC-03, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05
**Success Criteria** (what must be TRUE):
  1. An admin can open the template schema documentation page, view the full JSON schema (all fields, types, and constraints), and download or copy it -- the schema itself is always in English as a technical standard
  2. An admin reading the methodology docs sees the core 1:1 principles and question-quality guidance rendered in the company's content language (not hardcoded English)
  3. An admin reading the weight system docs sees how `scoreWeight` affects analytics, valid value ranges, and worked examples -- all rendered in the company's content language
  4. An admin or manager clicks "Export" on any template in the template list or builder, and a `.json` file downloads with `schemaVersion`, `language`, all question metadata (`scoreWeight`, `answerConfig`, conditional logic, section structure), and no internal tenant IDs or per-org UUIDs
**Plans**: 4 plans

Plans:
- [x] 15-01-PLAN.md — TDD: TemplateExport interface, SCHEMA_VERSION constant, buildExportPayload() with 7 unit tests (EXP-02 through EXP-05)
- [x] 15-02-PLAN.md — Export API route (GET /api/templates/[id]/export) + spec.json translation namespace (en + ro) + /templates/schema docs page (SPEC-01, SPEC-02, SPEC-03)
- [x] 15-03-PLAN.md — ExportButton component + wire into template-list.tsx and template-editor.tsx + translation keys (EXP-01)
- [x] 15-04-PLAN.md — Manual verification: role-gating UI check (member sees no button, admin/manager sees button + working download)

### Phase 16: Template Import
**Goal**: Users can import a template from a portable JSON file with full visibility into what they are importing, warnings about mismatches, and actionable error messages if the file is invalid
**Depends on**: Phase 15
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05
**Success Criteria** (what must be TRUE):
  1. An admin or manager uploads a `.json` file from the template list and sees a preview -- template name, section count, question count, and question type breakdown -- before any data is written
  2. When the imported file's `language` field does not match the company's content language, the user sees a warning (naming both languages) and must explicitly confirm before proceeding
  3. When a template with the same name already exists, the user is offered three choices -- rename, create as copy, or cancel -- and the import only proceeds after an explicit choice
  4. When the uploaded file fails validation, the user sees field-specific error messages (e.g., "Question 3, field `answerType`: invalid value `checkbox`") rather than a generic failure toast
**Plans**: 5 plans

Plans:
- [ ] 16-01-PLAN.md — Wave 0 TDD: failing test scaffolds for import-schema and RBAC guard
- [ ] 16-02-PLAN.md — import-schema.ts (Zod schema, formatImportErrors, derivePreviewStats) + import.* translation keys (EN + RO)
- [ ] 16-03-PLAN.md — POST /api/templates/import route: validation, atomic insert, conflict detection, audit log
- [ ] 16-04-PLAN.md — ImportDialog component (4-step) + wire Import button into template-list.tsx
- [ ] 16-05-PLAN.md — Manual verification: RBAC gating, happy path round-trip, language mismatch, conflict resolution, invalid file errors

### Phase 17: AI Generator & DIY Kit
**Goal**: Users can generate a complete, ready-to-use template draft through an in-app AI flow, and can access a copyable prompt kit to build templates with external AI tools on their own
**Depends on**: Phase 15
**Requirements**: AIGEN-01, AIGEN-02, AIGEN-03, AIGEN-04, DIY-01, DIY-02
**Success Criteria** (what must be TRUE):
  1. An admin or manager opens "Generate with AI", describes their team and meeting goals in plain text, and receives a complete template draft (name, sections, questions with help text) within the generation flow -- all question text is in the company's content language
  2. The generated template draft appears in a preview showing name, section count, and question type breakdown before any data is saved -- user can accept, discard, or open the template builder to edit before saving
  3. The AI generation prompt includes the JSON schema spec, methodology principles, and weight system documentation as structured context so that generated templates conform to the schema and follow 1:1 best practices
  4. A user accesses the DIY prompt kit page, sees the full copyable block (JSON schema + methodology principles + worked example), and the narrative and example content render in the company's content language (the JSON schema block itself remains in English)
**Plans**: 7 plans

Plans:
- [ ] 17-01-PLAN.md — Wave 0 TDD: failing test stubs for templateChatResponseSchema, buildTemplateEditorSystemPrompt, withLanguageInstruction, DIY kit worked example
- [ ] 17-02-PLAN.md — AI contracts: templateChatResponseSchema, template-editor system prompt, models.templateEditor, generateTemplateChatTurn service function
- [ ] 17-03-PLAN.md — Translation keys: spec.promptKit.* (EN + RO) and templates.aiEditor.* (EN + RO)
- [ ] 17-04-PLAN.md — POST /api/templates/ai-chat route: RBAC, Zod validation, tenant language resolution, AI service call
- [ ] 17-05-PLAN.md — AI editor UI: split-screen shell + preview panel + chat panel + chat input + server pages for new and existing templates
- [ ] 17-06-PLAN.md — Wire entry points: Generate with AI button in template-list, Edit with AI button in template-editor, DIY Prompt Kit 4th tab on schema page
- [ ] 17-07-PLAN.md — Manual verification: all 7 scenarios (AIGEN-01 through DIY-02 confirmed in browser)

## Progress

**Execution Order:**
Phase 15 first (schema is prerequisite for export format, import validation, and AI context). Phase 16 and 17 are parallelizable after Phase 15.

```
Phase 15 (schema + export)
  |
  +---> Phase 16 (import)         ---+
  |                                   +--> v1.2 complete
  +---> Phase 17 (AI gen + DIY)  ---+
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
| 11. i18n Foundation | v1.1 | 2/2 | Complete | 2026-03-05 |
| 12. UI Translation | v1.1 | 6/6 | Complete | 2026-03-06 |
| 13. Email Translation | v1.1 | 3/3 | Complete | 2026-03-06 |
| 14. Romanian & Quality | v1.1 | 2/2 | Complete | 2026-03-07 |
| 15. Schema, Spec & Export | v1.2 | 4/4 | Complete | 2026-03-07 |
| 16. Template Import | 5/5 | Complete    | 2026-03-07 | - |
| 17. AI Generator & DIY Kit | 7/7 | Complete   | 2026-03-07 | - |
