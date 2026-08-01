import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        secondary: "border-zinc-200 bg-zinc-100 text-zinc-700",
        positive:
          "border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
        attention:
          "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
