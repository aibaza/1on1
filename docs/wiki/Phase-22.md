# Phase 22: Safety, Errors & Inputs

**Status**: Complete
**Milestone**: v1.3 UI/UX Improvements
**Depends on**: Phase 19
**Completed**: 2026-03-16

## Goal

Protect users from accidental data loss, show contextual error pages instead of bare Next.js defaults, and standardize date picker controls across the app.

## Success Criteria

1. SAFE-01: "Delete Team" button appears in a visually distinct "Danger Zone" section at the bottom of team detail, styled with outlined red and separated from non-destructive actions
2. ERR-01: Navigating to a non-existent session summary URL shows a contextual 404 page with a "Back to Sessions" link — not the bare Next.js error page
3. INP-01: Date filter inputs on History and Audit Log pages use the shadcn DatePicker component — no native `<input type="date">` elements remain

## What Was Built

- **Wave 0 TDD scaffold** (Plan 01): Installed `react-day-picker@9.14.0` and `date-fns@4.1.0`. Wrote `calendar.tsx` manually (shadcn CLI unavailable). Added failing RED tests for `date-picker.test.tsx` (module not found, suppressed with `@ts-expect-error`) and `team-detail-danger-zone.test.tsx`. Global `src/test-setup.ts` for jest-dom matchers.
- **Danger Zone AlertDialog** (Plan 02, SAFE-01): Added a "Danger Zone" section at the bottom of `team-detail-client.tsx` with a visual separator and outlined destructive button. AlertDialog confirmation with EN+RO i18n keys. Open state controlled via `useState` for programmatic control and proper animation.
- **Shared DatePicker component** (Plan 03, INP-01): `src/components/ui/date-picker.tsx` composing `Calendar` + `Popover`. String boundary: accepts `value (YYYY-MM-DD | '')`, emits `onChange(string)` — no `Date` objects leak to consumers. Migrated `history-page.tsx` and `audit-log-client.tsx` from native `<input type="date">` to DatePicker.
- **Contextual 404 page** (Plan 04, ERR-01): `src/app/(dashboard)/sessions/[id]/summary/not-found.tsx` at the summary segment level (not route level) to scope interception precisely. Uses `getTranslations` server-side with `notFound.*` keys under `sessions` namespace. Links back to `/history`.

## Key Decisions

- AlertDialog open state controlled via `useState(deleteDialogOpen)` — allows programmatic control and proper animation
- Delete button uses `variant=outline` + `border-destructive text-destructive` classes — visual danger without using `variant=destructive` (which reserves the filled red for the most severe actions)
- DatePicker string boundary: component accepts/emits `YYYY-MM-DD` string, never leaks `Date` objects to consumers — keeps history and audit-log state contracts unchanged
- `not-found.tsx` placed at `sessions/[id]/summary/` not `sessions/[id]/` — scoped to summary segment only, does not intercept series-level 404s
- Link routes to `/history` — matches existing `backToSeries` pattern in the project

## Key Files

- `src/components/ui/calendar.tsx` (new)
- `src/components/ui/date-picker.tsx` (new)
- `src/app/(dashboard)/sessions/[id]/summary/not-found.tsx` (new)
- `src/app/(dashboard)/teams/[id]/team-detail-client.tsx`
- `src/components/history/history-page.tsx`
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx`
- `src/components/ui/__tests__/date-picker.test.tsx` (new)
- `src/components/teams/__tests__/team-detail-danger-zone.test.tsx` (new)
- `messages/en/teams.json`, `messages/ro/teams.json`
- `messages/en/sessions.json`, `messages/ro/sessions.json`
