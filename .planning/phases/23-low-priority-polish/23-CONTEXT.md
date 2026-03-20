# Phase 23: Low-Priority Polish - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

9 small visual and copy tweaks for a professionally finished product — correct placeholder text, accurate copy, properly styled dividers, centered auth pages, hidden redundant badges, and mobile-optimized layout details. All items are independent fixes with no shared state.

</domain>

<decisions>
## Implementation Decisions

### Registration placeholder (POL-01)
- Company name field placeholder → "Acme Corp" (not a person name)
- i18n key `register.companyPlaceholder` already exists — update EN + RO translations

### Audit log casing (POL-02)
- Action name fallback `formatActionLabel()` uses title-case word splitting — "ai" becomes "Ai"
- Fix: map known acronyms (AI) to correct casing in the fallback formatter
- i18n'd action labels are already correct — only the fallback path needs fixing

### Forgot-password centering (POL-03)
- Card must be vertically centered to match login (`/login/page.tsx`) and register pages
- Check login page's container classes and replicate on forgot-password

### People list Active badge (POL-04)
- Hide "Active" status badge when ALL users in the visible list are active
- Badge only appears for non-default states (pending, deactivated)
- Implementation: conditionally render badge based on whether mixed statuses exist in dataset

### Action items COMPLETED divider (POL-05)
- Divider text: 13px font, hairline `<hr>` separator
- Currently uses `text-[10px]` — update to `text-[13px]`
- Separator component is already hairline — verify visual match

### Team cards dark mode border (POL-06)
- Add visible border in dark mode for definition against page background
- Use `dark:border-border` or similar Tailwind class on Card component

### Session cards empty state (POL-07)
- Show "Start first session" link below the AI summary placeholder on series cards with no sessions
- Link targets the session wizard for that series

### Mobile history search placeholder (POL-08)
- Shorten placeholder text so it doesn't truncate on mobile screens
- Current key: `history.searchPlaceholder`

### Claude's Discretion
- Session card empty state: exact link text, styling (text link vs subtle button), and navigation target
- Mobile search placeholder: exact short text (e.g., "Search..." vs "Search sessions...")
- Team card border opacity/color choice for dark mode
- Whether Active badge logic checks visible page or full dataset

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in ROADMAP.md success criteria and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState` component (from Phase 19) — used in series-list.tsx for empty series
- `Badge` with `variant="outline"` + color classes — people-table-columns.tsx
- `Separator` component — already used in action items divider
- `Card` component — team-card.tsx, series cards

### Established Patterns
- i18n via `useTranslations()` hooks — all 8 items already use translation keys
- Auth pages use `(auth)` route group layout — centering should come from shared layout or per-page container
- Dark mode via Tailwind `dark:` prefix — standard across codebase

### Integration Points
- `src/app/(auth)/register/page.tsx` — company name placeholder
- `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx` — formatActionLabel fallback
- `src/app/(auth)/forgot-password/page.tsx` — card centering
- `src/components/people/people-table-columns.tsx` — Active badge conditional
- `src/components/action-items/action-items-page.tsx` — COMPLETED divider styling
- `src/components/people/team-card.tsx` — dark mode border
- `src/components/series/series-list.tsx` or series card component — empty state link
- `src/components/history/history-page.tsx` — search placeholder
- EN translation file: `messages/en.json`
- RO translation file: `messages/ro.json`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All items have concrete success criteria in ROADMAP.md.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 23-low-priority-polish*
*Context gathered: 2026-03-20*
