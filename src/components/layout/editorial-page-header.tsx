import { cn } from "@/lib/utils";

interface EditorialPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EditorialPageHeader({ title, description, action, className }: EditorialPageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6", className)}>
      <div>
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight font-headline">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
