import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/lib/validations/feedback";

const TYPE_STYLES: Record<
  FeedbackType,
  { className: string; icon: typeof Bug }
> = {
  bug: {
    className:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    icon: Bug,
  },
  suggestion: {
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: Lightbulb,
  },
};

export function TypeBadge({
  type,
  className,
}: {
  type: FeedbackType;
  className?: string;
}) {
  const t = useTranslations("feedback.type");
  const style = TYPE_STYLES[type];
  const Icon = style.icon;
  return (
    <Badge
      variant="outline"
      className={cn(style.className, "gap-1", className)}
    >
      <Icon className="h-3 w-3" />
      {t(type)}
    </Badge>
  );
}
