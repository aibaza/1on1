import { describe, it, expect } from 'vitest';
import { buildTemplateEditorSystemPrompt } from '../template-editor';
import type { TemplateExport } from '../../../templates/export-schema';

// ---------------------------------------------------------------------------
// Wave 0 — RED phase
// These tests FAIL until Wave 1 (17-02) creates src/lib/ai/prompts/template-editor.ts
// Expected failure: "Cannot find module '../template-editor'"
// ---------------------------------------------------------------------------

/** Sample TemplateExport for testing the optional existingTemplate parameter */
const SAMPLE_TEMPLATE: TemplateExport = {
  schemaVersion: 1,
  language: 'en',
  name: 'Engineering 1on1',
  description: 'A structured template for engineering 1on1 meetings',
  sections: [
    {
      name: 'Check-in',
      description: null,
      sortOrder: 0,
      questions: [
        {
          questionText: 'How are you feeling this week?',
          helpText: 'Rate your overall mood and energy level',
          answerType: 'mood',
          answerConfig: {},
          isRequired: true,
          sortOrder: 0,
          scoreWeight: 2,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
      ],
    },
  ],
};

describe('buildTemplateEditorSystemPrompt', () => {
  // Test 1: prompt contains schema spec section
  it('returns a string containing "JSON schema" (schema spec section present)', () => {
    const prompt = buildTemplateEditorSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('JSON schema');
  });

  // Test 2: prompt contains methodology / principles section
  it('returns a string containing "methodology" or "principles" (methodology section present)', () => {
    const prompt = buildTemplateEditorSystemPrompt();
    const hasMethodology =
      prompt.toLowerCase().includes('methodology') ||
      prompt.toLowerCase().includes('principles');
    expect(hasMethodology).toBe(true);
  });

  // Test 3: prompt contains scoreWeight section
  it('returns a string containing "scoreWeight" (weight system section present)', () => {
    const prompt = buildTemplateEditorSystemPrompt();
    expect(prompt).toContain('scoreWeight');
  });

  // Test 4: with existingTemplate — embeds the template JSON in the prompt
  it('embeds the template JSON in the prompt when existingTemplate is provided', () => {
    const prompt = buildTemplateEditorSystemPrompt(SAMPLE_TEMPLATE);
    // The template name should appear in the serialized JSON
    expect(prompt).toContain('Engineering 1on1');
  });

  // Test 5: without existingTemplate — does NOT contain a template JSON block
  it('does not contain a template JSON block when no existingTemplate is provided', () => {
    const prompt = buildTemplateEditorSystemPrompt();
    // The sample template's name should NOT appear
    expect(prompt).not.toContain('Engineering 1on1');
  });
});
