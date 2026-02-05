// SLO/SLA calculation and tracking service
import { prisma } from '@/lib/prisma'
import { SloMetric, SloWindow, SloWindowData } from '@/types'

// Window duration in milliseconds
const WINDOW_DURATION: Record<SloWindow, number> = {
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  NINETY_DAYS: 90 * 24 * 60 * 60 * 1000,
}

/**
 * Calculate percentile from an array of values
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0
  const index = Math.floor((percentile / 100) * (sortedValues.length - 1))
  return sortedValues[index]
}

/**
 * Calculate SLO for availability metric
 */
async function calculateAvailabilitySlo(
  monitorId: string | undefined,
  projectId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<{ actual: number; good: number; total: number }> {
  const where: any = {
    checkedAt: {
      gte: windowStart,
      lte: windowEnd,
    },
  }

  if (monitorId) {
    where.monitorId = monitorId
  } else {
    const monitors = await prisma.monitor.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    })
    where.monitorId = { in: monitors.map(m => m.id) }
  }

  const checks = await prisma.monitorCheck.groupBy({
    by: ['status'],
    where,
    _count: {
      status: true,
    },
  })

  const total = checks.reduce((sum, c) => sum + c._count.status, 0)
  const up = checks.find(c => c.status === 'up')?._count.status || 0
  const degraded = checks.find(c => c.status === 'degraded')?._count.status || 0

  const actual = total > 0 ? ((up + degraded) / total) * 100 : 100

  return {
    actual,
    good: up + degraded,
    total,
  }
}

/**
 * Calculate SLO for latency metric
 */
async function calculateLatencySlo(
  monitorId: string | undefined,
  projectId: string,
  windowStart: Date,
  windowEnd: Date,
  percentile: 95 | 99
): Promise<{ actual: number; good: number; total: number }> {
  const where: any = {
    checkedAt: {
      gte: windowStart,
      lte: windowEnd,
    },
    status: { in: ['up', 'degraded'] },
  }

  if (monitorId) {
    where.monitorId = monitorId
  } else {
    const monitors = await prisma.monitor.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    })
    where.monitorId = { in: monitors.map(m => m.id) }
  }

  const checks = await prisma.monitorCheck.findMany({
    where,
    select: {
      totalTime: true,
    },
  })

  if (checks.length === 0) {
    return { actual: 0, good: 0, total: 0 }
  }

  const latencies = checks.map(c => c.totalTime).sort((a, b) => a - b)
  const actual = calculatePercentile(latencies, percentile)

  return {
    actual,
    good: checks.length,
    total: checks.length,
  }
}

/**
 * Calculate SLO for error rate metric
 */
async function calculateErrorRateSlo(
  monitorId: string | undefined,
  projectId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<{ actual: number; good: number; total: number }> {
  const where: any = {
    checkedAt: {
      gte: windowStart,
      lte: windowEnd,
    },
  }

  if (monitorId) {
    where.monitorId = monitorId
  } else {
    const monitors = await prisma.monitor.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    })
    where.monitorId = { in: monitors.map(m => m.id) }
  }

  const checks = await prisma.monitorCheck.groupBy({
    by: ['status'],
    where,
    _count: {
      status: true,
    },
  })

  const total = checks.reduce((sum, c) => sum + c._count.status, 0)
  const down = checks.find(c => c.status === 'down')?._count.status || 0

  const actual = total > 0 ? (down / total) * 100 : 0

  return {
    actual,
    good: total - down,
    total,
  }
}

/**
 * Calculate SLO window data
 */
export async function calculateSloWindow(
  sloId: string,
  forceRecalculate: boolean = false
): Promise<SloWindowData> {
  // Get SLO definition
  const slo = await prisma.sloDefinition.findUnique({
    where: { id: sloId },
  })

  if (!slo) {
    throw new Error('SLO definition not found')
  }

  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DURATION[slo.window])

  // Check if we already have recent data
  if (!forceRecalculate) {
    const existing = await prisma.sloWindowData.findUnique({
      where: {
        sloId_windowStart: {
          sloId,
          windowStart,
        },
      },
    })

    if (existing && existing.updatedAt > new Date(Date.now() - 60 * 60 * 1000)) {
      return {
        sloId: existing.sloId,
        windowStart: existing.windowStart,
        windowEnd: existing.windowEnd,
        actualValue: existing.actualValue,
        targetValue: existing.targetValue,
        errorBudgetTotal: existing.errorBudgetTotal,
        errorBudgetUsed: existing.errorBudgetUsed,
        errorBudgetRemaining: existing.errorBudgetRemaining,
        burnRate: existing.burnRate,
        isBreached: existing.isBreached,
        breachedAt: existing.breachedAt || undefined,
      }
    }
  }

  // Calculate based on metric type
  let result: { actual: number; good: number; total: number }

  switch (slo.metric) {
    case 'AVAILABILITY':
      result = await calculateAvailabilitySlo(
        slo.monitorId || undefined,
        slo.projectId,
        windowStart,
        windowEnd
      )
      break

    case 'LATENCY_P95':
      result = await calculateLatencySlo(
        slo.monitorId || undefined,
        slo.projectId,
        windowStart,
        windowEnd,
        95
      )
      break

    case 'LATENCY_P99':
      result = await calculateLatencySlo(
        slo.monitorId || undefined,
        slo.projectId,
        windowStart,
        windowEnd,
        99
      )
      break

    case 'ERROR_RATE':
      result = await calculateErrorRateSlo(
        slo.monitorId || undefined,
        slo.projectId,
        windowStart,
        windowEnd
      )
      break

    default:
      throw new Error(`Unknown metric type: ${slo.metric}`)
  }

  // Calculate error budget
  let errorBudgetTotal: number
  let isBreached: boolean

  switch (slo.metric) {
    case 'AVAILABILITY':
      errorBudgetTotal = 100 - slo.threshold
      isBreached = result.actual < slo.threshold
      break
    case 'LATENCY_P95':
    case 'LATENCY_P99':
      errorBudgetTotal = slo.threshold
      isBreached = result.actual > slo.threshold
      break
    case 'ERROR_RATE':
      errorBudgetTotal = slo.threshold
      isBreached = result.actual > slo.threshold
      break
    default:
      errorBudgetTotal = 0
      isBreached = false
  }

  // Calculate error budget used
  let errorBudgetUsed: number
  let errorBudgetRemaining: number

  if (slo.metric === 'AVAILABILITY') {
    errorBudgetUsed = Math.max(0, slo.threshold - result.actual)
    errorBudgetRemaining = errorBudgetTotal - errorBudgetUsed
  } else {
    errorBudgetUsed = result.actual
    errorBudgetRemaining = Math.max(0, errorBudgetTotal - errorBudgetUsed)
  }

  // Calculate burn rate
  const burnRate = errorBudgetTotal > 0 
    ? (errorBudgetUsed / errorBudgetTotal) * 100 
    : 0

  // Check if this is a new breach
  const existingData = await prisma.sloWindowData.findUnique({
    where: {
      sloId_windowStart: {
        sloId,
        windowStart,
      },
    },
  })

  // Store result
  const windowData = await prisma.sloWindowData.upsert({
    where: {
      sloId_windowStart: {
        sloId,
        windowStart,
      },
    },
    update: {
      windowEnd,
      actualValue: result.actual,
      targetValue: slo.threshold,
      errorBudgetTotal,
      errorBudgetUsed,
      errorBudgetRemaining,
      burnRate,
      isBreached,
      breachedAt: isBreached && !existingData?.isBreached ? new Date() : existingData?.breachedAt,
      totalChecks: result.total,
      goodChecks: result.good,
      badChecks: result.total - result.good,
    },
    create: {
      sloId,
      windowStart,
      windowEnd,
      actualValue: result.actual,
      targetValue: slo.threshold,
      errorBudgetTotal,
      errorBudgetUsed,
      errorBudgetRemaining,
      burnRate,
      isBreached,
      breachedAt: isBreached ? new Date() : null,
      totalChecks: result.total,
      goodChecks: result.good,
      badChecks: result.total - result.good,
    },
  })

  return {
    sloId: windowData.sloId,
    windowStart: windowData.windowStart,
    windowEnd: windowData.windowEnd,
    actualValue: windowData.actualValue,
    targetValue: windowData.targetValue,
    errorBudgetTotal: windowData.errorBudgetTotal,
    errorBudgetUsed: windowData.errorBudgetUsed,
    errorBudgetRemaining: windowData.errorBudgetRemaining,
    burnRate: windowData.burnRate,
    isBreached: windowData.isBreached,
    breachedAt: windowData.breachedAt || undefined,
  }
}

/**
 * Calculate SLO for all active SLOs in a project
 */
export async function calculateProjectSlos(
  projectId: string
): Promise<SloWindowData[]> {
  const slos = await prisma.sloDefinition.findMany({
    where: {
      projectId,
      isActive: true,
      deletedAt: null,
    },
  })

  const results: SloWindowData[] = []

  for (const slo of slos) {
    try {
      const data = await calculateSloWindow(slo.id)
      results.push(data)
    } catch (error) {
      console.error(`Failed to calculate SLO ${slo.id}:`, error)
    }
  }

  return results
}

/**
 * Predict when error budget will be exhausted
 */
export async function predictBudgetExhaustion(
  sloId: string
): Promise<{
  willExhaust: boolean
  predictedExhaustionDate?: Date
  daysRemaining?: number
} | null> {
  const slo = await prisma.sloDefinition.findUnique({
    where: { id: sloId },
  })

  if (!slo) return null

  // Get recent window data
  const windowEnd = new Date()
  const windowStart = new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  const history = await prisma.sloWindowData.findMany({
    where: {
      sloId,
      windowStart: {
        gte: windowStart,
      },
    },
    orderBy: {
      windowStart: 'asc',
    },
  })

  if (history.length < 3) {
    return { willExhaust: false }
  }

  // Calculate burn rate trend
  const burnRates = history.map(h => h.burnRate)
  const avgBurnRate = burnRates.reduce((a, b) => a + b, 0) / burnRates.length

  const current = history[history.length - 1]

  if (current.errorBudgetRemaining <= 0) {
    return { willExhaust: true, daysRemaining: 0 }
  }

  if (avgBurnRate <= 0) {
    return { willExhaust: false }
  }

  // Simple linear projection
  const daysRemaining = current.errorBudgetRemaining / (avgBurnRate / 7)

  if (daysRemaining > 90) {
    return { willExhaust: false }
  }

  const predictedExhaustionDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)

  return {
    willExhaust: true,
    predictedExhaustionDate,
    daysRemaining: Math.round(daysRemaining),
  }
}

/**
 * Check for fast burn alert (2% in 1 hour)
 */
export async function checkFastBurn(
  sloId: string
): Promise<{
  isFastBurn: boolean
  burnRate1h: number
} | null> {
  const slo = await prisma.sloDefinition.findUnique({
    where: { id: sloId },
  })

  if (!slo || !slo.fastBurnAlert) return null

  // Calculate 1-hour burn
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const windowEnd = new Date()

  let result: { actual: number; good: number; total: number }

  switch (slo.metric) {
    case 'AVAILABILITY':
      result = await calculateAvailabilitySlo(
        slo.monitorId || undefined,
        slo.projectId,
        hourAgo,
        windowEnd
      )
      break
    case 'LATENCY_P95':
      result = await calculateLatencySlo(
        slo.monitorId || undefined,
        slo.projectId,
        hourAgo,
        windowEnd,
        95
      )
      break
    case 'LATENCY_P99':
      result = await calculateLatencySlo(
        slo.monitorId || undefined,
        slo.projectId,
        hourAgo,
        windowEnd,
        99
      )
      break
    case 'ERROR_RATE':
      result = await calculateErrorRateSlo(
        slo.monitorId || undefined,
        slo.projectId,
        hourAgo,
        windowEnd
      )
      break
    default:
      return null
  }

  // Calculate 1-hour burn rate as percentage of total budget
  const errorBudgetTotal = slo.metric === 'AVAILABILITY' 
    ? 100 - slo.threshold 
    : slo.threshold

  let burnRate1h: number

  if (slo.metric === 'AVAILABILITY') {
    const budgetUsed = Math.max(0, slo.threshold - result.actual)
    burnRate1h = (budgetUsed / errorBudgetTotal) * 100
  } else {
    burnRate1h = (result.actual / errorBudgetTotal) * 100
  }

  // Fast burn: 2% in 1 hour
  return {
    isFastBurn: burnRate1h >= 2,
    burnRate1h,
  }
}
