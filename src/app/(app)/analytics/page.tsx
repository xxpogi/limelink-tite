import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'

async function getAnalyticsData(userId: string) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  // Get user's monitors
  const userMonitors = await prisma.monitor.findMany({
    where: {
      deletedAt: null,
      project: {
        team: {
          members: {
            some: { userId }
          }
        }
      }
    },
    select: { id: true }
  })
  
  const monitorIds = userMonitors.map(m => m.id)
  
  // If no monitors, return zeros
  if (monitorIds.length === 0) {
    return {
      totalChecks24h: 0,
      avgResponseTime: 0,
      incidents30d: 0,
      uptimePercentage: 100,
    }
  }
  
  // Get total checks in last 24h
  const totalChecks24h = await prisma.monitorCheck.count({
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: last24Hours }
    }
  })
  
  // Get average response time
  const avgResponseResult = await prisma.monitorCheck.aggregate({
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: last24Hours },
      status: { in: ['up', 'degraded'] }
    },
    _avg: {
      totalTime: true
    }
  })
  
  // Get incidents in last 30 days
  const incidents30d = await prisma.incident.count({
    where: {
      monitorId: { in: monitorIds },
      startedAt: { gte: last30Days }
    }
  })
  
  // Calculate uptime percentage
  const checksForUptime = await prisma.monitorCheck.groupBy({
    by: ['status'],
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: last24Hours }
    },
    _count: {
      status: true
    }
  })
  
  const totalUptimeChecks = checksForUptime.reduce((sum, c) => sum + c._count.status, 0)
  const upChecks = checksForUptime.find(c => c.status === 'up')?._count.status || 0
  const degradedChecks = checksForUptime.find(c => c.status === 'degraded')?._count.status || 0
  const uptimePercentage = totalUptimeChecks > 0 
    ? ((upChecks + degradedChecks) / totalUptimeChecks) * 100 
    : 100
  
  return {
    totalChecks24h,
    avgResponseTime: Math.round(avgResponseResult._avg.totalTime || 0),
    incidents30d,
    uptimePercentage,
  }
}

export default async function AnalyticsPage() {
  const session = await requireAuth()
  const data = await getAnalyticsData(session.id)
  
  const hasData = data.totalChecks24h > 0 || data.incidents30d > 0

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Checks (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalChecks24h.toLocaleString()}
            </div>
            {data.totalChecks24h === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No checks yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.avgResponseTime > 0 ? `${data.avgResponseTime}ms` : 'N/A'}
            </div>
            {data.avgResponseTime === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No data yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Uptime (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.uptimePercentage.toFixed(2)}%
            </div>
            {data.totalChecks24h === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No checks yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Incidents (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.incidents30d}</div>
            {data.incidents30d === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No incidents 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No analytics data available yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first monitor to start collecting analytics
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Analytics charts coming soon...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
