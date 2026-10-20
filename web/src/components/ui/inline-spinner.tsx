import { cn } from "@/lib/utils";

/**
 * "Working" mark beside a word like `Generating…`: a small dot that slowly
 * fades in and out (DESIGN.md: no spinning wheel).
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "breathe inline-block size-2 shrink-0 rounded-full bg-current align-middle",
        className,
      )}
      aria-hidden
    />
  );
}
