# Phase 18: Critical Bugs

**Status**: Complete
**Milestone**: v1.3 UI/UX Improvements
**Depends on**: Phase 17
**Completed**: 2026-03-08

## Goal

Fix four rendering bugs that break content display and layout in production.

## Success Criteria

1. BUG-01: Wizard recap screen renders rich text notes (not `[object Object]`)
2. BUG-02: AI template editor is usable on mobile (<1024px) via stacked tab layout
3. BUG-03: `/templates/spec` renders translated UI text (no raw `spec.*` keys)
4. BUG-04: Recap screen contains no dashed-border sparkline placeholder div

## What Was Built

- **`contentToHtml()` utility** (`src/lib/session/tiptap-render.ts`): type-guards Tiptap JSON vs HTML strings; uses `generateHTML` from `@tiptap/core`; handles null/undefined/malformed input. Applied to recap screen, eliminating `[object Object]` display.
- **AI editor responsive layout** (`src/components/templates/ai-editor/ai-editor-shell.tsx`): desktop (lg+) shows side-by-side panels; mobile (<lg) shows Tabs with "Preview" and "Chat" tabs.
- **i18n fix** (`src/i18n/request.ts`): added `spec` namespace to messages loader so `/templates/spec` page renders properly.
- **Sparkline placeholder removed** from recap screen.
- **`happy-dom`** added as dev dependency for `@tiptap/core`'s DOM requirements in Vitest.
- **5 unit tests** (all passing) covering `contentToHtml` edge cases.

## Key Decisions

- `contentToHtml` detects JSON by `typeof === 'object'` check, not string sniffing
- `generateHTML` requires DOM — `happy-dom` injected via Vitest `environmentOptions` rather than global env to minimize test suite impact
- AI editor uses Tabs (not conditional rendering) to avoid layout shift on tab switch

## Key Files

- `src/lib/session/tiptap-render.ts` (new)
- `src/lib/session/__tests__/tiptap-render.test.ts` (new)
- `src/components/templates/ai-editor/ai-editor-shell.tsx`
- `src/components/session/recap-screen.tsx`
- `src/i18n/request.ts`
