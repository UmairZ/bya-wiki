import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Unified small-chip component. Use anywhere you'd otherwise reach for a
 *  span with `rounded-full bg-* text-[10px] uppercase` etc.
 *
 *  - `tone` picks the semantic color treatment
 *  - `size="sm"` is the small uppercase-tracking chip (most common)
 *  - `size="md"` is the slightly larger sentence-case badge
 *
 *  Icons render at consistent size; pass them inline as `<Icon />` children. */
const pillVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        accent: "bg-brand-tint text-brand-tint-foreground",
        info: "bg-primary/15 text-primary",
        warning:
          "bg-amber-500/15 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        success:
          "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        destructive: "bg-destructive/15 text-destructive",
        outline: "border border-border bg-transparent text-foreground",
      },
      size: {
        sm: "h-5 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider [&_svg]:size-2.5",
        md: "h-6 px-2 py-0.5 text-xs font-medium [&_svg]:size-3",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  },
);

type PillProps = React.ComponentProps<"span"> &
  VariantProps<typeof pillVariants>;

export function Pill({
  className,
  tone,
  size,
  ...props
}: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(pillVariants({ tone, size }), className)}
      {...props}
    />
  );
}
