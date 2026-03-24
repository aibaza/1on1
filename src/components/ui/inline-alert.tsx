import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inlineAlertVariants = cva(
  "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
        warning:
          "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
        error:
          "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
        success:
          "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

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
  const Icon = iconMap[variant ?? "info"];

  return (
    <div
      role="alert"
      className={cn(inlineAlertVariants({ variant }), className)}
      {...props}
    >
      {!hideIcon && (
        <Icon className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
