# Phase 17: AI Generator & DIY Kit - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create or edit templates through an in-app AI chat editor — a full-page split-screen where the template preview updates live as the AI chat evolves it. Users who prefer external AI tools can copy a complete prompt kit from the Schema docs page. All AI-generated content is in the company's content language.

Scope: AI chat editor (new + existing templates), live template preview, save/reset flow, DIY prompt kit tab on schema docs page. Does NOT include conversation persistence across sessions, streaming token-by-token response, or a template marketplace.

</domain>

<decisions>
## Implementation Decisions

### Entry Points
- "Generate with AI" button in the template list header, alongside Import and New Template
  - Wand icon (Lucide `Wand2`) + label "Generate with AI"
  - RBAC: admin + manager only — same `canManageTemplates()` guard as Import/Export
- "Edit with AI" button in the existing template builder header
  - Opens the AI editor pre-loaded with the existing template
  - The current manual builder remains available — AI editor is an additional path, not a replacement

### AI Editor Layout
- Full-page split-screen layout — NOT a dialog
  - Left panel: live template preview (visual form layout)
  - Right panel: AI chat
- New route: `/templates/ai-editor` (new template) and `/templates/[id]/ai-editor` (existing template)
- No initial seed form — the AI sends the first message and starts the conversation

### AI Chat Behavior
- AI opens new sessions with a greeting question: "Tell me about your team and what you want to achieve in your 1:1s"
- Existing template sessions: AI opens with a brief summary of the loaded template and asks "What would you like to improve?"
- When the AI modifies the template, it:
  1. Outputs the full replacement template as a JSON block (internal protocol — never displayed to user)
  2. Explains the changes in plain language in the same chat message
- JSON is parsed by the app and the preview re-renders — the user only sees the preview update + the chat explanation
- AI must generate all question text, help text, and section names in the company's content language (same `withLanguageInstruction()` pattern as the rest of the AI pipeline)

### AI System Prompt (research-driven — see research requirement)
- Full JSON schema spec (all fields, types, constraints, valid answer types)
- Methodology principles: what makes a good 1:1 question, conversation flow, psychological safety
- Weight system: how `scoreWeight` affects analytics, valid values, examples
- Expert in 1:1 meeting best practices — researcher must invest deeply in this (see below)
- Guides toward quality outcomes: proactively suggests improvements, flags weak questions, recommends coverage of key 1:1 topics

### Template Preview Panel
- Visual form layout: section headers + question text + answer type indicator (e.g., "Rating 1–5", "Yes/No", "Text") + help text
- Not interactive — read-only live preview
- Updates on every AI response that produces a new template JSON
- Empty state when no template exists yet: placeholder "Your template will appear here as you chat"

### Save & Reset Flow
- Save button in the editor header: saves the current template state
  - New template: creates template in DB, shows success toast, user stays in editor
  - Existing template: updates template in DB, shows success toast, user stays in editor
  - No redirect — user can keep chatting and saving iteratively
- Reset button: clears both the template preview (back to empty) and the chat history — requires a confirmation prompt ("Start over? This will clear the template and conversation.")
- Back button: navigates to template list (for new) or template builder (for existing) without saving — standard browser back

### Model
- Use Sonnet (same tier as summary/action suggestions) — template generation requires quality and nuance
- Non-streaming: full response before preview updates (simpler implementation, avoids partial JSON parse issues)

### DIY Prompt Kit
- 4th tab on the existing `/templates/schema` page — "Prompt Kit" tab
- Single copyable block containing all four elements:
  1. JSON schema spec (in English — technical standard)
  2. Core methodology principles (in company's content language)
  3. Weight system explanation (in company's content language)
  4. A complete worked example template (in company's content language)
- One "Copy" button copies the entire block to clipboard
- Narrative intro: "Paste this into Claude, ChatGPT, or any AI assistant to generate a 1on1 template"
- Translations: new `spec.promptKit.*` keys (EN + RO), same pattern as existing spec namespace

### Claude's Discretion
- Exact Zod schema shape for the AI output (must conform to `TemplateExport` interface)
- Chat message history format and how it's sent to the AI on follow-up turns
- Exact wording of the AI's opening message
- Layout proportions (left/right panel split ratio)
- Loading state design during AI response

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `generateText + Output.object` (`src/lib/ai/service.ts`) — established pattern for structured AI output; AI editor uses this for each chat turn
- `withLanguageInstruction()` (`src/lib/ai/service.ts`) — appends language instruction to system prompt; reuse for all AI editor responses
- `models` (`src/lib/ai/models.ts`) — add `templateEditor: anthropic("claude-sonnet-4-6")` (or latest Sonnet)
- `BASE_SYSTEM` (`src/lib/ai/prompts/base.ts`) — shared system preamble; AI editor has its own system prompt but can draw from same principles
- `TemplateExport` interface + `buildExportPayload()` (`src/lib/templates/export-schema.ts`) — AI output schema must conform to `TemplateExport`; app parses AI JSON using the same structure
- `canManageTemplates()` — RBAC guard already used in template-list, export-button, import-dialog
- `SchemaActions` + schema page tabs (`src/app/(dashboard)/templates/schema/`) — add 4th tab here for DIY kit
- Tenant `settings.preferredLanguage` pattern — already in pipeline.ts; same pattern for AI editor language resolution
- `withTenantContext` — used for all DB writes; template save goes through same pattern

### Established Patterns
- API routes: POST with Zod validation, tenant isolation, role check — new route `POST /api/templates/ai-generate` (or chat turn handler)
- `getTranslations()` for server components, `useTranslations()` for client components — new keys in `spec` namespace
- `useMutation` (TanStack Query) — established pattern for write operations; save template uses this

### Integration Points
- `template-list.tsx` — add "Generate with AI" button to header
- `src/app/(dashboard)/templates/[id]/page.tsx` (template builder) — add "Edit with AI" button to header
- New page: `src/app/(dashboard)/templates/ai-editor/page.tsx` (new template)
- New page: `src/app/(dashboard)/templates/[id]/ai-editor/page.tsx` (edit existing)
- New API route: `src/app/api/templates/ai-chat/route.ts` — accepts chat history + current template + user message, returns AI response + optional new template JSON
- `src/app/(dashboard)/templates/schema/page.tsx` — add "Prompt Kit" tab
- `messages/en/spec.json` + `messages/ro/spec.json` — add `promptKit.*` keys

</code_context>

<specifics>
## Specific Ideas

- The preview should feel like watching the template build itself in real-time — each AI turn that modifies the template causes a smooth re-render of the left panel
- The AI should be proactively helpful: not just respond to requests, but volunteer observations like "This section has 6 questions — that may be too long for a 30-minute 1:1; want me to trim it?"
- The AI is both a template schema expert AND a 1:1 methodology coach — the system prompt must reflect this dual expertise
- Research requirement: the researcher must invest significantly in 1:1 meeting best practices (question design, conversation flow, psychological safety, cadence, manager coaching patterns) so the AI system prompt is genuinely expert-level, not surface-level
- The worked example in the DIY kit should be a real, high-quality template that demonstrates best practices — not a toy example

</specifics>

<deferred>
## Deferred Ideas

- Streaming token-by-token AI responses — future UX enhancement; non-streaming is sufficient for v1
- Conversation persistence across sessions (save and resume chat history) — future phase
- Template marketplace / sharing AI-generated templates — future milestone
- "Suggest improvements" button on the template builder that kicks off an AI review without full chat — future enhancement
- Auto-translate AI-generated template to another language — TMTR-01, future phase

</deferred>

---

*Phase: 17-ai-generator-diy-kit*
*Context gathered: 2026-03-07*
