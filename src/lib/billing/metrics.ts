/**
 * Compute Monthly Recurring Revenue from active/trialing subscriptions.
 */
export function computeMRR(
  subscriptions: { mrrCents: number; status: string }[]
): number {
  return subscriptions
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => sum + s.mrrCents, 0);
}

/**
 * Compute churn rate: canceled / total at start of period.
 * Returns a ratio (0-1), not a percentage.
 */
export function computeChurnRate(
  canceledCount: number,
  totalAtStart: number
): number {
  if (totalAtStart === 0) return 0;
  return canceledCount / totalAtStart;
}

/**
 * Compute trial-to-paid conversion rate.
 * Returns a ratio (0-1), not a percentage.
 */
export function computeTrialConversion(
  convertedCount: number,
  totalTrials: number
): number {
  if (totalTrials === 0) return 0;
  return convertedCount / totalTrials;
}

/**
 * Format cents to a currency string (e.g. 1234 -> "12.34").
 */
export function formatCentsToEuro(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
