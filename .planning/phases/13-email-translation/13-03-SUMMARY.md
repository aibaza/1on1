---
phase: 13-email-translation
plan: 03
subsystem: email
tags: [email, i18n, translations, nodemailer, inngest, typescript]

# Dependency graph
requires:
  - phase: 13-email-translation
    plan: 01
    provides: createEmailTranslator utility + emails.json for en/ro
  - phase: 13-email-translation
    plan: 02
    provides: All 6 email templates accept translated string props
provides:
  - End-to-end email translation pipeline — every email sent by the system renders in the recipient's/company's configured language
  - sendVerificationEmail + sendPasswordResetEmail resolve users.language and pass translated props
  - InviteEmail call sites (POST + resend) resolve tenants.contentLanguage and pass translated props
  - SessionSummaryEmail call site resolves tenants.contentLanguage, builds per-recipient labels bags
  - PreMeetingReminderEmail + AgendaPrepEmail call sites resolve tenants.contentLanguage and pass translated props
affects:
  - 13-04 (Phase 14 / any future email work)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Locale source rule: verification/passwordReset use users.language (personal); all other emails use tenants.contentLanguage (company)"
    - "createEmailTranslator called once per request/job — translator instance reused for all strings in that email"
    - "SessionSummaryEmail uses two separate labels bags (labelsReport, labelsManager) differing only in greeting to address each recipient correctly"
    - "translator.ts messages typed as Record<string, any> (not unknown) — required for TypeScript to traverse nested key paths without resolving to never"
    - "Locale-aware date formatting in emails deferred — toLocaleDateString('en-US') in sender.ts is acceptable for Phase 13; locale-aware dates are Phase 14+ concern"

key-files:
  modified:
    - src/lib/email/translator.ts
    - src/lib/email/send.ts
    - src/app/api/invites/route.ts
    - src/app/api/invites/resend/route.ts
    - src/lib/notifications/summary-email.ts
    - src/lib/notifications/sender.ts
    - CHANGELOG.md

key-decisions:
  - "Record<string, any> for messages in translator.ts — Record<string, unknown> caused TypeScript to infer NamespacedMessageKeys as never, blocking all t() calls; any allows proper nested key traversal by use-intl/core"
  - "Per-recipient labels bags in summary-email.ts (labelsReport + labelsManager) — simplest way to personalize greeting while reusing all other translated labels"
  - "createEmailTranslator called before the transaction loop in invites/route.ts — translator is locale-specific and locale is tenant-wide, so one call per request is correct"
  - "Date formatting stays as toLocaleDateString('en-US') in sender.ts — locale-aware email date formatting is deferred to future phase per plan spec"

requirements-completed: [MAIL-01, MAIL-02]

# Metrics
duration: 8min
completed: 2026-03-06
---

# Phase 13 Plan 03: Email Translation Call Site Wiring Summary

**End-to-end email translation pipeline complete — all 6 email types (invite, verification, passwordReset, sessionSummary, preMeeting, agendaPrep) resolve the correct locale from the DB and render in the recipient's/company's configured language, including Inngest background jobs**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-06T19:38:00Z
- **Completed:** 2026-03-06T19:46:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `sendVerificationEmail` and `sendPasswordResetEmail` now resolve `users.language` before generating tokens, call `createEmailTranslator(locale)`, and pass all translated strings (heading, body, buttonLabel, footer, subject) to templates — no hardcoded English
- `POST /api/invites` and `POST /api/invites/resend` add `contentLanguage` to the existing tenant query, call `createEmailTranslator` once per request, pass translated `InviteEmail` props and translated subject
- `sendPostSessionSummaryEmails` fetches tenant `contentLanguage`, builds separate `labelsReport`/`labelsManager` objects with personalized translated greetings, and passes them to the two `SessionSummaryEmail` renders
- `processPreMeeting` and `processAgendaPrep` in sender.ts each fetch tenant `contentLanguage` after series lookup, call `createEmailTranslator`, and use appropriate translation keys (including variant-specific body/button for agenda prep)
- Fixed `translator.ts`: messages typed as `Record<string, any>` so TypeScript can traverse nested keys — was `Record<string, unknown>` which resolved all key paths to `never`

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire locale into send.ts (verification + password-reset)** - `3a077f6` (feat)
2. **Task 2: Wire locale into all remaining call sites (invites, summary-email, sender)** - `5ba8848` (feat)

## Files Created/Modified

- `src/lib/email/translator.ts` — messages cast to `Record<string, any>` (was `unknown`) to fix TypeScript key inference
- `src/lib/email/send.ts` — both send functions resolve `users.language`, call `createEmailTranslator`, use translated props/subject
- `src/app/api/invites/route.ts` — added `contentLanguage` to tenant query; `createEmailTranslator` called once before loop; translated InviteEmail props and subject
- `src/app/api/invites/resend/route.ts` — same pattern as invites/route.ts for the resend path
- `src/lib/notifications/summary-email.ts` — fetch `tenants.contentLanguage` after series fetch; per-recipient labels bags via `t()`; translated subject; actionItem `assignedToLabel`/`dueLabel` built with `t()`
- `src/lib/notifications/sender.ts` — both `processPreMeeting` and `processAgendaPrep` fetch tenant locale and use `t()` for all string props including subject

## Decisions Made

- `Record<string, any>` in `translator.ts`: `use-intl/core`'s `createTranslator` infers `NamespacedMessageKeys` from the messages type. When `unknown` is used, TypeScript cannot traverse nested object keys and the constraint resolves to `never`, making every `t("...")` call a type error. Using `any` preserves the runtime behavior while satisfying the inference constraint.
- Two separate labels bags (`labelsReport`, `labelsManager`) in `summary-email.ts`: both emails share the same session data labels but differ in the greeting recipient name. Spreading a common `baseLabels` object and overriding `greeting` is the minimal pattern.
- `createEmailTranslator` called once outside the invite loop: the locale is tenant-wide, so translating once per request (not per recipient email address) is correct and avoids redundant file reads.
- Date formatting kept as `toLocaleDateString("en-US")` in `sender.ts`: per plan specification, locale-aware date formatting in reminder emails is a future-phase concern — the pre-formatted strings are passed as template variables, not reformatted inside templates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript `never` type inference in translator.ts**
- **Found during:** Task 1 (verification of typecheck)
- **Issue:** `JSON.parse(raw) as Record<string, unknown>` caused `createTranslator` to infer all message keys as `never`, making every `t("emails.*")` call a TypeScript error: `Argument of type '"emails.verification.heading"' is not assignable to parameter of type 'never'`
- **Fix:** Changed cast to `Record<string, any>` with an eslint-disable comment — preserves runtime behavior, satisfies `use-intl/core` generic constraint for nested key traversal
- **Files modified:** `src/lib/email/translator.ts`
- **Verification:** `bun run typecheck` passed with zero errors after fix
- **Committed in:** `3a077f6` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type inference bug)
**Impact on plan:** Essential fix for TypeScript correctness. No scope creep.

## Issues Encountered

None beyond the translator.ts type inference issue documented above.

## Next Phase Readiness

- Email translation pipeline is complete end-to-end
- An invite email sent when `tenants.content_language = "ro"` renders Romanian subject, heading, body, and footer
- A password reset email sent to a user with `users.language = "ro"` renders Romanian
- Inngest background jobs (processPreMeeting, processAgendaPrep) work identically — no request context required
- Phase 13 (email translation) is complete — Phase 14 can proceed

## Self-Check: PASSED

All 6 modified source files verified on disk. Both task commits (3a077f6, 5ba8848) verified in git log.

---
*Phase: 13-email-translation*
*Completed: 2026-03-06*
