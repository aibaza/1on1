# Phase 17: AI Generator & DIY Kit

**Status**: In Progress
**Milestone**: v1.2 AI-Ready Templates
**Depends on**: Phase 15
**Completed**: —

## Goal

Users can generate a complete, ready-to-use template draft through an in-app AI flow, and can access a copyable prompt kit to build templates with external AI tools on their own.

## Success Criteria

1. An admin or manager opens "Generate with AI", describes their team and meeting goals in plain text, and receives a complete template draft (name, sections, questions with help text) within the generation flow — all question text is in the company's content language
2. The generated template draft appears in a preview showing name, section count, and question type breakdown before any data is saved — user can accept, discard, or open the template builder to edit before saving
3. The AI generation prompt includes the JSON schema spec, methodology principles, and weight system documentation as structured context so that generated templates conform to the schema and follow 1:1 best practices
4. A user accesses the DIY prompt kit page, sees the full copyable block (JSON schema + methodology principles + worked example), and the narrative and example content render in the company's content language (the JSON schema block itself remains in English)

## What Was Built

*In progress — will be updated on completion.*

## Key Decisions

- **Full-page split-screen AI editor** — left panel: live template preview; right panel: AI chat. Not a dialog. Routes: `/templates/ai-editor` (new) and `/templates/[id]/ai-editor` (edit existing)
- **AI response shape** — each turn uses `generateText + Output.object` with `{ templateJson: nullable, chatMessage: string }`. JSON parsed silently; only `chatMessage` shown to user
- **Non-streaming** — full response before preview updates; avoids partial JSON parse issues
- **Model** — Claude Sonnet (same tier as session summaries and action suggestions)
- **Stateless chat** — client holds full message history; sends complete history on every API call (rolling 20-message window for long sessions)
- **Language handling** — `withLanguageInstruction()` pattern; system prompt explicitly scopes JSON field names to English while question text / section names / chatMessage are in content language
- **DIY kit** — 4th tab on `/templates/schema` page; single copyable block with JSON schema (EN) + methodology + weights + worked example (content language)
- **No redirect on save** — user stays in editor after saving; can keep chatting and saving iteratively

## Key Files

*To be filled in on completion.*
