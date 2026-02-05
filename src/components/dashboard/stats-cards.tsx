"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
  stats: {
    totalMonitors: number
    upMonitors: number
    downMonitors: number
    degradedMonitors: number
    openIncidents: number
    avgUptime: number
    avgLatency: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Monitors",
      value: stats.totalMonitors,
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Up",
      value: stats.upMonitors,
      icon: CheckCircle,
      color: "text-status-up",
      bgColor: "bg-status-up/10",
    },
    {
      title: "Down",
      value: stats.downMonitors,
      icon: AlertTriangle,
      color: "text-status-down",
      bgColor: "bg-status-down/10",
    },
    {
      title: "Open Incidents",
      value: stats.openIncidents,
      icon: Clock,
      color: "text-severity-major",
      bgColor: "bg-severity-major/10",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="card-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn("rounded-lg p-2", card.bgColor)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>
                {card.value}
              </div>
              {card.title === "Total Monitors" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.avgUptime.toFixed(1)}% avg uptime
                </p>
              )}
              {card.title === "Up" && stats.totalMonitors > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {((stats.upMonitors / stats.totalMonitors) * 100).toFixed(0)}% healthy
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
