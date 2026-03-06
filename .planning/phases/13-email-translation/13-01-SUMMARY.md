---
phase: 13-email-translation
plan: 01
subsystem: email
tags: [use-intl, i18n, email, translation, nodemailer]

# Dependency graph
requires:
  - phase: 11-i18n-foundation
    provides: next-intl setup with messages/{locale}/ directory structure
  - phase: 12-ui-translation
    provides: established translation patterns for namespaced JSON files
provides:
  - createEmailTranslator utility — standalone, no Next.js request context required
  - messages/en/emails.json — English email translation keys for all 6 templates
  - messages/ro/emails.json — Romanian email translation keys with identical structure
affects:
  - 13-02 (email templates wiring)
  - 13-03 (email sending with locale)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Email translation uses use-intl/core createTranslator (not next-intl) — works outside request lifecycle"
    - "Email message files loaded via fs/promises readFile from disk at send time"
    - "Locale fallback to 'en' for unsupported locales — no crashes for future locale additions"

key-files:
  created:
    - src/lib/email/translator.ts
    - messages/en/emails.json
    - messages/ro/emails.json
  modified:
    - CHANGELOG.md

key-decisions:
  - "use-intl/core createTranslator (not next-intl) — only approach that works outside the Next.js request lifecycle where all email sending occurs"
  - "Messages loaded from disk via fs/promises readFile — avoids any module caching or context issues in background jobs"
  - "Fallback to 'en' for unsupported locales — safe for future locale additions without breaking email delivery"

patterns-established:
  - "Email translators: createEmailTranslator(locale) -> t() function, called at send time, not at module load"

requirements-completed:
  - MAIL-01
  - MAIL-02

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 13 Plan 01: Email Translation Foundation Summary

**Standalone `createEmailTranslator` using `use-intl/core` with full EN/RO `emails.json` namespace covering all 6 email templates — works in Inngest background jobs with no Next.js request context**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T19:27:32Z
- **Completed:** 2026-03-06T19:29:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `createEmailTranslator(locale)` utility reads emails.json from disk and returns a `use-intl` translator — callable from any Node.js context including Inngest background jobs
- `messages/en/emails.json` covers all 6 email types: invite, verification, passwordReset, sessionSummary, preMeeting, agendaPrep
- `messages/ro/emails.json` mirrors identical key structure with Romanian translations
- Locale fallback to `en` ensures no crashes for unsupported locales

## Task Commits

Each task was committed atomically:

1. **Task 1: Create createEmailTranslator utility** - `577d84c` (feat)
2. **Task 2: Create emails.json translation namespaces** - `193f5c4` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/lib/email/translator.ts` — Standalone email translator using use-intl/core; reads messages from disk; locale-safe fallback
- `messages/en/emails.json` — English email keys for all 6 template types with ICU-style interpolation params
- `messages/ro/emails.json` — Romanian email keys with identical structure, verified via key parity check
- `CHANGELOG.md` — Updated with new additions

## Decisions Made
- `use-intl/core` chosen over `next-intl` or `next-intl/server` — the latter require Next.js request context which is unavailable in Inngest background jobs where emails are sent
- Messages loaded from disk via `fs/promises` `readFile` at call time — avoids module caching issues
- Fallback to `en` for unsupported locales — safe default that prevents crashes when future locales are added before translation files exist

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Node.js v22 `node -e` with `!==` operator caused shell escaping issues — resolved by writing verification script to `/tmp` and running it separately

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Foundation is complete and ready for Plan 02 (email template wiring)
- `createEmailTranslator` is importable from any background job context
- Both locale files verified for structural parity
- No blockers

---
*Phase: 13-email-translation*
*Completed: 2026-03-06*
