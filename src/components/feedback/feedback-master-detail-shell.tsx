import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FeedbackMasterDetailShellProps {
  list: ReactNode;
  detail: ReactNode;
  /**
   * When true, mobile viewports show the detail pane and hide the list;
   * when false, mobile shows only the list.
   * Desktop always shows both panes side-by-side.
   */
  hasSelection: boolean;
}

/**
 * Shared master-detail layout used by `/feedback/mine` and `/admin/feedback`.
 * Left pane is 360px sticky list; right pane flexes with the rest of the
 * content. Full-height layout relies on the pane containers managing their
 * own overflow. Mobile collapses to a single pane based on `hasSelection`.
 */
export function FeedbackMasterDetailShell({
  list,
  detail,
  hasSelection,
}: FeedbackMasterDetailShellProps) {
  return (
    <div
      className="flex h-[calc(100vh-10rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col md:w-[360px] md:border-r",
          hasSelection ? "hidden md:flex" : "flex"
        )}
      >
        {list}
      </aside>
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          hasSelection ? "flex" : "hidden md:flex"
        )}
      >
        {detail}
      </section>
    </div>
  );
}
