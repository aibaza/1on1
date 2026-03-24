"use client";

import { useMemo, useState, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { scoreChartColor } from "@/lib/analytics/colors";

interface HeatmapDatum {
  userId: string;
  userName: string;
  category: string;
  score: number;
  sampleCount: number;
}

interface TeamHeatmapProps {
  data: HeatmapDatum[];
  categories: string[];
}


// Sample count to radius: min 6px, max 16px
function sampleToRadius(count: number, maxCount: number): number {
  if (maxCount <= 1) return 11; // default mid-size
  const t = Math.min(count / maxCount, 1);
  return 6 + t * 10;
}

function capitalizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function TeamHeatmap({ data, categories }: TeamHeatmapProps) {
  const format = useFormatter();
  const t = useTranslations("analytics.chart");

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    userName: string;
    category: string;
    score: number;
    sampleCount: number;
  } | null>(null);

  // Build grid data
  const { rows, maxSample } = useMemo(() => {
    // Group by user
    const userMap = new Map<
      string,
      { userName: string; scores: Map<string, { score: number; sampleCount: number }> }
    >();

    let maxS = 1;
    for (const d of data) {
      if (!userMap.has(d.userName)) {
        userMap.set(d.userName, { userName: d.userName, scores: new Map() });
      }
      userMap.get(d.userName)!.scores.set(d.category, {
        score: d.score,
        sampleCount: d.sampleCount,
      });
      if (d.sampleCount > maxS) maxS = d.sampleCount;
    }

    const sortedRows = Array.from(userMap.values()).sort((a, b) =>
      a.userName.localeCompare(b.userName),
    );

    return { rows: sortedRows, maxSample: maxS };
  }, [data]);

  // Layout constants
  const labelWidth = 120;
  const headerHeight = 80;
  const cellSize = 44;
  const colCount = categories.length;
  const rowCount = rows.length;
  const svgWidth = labelWidth + colCount * cellSize + 20;
  const svgHeight = headerHeight + rowCount * cellSize + 10;

  const handleMouseEnter = useCallback(
    (
      e: React.MouseEvent<SVGCircleElement>,
      userName: string,
      category: string,
      score: number,
      sampleCount: number,
    ) => {
      const svg = (e.target as SVGElement).closest("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const clientRect = (e.target as SVGElement).getBoundingClientRect();
      setTooltip({
        x: clientRect.left - rect.left + clientRect.width / 2,
        y: clientRect.top - rect.top - 8,
        userName,
        category,
        score,
        sampleCount,
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (data.length === 0 || categories.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {t("noHeatmapData")}
      </div>
    );
  }

  // Threshold guard: require ≥3 contributors for meaningful heatmap
  if (rows.length > 0 && rows.length < 3) {
    return (
      <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
        <p>{t("heatmapThreshold")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative inline-block">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="text-foreground"
          role="img"
          aria-label={t("heatmapLabel")}
        >
          {/* Column headers (categories) - rotated 45deg */}
          {categories.map((cat, ci) => {
            const x = labelWidth + ci * cellSize + cellSize / 2;
            return (
              <text
                key={cat}
                x={x}
                y={headerHeight - 10}
                textAnchor="start"
                className="fill-muted-foreground text-[11px]"
                transform={`rotate(-45, ${x}, ${headerHeight - 10})`}
              >
                {capitalizeCategory(cat)}
              </text>
            );
          })}

          {/* Rows */}
          {rows.map((row, ri) => {
            const y = headerHeight + ri * cellSize + cellSize / 2;

            return (
              <g key={row.userName}>
                {/* Row label */}
                <text
                  x={labelWidth - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-foreground text-xs"
                >
                  {row.userName}
                </text>

                {/* Dots per category */}
                {categories.map((cat, ci) => {
                  const x = labelWidth + ci * cellSize + cellSize / 2;
                  const cellData = row.scores.get(cat);

                  if (!cellData) {
                    // Missing data: no dot
                    return null;
                  }

                  const insufficientData = cellData.sampleCount < 3;
                  const radius = sampleToRadius(cellData.sampleCount, maxSample);

                  if (insufficientData) {
                    // Hollow circle for insufficient data
                    return (
                      <circle
                        key={cat}
                        cx={x}
                        cy={y}
                        r={6}
                        fill="none"
                        stroke="var(--muted-foreground)"
                        strokeWidth={1.5}
                        opacity={0.5}
                        className="cursor-pointer"
                        onMouseEnter={(e) =>
                          handleMouseEnter(
                            e,
                            row.userName,
                            cat,
                            cellData.score,
                            cellData.sampleCount,
                          )
                        }
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  }

                  return (
                    <circle
                      key={cat}
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={scoreChartColor(cellData.score)}
                      opacity={0.85}
                      className="cursor-pointer transition-opacity hover:opacity-100"
                      onMouseEnter={(e) =>
                        handleMouseEnter(
                          e,
                          row.userName,
                          cat,
                          cellData.score,
                          cellData.sampleCount,
                        )
                      }
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-medium">{tooltip.userName}</p>
            <p className="text-muted-foreground">
              {capitalizeCategory(tooltip.category)}: {format.number(tooltip.score, { maximumFractionDigits: 2 })}
            </p>
            <p className="text-muted-foreground">
              {t("sampleCount", { count: tooltip.sampleCount })}
              {tooltip.sampleCount < 3 && ` ${t("insufficientData")}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
