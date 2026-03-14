import { Skeleton } from "@/components/ui/skeleton";

export default function SessionSummaryLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6 animate-fade-in">
      {/* Back link */}
      <Skeleton className="h-4 w-28" />

      {/* Session header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* AI Summary card */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Category sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}
