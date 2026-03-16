# UX Visual Auditor - Agent Memory

## Project Design System

### Color Tokens (from globals.css)
- Primary light: `oklch(0.205 0 0)` (near-black), dark: `oklch(0.922 0 0)` (near-white)
- Muted-foreground light: `oklch(0.556 0 0)`, dark: `oklch(0.708 0 0)`
- Brand orange used for: cadence toggles, some CTA buttons (inconsistent), logo, sparklines
- Dark mode card: `oklch(0.205 0 0)`, page background: `oklch(0.145 0 0)`
- Multiple theme variants exist in globals.css (default, zinc, slate, stone, violet)

### Known Systemic Issues (March 2026 audit)
- **Button color split**: Auth pages use bg-primary (black/white), form pages use orange -- needs resolution
- **Badge weight inversion**: "completed" is louder than "in progress" on history page
- **Section header casing**: UPPERCASE in wizard steps, sentence case in context panel
- **Native date inputs**: Used in history and audit-log instead of shadcn DatePicker

### Critical Bugs (as of March 8, 2026)
- `[object Object]` in recap notes: `src/components/session/recap-screen.tsx:117-120` -- Tiptap JSON passed to dangerouslySetInnerHTML
- Sparkline placeholder: `src/components/session/recap-screen.tsx:138-140` -- literal text "Score trend sparkline (Plan 03)"
- AI editor mobile: no responsive breakpoint on two-column layout
- Templates schema i18n: `spec.*` namespace keys not in translation files

### Best Screens (design references)
- Dashboard dark mode sparklines -- signature visual
- Wizard step 2 (Wellbeing) -- best three-column layout
- Analytics individual -- best information density
- Organization settings -- reference for settings pages

### Screenshot Infrastructure
- 35 pages x 4 configs in /home/dc/work/1on1/screenshots/
- Directories: desktop-light, desktop-dark, mobile-light, mobile-dark, artifacts
- Prior review: screenshots/UX-REVIEW.md (March 7)
- This audit: screenshots/UX-AUDIT-REPORT.md (March 8)

## Key File Paths
- Global CSS tokens: `src/app/globals.css`
- Recap screen (bugs): `src/components/session/recap-screen.tsx`
- Template schema page: likely `src/app/[locale]/(dashboard)/settings/templates/schema/page.tsx`
