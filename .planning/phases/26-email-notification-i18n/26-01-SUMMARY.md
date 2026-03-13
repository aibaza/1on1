---
phase: 26-email-notification-i18n
plan: "01"
subsystem: notifications/email
tags: [tdd, red, email, i18n, react-email]
dependency_graph:
  requires: []
  provides:
    - correction-email.test.ts (RED test suite for plan 26-02 implementation)
    - CorrectionNotificationEmail React Email template
    - messages/*/emails.json sessionCorrection i18n block
  affects:
    - src/lib/notifications/correction-email.ts (not yet created — plan 26-02)
    - src/lib/i18n/__tests__/translation-parity.test.ts (emails.json parity now GREEN)
tech_stack:
  added: []
  patterns:
    - TDD RED phase — tests import non-existent module (dynamic import with try/catch)
    - React Email template following pre-meeting-reminder.tsx pattern
    - use-intl createEmailTranslator with real locale files (no mocking for i18n tests)
key_files:
  created:
    - src/lib/notifications/__tests__/correction-email.test.ts
    - src/lib/email/templates/correction-notification.tsx
  modified:
    - messages/en/emails.json
    - messages/ro/emails.json
    - CHANGELOG.md
decisions:
  - i18n tests assert on content not just type-safety — toContain("corrected") / toContain("corectat") — so they are genuinely RED until keys exist
  - Dynamic import with try/catch used for sender tests to avoid hard module-not-found crash at file load time
  - Pre-existing analytics.json parity failure is out-of-scope and not fixed (logged as deferred)
metrics:
  duration: "3 minutes"
  completed: "2026-03-13"
  tasks_completed: 2
  files_modified: 5
---

# Phase 26 Plan 01: RED Tests + Template Scaffold Summary

**One-liner:** TDD RED suite for correction email sender (8 tests) + CorrectionNotificationEmail template + sessionCorrection i18n keys in EN/RO.

## What Was Built

### Task 1: RED Test Suite (`correction-email.test.ts`)

Eight failing tests covering:
- `sendCorrectionEmails` recipient assembly — report gets one email (NOTIF-01)
- `sendCorrectionEmails` active-admin fan-out, excluding inactive admins (NOTIF-02)
- `sendCorrectionEmails` deduplication — report who is also admin gets only 1 email (NOTIF-02 dedup)
- `wasRecentlySent` returns true for notification within 5-minute window (NOTIF-04)
- `wasRecentlySent` returns false when no matching notification exists (NOTIF-04)
- `wasRecentlySent` returns false when notification is older than 5 minutes (NOTIF-04 cutoff)
- `createEmailTranslator("en")` resolves `emails.sessionCorrection.subject` containing "corrected"
- `createEmailTranslator("ro")` resolves `emails.sessionCorrection.subject` containing "corectat"

After Task 2, 6 tests remain RED (sender logic) and 2 i18n tests turn GREEN.

### Task 2: Template + i18n Keys

- `CorrectionNotificationEmail` component: matches pre-meeting-reminder.tsx pattern exactly — `EmailLayout` wrapper, `headingStyle`/`paragraphStyle`/`buttonStyle` imports, pre-interpolated string props
- `sessionCorrection` block added to both locale files with 6 keys: subject, heading, greeting, body, buttonLabel, footer
- Translation parity test for `emails.json` passes GREEN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing validation] i18n tests strengthened to be genuinely RED**
- **Found during:** Task 1 initial test run
- **Issue:** `use-intl` returns fallback (key path) instead of throwing when key is missing, so `not.toThrow()` + `length > 0` assertions passed even without the keys — 2 tests would have been false GREEN
- **Fix:** Changed assertions to `toContain("corrected")` / `toContain("corectat")` so tests are RED until locale files contain the actual translated content
- **Files modified:** `src/lib/notifications/__tests__/correction-email.test.ts`
- **Commit:** edbb729

### Out-of-Scope Issues (Deferred)

- Pre-existing `analytics.json` translation parity failure (`analytics.chart.sessionHistory` missing in RO) — not introduced by this plan, not fixed here

## Commits

| Hash | Message |
|------|---------|
| edbb729 | test(26-01): add RED failing tests for correction email sender and i18n key resolution |
| f68459f | feat(26-01): add CorrectionNotificationEmail template and sessionCorrection i18n keys |

## Verification State

| Check | Result |
|-------|--------|
| correction-email.test.ts — sender tests | 6 RED (expected — module not found) |
| correction-email.test.ts — i18n tests | 2 GREEN (keys exist after Task 2) |
| translation-parity emails.json | GREEN |
| typecheck | 1 expected error: `correction-email.ts` not found |

## Self-Check: PASSED
