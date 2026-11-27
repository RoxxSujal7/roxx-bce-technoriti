import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:opacity-90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:opacity-90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:opacity-90",
        outline: "border-border text-foreground",
        success:
          "bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))] border-[hsl(var(--status-success-border))]",
        warning:
          "bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))] border-[hsl(var(--status-warning-border))]",
        info:
          "bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-fg))] border-[hsl(var(--status-info-border))]",
        danger:
          "bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-fg))] border-[hsl(var(--status-danger-border))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
