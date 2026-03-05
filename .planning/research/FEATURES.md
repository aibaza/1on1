# Feature Landscape: i18n (English + Romanian)

**Domain:** Internationalization for a SaaS 1:1 meeting management platform
**Researched:** 2026-03-05
**Confidence:** HIGH (well-established patterns, next-intl is mature, existing codebase already has partial i18n infrastructure)

## Dual-Layer Language Model

This product requires two distinct language layers that operate independently:

### Layer 1: UI Language (per-user preference)
Controls the interface chrome -- navigation labels, button text, form labels, tooltips, error messages, placeholder text, status badges, date/number formatting. Each user picks their own UI language. Stored on the user record (new `locale` column on the `user` table). Defaults to browser locale detection on first visit, then persisted via cookie and synced to DB on login.

### Layer 2: Content Language (per-company setting)
Controls generated/system content that the entire organization sees together: AI summaries, AI nudges, AI action item suggestions, email notifications (invites, reminders, session summaries), and system-generated text in shared contexts. Already partially implemented via `tenant.settings.preferredLanguage` and the `withLanguageInstruction()` helper in `src/lib/ai/service.ts`.

**Key insight:** These layers are orthogonal. A Romanian user at a Romanian company sees Romanian UI + Romanian AI content. An English-speaking expat at the same company sees English UI + Romanian AI content (because AI summaries are shared across the org and need to be in one language everyone can read in context).

---

## Table Stakes

Features users expect from any i18n implementation. Missing any of these = broken or confusing experience.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| UI string extraction to translation files | Foundation of all i18n; without it nothing else works | HIGH (265 source files, mechanical but large scope) | None | ~265 .ts/.tsx files need audit. Estimate ~100-150 have user-facing strings requiring extraction. Use next-intl message keys in namespaced JSON files |
| Language switcher in user menu | Users must be able to change their UI language | LOW | User DB schema update (add `locale` column) | Place in the existing user-menu dropdown (top-right). No separate settings page needed for this alone |
| Browser locale auto-detection | First-time users should see their language without manual configuration | LOW | next-intl middleware | Use `Accept-Language` header via next-intl's `negotiateLocale`, fall back to `en`. Set cookie on detection |
| Date formatting (locale-aware) | "Mar 5, 2026" vs "5 mar. 2026" -- wrong format feels foreign and breaks scanning | LOW | next-intl `useFormatter()` | Currently dates are formatted ad-hoc across ~30-40 components via `toLocaleDateString()` or template literals. Centralize via next-intl `format.dateTime()` |
| Number formatting (locale-aware) | Decimal separators (1,234.56 vs 1.234,56), percentages | LOW | next-intl `useFormatter()` | Analytics charts, session scores, percentages throughout the app |
| Relative time formatting | "3 days ago", "in 2 hours" in user's locale | LOW | next-intl `format.relativeTime()` | Dashboard upcoming sessions, session history, action item due dates, "overdue by X days" |
| Pluralization rules | "1 session" vs "2 sessions" -- Romanian has 3 plural forms unlike English's 2 | MEDIUM | next-intl ICU message syntax | Romanian pluralization is non-trivial: `{count, plural, one {# sesiune} few {# sesiuni} other {# de sesiuni}}`. Must use ICU MessageFormat, not naive string concatenation |
| Email notifications in content language | Emails are org-shared content; must match company language so all recipients can read them | MEDIUM | React Email templates, `use-intl/core` `createTranslator` | 6 email templates exist (invite, verification, password-reset, pre-meeting-reminder, agenda-prep, session-summary). Each needs locale-aware rendering. Official next-intl + React Email integration pattern exists |
| AI content in content language | AI summaries, nudges, suggestions in company's preferred language | ALREADY DONE | Already implemented in `src/lib/ai/service.ts` | `withLanguageInstruction()` appends "Respond entirely in [Language]" to system prompts. Verify edge cases and add tests |
| Error messages translated | Validation errors, API errors, toast notifications | MEDIUM | Zod custom error maps, API error response handler | Zod supports `z.setErrorMap()` for custom translated messages. API routes need a centralized error response helper that translates |
| Auth pages translated | Login, register, forgot password, invite acceptance, email verification, password reset | MEDIUM | 6 auth page components under `src/app/(auth)/` | Public-facing pages -- important for first impression. These are the first screens new users see |
| Command palette labels translated | Existing command palette (Cmd+K) has hardcoded English labels | LOW | Depends on how commands are registered | Static command list should use translation keys |

## Differentiators

Features that set the product apart. Not expected in every SaaS i18n implementation, but create a polished, premium feel.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| Per-user UI language independent of company language | Each team member sees the UI in their preferred language, regardless of what language the company operates in. Rare in HR/meeting SaaS -- most only offer per-org language | LOW (architectural decision) | Clear separation between `t()` for UI strings and `tenant.settings.preferredLanguage` for content | Competitive advantage for international teams (e.g., a Romanian company with a German developer sees German UI but Romanian AI summaries) |
| Content language clearly separated from UI language | Manager in Berlin (German UI) reads AI summary in Romanian (company language). No confusion about which content is shared vs personal | LOW (architecture) | Dual-layer model documented and enforced | Most SaaS products conflate UI language and content language. Separating them avoids the "my AI summary language changed when I changed my UI language" bug |
| Locale-aware analytics charts | Chart axis labels, tooltips, legends all in user's language; number formatting matches locale (comma vs period for decimals) | MEDIUM | Recharts customization, next-intl formatters passed to chart config | ~8 chart components (score-trend, category-radar, team-heatmap, adherence, velocity, session-comparison, etc.) currently use hardcoded English text |
| Language preference persisted to DB | Stored in user record, not just a browser cookie. Logging in on a new device or clearing cookies preserves the preference | LOW | Already have user DB record; just add `locale` varchar column | Cookie-only approaches lose preference when users switch devices. DB-backed preference with cookie as cache is the right pattern |
| Instant language switch without page reload | Changing language in user menu immediately updates all visible UI strings | MEDIUM | next-intl's `useTranslations` reactivity, cookie update + router.refresh() | Creates a premium feel. Most i18n implementations require a full page reload |

## Anti-Features

Features to explicitly NOT build. These are tempting but wrong for this scope (2 languages, B2B SaaS).

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-language questionnaire templates | Enormous complexity: N templates x M languages, unclear UX for the template builder, unclear which language version to show in which context. Questionnaires are already authored per-company in the company's language | Admins write templates in their company's content language. Period. If a company operates in Romanian, their questionnaire text is in Romanian. No translation layer on templates |
| URL-based locale routing (`/en/dashboard`, `/ro/dashboard`) | This is a B2B SaaS behind auth, not a public content site. URL locales add routing complexity (wrapping entire app in `[locale]` segment), break existing bookmarks, require rewriting all `Link` components, and provide zero SEO benefit since the app is behind login | Cookie/DB-based locale via next-intl's non-routing mode. No `[locale]` path segment. Locale determined from user session, not URL |
| RTL layout support (Arabic, Hebrew) | Not needed for EN + RO (both LTR). RTL adds CSS complexity (logical properties, mirrored layouts, testing surface area). Architecture should not block future RTL, but do not implement or test it | Use CSS logical properties where convenient (`ps-4` instead of `pl-4` in new code), but do not add `dir="rtl"` support, RTL-specific styles, or RTL testing |
| Machine translation of user-generated content | Translating notes, talking points, action item text between languages creates privacy concerns, accuracy issues ("he" vs "she" in gendered languages), and unclear content ownership | Users write in whatever language they choose. Shared notes stay as-written. The content language only controls system-generated content (AI, emails) |
| Translation management platform (Crowdin, Phrase, Lokalise) | Over-engineering for 2 languages and ~500-800 translation keys. TMS platforms shine at 10+ languages with external translator teams | JSON files in the repo (`messages/en.json`, `messages/ro.json`). Manual editing by the development team. Re-evaluate when adding a 4th+ language |
| Per-user content language override | A user wanting AI summaries in a different language than the company breaks the "shared content in one language" model. If an AI summary is in Romanian for user A but English for user B, which version gets stored? | Content language is per-company only. Users who want the UI in a different language get that via the UI language layer. Content stays in the company's language |
| Dynamic/lazy translation loading | With 2 languages and ~500-800 keys, the translation JSON is likely <50KB per locale. Code-splitting translations adds complexity (loading states, race conditions) for negligible bundle impact | Bundle both locale JSON files statically. Server Components render translations server-side (zero client cost). Client Components receive only the active locale's messages via `NextIntlClientProvider` |
| Translating database-stored content (team names, labels, etc.) | User-created data (team names, action item titles, labels) is in whatever language users typed. Translating it is AI translation territory with quality and consistency issues | Database content stays as-entered. Only system-generated strings (AI output, email body text, notification text) follow the content language setting |

## Feature Dependencies

```
[next-intl setup + config]
    |
    +--> [Translation JSON files (messages/en.json, messages/ro.json)]
    |        |
    |        +--> [UI string extraction - layout components] (establishes pattern)
    |        |        |
    |        |        +--> [UI string extraction - dashboard pages]
    |        |        +--> [UI string extraction - auth pages]
    |        |        +--> [UI string extraction - session wizard]
    |        |        +--> [UI string extraction - analytics/charts]
    |        |
    |        +--> [Pluralization rules (ICU MessageFormat)]
    |        +--> [Error message translation (Zod + API)]
    |        +--> [Command palette i18n]
    |
    +--> [Date/number/relative time formatting]
    |        |
    |        +--> [Analytics chart label i18n]
    |
    +--> [Browser locale auto-detection (middleware)]
    |
    +--> [User locale column (DB migration)]
             |
             +--> [Language switcher in user menu]
             +--> [Language preference synced to DB]

[Email template i18n] (independent track)
    |-- requires --> [Translation JSON files]
    |-- uses --> [use-intl/core createTranslator]
    |-- reads --> [tenant.settings.preferredLanguage] (already exists)

[AI content language] (already implemented)
    |-- verify --> [Edge cases, test coverage]
    |-- reads --> [tenant.settings.preferredLanguage] (already exists)

Questionnaire content --> NO WORK NEEDED (admin-authored in company language)
```

**Critical path:** next-intl setup --> translation files --> string extraction. Everything else can proceed in parallel once the infrastructure is in place.

**Independent tracks that can run in parallel after infrastructure:**
1. UI string extraction (the bulk effort)
2. Email template i18n
3. Date/number formatting centralization
4. AI content language verification

## Existing Infrastructure (Already Built)

These elements already exist in the codebase and should be leveraged, not rebuilt:

| Element | Location | Status | i18n Impact |
|---------|----------|--------|-------------|
| Company preferred language setting | `tenant.settings.preferredLanguage` (JSONB) | Working | Content language source -- use as-is |
| Company language UI in settings | `src/app/(dashboard)/settings/company/company-settings-form.tsx` | Working | Already has language dropdown with EN, RO, DE, FR, ES, PT options |
| AI language instruction | `src/lib/ai/service.ts` `withLanguageInstruction()` | Working | Appends language instruction to LLM system prompts. Verify, add tests, no rebuild needed |
| Language name mapping | `src/lib/ai/service.ts` `LANGUAGE_NAMES` | Working | Maps `en`->`English`, `ro`->`Romanian`, etc. Reuse across email i18n |
| 6 email templates | `src/lib/email/templates/` | Working | Need i18n wrapping with `createTranslator` |
| User menu component | `src/components/layout/user-menu.tsx` | Working | Add language switcher here |

## MVP Recommendation

### Priority 1: Infrastructure (do first, everything depends on it)
1. Install next-intl, configure in non-routing mode (cookie-based locale)
2. Create `messages/en.json` with namespaced keys
3. Add `locale` column to users table (DB migration)
4. Update middleware for locale detection
5. Wrap root layout with `NextIntlClientProvider`

### Priority 2: Core UI Extraction (largest effort, parallelize)
6. Extract strings from layout components (sidebar, top-nav, user-menu, breadcrumbs) -- establishes the pattern
7. Build language switcher in user menu
8. Extract strings from auth pages (login, register, invite, etc.)
9. Extract strings from dashboard pages (overview, sessions, people, teams, templates)
10. Extract strings from session wizard (most complex UI)
11. Extract strings from analytics pages and chart components
12. Extract strings from settings pages

### Priority 3: Formatting + Content Layer
13. Centralize date/number/relative time formatting via next-intl formatters
14. Email template i18n using `createTranslator` from `use-intl/core`
15. Translate error messages (Zod error maps + API error responses)
16. Command palette label i18n

### Priority 4: Romanian Translations + Polish
17. Create `messages/ro.json` with all Romanian translations (including proper 3-form pluralization)
18. Verify AI content language with Romanian test cases
19. QA: switch between EN/RO on every screen, verify no missing keys or layout breaks
20. Handle edge cases: longer Romanian strings that might break layouts (Romanian text is typically 15-25% longer than English)

**Defer:**
- Additional languages beyond EN/RO -- add when there is user demand
- RTL support -- not needed for current language pair
- TMS integration -- overkill for 2 languages
- Questionnaire template translation -- by design, not needed

## Effort Estimate

| Area | Files Affected | Estimated Effort | Notes |
|------|---------------|-----------------|-------|
| next-intl setup + config | ~5 new files + middleware update | 2-3 hours | `i18n/request.ts`, provider in layout, TypeScript config |
| Translation JSON files | 2 files (en.json, ro.json) | Ongoing with extraction | Start with ~50 keys, grow to ~500-800 as extraction progresses |
| DB migration (user locale) | 1 migration + schema update | 30 minutes | Add `locale varchar` to users table |
| Language switcher UI | 2-3 files | 1-2 hours | User menu dropdown + API to update user locale |
| String extraction (~150 files) | ~100-150 files with user-facing strings | 2-3 days | Largest single effort. Mechanical but requires judgment on key naming |
| Date/number formatting centralization | ~30-40 files | 4-6 hours | Find all date/number renders, replace with next-intl formatters |
| Email template i18n | 6 templates + translation keys | 4-6 hours | Each template gets `createTranslator` integration |
| Error message i18n | ~20-30 files | 3-4 hours | Zod schemas, API route error responses, toast messages |
| Analytics chart i18n | ~8 chart components | 2-3 hours | Recharts label/tooltip/legend customization |
| Command palette i18n | 1-2 files | 30 minutes | Replace hardcoded command labels with translation keys |
| Romanian translations | 1 file (ro.json) | 4-6 hours | Translate ~500-800 keys including pluralization forms |
| Testing + QA | All screens | 1 day | Systematic EN/RO switching on every page |
| **Total** | | **~5-7 working days** | For a single developer including Romanian translations |

## String Volume Estimate by Area

| Area | Estimated Keys | Complexity | Notes |
|------|---------------|------------|-------|
| Layout (sidebar, nav, menu) | ~30 | Low | Short labels, stable |
| Auth pages | ~60 | Low | Form labels, headings, messages |
| Dashboard/overview | ~40 | Medium | Dynamic text with interpolation |
| Sessions (list, detail, new) | ~50 | Medium | Status labels, form fields |
| Session wizard | ~80 | High | Question types, wizard flow, context panel, many states |
| People/teams | ~40 | Low | CRUD forms, table headers |
| Templates | ~50 | Medium | Builder UI, question type labels |
| Analytics | ~60 | Medium | Chart labels, tooltips, metric names |
| Settings | ~30 | Low | Form labels, descriptions |
| Action items | ~30 | Low | Status labels, form fields |
| Error messages | ~60 | Medium | Validation, API errors, toast |
| Email templates | ~80 | Medium | Full sentences, subject lines |
| Common/shared | ~40 | Low | "Save", "Cancel", "Delete", "Loading...", etc. |
| **Total** | **~650** | | Rough estimate, actual may vary +/-20% |

## Sources

- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router) -- HIGH confidence, official docs
- [next-intl non-routing mode](https://next-intl.dev/docs/routing) -- HIGH confidence, official docs
- [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration) -- HIGH confidence, official docs
- [next-intl request configuration](https://next-intl.dev/docs/usage/configuration) -- HIGH confidence, official docs
- [React Email + next-intl integration example](https://github.com/resend/react-email-next-intl-example) -- HIGH confidence, official Resend repository
- [next-intl vs next-i18next comparison (2026)](https://intlpull.com/blog/next-intl-complete-guide-2026) -- MEDIUM confidence, third-party guide
- [Complete guide to i18n in Next.js 15 with next-intl](https://dev.to/mukitaro/a-complete-guide-to-i18n-in-nextjs-15-app-router-with-next-intl-supporting-8-languages-1lgj) -- MEDIUM confidence, community guide
- [SaaS localization strategy guide](https://simplelocalize.io/blog/posts/localization-strategy-guide/) -- MEDIUM confidence
- [SaaS internationalization technical guide](https://www.linguise.com/blog/guide/saas-platform-internationalization-a-step-by-step-technical-implementation-guide/) -- MEDIUM confidence
- [Non-URL locale routing discussion (next-intl #366)](https://github.com/amannn/next-intl/issues/366) -- HIGH confidence, GitHub issue with maintainer responses
- Existing codebase analysis (`src/lib/ai/service.ts`, `src/app/(dashboard)/settings/company/`, schema files) -- HIGH confidence, direct inspection

---
*Feature landscape for: i18n (English + Romanian) milestone*
*Researched: 2026-03-05*
