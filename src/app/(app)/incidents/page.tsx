import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import { CardLoading } from '@/components/loading'
import { dedupe } from '@/lib/cache'

const getIncidents = dedupe(async () => {
  return prisma.incident.findMany({
    orderBy: { startedAt: 'desc' },
    include: {
      monitor: {
        select: { name: true, url: true }
      }
    }
  })
})

export const revalidate = 10

async function IncidentsList() {
  const incidents = await getIncidents()

  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED')
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'AUTO_RESOLVED')

  return (
    <>
      {/* Open Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Open Incidents ({openIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {openIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No open incidents. All systems operational.
            </div>
          ) : (
            <div className="space-y-3">
              {openIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={incident.severity.toLowerCase() as any}>
                        {incident.severity}
                      </Badge>
                      <span className="font-medium">{incident.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {incident.monitor.name} • Started {formatRelativeTime(incident.startedAt)}
                    </p>
                  </div>
                  <Badge variant={incident.status === 'OPEN' ? 'destructive' : 'secondary'}>
                    {incident.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolved Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Resolved Incidents ({resolvedIncidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {resolvedIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No resolved incidents yet.
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedIncidents.slice(0, 10).map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="up">Resolved</Badge>
                      <span className="font-medium">{incident.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {incident.monitor.name} • Duration: {incident.duration ? `${Math.round(incident.duration / 60)}m` : 'N/A'}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(incident.resolvedAt || incident.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Incidents</h2>
      <Suspense fallback={<CardLoading />}>
        <IncidentsList />
      </Suspense>
    </div>
  )
}
