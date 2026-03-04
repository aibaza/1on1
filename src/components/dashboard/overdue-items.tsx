import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { OverdueGroup } from "@/lib/queries/dashboard";

interface OverdueItemsProps {
  groups: OverdueGroup[];
}

export function OverdueItems({ groups }: OverdueItemsProps) {
  // Don't render if nothing overdue
  if (groups.length === 0) return null;

  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-red-500" />
        <h2 className="text-lg font-medium">Overdue Action Items</h2>
        <Badge variant="destructive" className="ml-1 tabular-nums">
          {totalCount}
        </Badge>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.reportId} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{group.reportName}</h3>
              <span className="text-xs text-muted-foreground">
                {group.items.length}{" "}
                {group.items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href="/action-items"
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0 truncate pr-3">{item.title}</span>
                  <Badge
                    variant="destructive"
                    className="shrink-0 tabular-nums text-xs"
                  >
                    {item.daysOverdue}d overdue
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
