// Cron job for scheduling monitor checks
// This runs every minute to queue checks for due monitors

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonitorsDueForCheck, aggregateCheckResults, storeCheckResult, updateMonitorStatus } from '@/services/monitoring'
import { createIncident, resolveIncident, getOpenIncident, classifyIncident, determineSeverity } from '@/services/incidents'
import { detectDDoS, storeNetworkEvent } from '@/services/ddos-detection'
import { dispatchAlert } from '@/services/alerts'
import { queueRCAGeneration } from '@/services/rca'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get monitors due for check
    const monitors = await getMonitorsDueForCheck()
    
    const results = {
      processed: 0,
      errors: 0,
      incidentsCreated: 0,
      incidentsResolved: 0,
    }

    for (const monitor of monitors) {
      try {
        // Execute checks from all configured regions
        const checkPromises = monitor.regions.map(async (region) => {
          try {
            // Call edge function for this region
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                monitorId: monitor.id,
                url: monitor.url,
                method: monitor.method,
                headers: monitor.headers,
                body: monitor.body,
                timeout: monitor.timeout,
                expectedStatus: monitor.expectedStatus ?? undefined,
                expectedContent: monitor.expectedContent ?? undefined,
                followRedirects: monitor.followRedirects,
                checkSsl: monitor.checkSsl,
              }),
            })

            if (!response.ok) {
              throw new Error(`Check failed: ${response.status}`)
            }

            const data = await response.json()
            return data.result
          } catch (error) {
            // Return failed check result
            return {
              monitorId: monitor.id,
              region,
              status: 'down',
              totalTime: 0,
              error: error instanceof Error ? error.message : 'Check failed',
              checkedAt: new Date(),
            }
          }
        })

        const checkResults = await Promise.all(checkPromises)

        // Store individual check results
        await Promise.all(
          checkResults.map((result) => storeCheckResult(monitor.id, result))
        )

        // Aggregate results
        const aggregated = aggregateCheckResults(checkResults)

        // Update monitor status
        await updateMonitorStatus(monitor.id, aggregated)

        // Check for incident
        const openIncident = await getOpenIncident(monitor.id)

        if (aggregated.status === 'down') {
          // Downtime detected
          if (!openIncident) {
            // Classify the incident
            const failedCheck = checkResults.find(r => r.status === 'down')
            const classification = classifyIncident(
              failedCheck?.error || 'Unknown error',
              failedCheck?.statusCode,
              aggregated.regions.filter(r => r.status === 'down').length,
              aggregated.regions.length
            )

            const severity = determineSeverity(
              classification,
              aggregated.regions.filter(r => r.status === 'down').length,
              aggregated.regions.length,
              aggregated.regions.filter(r => r.status === 'down').length / aggregated.regions.length
            )

            // Create incident
            const incident = await createIncident(
              monitor.id,
              classification as any,
              severity as any,
              aggregated.regions.filter(r => r.status === 'down').map(r => r.region),
              aggregated.regions.filter(r => r.status === 'down').length / aggregated.regions.length,
              aggregated.avgResponseTime
            )

            results.incidentsCreated++

            // Dispatch alerts
            if (monitor.projectId) {
              await dispatchAlert(monitor.projectId, {
                event: 'MONITOR_DOWN',
                monitor: {
                  id: monitor.id,
                  name: monitor.name || monitor.url,
                  url: monitor.url,
                  status: 'down',
                },
                incident: {
                  id: incident.id,
                  severity: incident.severity,
                  title: incident.title,
                  affectedRegions: incident.affectedRegions,
                },
                timestamp: new Date(),
                details: {
                  error_rate: aggregated.regions.filter(r => r.status === 'down').length / aggregated.regions.length,
                  regions_affected: incident.affectedRegions.length,
                },
              })

              // Check for DDoS
              const ddosResult = await detectDDoS(monitor.id)
              if (ddosResult.isSuspected) {
                // Store DDoS network event
                await storeNetworkEvent(
                  monitor.id,
                  'DDOS_SUSPECTED',
                  severity as any,
                  ddosResult.recommendation,
                  ddosResult.confidence,
                  undefined,
                  incident.id,
                  { signals: ddosResult.signals }
                )

                // Update incident with DDoS confidence
                await prisma.incident.update({
                  where: { id: incident.id },
                  data: { ddosConfidence: ddosResult.confidence },
                })

                // Dispatch DDoS alert
                await dispatchAlert(monitor.projectId, {
                  event: 'DDOS_SUSPECTED',
                  monitor: {
                    id: monitor.id,
                    name: monitor.name || monitor.url,
                    url: monitor.url,
                    status: 'down',
                  },
                  incident: {
                    id: incident.id,
                    severity: incident.severity,
                    title: incident.title,
                    affectedRegions: incident.affectedRegions,
                  },
                  timestamp: new Date(),
                  details: {
                    ddos_confidence: ddosResult.confidence,
                    signals: ddosResult.signals.map(s => s.type),
                  },
                })
              }
            }

            // Queue RCA generation
            queueRCAGeneration(incident.id)
          }
        } else if (aggregated.status === 'up' && openIncident) {
          // Recovery detected
          await resolveIncident(openIncident.id, true)
          results.incidentsResolved++

          // Dispatch recovery alert
          if (monitor.projectId) {
            await dispatchAlert(monitor.projectId, {
              event: 'MONITOR_UP',
              monitor: {
                id: monitor.id,
                name: monitor.name || monitor.url,
                url: monitor.url,
                status: 'up',
              },
              timestamp: new Date(),
              details: {
                previous_incident: openIncident.id,
                duration_seconds: openIncident.duration,
              },
            })
          }
        }

        results.processed++
      } catch (error) {
        console.error(`Failed to process monitor ${monitor.id}:`, error)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
