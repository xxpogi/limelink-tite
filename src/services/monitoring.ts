// Core monitoring service - handles health checks from edge regions
import { prisma } from '@/lib/prisma'
import { CheckResult, AggregatedStatus, MonitorStatus } from '@/types'

// Region mapping for Vercel Edge
export const EDGE_REGIONS = {
  'us-east-1': { name: 'US East', city: 'Virginia', lat: 39.0438, lon: -77.4874 },
  'us-west-1': { name: 'US West', city: 'California', lat: 37.7749, lon: -122.4194 },
  'eu-west-1': { name: 'Europe West', city: 'Ireland', lat: 53.3498, lon: -6.2603 },
  'eu-central-1': { name: 'Europe Central', city: 'Frankfurt', lat: 50.1109, lon: 8.6821 },
  'ap-southeast-1': { name: 'Asia Pacific SE', city: 'Singapore', lat: 1.3521, lon: 103.8198 },
  'ap-northeast-1': { name: 'Asia Pacific NE', city: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  'ap-south-1': { name: 'Asia Pacific S', city: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  'sa-east-1': { name: 'South America', city: 'São Paulo', lat: -23.5505, lon: -46.6333 },
} as const

export type EdgeRegion = keyof typeof EDGE_REGIONS

interface CheckConfig {
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
  timeout: number
  expectedStatus?: number
  expectedContent?: string
  followRedirects: boolean
  checkSsl: boolean
}

interface MonitorData {
  id: string
  url: string
  method: string
  headers?: Record<string, string>
  body?: string | null
  timeout: number
  expectedStatus?: number | null
  expectedContent?: string | null
  followRedirects: boolean
  checkSsl: boolean
  regions: string[]
  interval: number
  projectId?: string
  name?: string
}

/**
 * Execute a health check from an edge region
 * This runs in Vercel Edge Runtime
 */
export async function executeCheck(
  config: CheckConfig,
  region: string
): Promise<CheckResult> {
  const startTime = Date.now()
  const result: CheckResult = {
    monitorId: '', // Will be set by caller
    region,
    status: 'up',
    totalTime: 0,
    checkedAt: new Date(),
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000)

    const fetchStart = performance.now()
    
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers || {},
      body: config.body || undefined,
      signal: controller.signal,
      redirect: config.followRedirects ? 'follow' : 'manual',
    })

    clearTimeout(timeoutId)
    
    result.totalTime = Math.round(performance.now() - fetchStart)
    result.statusCode = response.status
    result.responseSize = Number(response.headers.get('content-length')) || undefined

    // Check SSL if HTTPS
    if (config.url.startsWith('https') && config.checkSsl) {
      // SSL info extraction would require more detailed handling
      // For now, we assume SSL is valid if the request succeeded
      result.sslValid = true
    }

    // Determine status based on assertions
    const statusOk = config.expectedStatus 
      ? response.status === config.expectedStatus
      : response.status >= 200 && response.status < 400

    if (!statusOk) {
      result.status = response.status >= 500 ? 'down' : 'degraded'
      result.error = `Unexpected status code: ${response.status}`
    }

    // Check content match if specified
    if (config.expectedContent && result.status === 'up') {
      const body = await response.text()
      if (!body.includes(config.expectedContent)) {
        result.status = 'down'
        result.error = 'Expected content not found in response'
      }
    }

  } catch (error) {
    result.totalTime = Date.now() - startTime
    result.status = 'down'
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        result.error = `Timeout after ${config.timeout}s`
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        result.error = 'Connection failed - host unreachable'
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        result.error = `SSL Error: ${error.message}`
        result.sslValid = false
      } else {
        result.error = error.message
      }
    } else {
      result.error = 'Unknown error occurred'
    }
  }

  return result
}

/**
 * Aggregate check results from multiple regions
 * Uses quorum-based logic for accurate status determination
 */
export function aggregateCheckResults(
  results: CheckResult[]
): AggregatedStatus {
  const totalRegions = results.length
  const upRegions = results.filter(r => r.status === 'up').length
  const downRegions = results.filter(r => r.status === 'down').length
  const degradedRegions = results.filter(r => r.status === 'degraded').length

  // Quorum logic:
  // - UP: ≥50% of regions report up AND no more than 1 region down
  // - DOWN: ≥2 regions report down OR ≥50% report down
  // - DEGRADED: 1 region down OR some regions degraded
  let status: MonitorStatus = 'up'
  
  if (downRegions >= 2 || (totalRegions > 1 && downRegions / totalRegions >= 0.5)) {
    status = 'down'
  } else if (downRegions === 1 || degradedRegions > 0) {
    status = 'degraded'
  }

  const avgResponseTime = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.totalTime, 0) / results.length)
    : 0

  // Calculate uptime percentage from recent checks
  const successfulChecks = upRegions + degradedRegions
  const uptimePercentage = totalRegions > 0
    ? (successfulChecks / totalRegions) * 100
    : 100

  return {
    status,
    regions: results.map(r => ({
      region: r.region,
      status: r.status,
      latency: r.totalTime,
      lastCheckedAt: r.checkedAt,
    })),
    uptimePercentage,
    avgResponseTime,
    lastCheckedAt: new Date(),
  }
}

/**
 * Store check results in database
 */
export async function storeCheckResult(
  monitorId: string,
  result: CheckResult
): Promise<void> {
  await prisma.monitorCheck.create({
    data: {
      monitorId,
      region: result.region,
      dnsTime: result.dnsTime,
      tcpTime: result.tcpTime,
      tlsTime: result.tlsTime,
      ttfb: result.ttfb,
      totalTime: result.totalTime,
      statusCode: result.statusCode,
      status: result.status,
      error: result.error,
      responseSize: result.responseSize,
      sslValid: result.sslValid,
      sslExpiresAt: result.sslExpiresAt,
      checkedAt: result.checkedAt,
      checkIndex: Math.floor(Date.now() / 1000) % 2147483647,
    },
  })
}

/**
 * Update monitor with latest status
 */
export async function updateMonitorStatus(
  monitorId: string,
  aggregatedStatus: AggregatedStatus
): Promise<void> {
  await prisma.monitor.update({
    where: { id: monitorId },
    data: {
      lastStatus: aggregatedStatus.status,
      lastCheckedAt: aggregatedStatus.lastCheckedAt,
      uptimePercentage: aggregatedStatus.uptimePercentage,
      avgResponseTime: aggregatedStatus.avgResponseTime,
    },
  })

  // Update per-region status
  for (const region of aggregatedStatus.regions) {
    await prisma.monitorRegion.upsert({
      where: {
        monitorId_region: {
          monitorId,
          region: region.region,
        },
      },
      update: {
        lastStatus: region.status,
        lastCheckedAt: region.lastCheckedAt,
        avgLatency: region.latency,
      },
      create: {
        monitorId,
        region: region.region,
        lastStatus: region.status,
        lastCheckedAt: region.lastCheckedAt,
        avgLatency: region.latency,
      },
    })
  }
}

/**
 * Get monitors that are due for a check
 */
export async function getMonitorsDueForCheck(): Promise<MonitorData[]> {
  const now = new Date()
  
  const monitors = await prisma.monitor.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { lastCheckedAt: null },
        {
          lastCheckedAt: {
            lte: new Date(now.getTime() - 30000), // At least 30s ago (minimum interval)
          },
        },
      ],
    },
    select: {
      id: true,
      url: true,
      method: true,
      headers: true,
      body: true,
      timeout: true,
      expectedStatus: true,
      expectedContent: true,
      followRedirects: true,
      checkSsl: true,
      regions: true,
      interval: true,
      lastCheckedAt: true,
      projectId: true,
      name: true,
    },
  })

  // Filter by actual interval
  return monitors.filter(m => {
    if (!m.lastCheckedAt) return true
    const elapsed = now.getTime() - m.lastCheckedAt.getTime()
    return elapsed >= m.interval * 1000
  }).map(m => ({
    ...m,
    headers: m.headers as Record<string, string> | undefined,
  }))
}

/**
 * Calculate uptime percentage for a monitor over a time window
 */
export async function calculateUptime(
  monitorId: string,
  startTime: Date,
  endTime: Date = new Date()
): Promise<number> {
  const checks = await prisma.monitorCheck.groupBy({
    by: ['status'],
    where: {
      monitorId,
      checkedAt: {
        gte: startTime,
        lte: endTime,
      },
    },
    _count: {
      status: true,
    },
  })

  const total = checks.reduce((sum, c) => sum + c._count.status, 0)
  if (total === 0) return 100

  const up = checks.find(c => c.status === 'up')?._count.status || 0
  const degraded = checks.find(c => c.status === 'degraded')?._count.status || 0

  return ((up + degraded) / total) * 100
}

/**
 * Get response time statistics for a monitor
 */
export async function getResponseTimeStats(
  monitorId: string,
  startTime: Date,
  endTime: Date = new Date()
): Promise<{
  avg: number
  min: number
  max: number
  p95: number
  p99: number
}> {
  const checks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: startTime,
        lte: endTime,
      },
      status: { in: ['up', 'degraded'] },
    },
    select: {
      totalTime: true,
    },
    orderBy: {
      totalTime: 'asc',
    },
  })

  if (checks.length === 0) {
    return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 }
  }

  const times = checks.map(c => c.totalTime)
  const sum = times.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / times.length)
  const min = times[0]
  const max = times[times.length - 1]

  // Calculate percentiles
  const p95Index = Math.floor(times.length * 0.95)
  const p99Index = Math.floor(times.length * 0.99)
  const p95 = times[p95Index] || max
  const p99 = times[p99Index] || max

  return { avg, min, max, p95, p99 }
}
