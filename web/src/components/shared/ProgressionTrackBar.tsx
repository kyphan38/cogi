import { cn } from "@/lib/utils";

export interface ProgressionTrackBarProps {
  /** 0–100 */
  percent: number;
  className?: string;
  "aria-label"?: string;
}

export function ProgressionTrackBar({
  percent,
  className,
  "aria-label": ariaLabel = "Progress",
}: ProgressionTrackBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className={cn("relative h-1 w-full overflow-hidden rounded-full bg-zinc-200", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-zinc-900 transition-all duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
