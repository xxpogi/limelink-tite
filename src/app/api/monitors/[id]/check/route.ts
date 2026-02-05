import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { executeCheck, aggregateCheckResults, storeCheckResult, updateMonitorStatus } from '@/services/monitoring'
import { createIncident, getOpenIncident, classifyIncident, determineSeverity } from '@/services/incidents'
import { detectDDoS, storeNetworkEvent } from '@/services/ddos-detection'
import { queueRCAGeneration } from '@/services/rca'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()
    
    const monitor = await prisma.monitor.findUnique({
      where: { id: params.id },
    })
    
    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }
    
    const checkPromises = monitor.regions.map(async (region) => {
      try {
        const result = await executeCheck(
          {
            url: monitor.url,
            method: monitor.method,
            headers: monitor.headers as Record<string, string> | undefined,
            body: monitor.body || undefined,
            timeout: monitor.timeout,
            expectedStatus: monitor.expectedStatus ?? undefined,
            expectedContent: monitor.expectedContent ?? undefined,
            followRedirects: monitor.followRedirects,
            checkSsl: monitor.checkSsl,
          },
          region
        )
        result.monitorId = monitor.id
        return result
      } catch (error) {
        return {
          monitorId: monitor.id,
          region,
          status: 'down' as const,
          totalTime: 0,
          error: error instanceof Error ? error.message : 'Check failed',
          checkedAt: new Date(),
        }
      }
    })
    
    const checkResults = await Promise.all(checkPromises)
    
    await Promise.all(checkResults.map((result) => storeCheckResult(monitor.id, result)))
    
    const aggregated = aggregateCheckResults(checkResults)
    await updateMonitorStatus(monitor.id, aggregated)
    
    const openIncident = await getOpenIncident(monitor.id)
    
    if (aggregated.status === 'down' && !openIncident) {
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
      
      const incident = await createIncident(
        monitor.id,
        classification as any,
        severity as any,
        aggregated.regions.filter(r => r.status === 'down').map(r => r.region),
        aggregated.regions.filter(r => r.status === 'down').length / aggregated.regions.length,
        aggregated.avgResponseTime
      )
      
      const ddosResult = await detectDDoS(monitor.id)
      if (ddosResult.isSuspected) {
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
        
        await prisma.incident.update({
          where: { id: incident.id },
          data: { ddosConfidence: ddosResult.confidence },
        })
      }
      
      queueRCAGeneration(incident.id)
    }
    
    return NextResponse.json({
      success: true,
      results: checkResults,
      aggregated,
    })
  } catch (error) {
    console.error('Failed to trigger check:', error)
    return NextResponse.json({ error: 'Failed to trigger check' }, { status: 500 })
  }
}
