import { cn } from "@/lib/utils";

export function HistoryExerciseListSkeleton({ className }: { className?: string }) {
  return (
    <ul className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-lg border border-border bg-card p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-4 w-48 max-w-[70%] rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="mt-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-muted" />
            <div className="h-5 w-28 rounded-full bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}
