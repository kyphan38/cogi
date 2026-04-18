import { cn } from "@/lib/utils";

export function DashboardSummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mb-6 grid gap-2.5 sm:grid-cols-3", className)} aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border bg-card px-3.5 py-3"
        >
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-3 h-8 w-16 rounded bg-muted" />
          <div className="mt-2 h-3 w-full max-w-[180px] rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function DashboardCompletedCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      aria-hidden
    >
      <div className="mb-4 h-5 w-48 rounded bg-muted" />
      <div className="mb-6 h-3 w-32 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-[88%] rounded bg-muted" />
          <div className="h-4 w-[72%] rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-[88%] rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
