"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { SessionHistoryData } from "@/lib/analytics/queries";

interface Props {
  data: SessionHistoryData;
}

function formatValue(value: number | string | null, answerType: string, format: ReturnType<typeof useFormatter>): string {
  if (value === null) return "—";
  if (typeof value === "string") return value;
  if (answerType === "mood" || answerType === "rating_1_5") return `${value}/5`;
  if (answerType === "rating_1_10") return `${value}/10`;
  return format.number(value, { maximumFractionDigits: 1 });
}

function scoreClass(value: number | string | null, answerType: string): string {
  if (typeof value !== "number") return "";
  const normalized =
    answerType === "rating_1_10" ? value / 10 :
    answerType === "rating_1_5" || answerType === "mood" ? value / 5 :
    value / 5;
  if (normalized >= 0.8) return "text-emerald-600 dark:text-emerald-400 font-medium";
  if (normalized >= 0.6) return "text-amber-600 dark:text-amber-400";
  if (normalized < 0.4) return "text-red-500 dark:text-red-400";
  return "";
}

export function SessionHistoryTable({ data }: Props) {
  const format = useFormatter();
  const t = useTranslations("analytics.chart");

  if (data.sessions.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        {t("noScoreData")}
      </div>
    );
  }

  // Group rows by section
  const sections: { name: string; rows: SessionHistoryData["rows"] }[] = [];
  for (const row of data.rows) {
    const last = sections[sections.length - 1];
    if (!last || last.name !== row.section) sections.push({ name: row.section, rows: [row] });
    else last.rows.push(row);
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            {/* Sticky question column */}
            <th className="sticky left-0 z-10 bg-muted/50 px-4 py-2.5 text-left font-medium text-muted-foreground min-w-[220px] max-w-[280px]">
              Question
            </th>
            {data.sessions.map((s) => (
              <th key={s.id} className="px-3 py-2.5 text-center font-medium text-muted-foreground whitespace-nowrap min-w-[90px]">
                <span className="block text-xs font-semibold">#{s.number}</span>
                <span className="block text-xs font-normal opacity-70">{s.date}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, si) => (
            <>
              {/* Section header row */}
              <tr key={`section-${si}`} className="border-b bg-muted/20">
                <td
                  colSpan={data.sessions.length + 1}
                  className="sticky left-0 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {section.name}
                </td>
              </tr>
              {section.rows.map((row, ri) => (
                <tr key={`${si}-${ri}`} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-background px-4 py-2 text-xs text-foreground/80 min-w-[220px] max-w-[280px] break-words">
                    {row.question}
                  </td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className={`px-3 py-2 text-center text-xs tabular-nums ${scoreClass(val, row.answerType)}`}>
                      {formatValue(val, row.answerType, format)}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
