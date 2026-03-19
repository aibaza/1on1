# Phase 29: Template Versioning & Answer Remapping - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

When a template is modified via AI editor or manual edits and republished, snapshot the current version to a `template_version` table (JSONB), preserve answer integrity by keeping FKs to original question rows, and show version history in the template UI with restore capability. Prevents answer loss on template edits.

</domain>

<decisions>
## Implementation Decisions

### Version Snapshot Strategy
- Snapshot created **on publish only** — draft edits don't create versions
- New `template_version` table (not JSONB column) — dedicated, queryable, indexable
- Existing `aiVersionHistory` JSONB column stays for AI chat context only, not formal versioning
- Snapshot contains **full template + questions + sections** — complete self-contained record
- Version numbers auto-increment (v1, v2, v3...) with timestamp — no user-provided labels
- Each version row stores: version_number, template_id, snapshot JSONB, created_at, created_by

### Answer Remapping Rules
- **No remapping** — answers always point to the original question_id they were answered for
- Old questions stay in DB with `isArchived=true` — never deleted
- Version snapshot records what the template looked like at publish time
- Analytics track by question_id — if a question is archived and a new one created, they're separate trend lines (no false continuity)
- When viewing session history, show the **original question text** as it was when answered (from version snapshot)
- Scheduled/draft sessions **auto-upgrade** to latest published version — no answers to preserve yet

### Version History UI
- Accessible via a **"History" tab** in the template editor (alongside Questions, Settings, etc.)
- Each version entry shows: version number, date, author name, question count
- Clicking a version shows **read-only template preview** with a toggle to **change list summary** (diff)
- Change list format: bulleted list of additions, removals, and modifications (not inline highlights or side-by-side)
- "Restore this version" button visible on each version preview

### Restore Behavior
- Restoring creates a **new version from old** — append-only history (v1→v2→v3→v4(=v2 content))
- Restored content loads as **unpublished draft** — user must review and explicitly publish
- **Confirmation dialog** before restore with impact summary: question count, scheduled session status
- Permissions: same as template edit — `canManageTemplates()` check, no new permission needed

### Claude's Discretion
- Version snapshot JSONB schema structure (sections, questions, answer configs)
- Change list diff computation algorithm
- History tab empty state when template has only one version
- Exact confirmation dialog wording
- Mobile responsiveness of history tab and version preview

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Template system
- `src/lib/db/schema/templates.ts` — Current template, section, and question table definitions; existing `version` integer field and `aiVersionHistory` JSONB column
- `src/lib/db/schema/answers.ts` — `session_answer` table with `question_id` FK to `template_question`; unique index on (session_id, question_id)
- `src/app/api/templates/[id]/route.ts` — Template CRUD API; PATCH handler for template updates
- `src/app/api/templates/[id]/ai-history/route.ts` — AI version snapshot persistence pattern; shows how JSONB snapshots are currently stored and retrieved
- `src/app/api/templates/[id]/publish/route.ts` — Publish endpoint where version snapshot creation should be triggered
- `src/lib/validations/template.ts` — Template Zod schemas (updateTemplateSchema, saveTemplateSchema)

### Template UI
- `src/app/(dashboard)/templates/[id]/` — Template editor page
- `src/components/templates/template-editor.tsx` — Main editor component where History tab would be added
- `src/components/templates/question-card.tsx` — Question display component; reusable in version preview

### Authorization
- `src/lib/auth/rbac.ts` — `canManageTemplates()` function used for permission checks

### Data model
- `docs/data-model.md` — Complete database schema documentation; update with new `template_version` table
- `docs/questionnaires.md` — Question types, answer formats, template system design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `questionnaireTemplates.version` integer field: already tracks version number, can be incremented on publish
- `aiVersionHistory` JSONB pattern: shows how snapshots are stored/retrieved, but formal versioning uses a separate table
- `withTenantContext()`: transaction wrapper used by all template API routes
- `logAuditEvent()`: audit logging for template changes
- `canManageTemplates()`: RBAC check reusable for version history access and restore
- `question-card.tsx`: can be reused in read-only mode for version preview

### Established Patterns
- Soft-delete via `isArchived` boolean on questions and sections — preserved for answer integrity
- Template PATCH route increments version integer — hook into this for snapshot creation
- JSONB storage for complex nested data (aiVersionHistory, answerConfig)
- Tab-based layout in template editor — History tab follows same pattern

### Integration Points
- `POST /api/templates/[id]/publish` — trigger point for creating version snapshot
- Template editor component — add History tab
- Session history/summary pages — resolve question text from version snapshot when displaying old answers
- `GET /api/templates/[id]` — may need to include version metadata

</code_context>

<specifics>
## Specific Ideas

- Version entries should be compact and scannable — "v3 — Mar 19, 2026 — Ciprian — 12 questions"
- Change list summary style for diffs: "Added: Q5 'How do you feel about...', Removed: Q3 'Rate your...', Changed: Q1 text updated"
- Restore confirmation should explicitly mention impact on scheduled sessions

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-template-versioning-answer-remapping*
*Context gathered: 2026-03-19*
