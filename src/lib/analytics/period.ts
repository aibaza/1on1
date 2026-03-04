export interface PeriodValue {
  preset: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Compute start/end dates from a preset string.
 */
export function periodToDateRange(preset: string): { startDate: Date; endDate: Date } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "3mo":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6mo":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1yr":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 3);
  }

  return { startDate: start, endDate: end };
}
