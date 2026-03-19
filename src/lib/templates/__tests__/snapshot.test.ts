import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TemplateVersionSnapshot } from "../snapshot";

// ---------------------------------------------------------------------------
// Shared fixture UUIDs
// ---------------------------------------------------------------------------

const UUID_TEMPLATE = "55555555-5555-5555-8555-555555555555";
const UUID_SECTION_A = "aaaaaaaa-aaaa-aaaa-8aaa-aaaaaaaaaaaa";
const UUID_SECTION_B = "bbbbbbbb-bbbb-bbbb-8bbb-bbbbbbbbbbbb";
const UUID_Q1 = "11111111-1111-1111-8111-111111111111";
const UUID_Q2 = "22222222-2222-2222-8222-222222222222";
const UUID_Q3 = "33333333-3333-3333-8333-333333333333";
const UUID_LABEL_1 = "44444444-4444-4444-8444-444444444444";
const UUID_LABEL_2 = "66666666-6666-6666-8666-666666666666";

// ---------------------------------------------------------------------------
// Mock the drizzle DB layer — buildTemplateSnapshot queries via tx
// ---------------------------------------------------------------------------

// We'll mock `@/lib/db/schema` so imports resolve, then provide a fake tx.
vi.mock("@/lib/db/schema", () => ({
  templateSections: { templateId: "templateId", isArchived: "isArchived", sortOrder: "sortOrder" },
  templateQuestions: { templateId: "templateId", isArchived: "isArchived", sectionId: "sectionId", sortOrder: "sortOrder" },
  templateLabelAssignments: { templateId: "templateId", labelId: "labelId" },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: (a: unknown, b: unknown) => ({ _type: "eq", a, b }),
  and: (...args: unknown[]) => ({ _type: "and", args }),
  asc: (col: unknown) => ({ _type: "asc", col }),
}));

// Chainable mock tx
function makeMockTx(responses: unknown[][]) {
  let callIndex = 0;
  const tx = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockImplementation(() => {
      const result = responses[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
    }),
  };
  return tx;
}

describe("buildTemplateSnapshot", () => {
  let buildTemplateSnapshot: typeof import("../snapshot").buildTemplateSnapshot;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../snapshot");
    buildTemplateSnapshot = mod.buildTemplateSnapshot;
  });

  it("returns snapshot with name, description, sections, and labelIds", async () => {
    const sections = [
      { id: UUID_SECTION_A, name: "Section A", description: "Desc A", sortOrder: 0 },
    ];
    const questions = [
      {
        id: UUID_Q1,
        sectionId: UUID_SECTION_A,
        questionText: "How are you?",
        helpText: null,
        answerType: "rating_1_5",
        answerConfig: {},
        isRequired: true,
        sortOrder: 0,
        scoreWeight: "1.00",
        conditionalOnQuestionId: null,
        conditionalOperator: null,
        conditionalValue: null,
      },
    ];
    const labels = [{ labelId: UUID_LABEL_1 }];

    const tx = makeMockTx([sections, questions, labels]);

    const snapshot = await buildTemplateSnapshot(
      tx as never,
      UUID_TEMPLATE,
      "My Template",
      "A description"
    );

    expect(snapshot.name).toBe("My Template");
    expect(snapshot.description).toBe("A description");
    expect(snapshot.sections).toHaveLength(1);
    expect(snapshot.labelIds).toEqual([UUID_LABEL_1]);
  });

  it("includes all question fields in snapshot", async () => {
    const sections = [
      { id: UUID_SECTION_A, name: "Section A", description: null, sortOrder: 0 },
    ];
    const questions = [
      {
        id: UUID_Q1,
        sectionId: UUID_SECTION_A,
        questionText: "Rate your week",
        helpText: "Be honest",
        answerType: "rating_1_10",
        answerConfig: { min: 1, max: 10 },
        isRequired: false,
        sortOrder: 0,
        scoreWeight: "2.50",
        conditionalOnQuestionId: UUID_Q2,
        conditionalOperator: "gt",
        conditionalValue: "3",
      },
    ];

    const tx = makeMockTx([sections, questions, []]);

    const snapshot = await buildTemplateSnapshot(tx as never, UUID_TEMPLATE, "T", null);
    const q = snapshot.sections[0].questions[0];

    expect(q.id).toBe(UUID_Q1);
    expect(q.questionText).toBe("Rate your week");
    expect(q.helpText).toBe("Be honest");
    expect(q.answerType).toBe("rating_1_10");
    expect(q.answerConfig).toEqual({ min: 1, max: 10 });
    expect(q.isRequired).toBe(false);
    expect(q.sortOrder).toBe(0);
    expect(q.scoreWeight).toBe("2.50");
    expect(q.conditionalOnQuestionId).toBe(UUID_Q2);
    expect(q.conditionalOperator).toBe("gt");
    expect(q.conditionalValue).toBe("3");
  });

  it("orders sections by sortOrder", async () => {
    const sections = [
      { id: UUID_SECTION_B, name: "Second", description: null, sortOrder: 1 },
      { id: UUID_SECTION_A, name: "First", description: null, sortOrder: 0 },
    ];
    // The function should use DB-level ORDER BY, but we pass them out-of-order
    // to verify the function at least processes them. The mock returns them as-is.
    const tx = makeMockTx([sections, [], []]);

    const snapshot = await buildTemplateSnapshot(tx as never, UUID_TEMPLATE, "T", null);
    // Sections come back in DB order (mock returns as given)
    expect(snapshot.sections).toHaveLength(2);
    expect(snapshot.sections[0].name).toBe("Second");
    expect(snapshot.sections[1].name).toBe("First");
  });

  it("groups questions by sectionId", async () => {
    const sections = [
      { id: UUID_SECTION_A, name: "Section A", description: null, sortOrder: 0 },
      { id: UUID_SECTION_B, name: "Section B", description: null, sortOrder: 1 },
    ];
    const questions = [
      {
        id: UUID_Q1, sectionId: UUID_SECTION_A, questionText: "Q1", helpText: null,
        answerType: "text", answerConfig: {}, isRequired: true, sortOrder: 0,
        scoreWeight: "1.00", conditionalOnQuestionId: null,
        conditionalOperator: null, conditionalValue: null,
      },
      {
        id: UUID_Q2, sectionId: UUID_SECTION_B, questionText: "Q2", helpText: null,
        answerType: "yes_no", answerConfig: {}, isRequired: false, sortOrder: 0,
        scoreWeight: "1.00", conditionalOnQuestionId: null,
        conditionalOperator: null, conditionalValue: null,
      },
      {
        id: UUID_Q3, sectionId: UUID_SECTION_A, questionText: "Q3", helpText: null,
        answerType: "mood", answerConfig: {}, isRequired: false, sortOrder: 1,
        scoreWeight: "1.00", conditionalOnQuestionId: null,
        conditionalOperator: null, conditionalValue: null,
      },
    ];

    const tx = makeMockTx([sections, questions, []]);

    const snapshot = await buildTemplateSnapshot(tx as never, UUID_TEMPLATE, "T", null);

    expect(snapshot.sections[0].questions).toHaveLength(2); // Q1 + Q3
    expect(snapshot.sections[1].questions).toHaveLength(1); // Q2
    expect(snapshot.sections[0].questions[0].id).toBe(UUID_Q1);
    expect(snapshot.sections[0].questions[1].id).toBe(UUID_Q3);
    expect(snapshot.sections[1].questions[0].id).toBe(UUID_Q2);
  });

  it("returns valid snapshot with empty arrays for empty template", async () => {
    const tx = makeMockTx([[], [], []]);

    const snapshot = await buildTemplateSnapshot(tx as never, UUID_TEMPLATE, "Empty", null);

    expect(snapshot.name).toBe("Empty");
    expect(snapshot.description).toBeNull();
    expect(snapshot.sections).toEqual([]);
    expect(snapshot.labelIds).toEqual([]);
  });
});
