# Phase 15: Schema, Spec & Export

**Status**: Complete
**Milestone**: v1.2 AI-Ready Templates
**Depends on**: Phase 14 (v1.1 complete)
**Completed**: 2026-03-07

## Goal

Users can access the canonical JSON schema spec with methodology and weight system documentation, and export any template as a portable, tenant-neutral JSON file that any organization can import.

## Success Criteria

1. An admin can open the template schema documentation page, view the full JSON schema (all fields, types, and constraints), and download or copy it — the schema itself is always in English as a technical standard
2. An admin reading the methodology docs sees the core 1:1 principles and question-quality guidance rendered in the company's content language (not hardcoded English)
3. An admin reading the weight system docs sees how `scoreWeight` affects analytics, valid value ranges, and worked examples — all rendered in the company's content language
4. An admin or manager can export any template as a `.json` file — the export is tenant-neutral (no UUIDs, no tenant IDs, no internal references) and includes a `schemaVersion` field
5. An exported file can be imported by a different organization without any modification

## What Was Built

### Template Export System

- `src/lib/templates/export-schema.ts` — `buildExportPayload(template, contentLanguage)` strips all UUIDs/tenant IDs, converts `conditionalOnQuestionId` UUID references to `conditionalOnQuestionSortOrder` integers, serializes `scoreWeight` as a JS number (not string), sets `schemaVersion: 1`
- `src/lib/templates/import-schema.ts` — `templateImportSchema` Zod schema for round-trip validation; `formatImportErrors()` for field-specific error messages; `derivePreviewStats()` for import preview
- `GET /api/templates/[id]/export` — role-gated (admin/manager), returns JSON with `Content-Disposition: attachment` header

### Schema Documentation Page (`/templates/schema`)

Three-tab layout:
- **JSON Schema tab** — displays the canonical JSON Schema draft-07 document with Download and Copy buttons (`src/app/(dashboard)/templates/schema/schema-actions.tsx`)
- **Methodology tab** — 4 principle cards: psychological safety first, open-ended over closed, progressive depth, actionable closure — rendered in company content language via `spec.methodology.*` translation keys
- **Score Weights tab** — explains `scoreWeight` range (0.5–3.0), default (1.0), effect on analytics, with worked examples — rendered in company content language via `spec.weights.*` keys

### Translation Keys

- `messages/en/spec.json` and `messages/ro/spec.json` — new `spec` namespace with `methodology.*` and `weights.*` keys (EN + RO)

### Export Button in UI

- Template list cards: download icon on hover (admin/manager only, `canManageTemplates()` guard)
- Template builder toolbar: Export button before Publish

## Key Decisions

- **`schemaVersion: 1` as `const`** — exported in payload for future migration support
- **UUID → sortOrder conversion** — conditional question references converted to integer sort order in export so files are portable across tenants with different UUIDs
- **`scoreWeight` as number** — stored as `numeric` in DB but exported as JS float via `parseFloat()`; import schema accepts number
- **Schema doc always in English** — the JSON Schema technical standard stays in English; methodology/weights narrative is in content language

## Key Files

- `src/lib/templates/export-schema.ts` — export payload builder
- `src/lib/templates/import-schema.ts` — import validation schema
- `src/app/api/templates/[id]/export/route.ts` — export API route
- `src/app/(dashboard)/templates/schema/page.tsx` — schema docs page (3 tabs)
- `src/app/(dashboard)/templates/schema/schema-actions.tsx` — copy/download buttons
- `messages/en/spec.json`, `messages/ro/spec.json` — spec namespace translations
