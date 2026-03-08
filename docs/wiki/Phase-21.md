# Phase 21: Content & Data Display

**Status**: Complete
**Milestone**: v1.3 UI/UX Improvements
**Depends on**: Phase 19
**Completed**: 2026-03-08

## Goal

Improve analytics data density, session score display, and session card content organization.

## Success Criteria

1. CON-01: Analytics overview shows aggregate company-wide stat cards above the directory
2. CON-02: Session list cards with no score hide the star rating row (not hollow stars)
3. CON-03: Session list cards show numeric score badge instead of hollow star row
4. CON-04: Talking Points and Action Items sections show item count badge and expand/collapse chevron
5. CON-05: Team heatmap shows "Requires ≥3 contributors" when fewer than 3 users have data
6. SCORE-01: Session summary score label displays the correct scale ("out of 5", not "out of 5.0")

## What Was Built

- **Analytics aggregate stat cards** (`src/app/(dashboard)/analytics/page.tsx`): three cards — "Sessions Completed", "Avg Score", "Action Item Rate" — scoped by role (admin = company-wide, manager = direct reports). Empty state shows "—" when no data. i18n keys added to `messages/en|ro/analytics.json`.
- **Team heatmap threshold guard** (`src/components/analytics/team-heatmap.tsx`): when `rows.length > 0 && rows.length < 3`, renders a threshold message instead of the heatmap. Translated in both locales.
- **Collapsible CategoryStep sections** (`src/components/session/category-step.tsx`): Talking Points and Action Items wrapped in shadcn `Collapsible` with count badge in header. Both expanded by default. Count badge omitted when count = 0.
- **Numeric score badge on series cards** (`src/components/series/series-card.tsx`): replaces star rating row with a `Badge variant="secondary"` showing the numeric score. Star rating row hidden entirely when no score.
- **Score label fix** (`messages/en|ro/sessions.json`): changed "out of 5.0" → "out of 5".
- **StarRating component** (`src/components/ui/star-rating.tsx`): reusable star display in sm/md/lg sizes; amber filled stars for scored sessions; gray hollow stars for no score. Applied to session timeline, summary header, and recap screen.
- **Session summary header redesign**: title now includes the other person's name in bold + their team name in parentheses (fetched from first team membership with graceful fallback).
- **i18n**: sentiment badges (positive/neutral/mixed/concerning), priority badges (low/medium/high), and status badges translated via timeline keys instead of `.replace("_", " ")`.

## Key Decisions

- Score scale is 1–5 (via `computeSessionScore`) — label corrected to "out of 5" (not 10)
- Team heatmap threshold: `rows.length > 0 && rows.length < 3` (one user with data still triggers guard; zero users shows empty state instead)
- Count badge only shown when count > 0 — avoids "0 items" noise
- Series card shows numeric Badge (not stars) to avoid visual noise from hollow stars in lists
- Session timeline and summary use `StarRating` component for visual consistency

## Key Files

- `src/components/ui/star-rating.tsx` (new)
- `src/app/(dashboard)/analytics/page.tsx`
- `src/components/analytics/team-heatmap.tsx`
- `src/components/session/category-step.tsx`
- `src/components/series/series-card.tsx`
- `src/components/series/session-timeline.tsx`
- `src/components/session/session-summary-view.tsx`
- `src/app/(dashboard)/sessions/[id]/summary/page.tsx`
- `messages/en/analytics.json`, `messages/ro/analytics.json`
- `messages/en/sessions.json`, `messages/ro/sessions.json`
