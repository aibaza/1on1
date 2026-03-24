import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inlineAlertVariants = cva(
  "flex items-start gap-3 rounded-lg border-l-4 px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: [
          "border-l-blue-500 bg-blue-500/[0.06] text-blue-900",
          "dark:bg-blue-500/[0.08] dark:text-blue-200",
        ].join(" "),
        warning: [
          "border-l-amber-500 bg-amber-500/[0.06] text-amber-900",
          "dark:bg-amber-500/[0.08] dark:text-amber-200",
        ].join(" "),
        error: [
          "border-l-red-500 bg-red-500/[0.06] text-red-900",
          "dark:bg-red-500/[0.08] dark:text-red-200",
        ].join(" "),
        success: [
          "border-l-emerald-500 bg-emerald-500/[0.06] text-emerald-900",
          "dark:bg-emerald-500/[0.08] dark:text-emerald-200",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconColorMap = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-red-500",
  success: "text-emerald-500",
} as const;

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
} as const;

interface InlineAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineAlertVariants> {
  /** Hide the default icon */
  hideIcon?: boolean;
}

export function InlineAlert({
  className,
  variant = "info",
  hideIcon,
  children,
  ...props
}: InlineAlertProps) {
  const v = variant ?? "info";
  const Icon = iconMap[v];

  return (
    <div
      role="alert"
      className={cn(inlineAlertVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon && (
        <Icon className={cn("h-[18px] w-[18px] mt-px shrink-0", iconColorMap[v])} />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
