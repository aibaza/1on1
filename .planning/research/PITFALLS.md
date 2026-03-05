# Domain Pitfalls: i18n Retrofit (English + Romanian)

**Domain:** Internationalization for existing Next.js 15 App Router SaaS
**Researched:** 2026-03-05
**Context:** ~265 source files, 106 client components, 41K+ LOC of hardcoded English strings, dual-layer language model (UI language per-user, content language per-company)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken UX, or data corruption.

---

### Pitfall 1: Incomplete String Extraction Leaves Untranslated Fragments

**What goes wrong:** With 265 source files and 41K+ LOC, manual string extraction misses strings. Users see a patchwork of English and Romanian -- buttons translated, error messages not, toast notifications half-English. This is worse than no translation at all.

**Why it happens:** Hardcoded strings live everywhere: JSX text nodes, placeholder attributes, aria-labels, toast messages in API route handlers, Zod validation error messages, `title` attributes, `alt` text, confirmation dialogs, empty state messages, table column headers. No single grep pattern catches them all.

**Consequences:** Broken user experience. Users lose trust when the app randomly switches languages.

**Prevention:**
1. Use a codemod tool (e.g., [Codemod's next-intl migration](https://codemod.com/blog/next-intl-codemod)) for the initial bulk extraction pass
2. Create a string extraction checklist by component type: page components, layout components, form components, error boundaries, email templates, API error responses
3. Run the app in Romanian and screenshot every page -- untranslated strings are immediately visible
4. Add an ESLint rule (eslint-plugin-i18next) that flags hardcoded string literals in JSX
5. Process extraction file-by-file, not feature-by-feature -- less likely to miss strings in shared components

**Detection:** Any English text visible when UI language is set to Romanian. Automated: grep for quoted strings in JSX that are not wrapped in `t()`.

**Phase:** Must be addressed systematically in the core i18n setup phase. Expect this to be the most time-consuming step -- budget 60-70% of the total i18n effort here.

---

### Pitfall 2: Confusing UI Language and Content Language

**What goes wrong:** The app has two distinct language layers: (1) UI language -- buttons, labels, navigation, set per-user; (2) content language -- questionnaire templates, AI-generated summaries, email summaries, set per-company. Mixing these up causes a Romanian-speaking manager to see AI summaries in English (because their report writes in English), or an English-speaking user to see Romanian button labels (because the company is Romanian).

**Why it happens:** Most i18n libraries handle one language at a time. The concept of "the UI is in English but this AI summary should be in Romanian because that is the company language" is not a standard i18n pattern. Developers default to using the same locale for everything.

**Consequences:** Confusing UX. AI content in the wrong language. Email summaries sent in the wrong language. Questionnaire templates shown in unexpected language.

**Prevention:**
1. Define two explicit concepts in the codebase: `uiLocale` (from user preferences, drives `t()` calls) and `contentLocale` (from company settings, drives AI prompts, email templates, questionnaire content)
2. Store `uiLocale` on the user record, `contentLocale` on the tenant/company record
3. The `t()` function always uses `uiLocale` -- this is the standard next-intl behavior
4. AI prompts explicitly receive `contentLocale` and include it in the system prompt (the existing `BASE_SYSTEM` prompt already says "write in the same language as the session data" -- this needs to become locale-aware with an explicit locale parameter)
5. Email templates: determine language from recipient's `uiLocale` for UI chrome (headers, footers), but content sections (session summaries, action items) use `contentLocale`
6. Questionnaire template text is user-generated content -- it lives in the database, not in translation files. Do NOT try to put template question text into i18n JSON files

**Detection:** During testing, set one user to English UI + Romanian company, another to Romanian UI + English company. Verify every screen shows the right language for the right elements.

**Phase:** Architecture decision in Phase 1 (i18n setup). Must be designed before any translation work begins. This is the single most important design decision for the entire i18n milestone.

---

### Pitfall 3: Romanian Plural Rules Are Complex (Three Categories, Not Two)

**What goes wrong:** English has 2 plural forms: singular (1 item) and plural (2+ items). Romanian has 3 CLDR plural categories: `one` (1), `few` (0, 2-19, 101-119, etc.), and `other` (20-99, 120-199, etc.). Developers write `{count} items` / `{count} item` and call it done. Romanian users see grammatically incorrect text for most numbers.

**Why it happens:** Developers think "singular vs plural" is universal. Romanian follows CLDR rules where:
- `one`: exactly 1 (integer, no decimals)
- `few`: 0, or 2-19, or any number ending in 01-19 (e.g., 2, 12, 101, 112)
- `other`: numbers ending in 20-99, or round hundreds/thousands (e.g., 20, 35, 100, 1000)

Example: "3 sesiuni" (few), "25 de sesiuni" (other -- note the "de" particle that appears in the `other` form). This is not just a suffix change; the entire phrase structure changes.

**Consequences:** Grammatically broken Romanian text throughout the app. Looks unprofessional.

**Prevention:**
1. Use ICU MessageFormat syntax for ALL pluralized strings from the start:
   ```json
   "sessionCount": "{count, plural, one {# sesiune} few {# sesiuni} other {# de sesiuni}}"
   ```
2. Create a comprehensive list of all strings that contain counts/numbers before translating -- search for `{count}`, `{total}`, any numeric interpolation
3. Have a native Romanian speaker review all plural forms -- automated tools cannot catch the "de" particle or other structural changes
4. Test with values: 0, 1, 2, 5, 19, 20, 21, 100, 101 -- these hit all three plural branches

**Detection:** Search translation files for `plural` usage. Any string with a numeric variable that only has `one`/`other` forms is broken for Romanian.

**Phase:** Translation authoring phase. Every translator must understand Romanian CLDR rules. Include a Romanian plural cheat-sheet in translator documentation.

---

### Pitfall 4: Hydration Mismatches from Locale-Dependent Rendering

**What goes wrong:** Server renders with one locale, client hydrates with another. React throws hydration errors. Common triggers: date formatting (`new Date().toLocaleDateString()`), number formatting, relative time ("2 hours ago"), and currency formatting.

**Why it happens:** In Next.js App Router, Server Components render on the server with the locale from the request. Client Components may briefly see a different locale during hydration if the locale detection logic differs between server and client. The `Intl.DateTimeFormat` and `Intl.NumberFormat` APIs produce different output based on the runtime locale.

**Consequences:** React hydration errors in production. Console warnings. Flickering text. In worst cases, entire component trees remount, losing state (particularly dangerous in the session wizard where auto-save state could be disrupted).

**Prevention:**
1. Always use `next-intl`'s formatting functions (`useFormatter` / `format.dateTime()`) instead of raw `Intl` APIs -- they ensure server/client consistency
2. Set `timeZone` explicitly in `i18n/request.ts` configuration (from company settings), never rely on runtime detection
3. For dates displayed in Server Components, format on the server only -- no client-side reformatting
4. Use `suppressHydrationWarning` only on elements that genuinely differ (e.g., `<time>` elements with relative times) -- do not suppress globally
5. Ensure the `NEXT_LOCALE` cookie is set before SSR runs -- if the cookie arrives after server render, the server uses the default locale while the client uses the cookie value

**Detection:** React DevTools hydration warnings in console. Automated: Playwright tests that compare server-rendered HTML text content against client-rendered text content.

**Phase:** Core i18n setup phase. The formatting utilities must be established before any date/number formatting migration.

---

### Pitfall 5: Email Templates Rendered in Wrong Language

**What goes wrong:** Email templates (invite, session summary, password reset, verification) are React Email components with hardcoded English strings. After i18n, emails might render in the server's default locale instead of the recipient's preferred language, or use `contentLocale` when they should use `uiLocale`.

**Why it happens:** Emails are rendered server-side, outside the normal React component tree. The `useTranslations` hook is not available. Developers forget to pass the locale explicitly to `getTranslations` from `next-intl/server`, or they pass the wrong one.

**Consequences:** Users receive emails in the wrong language. Invite emails in Romanian sent to English-speaking invitees. Password reset emails unreadable.

**Prevention:**
1. Every email rendering function must accept an explicit `locale` parameter -- never infer from request context
2. Use `getTranslations({ locale, namespace })` from `next-intl/server` for email string translation
3. Language rules by email type:
   - Invite emails (recipient has no account yet): use the company's `contentLocale` as default
   - Transactional emails (password reset, verification): use the recipient's stored `uiLocale`
   - Session summary emails: UI chrome in recipient's `uiLocale`, session content in `contentLocale`
4. Create a test that renders every email template in both locales and snapshots the output

**Detection:** Send test emails in both locales during development. Automated: render email templates with explicit locale parameter in unit tests.

**Phase:** Email template migration phase (after core i18n is set up). Can be done independently from UI translation.

---

## Moderate Pitfalls

---

### Pitfall 6: Romanian Diacritics Corruption

**What goes wrong:** Romanian characters (ă, â, î, ș, ț) display as mojibake (garbled characters) or get stripped. Particularly insidious: there are two versions of ș and ț in Unicode -- comma-below (correct: ș U+0219, ț U+021B) and cedilla-below (wrong: ş U+015F, ţ U+0163). They look almost identical on screen but are different characters, causing search failures, sort inconsistencies, and database comparison mismatches.

**Why it happens:** Copy-pasting from older Romanian sources, or translators using keyboards configured for Turkish (which uses the cedilla variants). The Debian wiki documents this as a long-standing Romanian i18n issue. ISO-8859-2 (commonly used historically) maps to the wrong cedilla variants.

**Prevention:**
1. Ensure all translation JSON files are saved as UTF-8 without BOM
2. Verify the database connection uses UTF-8 (Neon/Supabase PostgreSQL defaults to UTF-8 -- verify, do not assume)
3. Use the correct Unicode characters: ș (U+0219), ț (U+021B), not ş (U+015F), ţ (U+0163)
4. Set `<html lang="ro">` dynamically when the UI locale is Romanian
5. Add a pre-commit hook or CI check that scans Romanian translation files for the wrong cedilla diacritic variants (U+015E, U+015F, U+0162, U+0163)
6. Specify correct diacritics in translator guidelines; provide a keyboard layout reference

**Detection:** Search translation files for bytes matching U+015E, U+015F, U+0162, U+0163 -- these are the wrong cedilla variants. A simple regex: `/[şŞţŢ]/`

**Phase:** Translation authoring. Include diacritic guidelines in translator documentation. Add CI check early.

---

### Pitfall 7: Romanian Text Length Breaks Layouts

**What goes wrong:** Romanian translations are typically 15-30% longer than English equivalents. UI elements designed for English overflow, truncate, or break layouts. Buttons, table headers, navigation items, and form labels are most affected.

**Why it happens:** English is a compact language. Romanian words tend to be longer, and some concepts require more words. Layout testing is always done in English first.

**Prevention:**
1. During UI development, test with pseudo-localization (artificially lengthened strings) before real translations arrive
2. Use flexible layouts: `min-width` not `width`, text wrapping not truncation, responsive grid not fixed columns
3. Specific danger zones in this app:
   - Sidebar navigation labels ("Overview" -> "Prezentare generala" is 2.5x longer)
   - Button text ("Mark as Complete" -> "Marcheaza ca finalizat" is similar length, but "Quick Stats" -> "Statistici rapide" can vary)
   - Table column headers in analytics and people views
   - Wizard step labels in session wizard
   - Badge text and status labels
4. Set `max-width` with `text-overflow: ellipsis` as a safety net, with full text in tooltip
5. Test the sidebar in collapsed and expanded states with Romanian labels

**Detection:** Visual regression tests with Romanian locale. Automated: Playwright screenshots in both locales compared side-by-side.

**Phase:** UI adjustment phase (after translations are in). Plan a dedicated "layout polish" pass.

---

### Pitfall 8: Translation Key Organization Becomes Unmaintainable

**What goes wrong:** Translation keys start with a flat structure (`"loginButton"`, `"loginTitle"`, `"dashboardWelcome"`) and quickly become an unnavigable mess of 500+ keys in a single file. Or keys are too deeply nested and painful to type. Or keys are inconsistently named, making it impossible to find the right one.

**Why it happens:** No key naming convention is established before extraction begins. Different developers use different patterns. The first 50 keys seem fine; the next 500 are chaos.

**Prevention:**
1. Use namespace-based organization matching the app's route structure:
   ```
   messages/en/
     common.json       # shared: buttons, labels, errors, confirmations
     auth.json          # login, register, forgot-password, invite
     dashboard.json     # overview, quick stats, nudges
     sessions.json      # wizard, summary, recap
     people.json        # people list, teams, profiles
     templates.json     # template editor, question types
     analytics.json     # charts, period selector, exports
     settings.json      # company settings, account settings
     actionItems.json   # action item list, status, carry-over
   ```
2. Keys should be 2-3 levels deep max: `namespace.section.key` (e.g., `sessions.wizard.nextStep`)
3. Shared strings (Save, Cancel, Delete, Loading, Error) go in `common.json` -- referenced everywhere
4. Never duplicate strings across namespaces -- if it is used in 2+ places, it belongs in `common`
5. Use `useTranslations('namespace')` to scope translations per component
6. Establish naming conventions before extraction:
   - Actions: `verb` or `verbNoun` (e.g., `save`, `deleteTeam`)
   - Labels: `noun` or `nounDescription` (e.g., `email`, `sessionScore`)
   - Messages: `stateMessage` (e.g., `emptyState`, `loadingData`, `saveSuccess`)
   - Errors: `errorType` (e.g., `errorRequired`, `errorTooLong`)

**Detection:** Any namespace file exceeding 200 keys needs splitting. Any key used in 3+ files should be in `common`.

**Phase:** Core i18n setup phase. The namespace structure must be defined before extraction begins.

---

### Pitfall 9: AI-Generated Content Language Inconsistency

**What goes wrong:** AI features (session summaries, nudges, action item suggestions) generate content in unpredictable languages. If session answers are in Romanian but the AI prompt is in English, the output language is a coin flip. Worse: mixed-language sessions (manager writes in English, report answers in Romanian) produce incoherent AI output.

**Why it happens:** The existing `BASE_SYSTEM` prompt says "Write in the same language as the session data" -- but this is ambiguous when session data is mixed-language. LLMs do not reliably detect language from short text like "Da" (Romanian "Yes") vs other short inputs.

**Consequences:** AI summaries switch languages mid-paragraph. Nudge cards show Romanian text to English users. Action item suggestions are in the wrong language.

**Prevention:**
1. Replace the language-detection heuristic with an explicit locale instruction: `"Always respond in ${contentLocale === 'ro' ? 'Romanian' : 'English'}."` in the system prompt
2. Pass `contentLocale` from the company settings to every AI call via the `context.ts` module
3. For mixed-language input: the AI output language follows `contentLocale`, not the input language
4. Test AI prompts with both locales -- Romanian output quality may differ from English (LLMs are generally weaker in Romanian)
5. Consider: AI-generated UI strings (like nudge card titles) that appear in the UI should follow `uiLocale`; summary content embedded in session records should follow `contentLocale`

**Detection:** Set company to Romanian, write session answers in English, verify AI output is in Romanian. And vice versa.

**Phase:** AI integration update phase. Relatively isolated change -- update `BASE_SYSTEM` and pass locale to all AI service calls via `src/lib/ai/context.ts`.

---

### Pitfall 10: Zod Validation Error Messages Stay in English

**What goes wrong:** Zod schemas throughout the app have hardcoded English error messages (`z.string().min(1, "Name is required")`). After i18n, form validation errors appear in English even when the UI is in Romanian.

**Why it happens:** Zod validation runs on both server and client. The `t()` function is not available when defining Zod schemas (they are defined at module level, outside React components). This is a well-known pain point in the Zod + i18n ecosystem.

**Consequences:** All form validation messages remain in English. Users see a jarring mix of Romanian UI with English error text.

**Prevention:**
1. Recommended approach for this app: remove custom messages from Zod schemas entirely (use schema-level validation only), then map Zod error codes to translated strings at the UI layer
2. Create a `getZodErrorMessage(error: ZodIssue, t: TranslationFunction)` utility that maps Zod issue codes (`too_small`, `invalid_type`, `invalid_string`, etc.) to translation keys
3. Update the shadcn/ui `<FormMessage>` component to use this utility
4. For custom business logic errors (e.g., "Team name already exists"), return error keys from API routes and translate them in the client component
5. Alternative: use `zod-i18n-map` library, but it adds a dependency and may not cover custom error messages

**Detection:** Submit a form with invalid data while UI is in Romanian. If error messages are in English, Zod messages are not translated.

**Phase:** Form migration phase. Must update the shared `<FormMessage>` component and all Zod schemas that have custom error strings. Can be done after core i18n setup.

---

### Pitfall 11: Missing Translation Fallback Breaks Production

**What goes wrong:** A translation key exists in English but is missing from Romanian. In development, next-intl shows the key name (e.g., `sessions.wizard.nextStep`). In production, this raw key is shown to users -- confusing and unprofessional.

**Why it happens:** Incremental translation means Romanian is always behind English. New features add English strings but Romanian translations lag. No CI check catches the gap.

**Prevention:**
1. Configure next-intl's `onError` and `getMessageFallback` to fall back to English (never show raw keys in production):
   ```typescript
   // i18n/request.ts
   onError(error) {
     if (error.code === 'MISSING_MESSAGE') {
       console.warn(`Missing translation: ${error.originalMessage}`);
     }
   },
   getMessageFallback({ namespace, key }) {
     return englishMessages[`${namespace}.${key}`] ?? `[${namespace}.${key}]`;
   }
   ```
2. Add a CI check that compares key counts between `en/` and `ro/` -- warn (not fail) if Romanian is missing keys, fail if more than 10% are missing
3. Use TypeScript-generated types from translation files to catch missing keys at compile time (next-intl supports this with `global.d.ts` augmentation)
4. During incremental migration, English fallbacks for untranslated sections are acceptable -- but log them so they can be tracked

**Detection:** CI pipeline that diffs translation file keys between locales. Runtime logging of fallback usage in production.

**Phase:** Core i18n setup (configure fallback behavior), then ongoing CI enforcement during translation phases.

---

## Minor Pitfalls

---

### Pitfall 12: Forgetting `setRequestLocale` in Every Page and Layout

**What goes wrong:** In Next.js App Router with next-intl (when not using URL-based routing), every `page.tsx` and `layout.tsx` that uses translations must call `setRequestLocale(locale)` before any `useTranslations` or `getTranslations` call. Forgetting this in even one page causes the page to use the default locale, leading to English text on a page the user expects in Romanian.

**Prevention:** Create a code snippet/template for all page files. Add to code review checklist. Consider a custom ESLint rule that checks for `setRequestLocale` in page/layout files.

**Phase:** Core i18n setup. Part of the file-by-file migration process.

---

### Pitfall 13: Locale Cookie Not Synced with User Preference

**What goes wrong:** Since this app uses no URL-based locale routing (locale is stored in user preferences, not the URL), the next-intl middleware must read the locale from a cookie. If the cookie gets out of sync with the database record, the user sees the wrong language. This can happen after clearing cookies, using a new device, or if the settings update fails to set the cookie.

**Prevention:**
1. On login/session creation, set the `NEXT_LOCALE` cookie from the user's stored `uiLocale` preference
2. On language change in settings, update both the database record and the cookie in the same response (use `Set-Cookie` header in the API route response)
3. Configure next-intl middleware with `localePrefix: 'never'` since URLs will not contain locale segments
4. For unauthenticated pages (login, register, invite), fall back to `Accept-Language` header or a default
5. On the middleware: if user is authenticated and cookie disagrees with stored preference, update the cookie

**Phase:** Core i18n setup (middleware configuration) and auth flow update.

---

### Pitfall 14: Date and Number Format Inconsistencies

**What goes wrong:** Romanian date format is DD.MM.YYYY (not MM/DD/YYYY). Number format uses comma for decimals and period for thousands (1.234,56 not 1,234.56). Hardcoded `toLocaleDateString('en-US')` or manual date formatting throughout the codebase produces American-style dates for Romanian users. Session scores displayed as "4.5" should be "4,5" in Romanian.

**Why it happens:** Date/number formatting calls are scattered across many components and are easy to miss during string extraction because they are not plain text strings -- they are function calls that produce locale-dependent output.

**Prevention:**
1. Audit all `toLocaleDateString`, `toLocaleString`, `Intl.DateTimeFormat`, and manual date formatting calls across all 265 files
2. Replace with next-intl's `useFormatter().dateTime()` and `useFormatter().number()` which respect the active locale
3. For server-side formatting (API routes, email templates, Inngest jobs), use `getFormatter({ locale })` from `next-intl/server`
4. Relative times ("2 hours ago") must also be locale-aware -- use `useFormatter().relativeTime()`
5. Pay special attention to: session timestamps, due dates on action items, chart axis labels in analytics, CSV export date formatting

**Detection:** Search codebase for `toLocaleDateString`, `toLocaleString`, `new Intl.DateTimeFormat`, `new Date().toLocal`, `.format(date` patterns.

**Phase:** Formatting migration phase. Can be done in parallel with string extraction. Create a separate tracking list for date/number formatting instances.

---

### Pitfall 15: Client Bundle Size Increase from Translation Messages

**What goes wrong:** By default, `NextIntlClientProvider` sends all translation messages to the client. With two languages and 500+ keys each, plus ICU MessageFormat parsing overhead, this adds 20-50KB to every page load.

**Prevention:**
1. Use next-intl's namespace-based message splitting -- only pass the namespaces needed for each page via the provider
2. Server Components do not add to bundle size (translations stay on the server) -- leverage the existing 159 Server Components
3. For the 106 client components, pass only the relevant namespace: `<NextIntlClientProvider messages={pick(messages, ['common', 'sessions'])}>`
4. Monitor bundle size before and after i18n integration using `next-bundle-analyzer`

**Detection:** Check the Next.js build output for `__NEXT_DATA__` size increase.

**Phase:** Performance optimization phase (after i18n is functional). Not critical for initial launch.

---

### Pitfall 16: Hardcoded Strings in shadcn/ui Components

**What goes wrong:** The 28 shadcn/ui components in `src/components/ui/` may contain hardcoded English strings in aria-labels, placeholder text, or default props (e.g., "Search...", "No results", "Close", "Loading"). These are easy to overlook because developers think of them as "library code" that should not be modified.

**Prevention:**
1. Audit each shadcn/ui component for hardcoded strings -- particularly `command.tsx` ("No results found"), `dialog.tsx` ("Close"), `sheet.tsx`, `alert-dialog.tsx` ("Cancel"/"Continue")
2. Extract these strings into the `common` namespace
3. Pass translated strings as props rather than modifying the shadcn components directly (preserves upgrade path)

**Detection:** Grep `src/components/ui/` for English string literals in JSX.

**Phase:** String extraction phase. Include UI components in the extraction checklist.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| **i18n Architecture Setup** | Pitfall 2 (dual language confusion) | Design `uiLocale` vs `contentLocale` separation first, before writing any code |
| **Middleware & Routing** | Pitfall 13 (cookie sync), Pitfall 4 (hydration) | `localePrefix: 'never'`, sync cookie on login/settings change, explicit timezone |
| **String Extraction** | Pitfall 1 (incomplete extraction), Pitfall 16 (shadcn) | Use codemod + ESLint rule + visual review in Romanian; include UI components |
| **Translation Key Design** | Pitfall 8 (key organization) | Define namespace structure matching route structure before extraction begins |
| **Server/Client Components** | Pitfall 4 (hydration mismatch), Pitfall 12 (setRequestLocale) | Use next-intl formatting APIs exclusively; add setRequestLocale to every page/layout |
| **Form Validation** | Pitfall 10 (Zod messages) | Update shared `<FormMessage>` component; remove custom Zod messages |
| **Email Templates** | Pitfall 5 (wrong language) | Every email function takes explicit `locale` parameter |
| **AI Integration** | Pitfall 9 (inconsistent language) | Pass `contentLocale` to all AI service calls; update `BASE_SYSTEM` prompt |
| **Romanian Translation** | Pitfall 3 (plural rules), Pitfall 6 (diacritics) | Romanian CLDR plural cheat-sheet; diacritic linting pre-commit hook |
| **Layout Polish** | Pitfall 7 (text overflow) | Pseudo-localization testing; flexible layouts; sidebar label testing |
| **Missing Translation Handling** | Pitfall 11 (fallback) | English fallback config; CI key-count check between locales |
| **Date/Number Formatting** | Pitfall 14 (format inconsistencies) | Audit and replace all `Intl` API and manual formatting calls |
| **Performance** | Pitfall 15 (bundle size) | Namespace-scoped message passing to client provider |

---

## Sources

- [next-intl App Router setup](https://next-intl.dev/docs/getting-started/app-router) -- official documentation (HIGH confidence)
- [next-intl Server & Client Components](https://next-intl.dev/docs/environments/server-client-components) -- hydration and rendering patterns (HIGH confidence)
- [next-intl translations outside React components](https://next-intl.dev/blog/translations-outside-of-react-components) -- email template pattern (HIGH confidence)
- [next-intl useExtracted](https://next-intl.dev/docs/usage/extraction) -- automated string extraction (HIGH confidence)
- [next-intl routing configuration (localePrefix)](https://next-intl.dev/docs/routing/configuration) -- no-prefix routing (HIGH confidence)
- [next-intl middleware](https://next-intl.dev/docs/routing/middleware) -- cookie-based locale detection (HIGH confidence)
- [Codemod next-intl migration tool](https://codemod.com/blog/next-intl-codemod) -- automated codemod for string extraction (MEDIUM confidence)
- [CLDR Language Plural Rules](https://www.unicode.org/cldr/charts/44/supplemental/language_plural_rules.html) -- Romanian plural categories one/few/other (HIGH confidence)
- [Debian Romanian I18N Issues](https://wiki.debian.org/L10n/Romanian/I18NIssues) -- diacritics and encoding specifics (HIGH confidence)
- [i18next Romanian plurals issue #1579](https://github.com/i18next/i18next/issues/1579) -- known Romanian pluralization challenges (MEDIUM confidence)
- [Phrase: i18n beyond code](https://phrase.com/blog/posts/internationalization-beyond-code-a-developers-guide-to-real-world-language-challenges/) -- real-world language challenges (MEDIUM confidence)
- [next-intl locale without URL prefix discussion #366](https://github.com/amannn/next-intl/issues/366) -- community patterns for cookie-based locale (MEDIUM confidence)

---

*Pitfalls research for: i18n retrofit (English + Romanian) on 1on1 SaaS*
*Researched: 2026-03-05*
