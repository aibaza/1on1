import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  evaluateConditionFromRecord,
} from "../evaluate-condition";
import type { AnswerValue } from "@/components/session/question-widget";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQuestion(
  parentId: string | null,
  operator: string | null,
  value: string | null
) {
  return {
    conditionalOnQuestionId: parentId,
    conditionalOperator: operator,
    conditionalValue: value,
  };
}

function makeAnswers(
  entries: Record<string, AnswerValue>
): Map<string, AnswerValue> {
  return new Map(Object.entries(entries));
}

// ---------------------------------------------------------------------------
// No condition (always visible)
// ---------------------------------------------------------------------------

describe("evaluateCondition", () => {
  describe("no condition configured", () => {
    it("returns true when conditionalOnQuestionId is null", () => {
      expect(evaluateCondition(makeQuestion(null, "eq", "5"), new Map())).toBe(
        true
      );
    });

    it("returns true when conditionalOperator is null", () => {
      expect(
        evaluateCondition(makeQuestion("q1", null, "5"), new Map())
      ).toBe(true);
    });

    it("returns true when both are null", () => {
      expect(evaluateCondition(makeQuestion(null, null, null), new Map())).toBe(
        true
      );
    });
  });

  // -------------------------------------------------------------------------
  // Missing parent answer
  // -------------------------------------------------------------------------

  describe("missing parent answer", () => {
    it("returns false when parent question has no answer in the map", () => {
      const q = makeQuestion("q1", "eq", "5");
      expect(evaluateCondition(q, new Map())).toBe(false);
    });

    it("returns false when parent answer has all undefined fields", () => {
      const q = makeQuestion("q1", "eq", "5");
      const answers = makeAnswers({ q1: {} });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // eq operator
  // -------------------------------------------------------------------------

  describe("eq operator", () => {
    it("matches equal string values", () => {
      const q = makeQuestion("q1", "eq", "yes");
      const answers = makeAnswers({ q1: { answerText: "yes" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("rejects non-equal string values", () => {
      const q = makeQuestion("q1", "eq", "yes");
      const answers = makeAnswers({ q1: { answerText: "no" } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });

    it("matches numeric values via string comparison", () => {
      const q = makeQuestion("q1", "eq", "5");
      const answers = makeAnswers({ q1: { answerNumeric: 5 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("rejects different numeric values", () => {
      const q = makeQuestion("q1", "eq", "5");
      const answers = makeAnswers({ q1: { answerNumeric: 3 } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // neq operator
  // -------------------------------------------------------------------------

  describe("neq operator", () => {
    it("returns true when values differ", () => {
      const q = makeQuestion("q1", "neq", "yes");
      const answers = makeAnswers({ q1: { answerText: "no" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns false when values are equal", () => {
      const q = makeQuestion("q1", "neq", "yes");
      const answers = makeAnswers({ q1: { answerText: "yes" } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Numeric comparison operators
  // -------------------------------------------------------------------------

  describe("lt operator", () => {
    it("returns true when parent < condition (numeric)", () => {
      const q = makeQuestion("q1", "lt", "10");
      const answers = makeAnswers({ q1: { answerNumeric: 5 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns false when parent >= condition (numeric)", () => {
      const q = makeQuestion("q1", "lt", "5");
      const answers = makeAnswers({ q1: { answerNumeric: 5 } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });

    it("falls back to string comparison for non-numeric values", () => {
      const q = makeQuestion("q1", "lt", "banana");
      const answers = makeAnswers({ q1: { answerText: "apple" } });
      // "apple" < "banana" lexicographically
      expect(evaluateCondition(q, answers)).toBe(true);
    });
  });

  describe("gt operator", () => {
    it("returns true when parent > condition (numeric)", () => {
      const q = makeQuestion("q1", "gt", "3");
      const answers = makeAnswers({ q1: { answerNumeric: 7 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns false when parent <= condition (numeric)", () => {
      const q = makeQuestion("q1", "gt", "7");
      const answers = makeAnswers({ q1: { answerNumeric: 7 } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  describe("lte operator", () => {
    it("returns true when parent < condition", () => {
      const q = makeQuestion("q1", "lte", "10");
      const answers = makeAnswers({ q1: { answerNumeric: 5 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns true when parent == condition", () => {
      const q = makeQuestion("q1", "lte", "5");
      const answers = makeAnswers({ q1: { answerNumeric: 5 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns false when parent > condition", () => {
      const q = makeQuestion("q1", "lte", "5");
      const answers = makeAnswers({ q1: { answerNumeric: 8 } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  describe("gte operator", () => {
    it("returns true when parent > condition", () => {
      const q = makeQuestion("q1", "gte", "3");
      const answers = makeAnswers({ q1: { answerNumeric: 7 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns true when parent == condition", () => {
      const q = makeQuestion("q1", "gte", "7");
      const answers = makeAnswers({ q1: { answerNumeric: 7 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("returns false when parent < condition", () => {
      const q = makeQuestion("q1", "gte", "10");
      const answers = makeAnswers({ q1: { answerNumeric: 7 } });
      expect(evaluateCondition(q, answers)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Unknown operator
  // -------------------------------------------------------------------------

  describe("unknown operator", () => {
    it("returns true for an unrecognized operator", () => {
      const q = makeQuestion("q1", "contains", "foo");
      const answers = makeAnswers({ q1: { answerText: "foobar" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Answer value priority (answerNumeric > answerJson > answerText)
  // -------------------------------------------------------------------------

  describe("answer value resolution priority", () => {
    it("prefers answerNumeric over answerText", () => {
      const q = makeQuestion("q1", "eq", "5");
      const answers = makeAnswers({
        q1: { answerNumeric: 5, answerText: "different" },
      });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("uses answerJson (stringified) when answerNumeric is absent", () => {
      const q = makeQuestion("q1", "eq", '["a","b"]');
      const answers = makeAnswers({ q1: { answerJson: ["a", "b"] } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("falls back to answerText when numeric and json are absent", () => {
      const q = makeQuestion("q1", "eq", "hello");
      const answers = makeAnswers({ q1: { answerText: "hello" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    it("treats empty string answerText as a valid value", () => {
      const q = makeQuestion("q1", "eq", "");
      const answers = makeAnswers({ q1: { answerText: "" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("handles null conditionalValue by defaulting to empty string", () => {
      const q = makeQuestion("q1", "eq", null);
      const answers = makeAnswers({ q1: { answerText: "" } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("handles answerNumeric of 0 (falsy but valid)", () => {
      const q = makeQuestion("q1", "eq", "0");
      const answers = makeAnswers({ q1: { answerNumeric: 0 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("handles negative numeric comparison", () => {
      const q = makeQuestion("q1", "lt", "0");
      const answers = makeAnswers({ q1: { answerNumeric: -3 } });
      expect(evaluateCondition(q, answers)).toBe(true);
    });

    it("uses string comparison for lt when one side is non-numeric text", () => {
      const q = makeQuestion("q1", "gt", "abc");
      const answers = makeAnswers({ q1: { answerText: "xyz" } });
      // "xyz" > "abc" lexicographically
      expect(evaluateCondition(q, answers)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// evaluateConditionFromRecord
// ---------------------------------------------------------------------------

describe("evaluateConditionFromRecord", () => {
  it("works identically to evaluateCondition with a plain object", () => {
    const q = makeQuestion("q1", "eq", "yes");
    const answers = { q1: { answerText: "yes" } };
    expect(evaluateConditionFromRecord(q, answers)).toBe(true);
  });

  it("returns false when parent answer is missing from the record", () => {
    const q = makeQuestion("q1", "eq", "yes");
    expect(evaluateConditionFromRecord(q, {})).toBe(false);
  });

  it("handles numeric comparisons through the record wrapper", () => {
    const q = makeQuestion("q1", "gte", "5");
    const answers = { q1: { answerNumeric: 5 } };
    expect(evaluateConditionFromRecord(q, answers)).toBe(true);
  });
});
