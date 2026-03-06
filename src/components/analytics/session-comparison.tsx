"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useState, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";

interface SessionOption {
  id: string;
  date: string;
  number: number;
}

interface ComparisonRow {
  category: string;
  score1: number;
  score2: number;
  delta: number;
}

interface SessionComparisonProps {
  sessions: SessionOption[];
  onCompare: (id1: string, id2: string) => void;
  comparisonData: ComparisonRow[] | null;
}

function capitalizeCategory(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function SessionComparison({
  sessions: sessionOptions,
  onCompare,
  comparisonData,
}: SessionComparisonProps) {
  const format = useFormatter();
  const t = useTranslations("analytics.chart");
  const [session1, setSession1] = useState<string>("");
  const [session2, setSession2] = useState<string>("");

  const handleSession1Change = useCallback(
    (id: string) => {
      setSession1(id);
      if (id && session2) onCompare(id, session2);
    },
    [session2, onCompare],
  );

  const handleSession2Change = useCallback(
    (id: string) => {
      setSession2(id);
      if (session1 && id) onCompare(session1, id);
    },
    [session1, onCompare],
  );

  if (sessionOptions.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        {t("minSessionsComparison")}
      </div>
    );
  }

  const formatOption = (s: SessionOption) =>
    t("sessionLabel", {
      number: s.number,
      date: format.dateTime(new Date(s.date), {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    });

  function DeltaCell({ delta }: { delta: number }) {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-600">
          <ArrowUp className="h-3.5 w-3.5" />+{format.number(delta, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-red-500">
          <ArrowDown className="h-3.5 w-3.5" />{format.number(delta, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />{format.number(0, { minimumFractionDigits: 1 })}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("sessionA")}</span>
          <Select value={session1} onValueChange={handleSession1Change}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={t("selectSession")} />
            </SelectTrigger>
            <SelectContent>
              {sessionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {formatOption(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t("sessionB")}</span>
          <Select value={session2} onValueChange={handleSession2Change}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder={t("selectSession")} />
            </SelectTrigger>
            <SelectContent>
              {sessionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {formatOption(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {comparisonData && comparisonData.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("category")}</TableHead>
              <TableHead className="text-right">{t("sessionA")}</TableHead>
              <TableHead className="text-right">{t("sessionB")}</TableHead>
              <TableHead className="text-right">{t("delta")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonData.map((row) => (
              <TableRow key={row.category}>
                <TableCell className="font-medium">
                  {capitalizeCategory(row.category)}
                </TableCell>
                <TableCell className="text-right">
                  {format.number(row.score1, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                </TableCell>
                <TableCell className="text-right">
                  {format.number(row.score2, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                </TableCell>
                <TableCell className="text-right">
                  <DeltaCell delta={row.delta} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {comparisonData && comparisonData.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t("noComparisonData")}
        </p>
      )}
    </div>
  );
}
