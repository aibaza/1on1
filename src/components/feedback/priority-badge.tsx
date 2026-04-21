import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackPriority } from "@/lib/validations/feedback";

const PRIORITY_STYLES: Record<FeedbackPriority, { className: string }> = {
  critical: {
    className:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  },
  high: {
    className:
      "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  },
  medium: {
    className:
      "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  },
  low: {
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: FeedbackPriority | null;
  className?: string;
}) {
  const t = useTranslations("feedback.priority");
  if (!priority) {
    return (
      <Badge
        variant="outline"
        className={cn("text-muted-foreground", className)}
      >
        {t("unassigned")}
      </Badge>
    );
  }

  const style = PRIORITY_STYLES[priority];
  return (
    <Badge
      variant="outline"
      className={cn(style.className, "gap-1", className)}
    >
      {priority === "critical" ? <ChevronUp className="h-3 w-3" /> : null}
      {t(priority)}
    </Badge>
  );
}
