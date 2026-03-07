# Phase 14: Romanian & Quality - Research

**Researched:** 2026-03-07
**Domain:** Romanian i18n quality, ICU plural rules, CI key parity enforcement
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROLN-01 | Complete Romanian translations for all ~650-800 keys with natural phrasing | Audit finds 927 keys exist with parity; ~100 diacritic fixes + phrasing review needed |
| ROLN-02 | Romanian plural forms use correct ICU MessageFormat (one/few/other) | Node.js CLDR confirms Romanian has 3 forms; 6 ICU plural keys + 3 dual-key pairs need fixing |
| ROLN-03 | Romanian text uses correct diacritics (comma-below U+0219/U+021B) | Audit: 0 cedilla variants found (good); ~100 strings missing diacritics entirely |
| ROLN-04 | UI layouts handle 15-30% longer Romanian text without overflow or truncation | 53 truncate/overflow-hidden/whitespace-nowrap occurrences to audit; button.tsx uses whitespace-nowrap globally |
| QUAL-01 | CI check enforces key parity between en.json and ro.json | Vitest test approach; parity is currently PERFECT (927 = 927) |
| QUAL-02 | No hardcoded English strings remain in user-facing components | Scan found ~9 visible strings; toasts/errors already use t() |
</phase_requirements>

---

## Summary

Phase 14 is a quality-hardening phase, not a feature phase. The translation infrastructure (Phase 11-13) is complete and working. The actual state of `messages/ro.json` is better than expected in some areas (key parity is perfect at 927 keys each; no cedilla diacritic variants exist) but has real quality problems: approximately 100 strings are missing diacritics entirely (using unaccented forms like "Creeaza" instead of "Creează"), 6 ICU plural keys use only one/other instead of the Romanian-required one/few/other three-form system, and a small number of hardcoded English strings remain in UI components.

The key parity CI check is straightforward: a vitest test that reads both `messages/en/*.json` and `messages/ro/*.json`, extracts all leaf keys recursively, and asserts the sets are identical per namespace. This test will catch any future key drift immediately. The hardcoded string audit is a manual sweep + targeted code changes for the 9 confirmed visible hardcoded strings.

The diacritic work is the largest task by volume (~100 fixes across 6 files) but is mechanical: a known set of unaccented forms maps to their correct accented equivalents. The plural work requires understanding Romanian CLDR rules: the "few" form covers 0 and numbers 2-19 (and 101-119, 201-219, etc.) — this means 5 items is "5 elemente" (few), not "5 element" (other).

**Primary recommendation:** Split into three plans: (1) diacritic fixes across all ro.json files + natural phrasing review, (2) ICU plural three-form fixes + dual-key plural conversion, (3) CI key parity test + hardcoded string audit + layout overflow check.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 4.8.3 (installed) | ICU MessageFormat parsing, plural rule resolution | Already the project i18n library; uses CLDR plural rules via Intl.PluralRules |
| vitest | ^4.0.18 (installed) | CI key parity test | Already the project test runner; `bun run test` runs it |
| Node.js Intl.PluralRules | built-in | Romanian CLDR plural rule verification | `new Intl.PluralRules('ro').select(n)` gives authoritative answer for any n |

### No New Dependencies Needed
This phase requires zero new npm packages. All tooling is already installed.

**Verification:**
```bash
# Verify Romanian plural rules
node -e "const ro = new Intl.PluralRules('ro'); [0,1,2,5,19,20,21,100].forEach(n => console.log(n + ': ' + ro.select(n)));"
# Output: 0=few, 1=one, 2=few, 5=few, 19=few, 20=other, 21=other, 100=other
```

## Architecture Patterns

### Translation File Layout
```
messages/
├── en/
│   ├── analytics.json     (70 lines, 60 keys)
│   ├── auth.json          (126 lines, 106 keys)
│   ├── common.json        (27 lines, 21 keys)
│   ├── dashboard.json     (49 lines, 33 keys)
│   ├── emails.json        (61 lines, 45 keys)
│   ├── history.json       (35 lines, 31 keys)
│   ├── navigation.json    (21 lines, 17 keys)
│   ├── people.json        (101 lines, 78 keys)
│   ├── search.json        (14 lines, 10 keys)
│   ├── sessions.json      (290 lines, 256 keys)
│   ├── settings.json      (90 lines, 72 keys)
│   ├── teams.json         (44 lines, 38 keys)
│   ├── templates.json     (137 lines, 123 keys)
│   ├── validation.json    (14 lines, 10 keys)
│   ├── admin.json         (8 lines, 2 keys)
│   └── actionItems.json   (31 lines, 25 keys)
└── ro/                    # Mirror structure, 927 keys = 927 en keys (perfect parity)
```

### ICU Plural Rule Pattern — Romanian Three-Form

Romanian requires three plural forms per CLDR:

| Form | Rule | Examples |
|------|------|---------|
| `one` | n == 1 | 1 sesiune |
| `few` | n == 0 OR (n % 100 >= 1 AND n % 100 <= 19) | 0, 2-19, 101-119, etc. |
| `other` | everything else | 20, 21-100, 120-200, etc. |

```json
// WRONG (current): only one/other
"sessionCount": "{count, plural, one {# sesiune} other {# sesiuni}}"

// CORRECT: one/few/other
"sessionCount": "{count, plural, one {# sesiune} few {# sesiuni} other {# sesiuni}}"
```

For Romanian, `few` and `other` often have the same surface form (the plural), but they MUST both be specified. Without `few`, counts like 0, 2, 5, 11, 19 fall through to `other` incorrectly (next-intl may silently use `other` as fallback, but the spec requires explicit `few`).

### Pattern: Dual-Key Plural (Non-ICU) — Already in Codebase

Three places use JS ternary to select between two translation keys instead of ICU plural:

```tsx
// dashboard/overdue-items.tsx — EXISTING pattern
{group.items.length === 1
  ? t("item", { count: group.items.length })
  : t("items", { count: group.items.length })}
```

This works for English (1 vs. not-1) but is wrong for Romanian (0 should use `few` form, not `other`). Two options:
1. Convert to ICU singular key with three forms — cleaner, but requires component changes
2. Keep dual-key pattern, update Romanian translations to use same text for both since Romanian uses the same plural form for 2+ anyway

Option 2 is lower risk. The `items` key value in Romanian already covers the non-one case correctly.

### Pattern: CI Key Parity Test

```typescript
// src/lib/i18n/__tests__/translation-parity.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

function getLeafKeys(obj: unknown, path = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [path];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => getLeafKeys(v, path ? `${path}.${k}` : k));
}

const messagesDir = resolve(__dirname, '../../../../../messages');
const namespaces = readdirSync(`${messagesDir}/en`).filter(f => f.endsWith('.json'));

describe('Translation key parity', () => {
  for (const ns of namespaces) {
    it(`${ns}: en and ro have identical keys`, () => {
      const en = JSON.parse(readFileSync(`${messagesDir}/en/${ns}`, 'utf-8'));
      const ro = JSON.parse(readFileSync(`${messagesDir}/ro/${ns}`, 'utf-8'));
      const enKeys = new Set(getLeafKeys(en));
      const roKeys = new Set(getLeafKeys(ro));
      const missingInRo = [...enKeys].filter(k => !roKeys.has(k));
      const missingInEn = [...roKeys].filter(k => !enKeys.has(k));
      expect(missingInRo, `Keys in en/${ns} not in ro/${ns}`).toEqual([]);
      expect(missingInEn, `Keys in ro/${ns} not in en/${ns}`).toEqual([]);
    });
  }
});
```

### Anti-Patterns to Avoid

- **Using `few` same as `other`:** Wrong — while the surface text is often identical, CLDR requires the `few` category to be present in the message for Romanian
- **Using `=0` instead of `few`:** ICU `=0 {zero text}` is an exact match shortcut; for Romanian, `few` already covers 0, so use `few`
- **Cedilla diacritics (ș U+015F, ț U+0163):** These are the wrong codepoints for Romanian. The project currently has 0 cedilla variants — keep it that way
- **JS `n === 1 ? singular : plural` ternary for Romanian:** Breaks for 0 (should be few, often uses the plural form in Romanian)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Romanian plural rules | Custom plural logic | `Intl.PluralRules('ro').select(n)` | CLDR-correct, built into Node.js |
| Key diff tooling | Custom recursive differ | Vitest test with Set comparison | Test runs in CI, catches drift immediately |
| Diacritic validation | Regex scanner | Simple string search + replacement | 100% predictable for known word list |
| Translation linting | eslint-plugin-i18n | None needed | Scope is 2 languages, JSON reviewed in PRs |

## Current State: Complete Audit

### Key Parity Status
- **en.json total keys:** 927 (across 16 namespace files)
- **ro.json total keys:** 927 (across 16 namespace files)
- **Status: PERFECT PARITY** — no missing or extra keys in either direction

### Diacritic Quality (ROLN-03)
Good news: **zero cedilla variants** found (U+015F/U+015E/U+0163/U+0162). All existing diacritics use correct comma-below forms.

Bad news: ~100 strings use unaccented forms instead of correct accented forms:

| File | Issue Count | Worst Offenders |
|------|------------|-----------------|
| templates.json | 39 | Creeaza(6), Adauga(6), Elimina(7), Selecteaza(6), Anuleaza(5) |
| teams.json | 24 | Creeaza(5), Adauga(3), sterge/Sterge/stearsa/stergi |
| people.json | 18 | Adauga(2+3), Anuleaza(2), Selecteaza(2), Cauta(3), gasit(2) |
| analytics.json | 16 | actiune/actiuni(4), esantion/esantioane(3), intalniri(2), Tendinta |
| auth.json | 2 | noua(2) |
| settings.json | 1 | elimina(1) |

**Full replacement map (authoritative):**
```
Creeaza → Creează    creeaza → creează
Adauga → Adaugă      adauga → adaugă
Anuleaza → Anulează  anuleaza → anulează
Selecteaza → Selectează  selecteaza → selectează
Cauta → Caută        cauta → caută
Salveaza → Salvează  salveaza → salvează
Elimina → Elimină    elimina → elimină
Fara → Fără          fara → fără
asigneaza → asignează
noua → nouă          Noua → Nouă
Inapoi → Înapoi      inapoi → înapoi
incepe → începe      Incepe → Începe
intalniri → întâlniri  intalnire → întâlnire
inregistrat → înregistrat
sterge → șterge      Sterge → Șterge
stearsa → ștearsă    stergi → ștergi
gasit → găsit        Gasit → Găsit
actiune → acțiune    actiuni → acțiuni
esantion → eșantion  esantioane → eșantioane
aderenta → aderență  diferenta → diferență
comparatie → comparație  Comparatie → Comparație
tendinta → tendința  Tendinta → Tendința
optiune → opțiune    optiuni → opțiuni
informatii → informații  necesita → necesită
```

### ICU Plural Quality (ROLN-02)
6 keys use only `one/other` — missing required Romanian `few` form:

| File | Key | Current |
|------|-----|---------|
| analytics.json | memberCount | `one {# membru} other {# membri}` |
| analytics.json | sessionCount | `one {# sesiune} other {# sesiuni}` |
| analytics.json | itemsCompleted | `one {# actiune} other {# actiuni}} finalizate` |
| analytics.json | sampleCount | `one {# esantion} other {# esantioane}` |
| sessions.json | questionCount | `one {1 întrebare} other {# întrebări}` |
| sessions.json | answersRecorded | `one {1 răspuns înregistrat} other {# răspunsuri înregistrate}` |

3 dual-key plural pairs (JS ternary in component code):
- `dashboard.upcoming.moreNudge / moreNudges` — used in upcoming-sessions.tsx
- `dashboard.overdue.item / items` — used in overdue-items.tsx
- `teams.member / members` — needs component code check

### Hardcoded Strings (QUAL-02)
Confirmed hardcoded visible English strings in UI:
1. `src/components/theme-toggle.tsx` — "Toggle theme" (2 instances, sr-only)
2. `src/components/ui/pagination.tsx` — "Previous", "More pages" (shadcn UI primitives)
3. `src/components/session/wizard-shell.tsx` — "Failed to load session"
4. `src/components/session/wizard-top-bar.tsx` — "Exit wizard"
5. `src/components/people/user-actions-menu.tsx` — "Open menu" (sr-only aria)
6. `src/app/(dashboard)/analytics/team/[id]/client.tsx` — "Category Averages", "Team Heatmap"
7. `src/components/ui/dialog.tsx` — "Close" button (shadcn primitive)

Toasts, validation errors, and API responses: already use `t()` — no fixes needed.

### Layout/Overflow Risk (ROLN-04)
Romanian words are 15-30% longer on average. Highest risk elements:
- `whitespace-nowrap` on `badge.tsx`, `button.tsx`, `tabs.tsx`, `select.tsx` (shadcn primitives — may clip)
- `truncate` on: `sidebar.tsx` (user name), `series-card.tsx` (card title), `recent-sessions.tsx`, `upcoming-sessions.tsx`
- `whitespace-nowrap` on `table.tsx` headers — table column headers in Romanian could overflow

Low risk (truncate on user-supplied content like name/email is intentional).
High risk: table column headers in `people.json` (`table.name`, `table.role`, etc.) — these go into `<th>` with `whitespace-nowrap`.

## Common Pitfalls

### Pitfall 1: Romanian `few` Silently Falling to `other`
**What goes wrong:** ICU plurals without `few` render "2 sesiune" instead of "2 sesiuni" for count=2, because next-intl falls back to `other` when `few` is missing but Intl.PluralRules says the category is `few`.
**Why it happens:** Translators unfamiliar with Romanian CLDR add only English-style one/other.
**How to avoid:** Every ICU plural in ro.json must have explicit `one`, `few`, and `other` forms.
**Warning signs:** Test with values 0, 2, 5, 19 — all should use the plural surface form.

### Pitfall 2: Overwriting Correct Diacritics While Fixing Incorrect Ones
**What goes wrong:** A global string replace of "sterge" hits words like "nesterge" or mid-word occurrences incorrectly.
**Why it happens:** Romanian JSON has multi-word values; naive substring replace can corrupt good text.
**How to avoid:** Do targeted key-level replacements, not global file-level search/replace. Verify each file after edit with a diacritic audit script.

### Pitfall 3: Table Column Headers Overflowing
**What goes wrong:** `<th>` elements in people/teams tables use `whitespace-nowrap` (from shadcn table.tsx). Romanian column header "Înregistrat" (8 chars) vs "Joined" (6 chars) may cause horizontal scroll on mobile.
**Why it happens:** Table headers can't wrap — whitespace-nowrap is intentional for data alignment.
**How to avoid:** Check Romanian header lengths against column widths. Consider abbreviations or allow wrapping for specific columns.

### Pitfall 4: Dual-Key Plural Wrong for 0
**What goes wrong:** `count === 1 ? t('item') : t('items')` gives "0 elemente" — which is actually correct for Romanian (0 uses `few` form, surface text matches plural). But verify each case.
**Why it happens:** English binary logic (1 vs. not-1) doesn't map to Romanian ternary logic.
**How to avoid:** Audit all three dual-key pairs; for Romanian, the `few`/`other` surface text is usually identical ("sesiuni"), so the ternary is accidentally correct. Verify with 0, 2, 20.

### Pitfall 5: `few` vs `other` Identical Surface Text
**What goes wrong:** "2 sesiuni" and "20 sesiuni" use the same Romanian word — but CLDR requires both `few` and `other` to be specified in ICU format even when the text is the same.
**Why it happens:** Appears redundant, gets omitted.
**How to avoid:** Always specify all three forms: `{count, plural, one {# sesiune} few {# sesiuni} other {# sesiuni}}`. The `few` and `other` values may be identical — that's correct.

## Code Examples

### Correct Romanian ICU Plural (Three Forms)
```json
// Source: CLDR Romanian plural rules (Intl.PluralRules('ro'))
// analytics.json — CORRECTED
{
  "analytics": {
    "memberCount": "{count, plural, one {# membru} few {# membri} other {# membri}}",
    "sessionCount": "{count, plural, one {# sesiune} few {# sesiuni} other {# sesiuni}}",
    "itemsCompleted": "{count, plural, one {# acțiune} few {# acțiuni} other {# acțiuni}} finalizate",
    "sampleCount": "{count, plural, one {# eșantion} few {# eșantioane} other {# eșantioane}}"
  }
}
```

### Key Parity Test (Vitest)
```typescript
// src/lib/i18n/__tests__/translation-parity.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

function getLeafKeys(obj: unknown, path = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return path ? [path] : [];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => getLeafKeys(v, path ? `${path}.${k}` : k));
}

const messagesDir = resolve(process.cwd(), 'messages');
const namespaces = readdirSync(`${messagesDir}/en`).filter(f => f.endsWith('.json'));

describe('Translation key parity (en ↔ ro)', () => {
  for (const ns of namespaces) {
    it(`${ns}: en and ro have identical keys`, () => {
      const en = JSON.parse(readFileSync(`${messagesDir}/en/${ns}`, 'utf-8'));
      const ro = JSON.parse(readFileSync(`${messagesDir}/ro/${ns}`, 'utf-8'));
      const enKeys = new Set(getLeafKeys(en));
      const roKeys = new Set(getLeafKeys(ro));
      const missingInRo = [...enKeys].filter(k => !roKeys.has(k));
      const missingInEn = [...roKeys].filter(k => !enKeys.has(k));
      expect(missingInRo, `Keys in en/${ns} not in ro/${ns}: ${missingInRo.join(', ')}`).toEqual([]);
      expect(missingInEn, `Keys in ro/${ns} not in en/${ns}: ${missingInEn.join(', ')}`).toEqual([]);
    });
  }
});
```

### Diacritic Audit Script (Run After Edits)
```bash
# Run to verify no bad forms remain
node -e "
const fs = require('fs'), path = require('path');
const bad = ['Creeaza','creeaza','Adauga','adauga','Anuleaza','Selecteaza',
             'sterge','Sterge','gasit','actiune','actiuni','esantion','aderenta',
             'comparatie','Tendinta','optiune','Inapoi','intalniri','necesita'];
const dir = 'messages/ro';
let total = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(fn => {
  const content = fs.readFileSync(path.join(dir, fn), 'utf-8');
  bad.forEach(b => { const c = (content.match(new RegExp(b, 'g')) || []).length; if(c) { console.log(fn + ': ' + c + 'x ' + b); total += c; }});
});
console.log('Total: ' + total);
"
```

### Fixing Hardcoded Strings in Components
```tsx
// Before (wizard-shell.tsx) — hardcoded
<p>Failed to load session</p>

// After — using t()
const t = useTranslations('sessions.wizard');
<p>{t('loadError')}</p>

// With corresponding ro.json key:
// "loadError": "Sesiunea nu a putut fi încărcată"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One/other ICU plurals for Romanian | One/few/other required by CLDR | CLDR spec, always | Affects counts 0 and 2-19 |
| Cedilla s/t (U+015F, U+0163) | Comma-below s/t (U+0219, U+021B) | Romanian standard, enforced in code | Project already correct |
| Global JS `n === 1 ? singular : plural` | ICU MessageFormat plurals | i18n best practice | Handles all CLDR plural categories |

## Open Questions

1. **Dual-key plural pairs — convert to ICU or leave as-is?**
   - What we know: 3 pairs exist (`moreNudge/moreNudges`, `item/items`, `member/members`); for Romanian, the JS ternary `=== 1 ? singular : plural` is accidentally correct because count=0 uses the same surface text as count=2 (both use plural form)
   - What's unclear: Does ROLN-02 require these be converted to ICU plurals?
   - Recommendation: Leave as-is unless explicitly required. Phrasing is correct; converting requires component code changes with no user-visible benefit.

2. **teams.json `member` key — is it used as a role label or a count?**
   - What we know: `teams.member = "Член"` is a role display value; `teams.members = "Membri ({count})"` is a count display
   - What's unclear: Whether component uses `=== 1 ? t('member') : t('members')` for count pluralization or just for role display
   - Recommendation: Audit component usage before deciding if Romanian fix is needed.

3. **Layout overflow — automated test or manual visual review?**
   - What we know: 53 truncate/whitespace-nowrap sites exist; highest risk is table headers and badges
   - What's unclear: Which specific components need responsive adjustments
   - Recommendation: Manual visual review with Romanian locale active; no automated screenshot test needed for this phase.

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — section omitted.

## Sources

### Primary (HIGH confidence)
- Node.js `Intl.PluralRules('ro')` — direct runtime verification of Romanian CLDR rules for values 0-119
- `messages/en/*.json` + `messages/ro/*.json` — direct file audit (Python scripts run on actual files)
- `src/` component grep — direct code audit for hardcoded strings and plural usage patterns
- `package.json` + `vitest.config.ts` — confirmed test infrastructure

### Secondary (MEDIUM confidence)
- CLDR Romanian plural rules: `n == 1` → one; `n % 100 in 1..19 or n == 0` → few; else → other (cross-verified with Node.js runtime)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; existing tools verified
- Architecture: HIGH — actual file audit done; key counts precise
- Pitfalls: HIGH — based on direct code inspection, not assumptions
- Romanian grammar: MEDIUM — diacritic replacement map based on linguistic knowledge; should be verified by native speaker review

**Research date:** 2026-03-07
**Valid until:** 2026-09-07 (stable domain — ICU/CLDR rules don't change)
