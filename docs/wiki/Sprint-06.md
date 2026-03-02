# Sprint 06 — Questionnaire Template Builder

**Duration**: 2 weeks
**Dependencies**: Sprint 04
**Parallelizable with**: Sprint 05

## Goals

Build the template management system: template CRUD, all 6 MVP answer types with their input configuration, drag-and-drop question reordering, template versioning, and template preview.

## Deliverables

1. **Template list page**: all templates with name, category, status (draft/published), question count, version
2. **Template editor**:
   - Template metadata: name, description, category, default flag
   - Question list with drag-and-drop reordering (drag handle ≡)
   - Add question button, edit/delete per question
   - Question edit dialog: text, help text, answer type picker, type-specific config, category, required toggle
3. **6 answer type configurations**:
   - `text`: no config needed
   - `rating_1_5`: 5 customizable labels
   - `rating_1_10`: min/max endpoint labels
   - `yes_no`: no config needed
   - `multiple_choice`: options list + allow_multiple toggle
   - `mood`: emoji scale (fixed)
4. **Template actions**: save draft, publish, duplicate, archive
5. **Template versioning**: version increments on published template edit, past data preserved
6. **Template preview**: preview mode showing wizard appearance
7. **API routes**: `GET/POST /api/templates`, `GET/PUT/DELETE /api/templates/[id]`, `PUT /api/templates/[id]/publish`, `POST /api/templates/[id]/duplicate`
8. **Zod schemas**: template creation, question configuration per answer type

## Acceptance Criteria

- [ ] Manager/admin can create a new template with name, description, and category
- [ ] Can add questions with each of the 6 answer types, configured correctly
- [ ] `rating_1_5` shows 5 label fields, labels are optional (defaults provided)
- [ ] `rating_1_10` shows min/max label fields
- [ ] `multiple_choice` requires at least 2 options, allow_multiple toggle works
- [ ] `mood` shows fixed emoji scale preview
- [ ] Questions can be reordered via drag-and-drop
- [ ] Template can be saved as draft (not visible to others)
- [ ] Template can be published (visible to all managers for selection)
- [ ] Publishing a draft changes status; editing a published template increments version
- [ ] Template can be duplicated (creates new draft with same questions)
- [ ] Template can be archived (hidden from selection, linked to past sessions)
- [ ] Template preview shows wizard-like step-by-step view
- [ ] Template must have at least 1 question to be published
- [ ] Template name is required (validation error if empty)
- [ ] Members cannot access template management

## Key Files

```
src/app/(dashboard)/templates/page.tsx          # Template list
src/app/(dashboard)/templates/new/page.tsx      # Create template
src/app/(dashboard)/templates/[id]/page.tsx     # Edit template
src/app/api/templates/route.ts
src/app/api/templates/[id]/route.ts
src/app/api/templates/[id]/publish/route.ts
src/app/api/templates/[id]/duplicate/route.ts
src/components/templates/template-editor.tsx
src/components/templates/question-form.tsx
src/components/templates/answer-type-picker.tsx
src/components/templates/template-preview.tsx
src/lib/validations/template.ts
```
