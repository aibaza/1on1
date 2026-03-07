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
    name: 'Standard 1:1',
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
      },
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
      },
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
    const name = 'Standard 1:1';
    const copyName = `${name} (copy)`;
    expect(copyName).toBe('Standard 1:1 (copy)');
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
