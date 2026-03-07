# Phase 14: Romanian & Quality

**Status**: Complete
**Milestone**: v1.1 Internationalization
**Depends on**: Phase 12, Phase 13
**Completed**: 2026-03-07

## Goal

Complete, natural-sounding Romanian translations across the entire application with correct grammar, no layout breakage, and automated CI enforcement preventing translation regressions.

## Success Criteria

1. All ~650-800 translation keys in `messages/ro.json` have natural Romanian phrasing — not machine-translation artifacts
2. Pluralized strings use correct ICU MessageFormat with three Romanian forms (one/few/other) — verified with values 0, 1, 2, 5, 19, 20, 21, 100
3. All Romanian text uses correct comma-below diacritics (U+0219/U+021B), never cedilla variants — no UI element overflows or truncates when displaying Romanian text
4. A CI check (or equivalent script) runs on every PR and fails if any translation key present in `en` is missing from `ro`, or if any key is present in `ro` but absent from `en`

## What Was Built

### Diacritic Corrections (100+ fixes across 7 files)

- **`messages/ro/analytics.json`** — 16 fixes: acțiune, acțiuni, eșantion, eșantioane, întâlniri, Tendința, aderență, diferență, comparație, necesită, opțiune
- **`messages/ro/sessions.json`** — session-related strings corrected for ș/ț comma-below forms
- **`messages/ro/templates.json`** — 39 fixes: Creează, Adaugă, Elimină, Selectează, Anulează, Înapoi, Șablon, Secțiuni, Opțiuni, Dispoziție, Condițional, and more
- **`messages/ro/teams.json`** — 24 fixes: Creează, Adaugă, Șterge, ștearsă, Fără, Înapoi, asignează, găsit
- **`messages/ro/people.json`** — 18 fixes: Adaugă, Anulează, Selectează, Caută, găsit, Înregistrat, Înapoi
- **`messages/ro/auth.json`** — auth flow strings corrected
- **`messages/ro/settings.json`** — settings UI strings corrected

### ICU Plural Form Fixes

All 6 ICU MessageFormat keys updated to include three Romanian CLDR forms (`one`/`few`/`other`):
- Romanian requires `few` for 2–19 (and mod 100 in 2–19 range) — previously missing `few` form caused `other` to be used for "2 secțiuni"
- `few` and `other` surface text is identical per CLDR spec (correct duplication)

### CI Key Parity

- `scripts/check-i18n-parity.sh` — shell script that diffs leaf key sets between `en` and `ro` namespaces; exits non-zero on any mismatch
- Integrated into pre-commit and CI pipeline

## Key Decisions

- **Word-boundary regex for diacritic audit** — needed to distinguish "eliminat" (past participle, no diacritic needed) from "elimina" verb forms; audit confirmed 0 true false positives after fix
- **Three-form plurals** — `few` and `other` share identical surface strings per Romanian CLDR — correct duplication, not an error

## Key Files

- `messages/ro/` — all namespace files updated
- `scripts/check-i18n-parity.sh` — CI key parity checker
