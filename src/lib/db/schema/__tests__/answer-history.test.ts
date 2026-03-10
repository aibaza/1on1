import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  sessionAnswerHistory,
  sessionAnswerHistoryRelations,
} from "../answer-history";

describe("sessionAnswerHistory schema", () => {
  it("table name is session_answer_history", () => {
    expect(getTableName(sessionAnswerHistory)).toBe("session_answer_history");
  });

  it("has id column", () => {
    expect(sessionAnswerHistory.id).toBeDefined();
  });

  it("has sessionAnswerId column", () => {
    expect(sessionAnswerHistory.sessionAnswerId).toBeDefined();
  });

  it("has sessionId column", () => {
    expect(sessionAnswerHistory.sessionId).toBeDefined();
  });

  it("has tenantId column that is NOT NULL", () => {
    expect(sessionAnswerHistory.tenantId).toBeDefined();
    expect(sessionAnswerHistory.tenantId.notNull).toBe(true);
  });

  it("has correctedById column", () => {
    expect(sessionAnswerHistory.correctedById).toBeDefined();
  });

  it("has originalAnswerText column", () => {
    expect(sessionAnswerHistory.originalAnswerText).toBeDefined();
  });

  it("has originalAnswerNumeric column", () => {
    expect(sessionAnswerHistory.originalAnswerNumeric).toBeDefined();
  });

  it("has originalAnswerJson column", () => {
    expect(sessionAnswerHistory.originalAnswerJson).toBeDefined();
  });

  it("has originalSkipped column with default false", () => {
    expect(sessionAnswerHistory.originalSkipped).toBeDefined();
    expect(sessionAnswerHistory.originalSkipped.default).toBe(false);
  });

  it("has correctionReason column that is NOT NULL", () => {
    expect(sessionAnswerHistory.correctionReason).toBeDefined();
    expect(sessionAnswerHistory.correctionReason.notNull).toBe(true);
  });

  it("has createdAt column", () => {
    expect(sessionAnswerHistory.createdAt).toBeDefined();
  });

  it("exports sessionAnswerHistoryRelations", () => {
    expect(sessionAnswerHistoryRelations).toBeDefined();
  });
});
