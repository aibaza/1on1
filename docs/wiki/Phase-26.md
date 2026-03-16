# Phase 26: Email Notification & i18n

**Status**: Complete
**Milestone**: v1.4 Session Corrections & Accountability
**Depends on**: Phase 25
**Completed**: 2026-03-13

## Goal

All involved parties receive one notification email per correction event — report and admins are informed with a session link, emails render correctly in English and Romanian, and multiple rapid corrections to the same session produce a single email rather than a flood.

## Success Criteria

1. NOTIF-01: When a session answer is corrected, the report (employee) receives an email containing a direct link to the session — no inline answer content appears in the email body
2. NOTIF-02: All active tenant admins receive the same correction notification email — admins added after the correction do not receive retroactive emails
3. NOTIF-02: Report who is also an admin receives only one email (dedup at recipient assembly time)
4. (i18n): The correction email renders correctly in both English and Romanian using `createEmailTranslator` — no raw translation keys appear in either language
5. NOTIF-04: Five corrections to the same session within a 5-minute window produce exactly one email per recipient — the deduplication window resets on each new correction within the window

## What Was Built

- **TDD RED scaffold** (Plan 01): 8-test suite covering recipient assembly, active-admin fan-out, report-as-admin dedup, `wasRecentlySent` 5-minute window, and EN/RO i18n key resolution. i18n tests assert on content (`toContain("corrected")` / `toContain("corectat")`) not just non-throw, so they are genuinely RED until locale files contain real translations.
- **`CorrectionNotificationEmail` React Email template** (`src/lib/email/templates/correction-notification.tsx`): Follows `pre-meeting-reminder.tsx` pattern — `EmailLayout` wrapper, shared heading/paragraph/button styles, pre-interpolated string props.
- **`sessionCorrection` i18n keys**: 6 keys added to both `messages/en/emails.json` and `messages/ro/emails.json` — subject, heading, greeting, body, buttonLabel, footer. Key parity enforced.
- **`sendCorrectionEmails` sender module** (`src/lib/notifications/correction-email.ts`): Orchestrates per-recipient locale lookup, renders the React Email template, dispatches via Nodemailer. Active admin filtering is defensive at recipient-list-build time. Dedup errors default to allow-send (DB failure cannot silently suppress emails).
- **Fire-and-forget wiring** (`src/app/api/sessions/[id]/corrections/route.ts`): Non-awaited IIFE resolves report/manager/admin user data via `adminDb`, then calls `sendCorrectionEmails`. Route returns `NextResponse.json` immediately — email dispatch does not block the HTTP response.
- **Phase gate**: All 8 unit tests GREEN; pre-existing lint errors fixed; missing RO translation key added; typecheck, lint, tests, build all passing.

## Key Decisions

- Dynamic import with try/catch for sender tests — avoids hard module-not-found crash at test file load time when module doesn't exist yet (TDD RED pattern)
- Dedup errors default to `false` (allow-send) — DB failure on dedup check should not silently suppress emails
- Inactive admin filtering at recipient-list-build time (not just at DB query) — defensive double-check
- Fire-and-forget IIFE (not `void promise`) — corrections route returns immediately, email delivery does not block the caller

## Key Files

- `src/lib/notifications/correction-email.ts` (new)
- `src/lib/email/templates/correction-notification.tsx` (new)
- `src/lib/notifications/__tests__/correction-email.test.ts` (new)
- `messages/en/emails.json`
- `messages/ro/emails.json`
- `src/app/api/sessions/[id]/corrections/route.ts`
