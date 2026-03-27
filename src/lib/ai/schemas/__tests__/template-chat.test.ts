import { describe, it, expect } from 'vitest';
import { templateChatResponseSchema } from '../template-chat';
import type { ChatTurnResponse } from '../template-chat';

// ---------------------------------------------------------------------------
// Wave 0 — RED phase
// These tests FAIL until Wave 1 (17-02) creates src/lib/ai/schemas/template-chat.ts
// Expected failure: "Cannot find module '../template-chat'"
// ---------------------------------------------------------------------------

describe('templateChatResponseSchema', () => {
  // Test 1: valid parse — chatMessage present, templateJson null
  it('accepts a response with chatMessage present and templateJson null', () => {
    const result = templateChatResponseSchema.safeParse({
      chatMessage: 'How can I help you build your template?',
      templateJson: null,
    });
    expect(result.success).toBe(true);
  });

  // Test 2: valid parse — chatMessage present, templateJson is a valid TemplateExport-shaped object
  it('accepts a response with chatMessage present and templateJson as a valid TemplateExport', () => {
    const result = templateChatResponseSchema.safeParse({
      chatMessage: 'Here is your template:',
      templateJson: {
        schemaVersion: 1,
        language: 'en',
        name: 'Engineering 1on1',
        description: null,
        sections: [
          {
            name: 'Check-in',
            description: null,
            sortOrder: 0,
            questions: [
              {
                questionText: 'How are you feeling this week?',
                helpText: null,
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
      },
    });
    expect(result.success).toBe(true);
  });

  // Test 3: invalid parse — empty chatMessage (min 1 char)
  it('rejects an empty chatMessage string', () => {
    const result = templateChatResponseSchema.safeParse({
      chatMessage: '',
      templateJson: null,
    });
    expect(result.success).toBe(false);
  });

  // Test 4: invalid parse — missing chatMessage entirely
  it('rejects when chatMessage is missing', () => {
    const result = templateChatResponseSchema.safeParse({
      templateJson: null,
    });
    expect(result.success).toBe(false);
  });
});

describe('ChatTurnResponse type', () => {
  // Compile-time type check — ensures the inferred type has the expected fields
  it('ChatTurnResponse type has chatMessage: string and templateJson: TemplateExport | null', () => {
    // If the type is correct, this assignment compiles without error
    const validResponse: ChatTurnResponse = {
      chatMessage: 'Here is your template.',
      templateJson: null,
    };
    expect(validResponse.chatMessage).toBe('Here is your template.');
    expect(validResponse.templateJson).toBeNull();
  });
});
