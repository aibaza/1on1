# Requirements: 1on1

**Defined:** 2026-03-05
**Core Value:** The AI context layer that makes every meeting smarter than the last

## v1.1 Requirements

Requirements for internationalization milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: App uses next-intl for all UI string translations with Server and Client Component support
- [x] **INFRA-02**: Locale resolves from user DB preference (authenticated) or browser Accept-Language (unauthenticated) via middleware cookie
- [x] **INFRA-03**: User language preference persists in DB and propagates through JWT without extra DB calls
- [x] **INFRA-04**: Translation files use namespace-based JSON structure with TypeScript type safety
- [x] **INFRA-05**: UI language (per-user) and content language (per-company) are independent, never conflated

### UI Translation

- [x] **UITR-01**: User can switch UI language between English and Romanian via language picker in user menu
- [x] **UITR-02**: All navigation, layout, and shared component strings are translated
- [x] **UITR-03**: All auth pages (login, register, invite, forgot-password, verification, reset) are translated
- [x] **UITR-04**: All dashboard components (stats, upcoming, overdue, recent) are translated
- [x] **UITR-05**: All session wizard components (steps, context panel, talking points, notes) are translated
- [x] **UITR-06**: All people/teams management pages are translated
- [x] **UITR-07**: All template builder pages are translated
- [x] **UITR-08**: All analytics pages (trends, category, team, velocity, export) are translated
- [x] **UITR-09**: All settings pages (company, profile, members, integrations) are translated
- [x] **UITR-10**: Command palette and search UI are translated

### Formatting

- [x] **FMT-01**: All dates display in locale-appropriate format (DD.MM.YYYY for Romanian, MM/DD/YYYY for English)
- [x] **FMT-02**: All numbers use locale-appropriate decimal and thousands separators
- [x] **FMT-03**: All relative times ("3 days ago" / "acum 3 zile") respect user locale
- [x] **FMT-04**: Analytics chart labels, tooltips, and axes are formatted per user locale

### Email

- [x] **MAIL-01**: All email templates render in the correct language (company content language for invites/summaries, user preference where applicable)
- [x] **MAIL-02**: Standalone email translator works outside Next.js request lifecycle for background jobs

### Validation

- [x] **VALD-01**: Zod form validation error messages display in user's UI language
- [x] **VALD-02**: API error responses display in user's UI language

### Romanian

- [x] **ROLN-01**: Complete Romanian translations for all ~650-800 keys with natural phrasing
- [x] **ROLN-02**: Romanian plural forms use correct ICU MessageFormat (one/few/other)
- [x] **ROLN-03**: Romanian text uses correct diacritics (comma-below U+0219/U+021B)
- [x] **ROLN-04**: UI layouts handle 15-30% longer Romanian text without overflow or truncation

### Quality

- [x] **QUAL-01**: CI check enforces key parity between en.json and ro.json
- [x] **QUAL-02**: No hardcoded English strings remain in user-facing components

## v1.2 Requirements

Requirements for AI-ready template milestone. Each maps to roadmap phases.

### Spec & Documentation

- [x] **SPEC-01**: A JSON schema document for templates is accessible in-app -- downloadable and copyable -- describing every field, type, and constraint (in English, as a technical standard)
- [x] **SPEC-02**: In-app methodology documentation (core 1:1 principles, what makes a good question, conversation flow) is rendered in the company's content language
- [x] **SPEC-03**: The spec documents the scoring/weight system -- how `scoreWeight` affects analytics, valid values, examples -- rendered in the company's content language

### Export

- [x] **EXP-01**: Admin or manager can export a single template as a downloadable `.json` file from the template list or template builder
- [x] **EXP-02**: Exported JSON includes a `schemaVersion` field (e.g., `1`) for compatibility tracking
- [x] **EXP-03**: Exported JSON is tenant-neutral -- no internal tenant IDs or per-org UUIDs, fully portable across organizations
- [x] **EXP-04**: Exported JSON includes a `language` field indicating the template content language
- [x] **EXP-05**: Exported JSON captures all question metadata: `scoreWeight`, `answerConfig`, conditional logic, section structure

### Import

- [ ] **IMP-01**: Admin or manager can import a template by uploading a `.json` file
- [ ] **IMP-02**: Before confirming import, user sees a preview: template name, section count, question count, question type breakdown
- [ ] **IMP-03**: If the JSON `language` field doesn't match the company's content language, user sees a language mismatch warning before proceeding
- [ ] **IMP-04**: If a template with the same name already exists, user is offered: rename, create as copy, or cancel
- [ ] **IMP-05**: Import validation reports detailed, field-specific errors (e.g., "Question 3, field `answerType`: invalid value `checkbox`") -- not a generic error toast

### In-app AI Generator

- [ ] **AIGEN-01**: Admin or manager can open a "Generate with AI" flow, describe their team and meeting goals in plain language, and receive a generated template draft
- [ ] **AIGEN-02**: Generated template is shown in a preview (name, section count, question breakdown) for review before saving -- user can accept, edit, or discard
- [ ] **AIGEN-03**: AI generates all question text, help text, and section names in the company's content language
- [ ] **AIGEN-04**: AI generation uses the JSON schema, core methodology principles, and weight system as context

### DIY Prompt Kit

- [ ] **DIY-01**: User can access and copy a "prompt kit" -- JSON schema + methodology principles + worked example -- formatted for use with external AI tools (Claude, ChatGPT, etc.)
- [ ] **DIY-02**: Prompt kit narrative and examples are rendered in the company's content language (JSON schema itself remains in English)

## Future Requirements

### Additional Languages

- **LANG-01**: Support for additional languages beyond EN + RO
- **LANG-02**: RTL layout support for Arabic/Hebrew languages
- **LANG-03**: Translation management platform integration (Crowdin, Lokalise)

### Advanced i18n

- **ADV-01**: Multi-language questionnaire templates (same template in multiple languages)
- **ADV-02**: Machine translation of user-generated content

### Template Translation

- **TMTR-01**: Auto-translate an imported template from its source language to the company's content language with cultural adaptation (not just literal translation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-language questionnaire templates | Questionnaires defined in company language; no per-template translation needed |
| RTL layout support | Neither English nor Romanian requires RTL |
| Translation management platform | Overkill at 2 languages; JSON files in repo reviewed in PRs |
| Additional languages beyond EN + RO | Revisit on user demand |
| Machine translation of user content | Privacy and quality concerns |
| URL-based locale routing | Locale driven by user/company settings, not URL prefixes |
| Public template marketplace | URL-based sharing -- future milestone |
| Schema version migration | Fail with clear version mismatch message; no auto-migration |
| Bulk export (all templates) | Single export covers primary use case; defer to future |
| Auto-translate on import | Cultural adaptation requires careful design; defer to future (TMTR-01) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 11 | Complete |
| INFRA-02 | Phase 11 | Complete |
| INFRA-03 | Phase 11 | Complete |
| INFRA-04 | Phase 11 | Complete |
| INFRA-05 | Phase 11 | Complete |
| UITR-01 | Phase 12 | Complete |
| UITR-02 | Phase 12 | Complete |
| UITR-03 | Phase 12 | Complete |
| UITR-04 | Phase 12 | Complete |
| UITR-05 | Phase 12 | Complete |
| UITR-06 | Phase 12 | Complete |
| UITR-07 | Phase 12 | Complete |
| UITR-08 | Phase 12 | Complete |
| UITR-09 | Phase 12 | Complete |
| UITR-10 | Phase 12 | Complete |
| FMT-01 | Phase 12 | Complete |
| FMT-02 | Phase 12 | Complete |
| FMT-03 | Phase 12 | Complete |
| FMT-04 | Phase 12 | Complete |
| VALD-01 | Phase 12 | Complete |
| VALD-02 | Phase 12 | Complete |
| MAIL-01 | Phase 13 | Complete |
| MAIL-02 | Phase 13 | Complete |
| ROLN-01 | Phase 14 | Complete |
| ROLN-02 | Phase 14 | Complete |
| ROLN-03 | Phase 14 | Complete |
| ROLN-04 | Phase 14 | Complete |
| QUAL-01 | Phase 14 | Complete |
| QUAL-02 | Phase 14 | Complete |
| SPEC-01 | Phase 15 | Complete |
| SPEC-02 | Phase 15 | Complete |
| SPEC-03 | Phase 15 | Complete |
| EXP-01 | Phase 15 | Complete |
| EXP-02 | Phase 15 | Complete |
| EXP-03 | Phase 15 | Complete |
| EXP-04 | Phase 15 | Complete |
| EXP-05 | Phase 15 | Complete |
| IMP-01 | Phase 16 | Pending |
| IMP-02 | Phase 16 | Pending |
| IMP-03 | Phase 16 | Pending |
| IMP-04 | Phase 16 | Pending |
| IMP-05 | Phase 16 | Pending |
| AIGEN-01 | Phase 17 | Pending |
| AIGEN-02 | Phase 17 | Pending |
| AIGEN-03 | Phase 17 | Pending |
| AIGEN-04 | Phase 17 | Pending |
| DIY-01 | Phase 17 | Pending |
| DIY-02 | Phase 17 | Pending |

**Coverage:**
- v1.1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

**Coverage (v1.2):**
- v1.2 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-07 after v1.2 roadmap created (phases 15-17 finalized)*
