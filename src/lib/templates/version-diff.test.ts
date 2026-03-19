import { describe, it, expect } from "vitest";
import { computeVersionDiff } from "./version-diff";
import type { TemplateVersionSnapshot } from "./snapshot";

function makeSnapshot(
  overrides: Partial<TemplateVersionSnapshot> = {}
): TemplateVersionSnapshot {
  return {
    name: "Test Template",
    description: null,
    sections: [],
    labelIds: [],
    ...overrides,
  };
}

function makeSection(
  id: string,
  name: string,
  questions: TemplateVersionSnapshot["sections"][number]["questions"] = []
) {
  return { id, name, description: null, sortOrder: 0, questions };
}

function makeQuestion(
  id: string,
  questionText: string,
  overrides: Partial<TemplateVersionSnapshot["sections"][number]["questions"][number]> = {}
) {
  return {
    id,
    questionText,
    helpText: null,
    answerType: "text",
    answerConfig: {},
    isRequired: false,
    sortOrder: 0,
    scoreWeight: "1",
    conditionalOnQuestionId: null,
    conditionalOperator: null,
    conditionalValue: null,
    ...overrides,
  };
}

describe("computeVersionDiff", () => {
  it("detects added section (present in new, absent in old)", () => {
    const oldSnap = makeSnapshot({ sections: [] });
    const newSnap = makeSnapshot({
      sections: [makeSection("s1", "New Section")],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual({
      type: "added",
      entity: "section",
      name: "New Section",
    });
  });

  it("detects removed section (present in old, absent in new)", () => {
    const oldSnap = makeSnapshot({
      sections: [makeSection("s1", "Old Section")],
    });
    const newSnap = makeSnapshot({ sections: [] });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual({
      type: "removed",
      entity: "section",
      name: "Old Section",
    });
  });

  it("detects added question within a section", () => {
    const oldSnap = makeSnapshot({
      sections: [makeSection("s1", "Section A", [])],
    });
    const newSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [makeQuestion("q1", "New question?")]),
      ],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual({
      type: "added",
      entity: "question",
      name: "New question?",
    });
  });

  it("detects removed question", () => {
    const oldSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [makeQuestion("q1", "Old question?")]),
      ],
    });
    const newSnap = makeSnapshot({
      sections: [makeSection("s1", "Section A", [])],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual({
      type: "removed",
      entity: "question",
      name: "Old question?",
    });
  });

  it("detects modified question (questionText changed)", () => {
    const oldSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [makeQuestion("q1", "Old text")]),
      ],
    });
    const newSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [makeQuestion("q1", "New text")]),
      ],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: "modified",
        entity: "question",
        name: "New text",
      })
    );
  });

  it("detects modified question (answerType changed)", () => {
    const oldSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [
          makeQuestion("q1", "Question", { answerType: "text" }),
        ]),
      ],
    });
    const newSnap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [
          makeQuestion("q1", "Question", { answerType: "rating" }),
        ]),
      ],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: "modified",
        entity: "question",
        details: expect.stringContaining("answer type"),
      })
    );
  });

  it("identical snapshots produce empty changes array", () => {
    const snap = makeSnapshot({
      sections: [
        makeSection("s1", "Section A", [makeQuestion("q1", "Question?")]),
      ],
    });
    const changes = computeVersionDiff(snap, snap);
    expect(changes).toEqual([]);
  });

  it("section name change detected as modified", () => {
    const oldSnap = makeSnapshot({
      sections: [makeSection("s1", "Old Name")],
    });
    const newSnap = makeSnapshot({
      sections: [makeSection("s1", "New Name")],
    });
    const changes = computeVersionDiff(oldSnap, newSnap);
    expect(changes).toContainEqual(
      expect.objectContaining({
        type: "modified",
        entity: "section",
        name: "New Name",
      })
    );
  });
});
