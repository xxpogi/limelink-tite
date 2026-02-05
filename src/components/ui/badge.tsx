import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status badges
        up: "border-transparent bg-status-up/10 text-status-up border-status-up/20",
        down: "border-transparent bg-status-down/10 text-status-down border-status-down/20",
        degraded: "border-transparent bg-status-degraded/10 text-status-degraded border-status-degraded/20",
        paused: "border-transparent bg-status-paused/10 text-status-paused border-status-paused/20",
        // Severity badges
        critical: "border-transparent bg-severity-critical/10 text-severity-critical border-severity-critical/20",
        major: "border-transparent bg-severity-major/10 text-severity-major border-severity-major/20",
        minor: "border-transparent bg-severity-minor/10 text-severity-minor border-severity-minor/20",
        warning: "border-transparent bg-severity-warning/10 text-severity-warning border-severity-warning/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
