"use client";

import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { periodToDateRange, type PeriodValue } from "@/lib/analytics/period";

export type { PeriodValue } from "@/lib/analytics/period";
export { periodToDateRange } from "@/lib/analytics/period";

const PRESETS = [
  { value: "30d", label: "Last 30 days" },
  { value: "3mo", label: "Last 3 months" },
  { value: "6mo", label: "Last 6 months" },
  { value: "1yr", label: "Last year" },
  { value: "custom", label: "Custom range" },
] as const;

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (period: PeriodValue) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const isCustom = value.preset === "custom";

  const handlePresetChange = useCallback(
    (preset: string) => {
      if (preset === "custom") {
        onChange({ ...value, preset: "custom" });
      } else {
        const { startDate, endDate } = periodToDateRange(preset);
        onChange({ preset, startDate, endDate });
      }
    },
    [onChange, value],
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        onChange({ ...value, startDate: date });
      }
    },
    [onChange, value],
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        onChange({ ...value, endDate: date });
      }
    },
    [onChange, value],
  );

  const startStr = useMemo(
    () => value.startDate.toISOString().split("T")[0],
    [value.startDate],
  );
  const endStr = useMemo(
    () => value.endDate.toISOString().split("T")[0],
    [value.endDate],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={value.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={startStr}
              onChange={handleStartChange}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={endStr}
              onChange={handleEndChange}
              className="w-[160px]"
            />
          </div>
        </>
      )}
    </div>
  );
}
