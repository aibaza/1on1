import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedbackStatus } from "@/lib/validations/feedback";

interface StatusBadgeProps {
  status: FeedbackStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("feedback.status");
  const label = t(status);
  switch (status) {
    case "new":
      return (
        <Badge variant="default" className={className}>
          {label}
        </Badge>
      );
    case "triaged":
      return (
        <Badge variant="secondary" className={className}>
          {label}
        </Badge>
      );
    case "in_progress":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-primary/15 text-primary border-primary/30",
            className
          )}
        >
          {label}
        </Badge>
      );
    case "awaiting_user":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
            className
          )}
        >
          {label}
        </Badge>
      );
    case "resolved":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
            className
          )}
        >
          {label}
        </Badge>
      );
    case "closed":
      return (
        <Badge
          variant="outline"
          className={cn("bg-muted text-muted-foreground", className)}
        >
          {label}
        </Badge>
      );
    default: {
      const _exhaustive: never = status;
      return null;
    }
  }
}
