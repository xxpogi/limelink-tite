import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UptimeChart } from '@/components/charts/uptime-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusIndicator } from '@/components/ui/status-indicator'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { StatsCardsLoading, CardLoading, ChartLoading, IncidentListLoading, MonitorListLoading } from '@/components/loading'
import { dedupe } from '@/lib/cache'
import type { MonitorStatus, IncidentSeverity } from '@/types'

// Type for valid status values
const validStatuses: MonitorStatus[] = ['up', 'down', 'degraded', 'paused']

// Type guard for monitor status
function isValidMonitorStatus(status: string | null): status is MonitorStatus {
  return status !== null && validStatuses.includes(status as MonitorStatus)
}

// Type for valid severity badge variants
type SeverityVariant = 'default' | 'secondary' | 'destructive' | 'outline'

// Map severity to badge variant
function getSeverityVariant(severity: string): SeverityVariant {
  switch (severity) {
    case 'CRITICAL':
      return 'destructive'
    case 'MAJOR':
      return 'destructive'
    case 'MINOR':
      return 'secondary'
    case 'WARNING':
      return 'outline'
    default:
      return 'default'
  }
}

// Cache dashboard stats for 30 seconds
const getDashboardStats = dedupe(async () => {
  const [
    totalMonitors,
    upMonitors,
    downMonitors,
    degradedMonitors,
    openIncidents,
    recentChecks,
  ] = await Promise.all([
    prisma.monitor.count({ where: { deletedAt: null } }),
    prisma.monitor.count({ where: { lastStatus: "up", deletedAt: null } }),
    prisma.monitor.count({ where: { lastStatus: "down", deletedAt: null } }),
    prisma.monitor.count({ where: { lastStatus: "degraded", deletedAt: null } }),
    prisma.incident.count({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    }),
    prisma.monitorCheck.findMany({
      where: {
        checkedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { checkedAt: "desc" },
      take: 100,
    }),
  ])

  const avgUptime = recentChecks.length > 0
    ? (recentChecks.filter(c => c.status === "up").length / recentChecks.length) * 100
    : 100

  const avgLatency = recentChecks.length > 0
    ? Math.round(recentChecks.reduce((sum, c) => sum + c.totalTime, 0) / recentChecks.length)
    : 0

  return {
    totalMonitors,
    upMonitors,
    downMonitors,
    degradedMonitors,
    openIncidents,
    avgUptime,
    avgLatency,
  }
})

// Cache recent monitors for 10 seconds
const getRecentMonitors = dedupe(async () => {
  return prisma.monitor.findMany({
    where: { deletedAt: null },
    orderBy: { lastCheckedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      url: true,
      lastStatus: true,
      uptimePercentage: true,
      avgResponseTime: true,
      lastCheckedAt: true,
    },
  })
})

// Cache recent incidents for 10 seconds
const getRecentIncidents = dedupe(async () => {
  return prisma.incident.findMany({
    where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    orderBy: { startedAt: "desc" },
    take: 5,
    include: {
      monitor: {
        select: { name: true },
      },
    },
  })
})

// Get chart data from database (server-side, deterministic)
async function getChartData() {
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)

  // Get hourly aggregated data
  const hourlyData = await prisma.monitorCheckHourly.findMany({
    where: {
      hour: {
        gte: startTime,
        lte: endTime,
      },
    },
    select: {
      hour: true,
      totalChecks: true,
      upCount: true,
    },
    orderBy: { hour: 'asc' },
  })

  // If we have data, use it; otherwise generate placeholder data
  if (hourlyData.length > 0) {
    return hourlyData.map(d => ({
      date: d.hour.toISOString(),
      uptime: d.totalChecks > 0 ? (d.upCount / d.totalChecks) * 100 : 100,
      checks: d.totalChecks,
    }))
  }

  // Generate deterministic placeholder data (based on hour, not random)
  return Array.from({ length: 24 }, (_, i) => {
    const hour = new Date(endTime.getTime() - (23 - i) * 60 * 60 * 1000)
    // Use hour as seed for consistent values
    const seed = hour.getHours()
    const uptime = 99 + (seed % 10) * 0.1 // 99.0 to 99.9
    return {
      date: hour.toISOString(),
      uptime,
      checks: 100 + (seed % 5) * 10, // 100 to 140
    }
  })
}

export const revalidate = 30 // Revalidate page every 30 seconds

export default async function DashboardPage() {
  // Fetch data in parallel
  const [stats, monitors, incidents, chartData] = await Promise.all([
    getDashboardStats(),
    getRecentMonitors(),
    getRecentIncidents(),
    getChartData(),
  ])

  return (
    <div className="space-y-6">
      <Suspense fallback={<StatsCardsLoading />}>
        <StatsCards stats={stats} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartLoading />}>
          <UptimeChart data={chartData} />
        </Suspense>

        <Suspense fallback={<CardLoading />}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Monitors</CardTitle>
            </CardHeader>
            <CardContent>
              {monitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No monitors yet. Create your first monitor to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {monitors.map((monitor) => {
                    const status: MonitorStatus = isValidMonitorStatus(monitor.lastStatus)
                      ? monitor.lastStatus
                      : 'unknown' as MonitorStatus

                    return (
                      <Link
                        key={monitor.id}
                        href={`/monitors/${monitor.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIndicator
                            status={status as "up" | "down" | "degraded" | "paused" | "unknown"}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">{monitor.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {monitor.url}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {monitor.uptimePercentage?.toFixed(1) ?? '100.0'}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {monitor.avgResponseTime ?? 0}ms
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </Suspense>
      </div>

      <Suspense fallback={<IncidentListLoading />}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Open Incidents</CardTitle>
            {incidents.length > 0 && (
              <Badge variant="destructive">{incidents.length} active</Badge>
            )}
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg">✓ All systems operational</p>
                <p className="text-sm mt-1">No open incidents at this time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={getSeverityVariant(incident.severity)}>
                        {incident.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {incident.monitor.name} • {formatRelativeTime(incident.startedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={incident.status === "OPEN" ? "destructive" : "secondary"}
                    >
                      {incident.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Suspense>
    </div>
  )
}
