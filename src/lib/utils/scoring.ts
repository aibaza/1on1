/**
 * Session scoring utilities.
 *
 * All numeric answer types are normalized to a 1-5 scale before averaging.
 * Non-numeric types (text, multiple_choice) are excluded from scoring.
 */

/** Answer types that can be scored (have a numeric value on a defined scale). */
const SCORABLE_TYPES = new Set([
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "mood",
]);

/**
 * Normalize a numeric answer value to the 1-5 scale.
 *
 * - rating_1_5 / mood: already 1-5, returned as-is
 * - rating_1_10: linear map from [1,10] to [1,5]
 * - yes_no: 0 -> 1, 1 -> 5
 * - Other types: returned as-is (caller should filter first)
 */
export function normalizeAnswer(answerType: string, value: number): number {
  switch (answerType) {
    case "rating_1_5":
    case "mood":
      return value;
    case "rating_1_10":
      return ((value - 1) / 9) * 4 + 1;
    case "yes_no":
      return value * 4 + 1;
    default:
      return value;
  }
}

/**
 * Compute the overall session score as the average of normalized numeric answers.
 *
 * Returns null if no scorable answers exist (e.g. all questions are text/multiple_choice,
 * or all numeric answers were skipped).
 */
export function computeSessionScore(
  answers: Array<{
    answerType: string;
    answerNumeric: number | null;
    skipped: boolean;
  }>
): number | null {
  const scorable = answers.filter(
    (a) =>
      SCORABLE_TYPES.has(a.answerType) &&
      a.answerNumeric !== null &&
      !a.skipped
  );

  if (scorable.length === 0) return null;

  const total = scorable.reduce(
    (sum, a) => sum + normalizeAnswer(a.answerType, a.answerNumeric!),
    0
  );

  // Round to 2 decimal places
  return Math.round((total / scorable.length) * 100) / 100;
}
