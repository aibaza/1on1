import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Score on a 0–5 scale. Pass null to show all grayed hollow stars. */
  score: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-7 w-7",
};

export function StarRating({ score, size = "md", className }: StarRatingProps) {
  if (score === null) return null;

  const cls = sizeClasses[size];
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.5;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < fullStars) {
          return <Star key={i} className={cn(cls, "fill-[var(--color-warning,#f59e0b)] text-[var(--color-warning,#f59e0b)]")} />;
        }
        if (i === fullStars && hasHalf) {
          return (
            <span key={i} className={cn("relative inline-flex shrink-0", cls)}>
              <Star className={cn("absolute", cls, "text-muted-foreground/25")} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star className={cn(cls, "fill-[var(--color-warning,#f59e0b)] text-[var(--color-warning,#f59e0b)]")} />
              </span>
            </span>
          );
        }
        return <Star key={i} className={cn(cls, "text-muted-foreground/25")} />;
      })}
    </div>
  );
}
