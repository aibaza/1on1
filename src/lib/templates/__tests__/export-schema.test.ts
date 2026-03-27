import { describe, it, expect } from 'vitest';
import { buildExportPayload } from '../export-schema';

// ---------------------------------------------------------------------------
// Shared fixture helpers
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
// Tests
// ---------------------------------------------------------------------------

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('buildExportPayload', () => {
  // Test 1 — EXP-02: schemaVersion is 1
  it('returns schemaVersion equal to 1 (EXP-02)', () => {
    const template = makeTemplate([makeSection([makeQuestion()])]);
    const result = buildExportPayload(template, 'en');
    expect(result.schemaVersion).toBe(1);
  });

  // Test 2 — EXP-04: language field matches contentLanguage argument
  it('sets language to the provided contentLanguage argument (EXP-04)', () => {
    const template = makeTemplate([makeSection([makeQuestion()])]);

    expect(buildExportPayload(template, 'en').language).toBe('en');
    expect(buildExportPayload(template, 'ro').language).toBe('ro');
  });

  // Test 3 — EXP-03: no UUID patterns in stringified output
  it('produces output with no UUID strings anywhere in JSON (EXP-03)', () => {
    const questionWithConditional = makeQuestion({
      id: UUID_A,
      sectionId: UUID_SECTION,
      templateId: UUID_TEMPLATE,
      tenantId: UUID_TENANT,
      conditionalOnQuestionId: UUID_B,
    });
    const questionB = makeQuestion({
      id: UUID_B,
      sortOrder: 0,
    });
    // Put B first so conditionalOnQuestionId resolves to sortOrder
    const section = makeSection([questionB, questionWithConditional], { id: UUID_SECTION });
    const template = makeTemplate([section], {
      id: UUID_TEMPLATE,
      tenantId: UUID_TENANT,
      createdBy: UUID_A,
    });

    const result = buildExportPayload(template, 'en');
    const json = JSON.stringify(result);
    expect(json).not.toMatch(UUID_REGEX);
  });

  // Test 4 — EXP-05a: scoreWeight is a JS number, not a string
  it('converts scoreWeight from Drizzle string to JS number (EXP-05a)', () => {
    const question = makeQuestion({ scoreWeight: '1.50' });
    const template = makeTemplate([makeSection([question])]);
    const result = buildExportPayload(template, 'en');

    expect(typeof result.sections[0].questions[0].scoreWeight).toBe('number');
    expect(result.sections[0].questions[0].scoreWeight).toBe(1.5);
  });

  // Test 5 — EXP-05b: answerConfig is an object (null → {})
  it('falls back answerConfig to {} when null (EXP-05b)', () => {
    const question = makeQuestion({ answerConfig: null });
    const template = makeTemplate([makeSection([question])]);
    const result = buildExportPayload(template, 'en');

    const ac = result.sections[0].questions[0].answerConfig;
    expect(typeof ac).toBe('object');
    expect(ac).not.toBeNull();
  });

  // Test 6 — conditional logic portability: uses sortOrder, not UUID
  it('resolves conditionalOnQuestionSortOrder to sortOrder integer, not UUID (conditional logic portability)', () => {
    const questionA = makeQuestion({ id: UUID_A, sortOrder: 0 });
    const questionB = makeQuestion({
      id: UUID_B,
      sortOrder: 1,
      conditionalOnQuestionId: UUID_A,
    });
    const section = makeSection([questionA, questionB]);
    const template = makeTemplate([section]);

    const result = buildExportPayload(template, 'en');
    const exportedB = result.sections[0].questions[1];

    expect(exportedB.conditionalOnQuestionSortOrder).toBe(0);
    // Must not have the old UUID field
    expect('conditionalOnQuestionId' in exportedB).toBe(false);
  });

  // Test 7 — null conditional stays null
  it('sets conditionalOnQuestionSortOrder to null when no conditional (null conditional)', () => {
    const question = makeQuestion({ conditionalOnQuestionId: null });
    const template = makeTemplate([makeSection([question])]);
    const result = buildExportPayload(template, 'en');

    expect(result.sections[0].questions[0].conditionalOnQuestionSortOrder).toBeNull();
  });
});
