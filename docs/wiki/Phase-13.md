# Phase 13: Email Translation

**Status**: Complete
**Milestone**: v1.1 Internationalization
**Depends on**: Phase 11
**Completed**: 2026-03-06

## Goal

All email notifications render in the correct language for the recipient, using a standalone translator that works outside the Next.js request lifecycle.

## Success Criteria

1. An invite email sent to a new user renders in the company's content language (not the sender's UI language)
2. Session summary emails sent by Inngest background jobs render in the correct language without access to the Next.js request context
3. Pre-meeting reminder and agenda prep emails render in the recipient's company content language

## What Was Built

### Standalone Email Translator (`src/lib/email/translator.ts`)
- `createEmailTranslator(locale)` — async factory that loads message files from disk using `fs/promises` and `use-intl/core` only
- No Next.js imports, no `next-intl`, no request context dependency — safe to call from Inngest background functions
- Falls back to `"en"` for unsupported locales via `isValidLocale()` guard

### Translation Files
- `messages/en/emails.json` — 6 namespaces: invite, verification, passwordReset, sessionSummary, preMeeting, agendaPrep (45 leaf keys)
- `messages/ro/emails.json` — complete Romanian mirror with identical key structure

### Email Templates Refactored
- All 6 email templates (`InviteEmail`, `VerificationEmail`, `PasswordResetEmail`, `SessionSummaryEmail`, `PreMeetingEmail`, `AgendaPrepEmail`) accept translated string props — no hardcoded English in JSX
- No template imports `useTranslations`, `getTranslations`, or any `next-intl` symbol

### Send Functions Updated
- `sendVerificationEmail` and `sendPasswordResetEmail` — resolve `users.language`, call `createEmailTranslator`, pass translated props + subject
- `POST /api/invites` and `/api/invites/resend` — resolve `tenants.contentLanguage`, use standalone translator
- `sendPostSessionSummaryEmails` — resolves tenant content language, builds per-recipient label bags
- `processPreMeeting` and `processAgendaPrep` in `sender.ts` — both resolve `tenants.contentLanguage`, use variant-specific translation keys

## Key Decisions

- **Standalone translator pattern** — `use-intl/core` + `fs/promises` instead of Next.js APIs, allowing safe use in Inngest workers
- **Props-based templates** — string props injected at send time rather than resolved inside the template component
- **Content language for tenant emails** — invite/session/reminder emails use tenant `contentLanguage`; auth emails (verification, password reset) use the individual user's language preference

## Key Files

- `src/lib/email/translator.ts` — standalone translator factory
- `src/lib/email/send.ts` — updated send functions
- `src/lib/notifications/sender.ts` — updated background job senders
- `messages/en/emails.json`, `messages/ro/emails.json` — email translation namespaces
