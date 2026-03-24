/**
 * Centralized analytics color system.
 *
 * All analytics components should import from here to ensure
 * consistent colors across pages.
 *
 * Score thresholds: >= 3.5 healthy, >= 2.5 attention, < 2.5 critical
 */

// ---------------------------------------------------------------------------
// Score thresholds (single source of truth)
// ---------------------------------------------------------------------------

export const SCORE_THRESHOLD_HEALTHY = 3.5;
export const SCORE_THRESHOLD_ATTENTION = 2.5;

// ---------------------------------------------------------------------------
// Semantic Tailwind classes (light + dark mode)
// ---------------------------------------------------------------------------

/** Health distribution bar segment colors */
export const DISTRIBUTION_COLORS = {
  healthy: "bg-emerald-500 dark:bg-emerald-500",
  attention: "bg-amber-400 dark:bg-amber-400",
  critical: "bg-red-500 dark:bg-red-500",
  noData: "bg-muted-foreground/40",
} as const;

/** Legend dot colors (small rounded circles in legends) */
export const LEGEND_DOT_COLORS = {
  healthy: "bg-emerald-500",
  attention: "bg-amber-400",
  critical: "bg-red-500",
  noData: "bg-muted-foreground",
} as const;

/** Score dot/indicator colors (inline with score values) */
export function scoreDotColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground";
  if (score >= SCORE_THRESHOLD_HEALTHY) return "bg-emerald-500";
  if (score >= SCORE_THRESHOLD_ATTENTION) return "bg-amber-400";
  return "bg-red-500";
}

/** Score text color */
export function scoreTextColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= SCORE_THRESHOLD_HEALTHY)
    return "text-emerald-600 dark:text-emerald-400";
  if (score >= SCORE_THRESHOLD_ATTENTION)
    return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/** Score badge colors (background + text, for pills/badges) */
export function scoreBadgeColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= SCORE_THRESHOLD_HEALTHY)
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (score >= SCORE_THRESHOLD_ATTENTION)
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

/** Score border color (for cards with score-colored borders) */
export function scoreBorderColor(score: number | null): string {
  if (score === null) return "border-muted-foreground";
  if (score >= SCORE_THRESHOLD_HEALTHY) return "border-emerald-500";
  if (score >= SCORE_THRESHOLD_ATTENTION) return "border-amber-400";
  return "border-red-500";
}

/** Sparkline bar colors (with opacity for subtle bars) */
export function sparkBarColor(score: number): string {
  if (score >= SCORE_THRESHOLD_HEALTHY) return "bg-emerald-400/60";
  if (score >= SCORE_THRESHOLD_ATTENTION) return "bg-amber-400/60";
  return "bg-red-400/60";
}

/** Trend badge colors */
export function trendBadgeColor(trend: number): string {
  if (trend > 0)
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
  if (trend < 0)
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
  return "bg-muted text-muted-foreground";
}

/** Trend icon color */
export function trendIconColor(trend: number): string {
  if (trend > 0) return "text-emerald-600 dark:text-emerald-400";
  if (trend < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

/** Alert type badge colors */
export function alertBadgeColor(type: string): string {
  switch (type) {
    case "low_score":
    case "score_drop":
    case "declining":
    case "critical_score":
      return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400";
    case "stale_series":
    case "stale":
    case "overdue":
    case "low_action_rate":
      return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400";
    default:
      return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
  }
}

/** Chart fill colors for Recharts (CSS variable values for inline styles) */
export function scoreChartColor(score: number | null): string {
  if (score === null) return "var(--muted-foreground)";
  if (score >= SCORE_THRESHOLD_HEALTHY) return "var(--color-success, #10b981)";
  if (score >= SCORE_THRESHOLD_ATTENTION) return "var(--color-warning, #f59e0b)";
  return "var(--color-danger, #ef4444)";
}
