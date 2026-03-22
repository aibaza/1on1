import { cn } from "@/lib/utils";

interface EditorialPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EditorialPageHeader({ title, description, eyebrow, action, className }: EditorialPageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6", className)}>
      <div>
        {eyebrow && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--editorial-tertiary, var(--color-success))" }}>
              {eyebrow}
            </span>
            <div className="h-px w-8" style={{ backgroundColor: "var(--editorial-tertiary-fixed-dim, var(--color-success))" }} />
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight font-headline">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-base font-medium mt-2 max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
