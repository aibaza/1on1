import type { TemplateVersionSnapshot } from "./snapshot";

export interface VersionChange {
  type: "added" | "removed" | "modified";
  entity: "section" | "question";
  name: string;
  details?: string;
}

type SnapshotQuestion =
  TemplateVersionSnapshot["sections"][number]["questions"][number];

function compareQuestions(
  oldQ: SnapshotQuestion,
  newQ: SnapshotQuestion
): string | null {
  const diffs: string[] = [];

  if (oldQ.questionText !== newQ.questionText) diffs.push("text changed");
  if (oldQ.answerType !== newQ.answerType) diffs.push("answer type changed");
  if (
    JSON.stringify(oldQ.answerConfig) !== JSON.stringify(newQ.answerConfig)
  )
    diffs.push("answer config changed");
  if (oldQ.isRequired !== newQ.isRequired) diffs.push("required changed");
  if (oldQ.helpText !== newQ.helpText) diffs.push("help text changed");

  if (diffs.length === 0) return null;
  if (diffs.length === 1) return diffs[0];
  return "multiple changes";
}

/**
 * Computes the differences between two template version snapshots.
 * Returns an array of changes (added/removed/modified sections and questions).
 */
export function computeVersionDiff(
  oldSnapshot: TemplateVersionSnapshot,
  newSnapshot: TemplateVersionSnapshot
): VersionChange[] {
  const changes: VersionChange[] = [];

  // Build section maps by id
  const oldSections = new Map(
    oldSnapshot.sections.map((s) => [s.id, s])
  );
  const newSections = new Map(
    newSnapshot.sections.map((s) => [s.id, s])
  );

  // Sections added in new
  for (const [id, section] of newSections) {
    if (!oldSections.has(id)) {
      changes.push({ type: "added", entity: "section", name: section.name });
    }
  }

  // Sections removed from old
  for (const [id, section] of oldSections) {
    if (!newSections.has(id)) {
      changes.push({
        type: "removed",
        entity: "section",
        name: section.name,
      });
    }
  }

  // Sections in both: compare name, then questions
  for (const [id, newSection] of newSections) {
    const oldSection = oldSections.get(id);
    if (!oldSection) continue;

    // Section name change
    if (oldSection.name !== newSection.name) {
      changes.push({
        type: "modified",
        entity: "section",
        name: newSection.name,
        details: `renamed from "${oldSection.name}"`,
      });
    }

    // Compare questions within section
    const oldQuestions = new Map(
      oldSection.questions.map((q) => [q.id, q])
    );
    const newQuestions = new Map(
      newSection.questions.map((q) => [q.id, q])
    );

    for (const [qId, newQ] of newQuestions) {
      if (!oldQuestions.has(qId)) {
        changes.push({
          type: "added",
          entity: "question",
          name: newQ.questionText,
        });
      }
    }

    for (const [qId, oldQ] of oldQuestions) {
      if (!newQuestions.has(qId)) {
        changes.push({
          type: "removed",
          entity: "question",
          name: oldQ.questionText,
        });
      }
    }

    for (const [qId, newQ] of newQuestions) {
      const oldQ = oldQuestions.get(qId);
      if (!oldQ) continue;

      const diff = compareQuestions(oldQ, newQ);
      if (diff) {
        changes.push({
          type: "modified",
          entity: "question",
          name: newQ.questionText,
          details: diff,
        });
      }
    }
  }

  return changes;
}
