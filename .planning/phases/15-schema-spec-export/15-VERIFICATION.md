---
phase: 15-schema-spec-export
verified: 2026-03-07T09:00:00Z
status: passed
score: 11/11 automated must-haves verified
human_verification:
  - test: "Member user sees no Export button in template list or editor"
    expected: "Export button (icon on cards, full in toolbar) is completely absent for member role"
    why_human: "canManageTemplates() conditional rendering requires live browser session with member JWT"
  - test: "Admin/manager sees Export button in both template list cards and editor toolbar"
    expected: "Download icon appears on hover over template cards; Export button appears in editor toolbar before Publish"
    why_human: "Role-gated rendering requires live browser session with admin/manager JWT"
  - test: "Clicking Export downloads a .json file to disk"
    expected: "Browser downloads a file named like 'standard-1-1-v1.json' containing valid JSON with schemaVersion, language, no UUIDs, numeric scoreWeight"
    why_human: "File download behavior (createObjectURL + anchor click) requires a real browser; cannot be tested programmatically"
  - test: "/templates/schema page loads with three tabs rendering correctly"
    expected: "JSON Schema tab shows code block; Methodology tab shows 4 principle cards; Score Weights tab shows range, default, worked examples"
    why_human: "Server Component rendering in production-like environment with correct translations requires browser verification"
  - test: "Methodology and Score Weights tabs render in company content language, not hardcoded English"
    expected: "If content language is Romanian, tabs display Romanian text via spec.json ro translations"
    why_human: "Content language rendering depends on session.user.contentLanguage from DB, which requires a live authenticated session"
  - test: "Schema Docs page Download Schema button downloads a .json file containing the JSON Schema draft-07 document"
    expected: "File named '1on1-template-schema-v1.json' downloads; JSON content is parseable and contains $schema, title, and properties"
    why_human: "Blob download behavior requires browser verification"
  - test: "Copy button on schema docs page writes schema JSON to clipboard"
    expected: "navigator.clipboard.writeText is called; button changes to 'Copied!' for 2 seconds"
    why_human: "Clipboard API requires browser permission grant; cannot test programmatically"
---

# Phase 15: Schema, Spec & Export Verification Report

**Phase Goal:** Users can access the canonical JSON schema spec with methodology and weight system documentation, and export any template as a portable, tenant-neutral JSON file that any organization can import

**Verified:** 2026-03-07T09:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | buildExportPayload returns schemaVersion equal to 1 (EXP-02) | VERIFIED | `export-schema.ts:105` returns `schemaVersion: SCHEMA_VERSION` where `SCHEMA_VERSION = 1 as const`; Test 1 in `export-schema.test.ts` asserts `result.schemaVersion === 1` |
| 2 | buildExportPayload output contains no UUID patterns at any level (EXP-03) | VERIFIED | Function strips id/tenantId/sectionId/templateId/createdBy; converts conditionalOnQuestionId to sortOrder via Map; Test 3 asserts `JSON.stringify(result)` does not match UUID regex |
| 3 | buildExportPayload output language field matches the contentLanguage argument (EXP-04) | VERIFIED | `export-schema.ts:106` sets `language: contentLanguage`; Test 2 asserts both "en" and "ro" pass through correctly |
| 4 | buildExportPayload output scoreWeight is a JS number; answerConfig is an object (EXP-05) | VERIFIED | `export-schema.ts:120` uses `parseFloat(q.scoreWeight ?? "1")`; answerConfig uses `?? {}`; Tests 4 and 5 verify both |
| 5 | conditionalOnQuestionSortOrder is an integer sortOrder value, never a UUID string | VERIFIED | UUID→sortOrder Map built from all questions before mapping; Tests 6 and 7 verify value and field-name absence |
| 6 | GET /api/templates/[id]/export returns a downloadable .json file with Content-Disposition: attachment | VERIFIED | `route.ts:132-137` returns `new Response(JSON.stringify(exported, null, 2), { headers: { "Content-Disposition": \`attachment; filename="${filename}"\` } })` |
| 7 | Export route returns 403 for member role and 401 for unauthenticated requests | VERIFIED | `route.ts:26-31` returns 401 if no session; returns 403 if `!canManageTemplates(session.user.role)` |
| 8 | /templates/schema page renders the JSON schema block in English | VERIFIED | `page.tsx:19-94` embeds a hardcoded `TEMPLATE_JSON_SCHEMA` constant as static English JSON string in `<pre><code>` block |
| 9 | Methodology and score weights sections render via t() from the spec namespace (not hardcoded English) | VERIFIED | `page.tsx:102` uses `(tSpec as any)(\`spec.${key}\`)` pattern; all methodology and weights content goes through this call; no hardcoded English strings in those sections |
| 10 | ExportButton component fetches /api/templates/[id]/export and downloads a .json file | VERIFIED | `export-button.tsx:23` calls `fetch(\`/api/templates/${templateId}/export\`)`, extracts filename from Content-Disposition header, creates blob URL, triggers anchor download |
| 11 | ExportButton is wired into template-list.tsx (icon variant, role-gated) and template-editor.tsx (full variant, role-gated) | VERIFIED | `template-list.tsx:220-224` renders `<ExportButton templateId={template.id} variant="icon" />` inside `canManageTemplates(currentUserRole)` gate; `template-editor.tsx:565-567` renders `<ExportButton templateId={template!.id} variant="full" />` inside `canManageTemplates(userRole)` gate |

**Score:** 11/11 truths verified (automated)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/templates/export-schema.ts` | TemplateExport interface, SCHEMA_VERSION, buildExportPayload | VERIFIED | 130 lines; exports SCHEMA_VERSION=1, TemplateExport, ExportSection, ExportQuestion interfaces, buildExportPayload function |
| `src/lib/templates/__tests__/export-schema.test.ts` | 7 Vitest unit tests covering EXP-02 through EXP-05 | VERIFIED | 200 lines; 7 tests with makeQuestion/makeSection/makeTemplate helpers; all EXP requirements covered |
| `src/app/api/templates/[id]/export/route.ts` | GET handler returning tenant-neutral JSON with Content-Disposition attachment | VERIFIED | 143 lines; auth check, RBAC check, DB query with withTenantContext, buildExportPayload call, bare Response with Content-Disposition header |
| `messages/en/spec.json` | English translations for spec page (pageTitle, tabs, schema, methodology, weights sections) | VERIFIED | 54 lines; complete spec namespace with all required keys |
| `messages/ro/spec.json` | Romanian translations with identical key structure | VERIFIED | 54 lines; identical key structure, Romanian content using angle quotes «» to avoid JSON parse issues |
| `src/app/(dashboard)/templates/schema/page.tsx` | Server Component rendering schema block + methodology + weights tabs | VERIFIED | 224 lines; three Tabs (schema, methodology, weights); hardcoded JSON schema; getTranslations() + as-any pattern for all spec keys |
| `src/app/(dashboard)/templates/schema/schema-actions.tsx` | Client component for copy and download | VERIFIED | 65 lines; navigator.clipboard.writeText + createObjectURL download; receives translated labels as props |
| `src/components/templates/export-button.tsx` | Reusable ExportButton client component | VERIFIED | 85 lines; "icon" and "full" variants; loading state spinner; blob download; toast success/error feedback |
| `messages/en/templates.json` (export keys) | export.button, exporting, downloaded, failed, schemaLink keys | VERIFIED | export object with 5 keys present at line 113 |
| `messages/ro/templates.json` (export keys) | Romanian equivalents with identical key structure | VERIFIED | export object with 5 keys present at line 113, identical structure |
| `src/global.d.ts` (spec namespace registration) | spec.json imported and added to Messages type | VERIFIED | `import type en_spec from "../messages/en/spec.json"` and `typeof en_spec` in Messages union |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `export-schema.test.ts` | `export-schema.ts` | `import buildExportPayload` | WIRED | Line 2: `import { buildExportPayload } from '../export-schema'` |
| `src/app/api/templates/[id]/export/route.ts` | `src/lib/templates/export-schema.ts` | `import buildExportPayload` | WIRED | Line 4: `import { buildExportPayload } from "@/lib/templates/export-schema"` |
| `src/app/(dashboard)/templates/schema/page.tsx` | `messages/en/spec.json` | `getTranslations()` + as-any `spec.*` | WIRED | Line 100-102: `const tSpec = await getTranslations(); const t = (key: string) => (tSpec as any)(\`spec.${key}\`)` |
| `messages/en/spec.json` | `messages/ro/spec.json` | key parity (translation CI test) | WIRED | Both files have identical 54-line structure; QUAL-01 CI parity test covers the spec namespace |
| `src/components/templates/export-button.tsx` | `/api/templates/[id]/export` | `fetch` in handleExport | WIRED | Line 23: `const res = await fetch(\`/api/templates/${templateId}/export\`)` with blob download handling |
| `src/components/templates/template-list.tsx` | `src/components/templates/export-button.tsx` | `import ExportButton` | WIRED | Line 14: `import { ExportButton } from "@/components/templates/export-button"`; used at line 222 |
| `src/components/templates/template-editor.tsx` | `src/components/templates/export-button.tsx` | `import ExportButton` | WIRED | Line 79: `import { ExportButton } from "@/components/templates/export-button"`; used at line 566 |
| `src/app/(dashboard)/templates/schema/page.tsx` | `./schema-actions` | `import SchemaActions` | WIRED | Line 13: `import { SchemaActions } from "./schema-actions"`; used at line 142 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SPEC-01 | 15-02 | JSON schema document accessible in-app, downloadable and copyable | SATISFIED | schema-actions.tsx provides download + copy; page.tsx embeds the JSON schema block |
| SPEC-02 | 15-02 | In-app methodology documentation rendered in company content language | SATISFIED | page.tsx Methodology tab uses `t("methodology.*")` keys from spec.json; content language from session |
| SPEC-03 | 15-02 | Score weight system documented in company content language | SATISFIED | page.tsx Score Weights tab uses `t("weights.*")` keys from spec.json; content language from session |
| EXP-01 | 15-03 (UI), 15-04 (verification) | Admin/manager can export template from list or builder | SATISFIED (automated portion) | ExportButton in template-list.tsx (icon, role-gated) and template-editor.tsx (full, role-gated); HUMAN verification required for actual UI behavior |
| EXP-02 | 15-01 | Exported JSON includes schemaVersion field | SATISFIED | export-schema.ts returns `schemaVersion: 1`; route calls buildExportPayload; 7 unit tests pass |
| EXP-03 | 15-01 | Exported JSON is tenant-neutral — no internal UUIDs | SATISFIED | buildExportPayload strips all UUIDs; conditionalOnQuestionId remapped to sortOrder; Test 3 asserts no UUID pattern |
| EXP-04 | 15-01 | Exported JSON includes language field matching content language | SATISFIED | route.ts passes `session.user.contentLanguage` to buildExportPayload; Test 2 verifies passthrough |
| EXP-05 | 15-01 | Exported JSON captures all question metadata with correct types | SATISFIED | scoreWeight is parseFloat'd; answerConfig defaults to {}; conditional logic uses sortOrder; Tests 4-7 verify all |

All 8 Phase 15 requirements (SPEC-01..03, EXP-01..05) are accounted for. No orphaned requirements.

**Requirements from REQUIREMENTS.md traceability table marked Complete for Phase 15:**
- SPEC-01, SPEC-02, SPEC-03, EXP-01, EXP-02, EXP-03, EXP-04, EXP-05 — all verified in code.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(dashboard)/templates/schema/page.tsx` | 101 | `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `(tSpec as any)` | Info | Known codebase pattern (documented as decision 12-04 in STATE.md) — TypeScript union complexity limit exceeded at 16+ namespaces; no functional impact |
| `src/app/api/templates/[id]/export/route.ts` | 52 | `return null` inside withTenantContext callback | Info | Not a stub — this is an early-return sentinel for "not found" handled correctly at line 116-118 |

No blockers or warnings found. Zero TODO/FIXME comments in phase-created files. No empty implementations. No placeholder content.

---

### Human Verification Required

#### 1. Member role sees no Export button

**Test:** Log in as a member user. Navigate to /templates. Check all template cards. Open any template at /templates/[id].
**Expected:** No Export button (download icon) visible on cards. No Export button in editor toolbar.
**Why human:** `canManageTemplates()` conditional rendering gates on `currentUserRole`/`userRole` props which come from the authenticated JWT — requires live browser session.

#### 2. Admin/manager sees Export button in both locations

**Test:** Log in as admin or manager. Navigate to /templates. Hover over a template card. Open any template at /templates/[id].
**Expected:** Download icon appears on hover over template cards (top-right, opacity-0 group-hover:opacity-100). "Export" button with Download icon appears in editor toolbar before the Publish button.
**Why human:** Hover-reveal pattern (Tailwind group/group-hover) and toolbar position require visual confirmation.

#### 3. Export download produces valid tenant-neutral JSON

**Test:** As admin or manager, click the Export button (card or editor toolbar) for any template.
**Expected:** Browser downloads a file named like `standard-1-1-v1.json`. Open the file and verify: `"schemaVersion": 1` (integer), `"language": "en"` or `"ro"`, no UUID-pattern fields anywhere, `scoreWeight` values are numbers not strings, `answerConfig` is an object, conditional questions have `conditionalOnQuestionSortOrder` as integer.
**Why human:** File download trigger (createObjectURL + anchor click + revokeObjectURL) requires real browser DOM.

#### 4. /templates/schema page three-tab rendering

**Test:** Navigate to /templates/schema (or click "Schema Docs" link in template list header).
**Expected:** Page loads with title "Template Schema & Documentation". Three tabs visible: JSON Schema, Methodology, Score Weights. JSON Schema tab shows formatted code block. Methodology tab shows 4 principle cards. Score Weights tab shows range, default value, examples.
**Why human:** Server Component rendering with next-intl getTranslations requires live Next.js environment.

#### 5. Methodology and Score Weights tabs respect content language

**Test:** Set company content language to Romanian (if not already). Navigate to /templates/schema. Click Methodology and Score Weights tabs.
**Expected:** Content displays in Romanian (e.g., "Principii pentru ședințele 1:1" as section title, not "1:1 Meeting Principles").
**Why human:** content language comes from `session.user.contentLanguage` derived from DB; requires authenticated session with Romanian content language set.

#### 6. Download Schema button on schema docs page

**Test:** On /templates/schema, JSON Schema tab, click "Download Schema".
**Expected:** File `1on1-template-schema-v1.json` downloads. File is valid JSON containing `$schema`, `title`, `type`, `properties`.
**Why human:** Blob download via SchemaActions client component requires browser.

#### 7. Copy button on schema docs page

**Test:** On /templates/schema, JSON Schema tab, click "Copy".
**Expected:** Button text changes to "Copied!" for 2 seconds. Pasting in a text editor shows the full JSON Schema.
**Why human:** `navigator.clipboard.writeText` requires browser permissions API.

---

### Gaps Summary

No gaps found in automated verification. All 11 observable truths pass all three levels (exists, substantive, wired). All 8 requirement IDs are satisfied by concrete, non-stub implementations.

The phase status is `human_needed` because Plan 04 explicitly requires browser-based manual verification of role-gating (EXP-01), download behavior, and schema docs page rendering. These items cannot be verified programmatically.

The code is complete and correctly wired. Human verification confirms the browser experience, not the existence or correctness of the implementation.

---

*Verified: 2026-03-07T09:00:00Z*
*Verifier: Claude (gsd-verifier)*
