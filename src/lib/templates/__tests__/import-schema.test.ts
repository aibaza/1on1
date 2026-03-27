import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  templateImportSchema,
  formatImportErrors,
  derivePreviewStats,
} from '../import-schema';
import { buildExportPayload } from '../export-schema';

// ---------------------------------------------------------------------------
// Shared fixture helpers (copied from export-schema.test.ts — do not import)
// ---------------------------------------------------------------------------

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';
const UUID_TENANT = '33333333-3333-3333-3333-333333333333';
const UUID_SECTION = '44444444-4444-4444-4444-444444444444';
const UUID_TEMPLATE = '55555555-5555-5555-5555-555555555555';

/** Minimal question fixture (all Drizzle fields present). */
function makeQuestion(overrides: Partial<{
  id: string;
  sectionId: string;
  templateId: string;
  tenantId: string;
  questionText: string;
  helpText: string | null;
  answerType: string;
  answerConfig: unknown;
  isRequired: boolean;
  sortOrder: number;
  scoreWeight: string | null;
  conditionalOnQuestionId: string | null;
  conditionalOperator: string | null;
  conditionalValue: string | null;
  isArchived: boolean;
  createdAt: string;
}> = {}) {
  return {
    id: UUID_A,
    sectionId: UUID_SECTION,
    templateId: UUID_TEMPLATE,
    tenantId: UUID_TENANT,
    questionText: 'How are you?',
    helpText: null,
    answerType: 'rating_1_5',
    answerConfig: null,
    isRequired: true,
    sortOrder: 0,
    scoreWeight: '1.00',
    conditionalOnQuestionId: null,
    conditionalOperator: null,
    conditionalValue: null,
    isArchived: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Minimal section fixture. */
function makeSection(questions: ReturnType<typeof makeQuestion>[], overrides: Partial<{
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
}> = {}) {
  return {
    id: UUID_SECTION,
    name: 'Check-in',
    description: null,
    sortOrder: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    questions,
    ...overrides,
  };
}

/** Minimal template fixture. */
function makeTemplate(sections: ReturnType<typeof makeSection>[], overrides: Partial<{
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isDefault: boolean;
  isArchived: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  return {
    id: UUID_TEMPLATE,
    tenantId: UUID_TENANT,
    name: 'Standard 1on1',
    description: null,
    isPublished: true,
    isDefault: false,
    isArchived: false,
    version: 1,
    createdBy: UUID_A,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    sections,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Minimal valid payload fixture for import schema tests
// ---------------------------------------------------------------------------

function makeValidPayload() {
  return {
    schemaVersion: 1,
    language: 'en',
    name: 'Test Template',
    description: null,
    sections: [
      {
        name: 'Section 1',
        description: null,
        sortOrder: 0,
        questions: [
          {
            questionText: 'How are you?',
            helpText: null,
            answerType: 'rating_1_5',
            answerConfig: {},
            isRequired: true,
            sortOrder: 0,
            scoreWeight: 1,
            conditionalOnQuestionSortOrder: null,
            conditionalOperator: null,
            conditionalValue: null,
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('templateImportSchema', () => {
  // Test 1: valid minimal payload passes
  it('accepts a minimal valid export payload (schemaVersion: 1, language: "en")', () => {
    const result = templateImportSchema.safeParse(makeValidPayload());
    expect(result.success).toBe(true);
  });

  // Test 2: schemaVersion: 2 is rejected
  it('rejects schemaVersion: 2 with error at path ["schemaVersion"]', () => {
    const payload = { ...makeValidPayload(), schemaVersion: 2 };
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => JSON.stringify(i.path));
      expect(paths).toContain(JSON.stringify(['schemaVersion']));
    }
  });

  // Test 3: invalid answerType "checkbox" is rejected at the nested question path
  it('rejects answerType "checkbox" (invalid) with issue at ["sections", 0, "questions", 0, "answerType"]', () => {
    const payload = makeValidPayload();
    payload.sections[0].questions[0].answerType = 'checkbox';
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => JSON.stringify(i.path));
      expect(paths).toContain(JSON.stringify(['sections', 0, 'questions', 0, 'answerType']));
    }
  });

  // Test 4: "scale_custom" is a valid answerType (pitfall check — must NOT be rejected)
  it('accepts answerType "scale_custom" (pitfall: must be in allowed set)', () => {
    const payload = makeValidPayload();
    payload.sections[0].questions[0].answerType = 'scale_custom';
    const result = templateImportSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});

describe('formatImportErrors', () => {
  // Test 5: nested path ["sections", 0, "questions", 2, "answerType"]
  it('formats path ["sections", 0, "questions", 2, "answerType"] as "Section 1, Question 3, field `answerType`"', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['sections', 0, 'questions', 2, 'answerType'],
        message: 'Expected string, received number',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ]);
    const errors = formatImportErrors(zodError);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('Section 1, Question 3, field `answerType`');
    expect(errors[0].message).toBeTruthy();
  });

  // Test 6: top-level path ["name"]
  it('formats path ["name"] as "field `name`"', () => {
    const zodError = new z.ZodError([
      {
        code: 'too_small',
        minimum: 1,
        type: 'string',
        inclusive: true,
        path: ['name'],
        message: 'String must contain at least 1 character(s)',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ]);
    const errors = formatImportErrors(zodError);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('field `name`');
  });

  // Test 7: root-level error (empty path [])
  it('formats path [] (root) as "root"', () => {
    const zodError = new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'Invalid input',
      },
    ]);
    const errors = formatImportErrors(zodError);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('root');
  });
});

describe('derivePreviewStats', () => {
  // Test 8: correct sectionCount, questionCount, and typeCounts for mixed payload
  it('returns correct sectionCount, questionCount, and typeCounts for a 2-section payload', () => {
    const payload = templateImportSchema.parse({
      schemaVersion: 1,
      language: 'en',
      name: 'Mixed Template',
      description: 'A mixed template',
      sections: [
        {
          name: 'Section A',
          description: null,
          sortOrder: 0,
          questions: [
            {
              questionText: 'Question 1',
              helpText: null,
              answerType: 'rating_1_5',
              answerConfig: {},
              isRequired: true,
              sortOrder: 0,
              scoreWeight: 1,
              conditionalOnQuestionSortOrder: null,
              conditionalOperator: null,
              conditionalValue: null,
            },
            {
              questionText: 'Question 2',
              helpText: null,
              answerType: 'yes_no',
              answerConfig: {},
              isRequired: false,
              sortOrder: 1,
              scoreWeight: 1,
              conditionalOnQuestionSortOrder: null,
              conditionalOperator: null,
              conditionalValue: null,
            },
          ],
        },
        {
          name: 'Section B',
          description: null,
          sortOrder: 1,
          questions: [
            {
              questionText: 'Question 3',
              helpText: null,
              answerType: 'rating_1_5',
              answerConfig: {},
              isRequired: true,
              sortOrder: 0,
              scoreWeight: 1,
              conditionalOnQuestionSortOrder: null,
              conditionalOperator: null,
              conditionalValue: null,
            },
          ],
        },
      ],
    });

    const stats = derivePreviewStats(payload);

    expect(stats.sectionCount).toBe(2);
    expect(stats.questionCount).toBe(3);
    expect(stats.typeCounts['rating_1_5']).toBe(2);
    expect(stats.typeCounts['yes_no']).toBe(1);
    expect(stats.name).toBe('Mixed Template');
    expect(stats.description).toBe('A mixed template');
  });
});

describe('Language mismatch detection (IMP-05 convention)', () => {
  // Test 9: language field equality check documents convention
  it('payload.language can be compared with company language for mismatch detection', () => {
    const payload = makeValidPayload(); // language: "en"
    // Simulates importing an "en" file into an "ro" company
    expect(payload.language === 'ro').toBe(false);
    expect(payload.language === 'en').toBe(true);
  });
});

describe('Copy suffix convention (IMP-04)', () => {
  // Test 10: appending " (copy)" documents the naming convention
  it('appending " (copy)" to a template name produces the expected string', () => {
    const name = 'Standard 1on1';
    const copyName = `${name} (copy)`;
    expect(copyName).toBe('Standard 1on1 (copy)');
  });
});

describe('Round-trip: buildExportPayload → templateImportSchema', () => {
  // Test 11: a valid export payload validates successfully through the import schema
  it('output of buildExportPayload() validates through templateImportSchema.safeParse()', () => {
    const template = makeTemplate([
      makeSection([
        makeQuestion({ answerType: 'rating_1_5', sortOrder: 0 }),
        makeQuestion({
          id: UUID_B,
          answerType: 'yes_no',
          sortOrder: 1,
          conditionalOnQuestionId: UUID_A,
        }),
      ]),
    ]);

    const exportPayload = buildExportPayload(template, 'en');
    const result = templateImportSchema.safeParse(exportPayload);

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DIY kit worked example (Phase 17 — AIGEN+DIY)
// A realistic high-quality template that can be used as prompt context and
// as a validation fixture for the AI generator output.
// ---------------------------------------------------------------------------

const DIY_WORKED_EXAMPLE = {
  schemaVersion: 1 as const,
  language: 'en',
  name: 'Engineering 1on1 Template',
  description: 'A structured template for weekly engineering 1on1 meetings.',
  sections: [
    {
      name: 'Check-in & Wellbeing',
      description: 'Understand how the person is doing overall.',
      sortOrder: 0,
      questions: [
        {
          questionText: 'How are you feeling this week overall?',
          helpText: '1 = struggling, 5 = excellent',
          answerType: 'rating_1_5' as const,
          answerConfig: {},
          isRequired: true,
          sortOrder: 0,
          scoreWeight: 3,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'Is there anything on your mind outside of work?',
          helpText: 'Optional — share only if comfortable',
          answerType: 'text' as const,
          answerConfig: {},
          isRequired: false,
          sortOrder: 1,
          scoreWeight: 0,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'Is your workload manageable right now?',
          helpText: null,
          answerType: 'yes_no' as const,
          answerConfig: {},
          isRequired: true,
          sortOrder: 2,
          scoreWeight: 2,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
      ],
    },
    {
      name: 'Work & Progress',
      description: 'Review progress, blockers, and priorities.',
      sortOrder: 1,
      questions: [
        {
          questionText: 'What did you accomplish since our last 1on1?',
          helpText: 'List 1-3 key things you completed or moved forward.',
          answerType: 'text' as const,
          answerConfig: {},
          isRequired: true,
          sortOrder: 0,
          scoreWeight: 0,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'What is blocking you or slowing you down?',
          helpText: 'Technical, organizational, or interpersonal blockers.',
          answerType: 'text' as const,
          answerConfig: {},
          isRequired: false,
          sortOrder: 1,
          scoreWeight: 1,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'How confident are you in your priorities for next week?',
          helpText: '1 = unclear, 10 = very clear',
          answerType: 'rating_1_10' as const,
          answerConfig: {},
          isRequired: true,
          sortOrder: 2,
          scoreWeight: 2,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
      ],
    },
    {
      name: 'Growth & Development',
      description: 'Support career growth and continuous learning.',
      sortOrder: 2,
      questions: [
        {
          questionText: 'What skill or area are you actively developing right now?',
          helpText: 'Can be technical, soft skills, or leadership.',
          answerType: 'text' as const,
          answerConfig: {},
          isRequired: false,
          sortOrder: 0,
          scoreWeight: 0,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'How satisfied are you with your growth opportunities here?',
          helpText: '1 = very dissatisfied, 5 = very satisfied',
          answerType: 'rating_1_5' as const,
          answerConfig: {},
          isRequired: true,
          sortOrder: 1,
          scoreWeight: 3,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
        {
          questionText: 'Is there anything I can do better as your manager?',
          helpText: 'Honest feedback helps us both improve.',
          answerType: 'text' as const,
          answerConfig: {},
          isRequired: false,
          sortOrder: 2,
          scoreWeight: 0,
          conditionalOnQuestionSortOrder: null,
          conditionalOperator: null,
          conditionalValue: null,
        },
      ],
    },
  ],
};

describe('DIY kit worked example', () => {
  it('DIY_WORKED_EXAMPLE passes templateImportSchema.parse() without error', () => {
    expect(() => templateImportSchema.parse(DIY_WORKED_EXAMPLE)).not.toThrow();
  });

  it('parsed DIY_WORKED_EXAMPLE has 3 sections and 9 questions total', () => {
    const parsed = templateImportSchema.parse(DIY_WORKED_EXAMPLE);
    const questionCount = parsed.sections.reduce(
      (sum, s) => sum + s.questions.length,
      0
    );
    expect(parsed.sections.length).toBe(3);
    expect(questionCount).toBe(9);
  });

  it('DIY_WORKED_EXAMPLE contains text, rating_1_5, and yes_no answer types', () => {
    const parsed = templateImportSchema.parse(DIY_WORKED_EXAMPLE);
    const allTypes = parsed.sections.flatMap((s) =>
      s.questions.map((q) => q.answerType)
    );
    expect(allTypes).toContain('text');
    expect(allTypes).toContain('rating_1_5');
    expect(allTypes).toContain('yes_no');
  });

  it('DIY_WORKED_EXAMPLE uses scoreWeight values 0, 1, 2, and 3', () => {
    const parsed = templateImportSchema.parse(DIY_WORKED_EXAMPLE);
    const allWeights = new Set(
      parsed.sections.flatMap((s) => s.questions.map((q) => q.scoreWeight))
    );
    expect(allWeights.has(0)).toBe(true);
    expect(allWeights.has(1)).toBe(true);
    expect(allWeights.has(2)).toBe(true);
    expect(allWeights.has(3)).toBe(true);
  });
});
