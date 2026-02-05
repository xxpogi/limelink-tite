// Local Root Cause Analysis service - 100% free, no external AI
// Uses statistical analysis and rule-based reasoning

import { prisma } from '@/lib/prisma'
import { RCAResult } from '@/types'
import { mean } from 'simple-statistics'
import { Prisma } from '@prisma/client'

interface IncidentContext {
  monitorId: string
  monitorName: string
  monitorUrl: string
  incidentStart: Date
  affectedRegions: string[]
  initialStatus: string
}

interface MetricSnapshot {
  region: string
  status: string
  latency: number
  errorRate: number
  statusCode?: number
  errorMessage?: string
}

interface CheckMetrics {
  timestamps: Date[]
  latencies: number[]
  errorRates: number[]
  statusCodes: Map<number, number>
  errorMessages: Map<string, number>
  regionStatuses: Map<string, { up: number; down: number; degraded: number; total: number }>
}

/**
 * Collect context data for RCA
 */
async function collectRCAContext(
  incidentId: string,
  monitorId: string
): Promise<{
  incident: IncidentContext
  preIncident: MetricSnapshot[]
  duringIncident: MetricSnapshot[]
  historicalBaseline: MetricSnapshot[]
  networkEvents: Array<{
    type: string
    description: string
    confidence: number
    detectedAt: Date
  }>
}> {
  // Get incident details
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      monitor: true,
    },
  })

  if (!incident) {
    throw new Error('Incident not found')
  }

  const incidentContext: IncidentContext = {
    monitorId: incident.monitorId,
    monitorName: incident.monitor.name,
    monitorUrl: incident.monitor.url,
    incidentStart: incident.startedAt,
    affectedRegions: incident.affectedRegions,
    initialStatus: incident.classification,
  }

  // Get pre-incident metrics (30 min before)
  const preStart = new Date(incident.startedAt.getTime() - 30 * 60 * 1000)
  const preEnd = incident.startedAt

  const preIncidentChecks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: preStart,
        lte: preEnd,
      },
    },
    select: {
      region: true,
      status: true,
      totalTime: true,
      statusCode: true,
      error: true,
    },
  })

  // Aggregate pre-incident by region
  const preIncidentMap = new Map<string, { latencies: number[]; errors: number; total: number }>()
  for (const check of preIncidentChecks) {
    const agg = preIncidentMap.get(check.region) || { latencies: [], errors: 0, total: 0 }
    agg.latencies.push(check.totalTime)
    agg.total++
    if (check.status === 'down') agg.errors++
    preIncidentMap.set(check.region, agg)
  }

  const preIncident: MetricSnapshot[] = Array.from(preIncidentMap.entries()).map(([region, agg]) => ({
    region,
    status: agg.errors === 0 ? 'healthy' : 'degraded',
    latency: agg.latencies.length > 0 
      ? agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length 
      : 0,
    errorRate: agg.total > 0 ? agg.errors / agg.total : 0,
  }))

  // Get during-incident metrics
  const duringEnd = new Date(incident.startedAt.getTime() + 30 * 60 * 1000)

  const duringChecks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: incident.startedAt,
        lte: duringEnd,
      },
    },
    select: {
      region: true,
      status: true,
      totalTime: true,
      statusCode: true,
      error: true,
    },
  })

  // Aggregate during-incident by region
  const duringMap = new Map<string, { 
    latencies: number[]; 
    errors: number; 
    total: number;
    statusCodes: Map<number, number>;
    errorMessages: Map<string, number>;
  }>()
  
  for (const check of duringChecks) {
    const agg = duringMap.get(check.region) || { 
      latencies: [] as number[], 
      errors: 0, 
      total: 0,
      statusCodes: new Map(),
      errorMessages: new Map(),
    }
    agg.latencies.push(check.totalTime)
    agg.total++
    if (check.status === 'down') {
      agg.errors++
      if (check.error) agg.errorMessages.set(check.error, (agg.errorMessages.get(check.error) || 0) + 1)
    }
    if (check.statusCode) {
      agg.statusCodes.set(check.statusCode, (agg.statusCodes.get(check.statusCode) || 0) + 1)
    }
    duringMap.set(check.region, agg)
  }

  const duringIncident: MetricSnapshot[] = Array.from(duringMap.entries()).map(([region, agg]) => {
    const mostCommonStatus = Array.from(agg.statusCodes.entries())
      .sort((a, b) => b[1] - a[1])[0]
    
    const mostCommonError = Array.from(agg.errorMessages.entries())
      .sort((a, b) => b[1] - a[1])[0]
    
    return {
      region,
      status: agg.errors / agg.total > 0.5 ? 'down' : agg.errors > 0 ? 'degraded' : 'up',
      latency: agg.latencies.length > 0 
        ? agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length 
        : 0,
      errorRate: agg.total > 0 ? agg.errors / agg.total : 0,
      statusCode: mostCommonStatus?.[0],
      errorMessage: mostCommonError?.[0],
    }
  })

  // Get historical baseline (7 days before)
  const baselineStart = new Date(preStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const baselineEnd = preStart

  const baselineChecks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: baselineStart,
        lte: baselineEnd,
      },
    },
    select: {
      region: true,
      status: true,
      totalTime: true,
    },
  })

  // Aggregate baseline by region
  const baselineMap = new Map<string, { latencies: number[]; errors: number; total: number }>()
  for (const check of baselineChecks) {
    const agg = baselineMap.get(check.region) || { latencies: [], errors: 0, total: 0 }
    agg.latencies.push(check.totalTime)
    agg.total++
    if (check.status === 'down') agg.errors++
    baselineMap.set(check.region, agg)
  }

  const historicalBaseline: MetricSnapshot[] = Array.from(baselineMap.entries()).map(([region, agg]) => ({
    region,
    status: 'healthy',
    latency: agg.latencies.length > 0 
      ? agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length 
      : 0,
    errorRate: agg.total > 0 ? agg.errors / agg.total : 0,
  }))

  // Get related network events
  const networkEvents = await prisma.networkEvent.findMany({
    where: {
      monitorId,
      startedAt: {
        gte: preStart,
        lte: duringEnd,
      },
    },
    select: {
      eventType: true,
      description: true,
      confidence: true,
      startedAt: true,
    },
  })

  return {
    incident: incidentContext,
    preIncident,
    duringIncident,
    historicalBaseline,
    networkEvents: networkEvents.map(e => ({
      type: e.eventType,
      description: e.description,
      confidence: e.confidence,
      detectedAt: e.startedAt,
    })),
  }
}

/**
 * Analyze patterns and generate root cause using local algorithms
 */
function analyzeRootCause(context: Awaited<ReturnType<typeof collectRCAContext>>): {
  summary: string
  rootCause: string
  category: string
  confidence: number
  evidence: string[]
  reasoning: string
  recommendations: string[]
} {
  const { incident, preIncident, duringIncident, historicalBaseline, networkEvents } = context
  
  const evidence: string[] = []
  const recommendations: string[] = []
  let rootCause = ""
  let category = "UNKNOWN"
  let confidence = 50

  // Calculate changes
  const avgPreLatency = preIncident.length > 0 
    ? preIncident.reduce((sum, r) => sum + r.latency, 0) / preIncident.length 
    : 0
  const avgDuringLatency = duringIncident.length > 0 
    ? duringIncident.reduce((sum, r) => sum + r.latency, 0) / duringIncident.length 
    : 0
  
  const avgPreErrorRate = preIncident.length > 0
    ? preIncident.reduce((sum, r) => sum + r.errorRate, 0) / preIncident.length
    : 0
  const avgDuringErrorRate = duringIncident.length > 0
    ? duringIncident.reduce((sum, r) => sum + r.errorRate, 0) / duringIncident.length
    : 0

  const latencyIncrease = avgPreLatency > 0 
    ? ((avgDuringLatency - avgPreLatency) / avgPreLatency) * 100 
    : 0
  const errorRateIncrease = avgPreErrorRate > 0
    ? ((avgDuringErrorRate - avgPreErrorRate) / avgPreErrorRate) * 100
    : avgDuringErrorRate * 100

  // Collect status codes and errors
  const statusCodes = new Map<number, number>()
  const errorTypes = new Map<string, number>()
  
  for (const region of duringIncident) {
    if (region.statusCode) {
      statusCodes.set(region.statusCode, (statusCodes.get(region.statusCode) || 0) + 1)
    }
    if (region.errorMessage) {
      const errorType = categorizeError(region.errorMessage)
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1)
    }
  }

  const mostCommonStatus = Array.from(statusCodes.entries()).sort((a, b) => b[1] - a[1])[0]
  const mostCommonError = Array.from(errorTypes.entries()).sort((a, b) => b[1] - a[1])[0]

  // Determine root cause based on patterns
  
  // Case 1: SSL/Certificate issues
  if (mostCommonError?.[0].includes('ssl') || mostCommonError?.[0].includes('certificate')) {
    rootCause = "SSL certificate validation failed or certificate has expired"
    category = "SSL_ERROR"
    confidence = 85
    evidence.push(`SSL error detected: ${mostCommonError[0]}`)
    evidence.push(`${mostCommonError[1]} regions affected by SSL issues`)
    recommendations.push("Check SSL certificate expiration date")
    recommendations.push("Verify certificate chain is complete")
    recommendations.push("Ensure certificate is properly installed on all servers")
  }
  // Case 2: DNS failures
  else if (mostCommonError?.[0].includes('dns') || mostCommonError?.[0].includes('enotfound') || mostCommonError?.[0].includes('getaddrinfo')) {
    rootCause = "DNS resolution failure - domain cannot be resolved"
    category = "DNS_FAILURE"
    confidence = 90
    evidence.push(`DNS errors across ${duringIncident.filter(r => r.errorMessage?.includes('dns') || r.errorMessage?.includes('enotfound')).length} regions`)
    recommendations.push("Verify DNS records are correctly configured")
    recommendations.push("Check DNS provider status")
    recommendations.push("Verify domain has not expired")
  }
  // Case 3: Timeout issues
  else if (mostCommonError?.[0].includes('timeout') || mostCommonError?.[0].includes('econnreset')) {
    rootCause = latencyIncrease > 200 
      ? "Server timeout due to high latency - likely resource exhaustion"
      : "Connection timeout - server may be unreachable"
    category = "TIMEOUT"
    confidence = 80
    evidence.push(`Timeout errors in ${duringIncident.filter(r => r.errorMessage?.includes('timeout')).length} regions`)
    if (latencyIncrease > 0) {
      evidence.push(`Latency increased by ${latencyIncrease.toFixed(1)}% before failure`)
    }
    recommendations.push("Check server CPU and memory usage")
    recommendations.push("Review application logs for slow requests")
    recommendations.push("Consider scaling resources if under high load")
  }
  // Case 4: 5xx Server errors
  else if (mostCommonStatus && mostCommonStatus[0] >= 500) {
    const statusCode = mostCommonStatus[0]
    rootCause = `Server error (${statusCode}) indicating application-level failure`
    category = "SERVER_ERROR"
    confidence = 85
    evidence.push(`HTTP ${statusCode} errors across ${mostCommonStatus[1]} regions`)
    evidence.push(`${(avgDuringErrorRate * 100).toFixed(1)}% error rate during incident`)
    
    if (statusCode === 502) {
      rootCause = "Bad Gateway - upstream server is not responding"
      recommendations.push("Check upstream server health")
      recommendations.push("Verify load balancer configuration")
    } else if (statusCode === 503) {
      rootCause = "Service Unavailable - server is overloaded or in maintenance"
      recommendations.push("Check if server is under maintenance")
      recommendations.push("Scale up resources to handle load")
    } else if (statusCode === 504) {
      rootCause = "Gateway Timeout - upstream server took too long to respond"
      recommendations.push("Increase timeout settings")
      recommendations.push("Optimize slow database queries")
    } else {
      recommendations.push("Check application error logs")
      recommendations.push("Review recent deployments for regressions")
    }
  }
  // Case 5: 4xx Client errors (shouldn't happen for monitors)
  else if (mostCommonStatus && mostCommonStatus[0] >= 400) {
    rootCause = `Client error (${mostCommonStatus[0]}) - possible misconfiguration`
    category = "CONFIG_ERROR"
    confidence = 75
    evidence.push(`HTTP ${mostCommonStatus[0]} errors detected`)
    recommendations.push("Verify monitor configuration")
    recommendations.push("Check if URL or expected status code is correct")
  }
  // Case 6: High latency spike
  else if (latencyIncrease > 300) {
    rootCause = "Severe latency degradation - possible network or resource issues"
    category = "NETWORK_DEGRADATION"
    confidence = 70
    evidence.push(`Latency increased from ${avgPreLatency.toFixed(0)}ms to ${avgDuringLatency.toFixed(0)}ms (${latencyIncrease.toFixed(0)}% increase)`)
    recommendations.push("Check network connectivity and bandwidth")
    recommendations.push("Review server resource utilization")
    recommendations.push("Check for DDoS attacks or traffic spikes")
  }
  // Case 7: Regional issues
  else if (incident.affectedRegions.length === 1) {
    rootCause = `Localized issue affecting only ${incident.affectedRegions[0]} region`
    category = "REGIONAL_ISSUE"
    confidence = 65
    evidence.push(`Only 1 of ${duringIncident.length} regions affected`)
    recommendations.push("Check regional CDN or edge server status")
    recommendations.push("Verify network routing to affected region")
  }
  // Case 8: Global outage
  else if (incident.affectedRegions.length === duringIncident.length) {
    rootCause = "Complete service outage - all monitoring regions affected"
    category = "COMPLETE_OUTAGE"
    confidence = 90
    evidence.push(`All ${duringIncident.length} regions reporting failure`)
    evidence.push(`${(avgDuringErrorRate * 100).toFixed(1)}% global error rate`)
    recommendations.push("Check primary server and infrastructure")
    recommendations.push("Verify DNS and SSL configuration")
    recommendations.push("Review recent infrastructure changes")
  }
  // Default case
  else {
    rootCause = "Unknown cause - requires manual investigation"
    category = "UNKNOWN"
    confidence = 40
    evidence.push(`Error rate: ${(avgDuringErrorRate * 100).toFixed(1)}%`)
    evidence.push(`Affected regions: ${incident.affectedRegions.join(', ')}`)
    recommendations.push("Review server and application logs")
    recommendations.push("Check infrastructure monitoring dashboards")
    recommendations.push("Verify no recent changes were deployed")
  }

  // Add network events to evidence
  for (const event of networkEvents) {
    evidence.push(`${event.type}: ${event.description} (${event.confidence}% confidence)`)
  }

  // Build reasoning
  const reasoningParts: string[] = []
  reasoningParts.push(`Analysis of ${duringIncident.length} monitoring regions shows ${incident.affectedRegions.length} regions affected.`)
  
  if (avgPreErrorRate < 0.01 && avgDuringErrorRate > 0.5) {
    reasoningParts.push(`Error rate spiked from ${(avgPreErrorRate * 100).toFixed(2)}% to ${(avgDuringErrorRate * 100).toFixed(1)}%, indicating a sudden failure.`)
  }
  
  if (latencyIncrease > 50) {
    reasoningParts.push(`Latency degraded significantly (${latencyIncrease.toFixed(0)}% increase) before or during the incident.`)
  }
  
  if (mostCommonStatus) {
    reasoningParts.push(`Most common HTTP status code: ${mostCommonStatus[0]} (observed ${mostCommonStatus[1]} times).`)
  }
  
  if (mostCommonError) {
    reasoningParts.push(`Primary error pattern: ${mostCommonError[0]}.`)
  }

  const summary = `${incident.monitorName} experienced a ${category.replace(/_/g, ' ').toLowerCase()} starting at ${incident.incidentStart.toISOString()}. ${rootCause}. This affected ${incident.affectedRegions.length} region(s).`

  return {
    summary,
    rootCause,
    category,
    confidence,
    evidence,
    reasoning: reasoningParts.join(' '),
    recommendations,
  }
}

/**
 * Categorize error messages into types
 */
function categorizeError(error: string): string {
  const lowerError = error.toLowerCase()
  
  if (lowerError.includes('ssl') || lowerError.includes('certificate') || lowerError.includes('tls')) {
    return 'ssl_error'
  }
  if (lowerError.includes('dns') || lowerError.includes('enotfound') || lowerError.includes('getaddrinfo')) {
    return 'dns_error'
  }
  if (lowerError.includes('timeout') || lowerError.includes('econnreset')) {
    return 'timeout'
  }
  if (lowerError.includes('refused') || lowerError.includes('econnrefused')) {
    return 'connection_refused'
  }
  if (lowerError.includes('network') || lowerError.includes('enetunreach')) {
    return 'network_error'
  }
  return 'unknown_error'
}

/**
 * Generate RCA using local analysis (100% free, no external API)
 */
export async function generateRCA(incidentId: string): Promise<RCAResult> {
  // Get monitor ID from incident
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { monitorId: true },
  })

  if (!incident) {
    throw new Error('Incident not found')
  }

  const context = await collectRCAContext(incidentId, incident.monitorId)
  const analysis = analyzeRootCause(context)

  // Store RCA report
  const regionSummary = context.duringIncident.reduce<Record<string, { status: string; latency: number; errors: number }>>((acc, r) => {
    acc[r.region] = {
      status: r.status,
      latency: r.latency,
      errors: r.errorRate,
    }
    return acc
  }, {})

  const rcaReport = await prisma.rCAReport.create({
    data: {
      summary: analysis.summary,
      rootCause: analysis.rootCause,
      category: analysis.category,
      confidence: analysis.confidence,
      evidence: {
        keyMetrics: analysis.evidence,
        anomalies: context.networkEvents.map(e => e.description),
        timeline: [
          `Incident started at ${context.incident.incidentStart.toISOString()}`,
          ...context.networkEvents.map(e => `${e.type} detected at ${e.detectedAt.toISOString()}`),
        ],
      } as any,
      reasoning: analysis.reasoning,
      recommendations: analysis.recommendations,
      dataWindowStart: new Date(context.incident.incidentStart.getTime() - 30 * 60 * 1000),
      dataWindowEnd: new Date(context.incident.incidentStart.getTime() + 30 * 60 * 1000),
      regionSummary: regionSummary as Prisma.InputJsonValue,
      modelVersion: 'local-v1.0',
    },
  })

  // Link RCA to incident
  await prisma.incident.update({
    where: { id: incidentId },
    data: { rootCauseId: rcaReport.id },
  })

  return {
    id: rcaReport.id,
    summary: rcaReport.summary,
    rootCause: rcaReport.rootCause,
    category: rcaReport.category,
    confidence: rcaReport.confidence,
    evidence: rcaReport.evidence as RCAResult['evidence'],
    reasoning: rcaReport.reasoning,
    recommendations: rcaReport.recommendations,
    dataWindow: {
      start: rcaReport.dataWindowStart,
      end: rcaReport.dataWindowEnd,
    },
    regionSummary: rcaReport.regionSummary as RCAResult['regionSummary'],
    createdAt: rcaReport.createdAt,
  }
}

/**
 * Get RCA for an incident
 */
export async function getRCA(incidentId: string): Promise<RCAResult | null> {
  const rca = await prisma.rCAReport.findFirst({
    where: {
      incidents: {
        some: {
          id: incidentId,
        },
      },
    },
  })

  if (!rca) return null

  return {
    id: rca.id,
    summary: rca.summary,
    rootCause: rca.rootCause,
    category: rca.category,
    confidence: rca.confidence,
    evidence: rca.evidence as RCAResult['evidence'],
    reasoning: rca.reasoning,
    recommendations: rca.recommendations,
    dataWindow: {
      start: rca.dataWindowStart,
      end: rca.dataWindowEnd,
    },
    regionSummary: rca.regionSummary as RCAResult['regionSummary'],
    createdAt: rca.createdAt,
  }
}

/**
 * Queue RCA generation for async processing
 */
export async function queueRCAGeneration(incidentId: string): Promise<void> {
  // Run locally with a slight delay (no external API calls)
  setTimeout(async () => {
    try {
      await generateRCA(incidentId)
      console.log(`Local RCA generated for incident ${incidentId}`)
    } catch (error) {
      console.error(`Failed to generate RCA for incident ${incidentId}:`, error)
    }
  }, 5000)
}
