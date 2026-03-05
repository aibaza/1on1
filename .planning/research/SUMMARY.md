# Project Research Summary

**Project:** 1on1 — i18n Milestone (English + Romanian)
**Domain:** Internationalization retrofit for existing Next.js App Router SaaS
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

Adding internationalization to a live B2B SaaS product is fundamentally different from building i18n into a greenfield app. The 1on1 codebase has ~265 source files, 106 client components, and 41K+ LOC of hardcoded English strings that all require systematic extraction. The recommended approach centers on **next-intl v4** in "without i18n routing" mode — locale stays out of URLs entirely, is resolved from a cookie backed by the authenticated user's DB preference, and cascades through the Next.js App Router's server/client component boundary without restructuring any existing routes.

The most important architectural decision is maintaining two independent language layers: **UI language** (per-user, drives all interface strings via `t()`) and **content language** (per-company, already partially built, drives AI output and emails via `tenant.settings.preferredLanguage`). These layers are orthogonal by design — an English-speaking member at a Romanian company sees English buttons but Romanian AI summaries. Conflating them at any point causes subtle, hard-to-debug language bugs across features. This separation must be designed and enforced before any string extraction begins.

The key risks are scope creep from incomplete extraction (the largest time sink, ~60-70% of total effort), Romanian-specific grammar complexity (three CLDR plural forms, not two), and hydration mismatches from locale-dependent rendering. All three are preventable with the right tooling: a codemod for bulk extraction, ICU MessageFormat for pluralization, and exclusive use of next-intl's formatting APIs (never raw `Intl` directly). The AI content language layer already exists and works — it needs testing and edge-case hardening, not rebuilding.

---

## Key Findings

### Recommended Stack

The entire i18n implementation requires one new dependency: `next-intl@^4.8` (single `bun add next-intl`). It is purpose-built for Next.js App Router with native RSC support, ~2KB client bundle, ICU message format for Romanian pluralization, and TypeScript-typed translation keys via `AppConfig`. No date library (date-fns, dayjs) is needed — next-intl wraps the browser-native `Intl` API for locale-aware date, number, and relative time formatting. No translation management system (Crowdin, Lokalise) is warranted at two languages; JSON files in the repo reviewed in PRs is the correct approach at this scale.

**Core technologies:**
- `next-intl@^4.8`: UI string translations, date/number formatting, Server and Client Component i18n — only Next.js-native library with full App Router support and "without routing" mode
- `messages/{locale}.json`: Single JSON file per locale, ~650-800 keys, namespaced to match route structure — native next-intl format, TypeScript type-inferrable, no build step
- `middleware.ts` (new): Locale cookie management via Auth.js v5 `auth()` wrapper — zero DB calls, reads locale from JWT, sets `NEXT_LOCALE` cookie; `Accept-Language` fallback for unauthenticated visitors
- `src/i18n/request.ts` (new): next-intl request config, resolves locale from cookie per-request, single source of truth for server-side locale
- `src/lib/email/i18n.ts` (new): Standalone email translator using direct JSON import, works outside the Next.js request lifecycle (required for Inngest jobs and notification services)

### Expected Features

**Must have (table stakes):**
- UI string extraction across all ~265 source files — foundation; without it nothing else works
- Language switcher in user menu — users must be able to change their UI language
- Browser locale auto-detection (`Accept-Language` header) for unauthenticated pages
- Locale-aware date formatting — Romanian uses DD.MM.YYYY and 24-hour time, not US format
- Locale-aware number formatting — decimal/thousands separators differ (1.234,56 vs 1,234.56)
- Relative time formatting — "3 days ago" / "peste 3 zile" in user's locale
- Romanian pluralization (3 CLDR forms: `one`, `few`, `other`) — grammatically required
- Email templates in correct language — invite, summary, and transactional emails per recipient
- Translated error messages — Zod validation errors and API errors must reflect UI locale
- Auth pages translated — first impression for new users

**Should have (differentiators):**
- Per-user UI language independent of company content language — rare in HR/meeting SaaS
- Instant language switch without full page reload — premium feel via `router.refresh()`
- Locale-aware analytics chart labels, tooltips, and axis formatting
- Language preference persisted to DB — survives cookie clear and new devices
- CI lint checking for translation key parity between `en.json` and `ro.json`

**Defer (not in this milestone):**
- Additional languages beyond EN + RO — revisit on user demand
- RTL layout support — not applicable to either current language
- Translation management platform (Crowdin, Lokalise) — overkill at 2 languages
- Multi-language questionnaire templates — by design not needed; admins author in company language
- Machine translation of user-generated content — privacy and quality concerns

### Architecture Approach

The implementation follows next-intl's "without i18n routing" pattern: locale is stored in a `NEXT_LOCALE` cookie, set by middleware from the authenticated user's JWT (which carries the DB-stored `language` field) or from `Accept-Language` for unauthenticated visitors. `src/i18n/request.ts` reads the cookie once per server request and passes locale + messages to the root layout, which wraps children in `NextIntlClientProvider`. Server Components use `await getTranslations('namespace')` with zero client bundle cost; Client Components use `useTranslations('namespace')` via React context. Email translation uses a standalone `createEmailTranslator()` function that imports message JSON files directly, bypassing the Next.js request lifecycle. The AI content language layer (`tenant.settings.preferredLanguage` + `withLanguageInstruction()`) remains unchanged and independent.

**Major components:**
1. `src/i18n/request.ts` — resolves UI locale per-request from cookie; single source of truth for server-side locale
2. `NextIntlClientProvider` (root layout) — propagates locale + messages to all Client Components via React context
3. `messages/{locale}.json` — single translation file per locale with namespace-based key structure (common, nav, auth, dashboard, session, people, templates, analytics, settings, validation, emails)
4. `middleware.ts` — sets `NEXT_LOCALE` cookie from JWT (authenticated) or `Accept-Language` (unauthenticated); wraps Auth.js v5 `auth()` for zero DB cost
5. `src/lib/email/i18n.ts` — standalone translator for email templates called from Inngest jobs
6. `users.language` DB column — persists UI language preference; included in JWT to avoid DB calls per request

### Critical Pitfalls

1. **Incomplete string extraction produces a patchwork experience** — 265 files, 41K+ LOC. Prevention: use codemod for bulk pass, add `eslint-plugin-i18next` to flag new hardcoded strings, run the app in Romanian to spot missing translations visually. Budget 60-70% of total i18n effort for this step alone.

2. **Conflating UI language with content language causes subtle, pervasive bugs** — the `t()` function always follows `uiLocale`; AI prompts and email content follow `contentLocale`. These must be two named concepts in the codebase before any code is written. Designing this correctly in the first phase prevents rewrites in every subsequent phase.

3. **Romanian has three plural forms, not two** — `one` (1), `few` (0, 2-19, 101-119), `other` (20-99, round hundreds). The `other` form adds a "de" particle that changes sentence structure entirely. Prevention: ICU MessageFormat from the start; test with values 0, 1, 2, 5, 19, 20, 21, 100, 101; native speaker review.

4. **Hydration mismatches from locale-dependent rendering** — Server renders with one locale, client hydrates with another, React throws. Prevention: use next-intl formatters exclusively (never raw `Intl` calls); set timezone explicitly in `i18n/request.ts`; ensure `NEXT_LOCALE` cookie arrives before SSR.

5. **Romanian text is 15-30% longer than English, breaking fixed-width layouts** — sidebar navigation labels, button text, table column headers, and wizard step labels are most at risk. Prevention: pseudo-localization testing before real translations arrive; use `min-width` not `width`; test sidebar in both collapsed and expanded states.

---

## Implications for Roadmap

The implementation has a clear critical path: infrastructure must be in place before any string extraction can be tested, and the dual-layer language model must be locked before any extraction work begins. String extraction is the dominant effort and should start immediately after infrastructure is confirmed working end-to-end. Several phases can run in parallel once the infrastructure is stable.

### Phase 1: Foundation and Infrastructure
**Rationale:** Everything else depends on this. next-intl must be installed and wired up before any string extraction can be tested. The dual-layer architecture decision (UI locale vs content locale) must be locked before any work begins — it infects every subsequent phase.
**Delivers:** Working i18n pipeline end-to-end — locale resolves correctly for authenticated and unauthenticated users, Server and Client Components can use `t()`, translation fallback behavior configured, cookie sync correct on login and settings change.
**Addresses:** next-intl setup, locale resolution, DB schema migration, JWT extension, middleware creation.
**Avoids:** Pitfall 2 (dual-language confusion — design before coding), Pitfall 13 (cookie sync — bake in from the start), Pitfall 4 (hydration — set up formatters before any date/number work).
**Work:** Install next-intl; create `src/i18n/request.ts`; create `messages/en.json` with initial namespaces (common, nav); create `messages/ro.json` as copy; DB migration to add `users.language`; update Auth.js JWT/session callbacks; create `middleware.ts`; update `next.config.ts` with plugin; update root layout with `NextIntlClientProvider`.
**Research flag:** Standard patterns — skip additional research.

### Phase 2: Root Layout Integration and Pattern Validation
**Rationale:** Before extracting 100+ components, validate the full server-to-client translation pipeline works correctly in this specific codebase. Catch integration issues with existing ThemeProvider, Auth.js session handling, and route groups before they multiply across the codebase.
**Delivers:** End-to-end proof that Server Component `getTranslations()` and Client Component `useTranslations()` both resolve the correct locale. Namespace structure locked. Pattern established for all subsequent component extraction.
**Addresses:** Navigation and layout components (sidebar, top-nav, user-menu) — highest reuse leverage; establishes key naming conventions.
**Avoids:** Pitfall 12 (missing `setRequestLocale` — caught here before it propagates), Pitfall 8 (key organization — namespace structure locked before bulk extraction begins).
**Research flag:** Standard patterns — skip additional research.

### Phase 3: Shared Components and Auth Pages
**Rationale:** Shared components (buttons, badges, status labels, form scaffolding) are referenced by every feature area. Extracting them first means all subsequent extraction work inherits correct translations rather than needing double-passes. Auth pages are first-impression screens for new users.
**Delivers:** `common` and `nav` namespaces fully populated; auth pages (login, register, invite, forgot-password, email verification, password reset) fully translated; language switcher added to user menu with API and JWT refresh flow.
**Addresses:** Auth page translation, command palette i18n, shadcn/ui component string audit.
**Avoids:** Pitfall 16 (hardcoded strings in shadcn/ui components), Pitfall 1 (incomplete extraction — by completing shared components before feature work).
**Research flag:** Standard patterns — skip additional research.

### Phase 4: Feature Component String Extraction (Bulk Work)
**Rationale:** This is the largest phase by volume — ~100-150 files with user-facing strings. Parallelizable across feature areas: dashboard, session wizard, people/teams, templates, analytics, settings, series, action items, history. The session wizard is the most complex (~20 components, many states, ~80 translation keys).
**Delivers:** All UI strings extracted to translation files for all feature areas. App renders without hardcoded English regardless of locale setting.
**Addresses:** Dashboard, sessions, people, teams, templates, analytics, settings, action items, history namespaces (~500+ keys total).
**Avoids:** Pitfall 1 (incomplete extraction — systematic file-by-file approach), Pitfall 8 (key naming convention — follows structure from Phase 2).
**Research flag:** Standard patterns — no additional research needed.

### Phase 5: Date, Number, and Formatting Migration
**Rationale:** Locale-aware formatting is independent of string extraction but affects many of the same files. Batching it separately avoids over-complicating the extraction passes. ~30-40 files have ad-hoc `toLocaleDateString()`, `Intl.DateTimeFormat`, or manual format calls that must be replaced with next-intl formatters.
**Delivers:** All dates display as DD.MM.YYYY in Romanian; all numbers use comma decimals; all relative times ("2 hours ago" / "acum 2 ore") respect locale; analytics chart axes formatted correctly.
**Addresses:** Date formatting, number formatting, relative time formatting, analytics chart i18n.
**Avoids:** Pitfall 4 (hydration mismatches — next-intl formatters guarantee server/client consistency), Pitfall 14 (date/number format inconsistencies).
**Research flag:** Standard patterns — skip additional research.

### Phase 6: Email Template Translation
**Rationale:** Email templates render outside the Next.js request lifecycle (called from Inngest jobs and notification services). They need a purpose-built translation approach that cannot use `useTranslations()` or `getTranslations()`. This is an independent track that can overlap with Phase 4-5.
**Delivers:** All 6+ email templates (invite, verification, password-reset, pre-meeting-reminder, agenda-prep, session-summary) render in correct language for recipient. Invite emails follow company `contentLocale`; transactional emails follow recipient `uiLocale`; summary emails mix both per documented rules.
**Addresses:** Email template i18n, notification service locale plumbing, `src/lib/email/i18n.ts` creation.
**Avoids:** Pitfall 5 (email rendered in wrong language — explicit locale parameter on every email function).
**Research flag:** Standard patterns — skip additional research.

### Phase 7: Validation Errors, AI Content Hardening, and Polish
**Rationale:** Final integration pass covering the remaining surface areas. Zod error messages are structurally different from UI string extraction (require UI-layer mapping, not schema-level changes). AI content language needs edge-case testing and explicit locale parameter threading, not rebuilding.
**Delivers:** Form validation errors translated in all locales; AI summaries reliably in company language for mixed-language sessions; Zod error utility in shared `<FormMessage>` component; translation fallback behavior confirmed (English fallback, no raw key exposure in production); CI key-parity check between `en.json` and `ro.json`.
**Addresses:** Zod validation translation, AI content language verification, missing key fallback, CI lint.
**Avoids:** Pitfall 10 (Zod messages in English), Pitfall 9 (AI language inconsistency), Pitfall 11 (missing translation fallback shows raw keys).
**Research flag:** Standard patterns — no additional research needed.

### Phase 8: Romanian Translations and QA
**Rationale:** Romanian translations should be authored after all English keys are locked — translating against a moving target wastes effort. This phase is a content/translation task with a final QA pass covering every screen in both locales.
**Delivers:** Complete `messages/ro.json` with all ~650-800 keys including correct Romanian plural forms (one/few/other) and correct diacritics (comma-below U+0219/U+021B, not cedilla); visual QA pass on every screen in both locales; layout polish for text overflow; diacritic CI check added.
**Addresses:** Romanian pluralization, diacritic correctness, text overflow in fixed-width layouts.
**Avoids:** Pitfall 3 (Romanian plural rules — ICU MessageFormat + values 0/1/2/5/19/20/21/100 test suite), Pitfall 6 (diacritic corruption), Pitfall 7 (text length overflow — layout polish pass with real strings).
**Research flag:** Romanian plural forms are well-documented via CLDR. No additional research needed. Native speaker review recommended for translation quality.

### Phase Ordering Rationale

- Phase 1 is a hard dependency for everything — no extraction can be validated without the infrastructure.
- Phase 2 validates integration before scaling to 100+ files — cheap insurance against hidden issues with ThemeProvider, Auth.js route groups, and the existing component tree.
- Phase 3 before Phase 4 because shared components are referenced by all feature components. Extracting in the wrong order means re-opening files.
- Phase 4 is intentionally standalone and large — it can be executed by feature area (wizard, dashboard, analytics, etc.) in sub-sprints, or parallelized across developers.
- Phases 5 and 6 can overlap with Phase 4 — they touch different concerns in largely the same files.
- Phases 7 and 8 are last because they require all English keys to be finalized before validation or translation begins.

### Research Flags

All phases use well-documented patterns from next-intl official documentation. No phase requires a dedicated research sprint before implementation. The official docs cover every integration point: App Router, email templates outside React context, JWT-based locale, cookie-based routing.

The one validation step worth doing before Phase 4 begins: run `next-bundle-analyzer` after Phase 2 to confirm that passing all messages to `NextIntlClientProvider` keeps the client bundle within acceptable bounds (~15-25KB expected). If it exceeds 50KB, namespace-scoped message passing becomes warranted before extracting 500+ more keys.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | next-intl official docs verified; version compatibility confirmed against Next.js 16.x, React 19.2, TypeScript 5; npm download statistics confirmed; no viable competing library for this use case |
| Features | HIGH | Existing codebase analyzed directly; feature list derived from actual files present; dual-layer architecture confirmed from live code in `src/lib/ai/service.ts` and `src/app/(dashboard)/settings/company/`; effort estimates grounded in file counts |
| Architecture | HIGH | All integration patterns verified against official next-intl docs; existing `src/lib/auth/config.ts`, `src/lib/ai/pipeline.ts`, and email template structure inspected directly; code samples provided in research files are ready to use |
| Pitfalls | HIGH | Romanian plural rules from CLDR (authoritative Unicode consortium); diacritic issues from Debian i18n wiki; hydration and extraction pitfalls from official next-intl docs and maintainer GitHub responses; bundle size verified against next-intl architecture docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Romanian translation quality:** The engineering approach is clear, but actual Romanian translation quality requires a native speaker. The plural forms are mechanically specified (ICU MessageFormat), but natural phrasing, tone consistency, and "de" particle placement in `other` forms need human review. Plan for native speaker review in Phase 8.
- **Text overflow specifics:** Romanian translations are estimated at 15-30% longer, but actual overflow spots cannot be identified until real translations are in. Phase 8 must include a dedicated layout polish pass using real Romanian strings, not pseudo-localization alone.
- **Inngest job locale context:** Background jobs (Inngest) may run without a request context. The email i18n approach handles this via direct JSON import, but any Inngest job that renders UI-facing content (e.g., nudge generation) needs the company's `contentLocale` passed explicitly in the job payload. Validate during Phase 6-7 implementation.
- **Bundle size after full extraction:** Research indicates ~15-25KB per locale JSON at ~800 keys is acceptable without namespace splitting. Validate with `next-bundle-analyzer` after Phase 2 before committing to passing all messages to `NextIntlClientProvider` at full scale.

---

## Sources

### Primary (HIGH confidence)
- [next-intl: App Router without i18n routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) — setup steps, locale resolution, "without routing" mode
- [next-intl 4.0 release blog](https://next-intl.dev/blog/next-intl-4-0) — breaking changes, `AppConfig` migration, ESM requirements
- [next-intl: Server and Client Components](https://next-intl.dev/docs/environments/server-client-components) — rendering patterns, hydration safety
- [next-intl: Routing configuration](https://next-intl.dev/docs/routing/configuration) — `localePrefix` options, cookie-based locale
- [next-intl: Date/time formatting](https://next-intl.dev/docs/usage/dates-times) — `useFormatter`, `getFormatter`, `Intl` wrapper
- [CLDR Language Plural Rules](https://www.unicode.org/cldr/charts/44/supplemental/language_plural_rules.html) — Romanian one/few/other categories
- [Debian Romanian I18N Issues](https://wiki.debian.org/L10n/Romanian/I18NIssues) — diacritic encoding specifics (comma-below vs cedilla)
- [next-intl locale without URL prefix discussion #366](https://github.com/amannn/next-intl/issues/366) — maintainer-confirmed patterns for cookie-based locale
- Existing codebase: `src/lib/ai/service.ts`, `src/lib/ai/pipeline.ts`, `src/app/layout.tsx`, `src/lib/auth/config.ts`, `src/lib/db/schema/users.ts`, `src/lib/email/templates/*.tsx` — direct inspection

### Secondary (MEDIUM confidence)
- [Codemod next-intl migration tool](https://codemod.com/blog/next-intl-codemod) — automated string extraction approach
- [Complete guide to i18n in Next.js 15 with next-intl](https://dev.to/mukitaro/a-complete-guide-to-i18n-in-nextjs-15-app-router-with-next-intl-supporting-8-languages-1lgj) — community guide corroborating official patterns
- [SaaS localization strategy guide](https://simplelocalize.io/blog/posts/localization-strategy-guide/) — dual-layer language model rationale
- [i18next Romanian plurals issue #1579](https://github.com/i18next/i18next/issues/1579) — Romanian pluralization challenges corroborated across libraries
- [next-intl vs alternatives comparison (2026)](https://intlpull.com/blog/next-intl-complete-guide-2026) — community comparison, corroborates next-intl recommendation

---
*Research completed: 2026-03-05*
*Ready for roadmap: yes*
