import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusIndicator } from '@/components/ui/status-indicator'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { MonitorListLoading } from '@/components/loading'
import { dedupe } from '@/lib/cache'
import type { MonitorStatus } from '@/types'

// Type guard for monitor status
const validStatuses: MonitorStatus[] = ['up', 'down', 'degraded', 'paused']
function isValidMonitorStatus(status: string | null): status is MonitorStatus {
  return status !== null && validStatuses.includes(status as MonitorStatus)
}

// Cache for 10 seconds
const getMonitors = dedupe(async () => {
  return prisma.monitor.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      project: {
        select: { name: true }
      }
    }
  })
})

export const revalidate = 10

async function MonitorsList() {
  const monitors = await getMonitors()

  if (monitors.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No monitors yet</p>
        <Button asChild>
          <Link href="/monitors/new">Create your first monitor</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {monitors.map((monitor) => {
        const status = isValidMonitorStatus(monitor.lastStatus)
          ? monitor.lastStatus
          : 'unknown'

        return (
          <Link
            key={monitor.id}
            href={`/monitors/${monitor.id}`}
            className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-4">
              <StatusIndicator
                status={status as "up" | "down" | "degraded" | "paused" | "unknown"}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{monitor.name}</h3>
                  <Badge variant="outline">{monitor.project.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate max-w-[300px]">{monitor.url}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {monitor.uptimePercentage?.toFixed(1) ?? '100.0'}% uptime
              </p>
              <p className="text-xs text-muted-foreground">
                {monitor.avgResponseTime ?? 0}ms avg
              </p>
              {monitor.lastCheckedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(monitor.lastCheckedAt)}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default function MonitorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Monitors</h2>
        <Button asChild>
          <Link href="/monitors/new">
            <Plus className="mr-2 h-4 w-4" />
            New Monitor
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Monitors</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<MonitorListLoading />}>
            <MonitorsList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
