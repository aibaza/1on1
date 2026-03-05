# Phase 10: Integration & Polish - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

The application gets dark mode, a design overhaul matching the shadcn dashboard reference style (top nav, org-level color themes, monochrome chart palette), wizard layout restructure (left step sidebar, floating context widgets), responsive polish, and end-to-end Playwright verification with Docker deployment check. All issues found during verification are fixed in this phase. Does NOT include: new features, keyboard shortcuts beyond existing Cmd+K, custom error pages, favicon/OG meta, or mobile native app.

</domain>

<decisions>
## Implementation Decisions

### Dark mode
- Dark mode infrastructure already exists (next-themes, ThemeProvider, ThemeToggle, CSS variables)
- Claude's discretion on audit depth: grep for hardcoded colors + targeted fixes
- Chart colors in dark mode: Claude's discretion (CSS vars with dark variants already defined)
- Tiptap editor dark mode: Claude's discretion (inherit from CSS vars or custom)
- Emails: don't force colors — only specify layout and typography, let email clients handle their own dark mode rendering naturally
- Toggle simplified to two-way (light/dark), system preference as default before user touches it
- Toggle in header only (localStorage persistence via next-themes, no server-side storage)
- Toggle also added to wizard top bar (accessible during sessions)
- No org-level theme forcing — personal preference only

### Design overhaul — shadcn dashboard reference
- **Reference**: https://ui.shadcn.com/examples/dashboard
- Main navigation moves from left sidebar to top horizontal nav bar
- Key items in top bar (primary nav), remaining items in dropdown/grouped menu — Claude decides the grouping
- Main sidebar becomes icon-only collapsible mode (like VS Code/Linear) — available as fallback but default is top nav
- Org-level shadcn color theme setting: admin picks a color theme (Zinc, Slate, Stone, Neutral, Blue, Green, etc.) that applies to the entire org
- Charts derive palette from active org theme — primary color with opacity variations, matching shadcn dashboard behavior
- Dashboard should emulate the clean, professional look of the shadcn dashboard example

### Wizard layout restructure
- Category navigation becomes a left vertical sidebar of steps (like multi-step form patterns)
- Category steps sidebar replaces bottom dots/tabs navigation
- Slide transitions between category screens + per-category completion status indicators (answered question counts, checkmarks)
- Prev/Next buttons repositioned — needs research for optimal placement given left sidebar + floating panels layout
- Context panel replaced by floating collapsible card widgets on the right of the page (not a fixed sidebar)
- Context widgets flow naturally with the page, not confined in a column
- On mobile: context widgets stack below the form; bottom sheet pattern (like iOS Maps) for context access
- **Needs deep research**: responsive multi-step wizard patterns with context panels — two sidebars + center form gets tight on laptops
- Context panel sections: needs visual audit first before deciding on restructure vs polish of existing Collapsible components
- Scrollbar-over-navigation bug must be fixed

### E2E verification
- Automated Playwright tests covering the critical path: register org → invite user → create template → create series → run session → view AI summary → check dashboard → receive email
- Edge cases covered: empty states across all screens, RBAC boundary enforcement, auth edge cases
- Docker blue-green deployment verification included (build image, start on port 4300, verify loads + DB connects)
- Issues found during verification are fixed immediately in this phase

### UI polish
- Claude audits the app and prioritizes what looks worst (loading states, spacing, empty states, error states)
- Subtle transitions only: fade-in on page load, smooth hover states, skeleton shimmer — Apple-like restraint
- Proper responsive polish across all screens (tablet and mobile, not just desktop)
- Session wizard gets special attention (category navigation + context panel UX)
- No favicon/OG meta (skip for v1)
- No keyboard shortcut additions (skip for v1)
- No custom error pages (Next.js defaults acceptable)

### Claude's Discretion
- Dark mode audit approach and fix priorities
- Chart color implementation (CSS vars vs useTheme)
- Tiptap dark mode styling approach
- Top nav item grouping (primary vs dropdown)
- Polish priority ordering based on visual audit
- Responsive breakpoints and collapse behavior
- Animation/transition library choice (CSS vs framer-motion)
- Wizard step sidebar responsive behavior on small screens

</decisions>

<specifics>
## Specific Ideas

- "I'd very much like to have it look like the dashboard depicted on https://ui.shadcn.com/examples/dashboard" — the shadcn dashboard is THE reference for the target look and feel
- Grayscale/monochrome charts using the org's theme color — not multi-colored, but theme-derived with opacity variations
- "The total visitors chart looks amazing with the grayscale charts" — chart aesthetic should match this reference
- Wizard navigation: on large displays, the form inputs are too far from the Next button — significant UX issue
- Category steps scrollbar overlaps the navigation bar — needs fixing
- Main sidebar should be collapsible to icon-only mode (like VS Code/Linear)
- Context panel should be floating collapsible cards/widgets, not a fixed sidebar — more dashboard-like
- Bottom sheet for mobile context access (like iOS Maps sliding up from bottom)
- Emails should be "color-neutral" — layout and typography only, no forced colors

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeProvider` (`src/components/theme-provider.tsx`): next-themes wrapper, already in root layout
- `ThemeToggle` (`src/components/theme-toggle.tsx`): Three-state toggle (needs simplification to two-state)
- `.dark` CSS variables: Full oklch dark palette in `globals.css` (background, card, popover, sidebar, charts)
- shadcn/ui: 40+ components all supporting dark mode via CSS variables
- Recharts 3.7 installed with --chart-1 through --chart-5 CSS vars (both light and dark defined)
- `ScoreSparkline`, various chart components in analytics — need theme-color refactor
- Collapsible components in context panel (Phase 5)
- Card grid pattern (series, teams) — reusable for dashboard redesign

### Established Patterns
- `@custom-variant dark (&:is(.dark *))` in globals.css for Tailwind 4 dark mode
- CSS variable-based theming (oklch) — adding org themes means swapping variable sets
- Server Components + Client Components with TanStack Query
- Sidebar component at `src/components/layout/sidebar.tsx` — needs restructure to top nav

### Integration Points
- Root layout (`src/app/layout.tsx`): ThemeProvider already wrapping children
- Dashboard layout (`src/app/(dashboard)/layout.tsx`): Sidebar + main area — needs restructure to top nav + content
- Wizard layout: Full-page immersive mode — needs left step sidebar + floating widgets
- Org settings API: exists, needs color theme field addition
- Auth layout (`src/app/(auth)/layout.tsx`): Has ThemeToggle — may need theme awareness for org theme

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-integration-polish*
*Context gathered: 2026-03-05*
