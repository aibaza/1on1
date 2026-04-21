import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Bug, Lightbulb } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import type { MyFeedbackListItem } from "@/lib/queries/feedback";

interface ReporterTicketListProps {
  items: MyFeedbackListItem[];
  selectedId?: string | null;
}

const STATUS_DOT: Record<
  MyFeedbackListItem["status"],
  string
> = {
  new: "bg-primary",
  triaged: "bg-secondary-foreground/60",
  in_progress: "bg-amber-500",
  awaiting_user: "bg-amber-500",
  resolved: "bg-emerald-500",
  closed: "bg-muted-foreground",
};

export async function ReporterTicketList({
  items,
  selectedId,
}: ReporterTicketListProps) {
  const t = await getTranslations("feedback.mine");
  const tType = await getTranslations("feedback.type");
  const tStatus = await getTranslations("feedback.status");

  const total = items.length;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t("listHeading")}
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("listTotal", { count: total })}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">{t("empty")}</p>
            <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y">
            {items.map((item) => {
              const isBug = item.type === "bug";
              const active = selectedId === item.id;
              const TypeIcon = isBug ? Bug : Lightbulb;
              return (
                <li key={item.id}>
                  <Link
                    href={`/feedback/mine/${item.id}`}
                    className={cn(
                      "flex w-full flex-col gap-1.5 border-l-2 px-4 py-3 text-left transition-colors",
                      active
                        ? "border-l-primary bg-primary/5"
                        : "border-l-transparent hover:bg-accent/40"
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
                          isBug
                            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                            : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        )}
                      >
                        <TypeIcon className="h-2.5 w-2.5" />
                        {isBug ? tType("bug") : tType("suggestion")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNowStrict(item.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "line-clamp-1 text-[13.5px] font-medium",
                        active ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          STATUS_DOT[item.status]
                        )}
                        aria-hidden
                      />
                      <span className="text-[11.5px] text-muted-foreground">
                        {tStatus(item.status)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
