---
phase: 10-integration-polish
plan: 01
subsystem: ui
tags: [dark-mode, theming, css-variables, recharts, next-themes, oklch]

# Dependency graph
requires:
  - phase: 08-manager-dashboard-analytics
    provides: Analytics chart components to refactor
  - phase: 02-authentication-organization
    provides: Tenant settings JSONB field for colorTheme storage
provides:
  - Two-state light/dark theme toggle across dashboard and wizard
  - Org color theme infrastructure with 8 presets (CSS variable overrides)
  - ThemeColorProvider for runtime theme application via data-color-theme attribute
  - Semantic chart CSS variables (success/warning/danger)
  - All analytics charts using CSS variable-based monochrome palette
affects: [10-02, 10-03, 10-04, 10-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [data-color-theme CSS attribute for org themes, semantic chart color variables, useSyncExternalStore for SSR-safe mounting]

key-files:
  created:
    - src/lib/theme-presets.ts
    - src/components/theme-color-provider.tsx
  modified:
    - src/components/theme-toggle.tsx
    - src/app/globals.css
    - src/components/session/wizard-top-bar.tsx
    - src/lib/validations/organization.ts
    - src/app/api/settings/company/route.ts
    - src/app/(dashboard)/settings/company/page.tsx
    - src/app/(dashboard)/settings/company/company-settings-form.tsx
    - src/app/(dashboard)/layout.tsx
    - src/components/analytics/category-breakdown.tsx
    - src/components/analytics/adherence-chart.tsx
    - src/components/analytics/velocity-chart.tsx
    - src/components/analytics/team-heatmap.tsx
    - src/components/analytics/team-overview.tsx
    - src/components/session/score-sparkline.tsx
    - src/components/session/save-status.tsx

key-decisions:
  - "useSyncExternalStore replaces useEffect+useState for SSR-safe mounting detection in ThemeToggle (avoids lint warning)"
  - "data-color-theme attribute on html element (not class) to compose with dark mode .dark class without conflicts"
  - "Semantic CSS variables (--color-success/warning/danger) for chart status colors instead of hardcoded HSL"
  - "Settings API merges colorTheme into existing JSONB settings (preserves other fields)"

patterns-established:
  - "CSS variable theming: use var(--chart-N) for chart colors, var(--color-success/warning/danger) for semantic"
  - "Org theme via data-color-theme attribute: CSS variable overrides in globals.css, provider in layout"

requirements-completed: [INFR-05]

# Metrics
duration: 8min
completed: 2026-03-05
---

# Phase 10 Plan 01: Dark Mode & Org Color Theme Summary

**Two-state dark mode toggle, org color theme infrastructure with 8 presets, and monochrome CSS variable-based chart palette across all analytics components**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-05T15:20:16Z
- **Completed:** 2026-03-05T15:28:30Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Simplified ThemeToggle to two-state (light/dark) with system preference detection, available in both dashboard header and wizard top bar
- Created org color theme infrastructure: 8 presets with CSS variable overrides for light and dark modes, admin-selectable from company settings
- Refactored all 7 analytics chart components to use CSS variable-based monochrome palette, eliminating all hardcoded HSL color values

## Task Commits

Each task was committed atomically:

1. **Task 1: Dark mode fixes, two-state toggle, and org color theme infrastructure** - `1afb1df` (feat)
2. **Task 2: Chart palette refactor to monochrome CSS variables** - `e266efc` (feat)

## Files Created/Modified
- `src/components/theme-toggle.tsx` - Two-state light/dark toggle using useSyncExternalStore
- `src/lib/theme-presets.ts` - 8 org color theme preset definitions with swatch colors
- `src/components/theme-color-provider.tsx` - Client component applying data-color-theme attribute to html element
- `src/app/globals.css` - CSS variable overrides for 7 color themes (light + dark), semantic color vars, Tiptap dark mode
- `src/components/session/wizard-top-bar.tsx` - Added ThemeToggle to wizard top bar
- `src/lib/validations/organization.ts` - Added colorTheme to org settings schema
- `src/app/api/settings/company/route.ts` - Persist colorTheme in tenant settings JSONB
- `src/app/(dashboard)/settings/company/company-settings-form.tsx` - Color theme radio card picker with swatches
- `src/app/(dashboard)/layout.tsx` - ThemeColorProvider wired in with server-side tenant settings fetch
- `src/components/analytics/category-breakdown.tsx` - 5 HSL colors replaced with var(--chart-N)
- `src/components/analytics/adherence-chart.tsx` - Semantic status colors via CSS variables
- `src/components/analytics/velocity-chart.tsx` - Reference line uses var(--color-success)
- `src/components/analytics/team-heatmap.tsx` - Score-to-color uses semantic CSS variables
- `src/components/analytics/team-overview.tsx` - Score color bar uses semantic CSS variables
- `src/components/session/score-sparkline.tsx` - Fixed hsl(var(--primary)) to var(--primary) for oklch

## Decisions Made
- Used `useSyncExternalStore` instead of `useEffect + useState` for mounting detection in ThemeToggle, avoiding the `set-state-in-effect` lint rule
- Applied `data-color-theme` as HTML attribute (not class) to compose cleanly with dark mode `.dark` class
- Defined semantic CSS variables (`--color-success`, `--color-warning`, `--color-danger`) for chart status colors rather than mapping to Tailwind classes
- Settings API merges `colorTheme` into existing JSONB settings to preserve other fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed save-status.tsx hardcoded text-green-500**
- **Found during:** Task 1 (dark mode audit)
- **Issue:** `text-green-500` lacks dark mode variant, poor contrast in dark mode
- **Fix:** Changed to `text-green-600 dark:text-green-400` for proper contrast in both modes
- **Files modified:** src/components/session/save-status.tsx
- **Verification:** Visual inspection confirms readable green in both modes
- **Committed in:** 1afb1df (Task 1 commit)

**2. [Rule 1 - Bug] Dashboard layout already refactored to TopNav**
- **Found during:** Task 1 (wiring ThemeColorProvider)
- **Issue:** Dashboard layout had already been updated to TopNav pattern (from a previous plan execution), different from plan's expected Sidebar layout
- **Fix:** Adapted ThemeColorProvider wiring to the current TopNav layout structure
- **Files modified:** src/app/(dashboard)/layout.tsx
- **Verification:** Build passes, layout renders correctly
- **Committed in:** 1afb1df (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor adaptations, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dark mode and color themes are fully functional
- Chart palette responds to theme changes
- Ready for Plan 02 (dashboard nav restructure / wizard layout) and subsequent polish plans

---
*Phase: 10-integration-polish*
*Completed: 2026-03-05*
