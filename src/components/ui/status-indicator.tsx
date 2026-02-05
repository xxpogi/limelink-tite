"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface StatusIndicatorProps {
  status: "up" | "down" | "degraded" | "paused" | "unknown"
  size?: "sm" | "md" | "lg"
  showPulse?: boolean
  className?: string
}

const statusConfig = {
  up: {
    color: "bg-status-up",
    label: "Up",
  },
  down: {
    color: "bg-status-down",
    label: "Down",
  },
  degraded: {
    color: "bg-status-degraded",
    label: "Degraded",
  },
  paused: {
    color: "bg-status-paused",
    label: "Paused",
  },
  unknown: {
    color: "bg-muted-foreground",
    label: "Unknown",
  },
}

const sizeConfig = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
}

export function StatusIndicator({
  status,
  size = "md",
  showPulse = true,
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status] || statusConfig.unknown
  const sizeClass = sizeConfig[size]

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      {/* Pulse ring for active states */}
      {showPulse && (status === "up" || status === "down") && (
        <motion.span
          className={cn("absolute inline-flex rounded-full opacity-75", config.color)}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
          style={{ width: size === "sm" ? 8 : size === "md" ? 12 : 16, height: size === "sm" ? 8 : size === "md" ? 12 : 16 }}
        />
      )}
      
      {/* Main dot */}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          sizeClass,
          config.color
        )}
      />
    </div>
  )
}

export function StatusBadge({
  status,
  className,
}: {
  status: "up" | "down" | "degraded" | "paused" | "unknown"
  className?: string
}) {
  const config = statusConfig[status] || statusConfig.unknown

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "up" && "bg-status-up/10 text-status-up",
        status === "down" && "bg-status-down/10 text-status-down",
        status === "degraded" && "bg-status-degraded/10 text-status-degraded",
        status === "paused" && "bg-status-paused/10 text-status-paused",
        status === "unknown" && "bg-muted text-muted-foreground",
        className
      )}
    >
      <StatusIndicator status={status} size="sm" showPulse={false} />
      {config.label}
    </div>
  )
}
