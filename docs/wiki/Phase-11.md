# Phase 11: i18n Foundation

**Status**: Complete
**Milestone**: v1.1 Internationalization
**Depends on**: Phase 10
**Completed**: 2026-03-05

## Goal

A working i18n pipeline where locale resolves correctly for authenticated and unauthenticated users, and both Server and Client Components can render translated strings through independent UI and content language layers.

## Success Criteria

1. A Server Component can call `getTranslations('namespace')` and render a translated string; a Client Component can call `useTranslations('namespace')` and render the same string
2. An unauthenticated visitor's browser locale is detected via Accept-Language and the correct language loads on the login page
3. An authenticated user's DB-stored language preference propagates through JWT and renders the correct locale without extra DB calls on each request
4. UI language (per-user) and content language (per-company) are stored independently and never conflated in the codebase
5. Translation files use namespace-based JSON structure with TypeScript type safety via next-intl AppConfig

## What Was Built

- **Plan 11-01**: next-intl v4 infrastructure — cookie-based locale resolution (non-routing setup), translation file structure (`messages/{locale}/{namespace}.json`), TypeScript type safety via `AppConfig` augmentation in `global.d.ts`, `i18n/request.ts` config, `NextIntlClientProvider` in root layout with dynamic `html lang` attribute. DB migration: `language` column on users, `content_language` on tenants. JWT extension: `uiLanguage` and `contentLanguage` claims carried from DB on sign-in. Proxy locale detection: reads JWT language for authenticated users, parses Accept-Language header for unauthenticated; sets `NEXT_LOCALE` cookie on all response paths.
- **Plan 11-02**: Proof-of-concept — login page fully translated (EN + RO, zero hardcoded English strings), language switcher in user menu dropdown with visual checkmark for active language, language preference API (`PATCH /api/user/language`), `updateLanguageSchema` Zod validation, full-page reload after switch (required for server-side message loading).

## Key Decisions

- Non-routing setup for next-intl (cookie-based, no URL prefixes like `/en/` or `/ro/`) — simpler and matches SaaS UX conventions
- UI language (per-user) and content language (per-company) stored independently — never conflated
- Accept-Language parsing extracts 2-char language code for simplicity
- `NEXT_LOCALE` cookie maxAge set to 1 year
- Language names displayed as proper nouns (English, Română) — not translated, standard i18n convention
- Full page reload on language switch — server-side message loading requires a fresh request

## Requirements

INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
