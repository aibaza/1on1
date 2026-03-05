---
phase: 11-i18n-foundation
plan: 02
subsystem: i18n
tags: [next-intl, useTranslations, useFormatter, language-switcher, api-route, zod]

# Dependency graph
requires:
  - phase: 11-i18n-foundation-01
    provides: next-intl v4 setup, translation files (EN/RO), JWT uiLanguage claim, NEXT_LOCALE cookie, users.language column
provides:
  - Login page fully translated as i18n proof-of-concept (pattern for all future page translations)
  - Language preference API endpoint (PATCH /api/user/language)
  - Language switcher in user menu with JWT refresh flow
  - Date/number formatting pipeline proven via useFormatter()
affects: [12-ui-translation, 14-language-switcher]

# Tech tracking
tech-stack:
  added: []
  patterns: [useTranslations for client component translation, useFormatter for locale-aware formatting, language switch flow (API -> JWT update -> reload)]

key-files:
  created:
    - src/app/api/user/language/route.ts
  modified:
    - src/app/(auth)/login/page.tsx
    - src/components/layout/user-menu.tsx
    - src/lib/validations/user.ts

key-decisions:
  - "Used hidden <data> element with format.dateTime() to prove formatting pipeline without visual impact"
  - "Language names displayed as proper nouns (English, Romana) not translated -- standard i18n convention"
  - "Page reload after language switch because next-intl server-side message loading needs fresh request with new cookie"

patterns-established:
  - "Translation pattern: import useTranslations, call t('namespace.key') for every visible string"
  - "Language switch flow: PATCH /api/user/language -> session update() -> window.location.reload()"
  - "Formatting pattern: import useFormatter, call format.dateTime() / format.number() for locale-aware output"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-05]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 11 Plan 02: Login Translation & Language Switcher Summary

**Login page fully translated EN/RO via useTranslations(), language switcher in user menu with DB persistence and JWT refresh, formatting pipeline proven via useFormatter()**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T21:21:55Z
- **Completed:** 2026-03-05T21:26:13Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Login page has zero hardcoded English strings -- every visible string uses t() calls from auth namespace
- Language API endpoint validates input with Zod, persists to DB via withTenantContext, and sets NEXT_LOCALE cookie
- User menu language switcher shows English/Romana with checkmark indicator, triggers full language switch flow
- Date/number formatting pipeline verified via hidden data element using useFormatter()

## Task Commits

Each task was committed atomically:

1. **Task 1: Translate login page and create language API endpoint** - `38dad8e` (feat)
2. **Task 2: Add language switcher to user menu with JWT refresh** - `def1bd4` (feat)

## Files Created/Modified
- `src/app/(auth)/login/page.tsx` - Replaced all hardcoded strings with useTranslations() t() calls, added useFormatter() proof
- `src/app/api/user/language/route.ts` - PATCH endpoint: auth check, Zod validation, DB update via withTenantContext, NEXT_LOCALE cookie
- `src/lib/validations/user.ts` - Added updateLanguageSchema (z.enum ["en", "ro"])
- `src/components/layout/user-menu.tsx` - Language switcher with Globe icon, English/Romana options, checkmark, switch handler

## Decisions Made
- Used hidden `<data>` element for formatting proof to avoid visual impact on login page
- Language names are proper nouns in their own language (not translated) per i18n convention
- Full page reload needed after language switch since next-intl loads messages server-side

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- i18n foundation complete: infrastructure (Plan 01) + proof-of-concept (Plan 02) both done
- Translation pattern established for Phase 12 to follow across all UI pages
- Language switcher ready for production use
- All Phase 11 requirements completed

---
*Phase: 11-i18n-foundation*
*Completed: 2026-03-05*
