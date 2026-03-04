/**
 * CSV generation utilities for analytics data export.
 */

/**
 * Escape a single CSV field value per RFC 4180.
 * Handles null, commas, quotes, newlines.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a CSV string from headers and rows.
 */
export function generateCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvField).join(","));
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Transform session data into CSV rows for full export.
 */
export function sessionDataToRows(
  sessions: Array<{
    date: string | null;
    reportName: string;
    managerName: string;
    templateName: string | null;
    score: string | null;
    durationMinutes: number | null;
    status: string;
    actionItemsCreated: number;
    actionItemsCompleted: number;
    aiSummary: string | null;
  }>,
): { headers: string[]; rows: unknown[][] } {
  const headers = [
    "Date",
    "Report",
    "Manager",
    "Template",
    "Score",
    "Duration (min)",
    "Status",
    "Action Items Created",
    "Action Items Completed",
    "AI Summary",
  ];

  const rows = sessions.map((s) => [
    s.date ?? "",
    s.reportName,
    s.managerName,
    s.templateName ?? "",
    s.score ? parseFloat(s.score).toFixed(2) : "",
    s.durationMinutes ?? "",
    s.status,
    s.actionItemsCreated,
    s.actionItemsCompleted,
    s.aiSummary ? s.aiSummary.slice(0, 200) : "",
  ]);

  return { headers, rows };
}
