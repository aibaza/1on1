"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useFormatter } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TalkingPointList, type TalkingPoint } from "@/components/session/talking-point-list";

interface AgendaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  personName: string;
  sessionNumber: number;
  sessionDate: string;
}

interface CategoryData {
  name: string;
  points: TalkingPoint[];
}

export function AgendaSheet({
  open,
  onOpenChange,
  sessionId,
  personName,
  sessionNumber,
  sessionDate,
}: AgendaSheetProps) {
  const t = useTranslations("sessions");
  const format = useFormatter();

  // Fetch talking points + available categories when sheet opens
  const { data, isLoading, error } = useQuery<{
    talkingPoints: TalkingPoint[];
    categories: string[];
  }>({
    queryKey: ["talking-points", sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/talking-points`);
      if (!res.ok) throw new Error("Failed to fetch talking points");
      return res.json();
    },
    enabled: open,
  });

  // Build category sections: show ALL template categories, with their points (or empty)
  const categories: CategoryData[] = (() => {
    if (!data) return [];
    const allCategories = data.categories ?? ["General"];
    const grouped = new Map<string, TalkingPoint[]>();
    for (const cat of allCategories) {
      grouped.set(cat, []);
    }
    for (const point of data.talkingPoints) {
      const cat = point.category ?? "General";
      const arr = grouped.get(cat) ?? [];
      arr.push(point);
      grouped.set(cat, arr);
    }
    return Array.from(grouped.entries()).map(([name, points]) => ({ name, points }));
  })();

  const formattedDate = sessionDate
    ? format.dateTime(new Date(sessionDate), { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[400px] flex flex-col">
        <SheetHeader className="space-y-0">
          <SheetTitle className="text-base font-semibold">{personName}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {t("agenda.sessionLabel", { number: sessionNumber })} &middot; {formattedDate}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive px-2">{t("agenda.loadError")}</p>
          )}

          {!isLoading && !error && categories.length > 0 && (
            <div className="space-y-4">
              {categories.map((cat, index) => (
                <CategorySection
                  key={cat.name}
                  stepNumber={index + 1}
                  name={cat.name}
                  sessionId={sessionId}
                  initialPoints={cat.points}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CategorySection({
  stepNumber,
  name,
  sessionId,
  initialPoints,
}: {
  stepNumber: number;
  name: string;
  sessionId: string;
  initialPoints: TalkingPoint[];
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} defaultOpen>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1">
        {isOpen ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="text-xs font-normal uppercase tracking-wide text-muted-foreground">
          {stepNumber}. {name}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2 pt-1">
          <TalkingPointList
            sessionId={sessionId}
            category={name}
            initialPoints={initialPoints}
            readOnly={false}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
