/**
 * Metric name constants for analytics_snapshot rows.
 *
 * Operational metrics (session_score, action_completion_rate, meeting_adherence)
 * are fixed names. Category metrics are derived dynamically from template section
 * names -- any section with scorable answers generates a snapshot row using the
 * section name directly as metricName (e.g., "Wellbeing", "Stare de spirit").
 */
export const METRIC_NAMES = {
  SESSION_SCORE: "session_score",
  ACTION_COMPLETION_RATE: "action_completion_rate",
  MEETING_ADHERENCE: "meeting_adherence",
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

/**
 * Operational metric names that are NOT category scores.
 * Used to exclude operational metrics when querying category data from snapshots.
 */
export const OPERATIONAL_METRICS = new Set<string>([
  METRIC_NAMES.SESSION_SCORE,
  METRIC_NAMES.ACTION_COMPLETION_RATE,
  METRIC_NAMES.MEETING_ADHERENCE,
]);

/**
 * Answer types that produce numeric values suitable for averaging.
 */
export const SCORABLE_ANSWER_TYPES = new Set([
  "rating_1_5",
  "rating_1_10",
  "mood",
  "scale_custom",
]);
