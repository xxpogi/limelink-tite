// DDoS and network anomaly detection service
import { prisma } from '@/lib/prisma'
import { DDoSSignal, AnomalyDetection } from '@/types'
import { mean, standardDeviation } from 'simple-statistics'

// Detection thresholds
const THRESHOLDS = {
  // Z-score threshold for latency spikes
  LATENCY_ZSCORE: 3,
  // Error rate threshold for flood detection
  ERROR_RATE_THRESHOLD: 0.5, // 50% error rate
  // Minimum sample size for statistical significance
  MIN_SAMPLE_SIZE: 10,
  // Time window for baseline calculation (ms)
  BASELINE_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  // Detection window (ms)
  DETECTION_WINDOW: 5 * 60 * 1000, // 5 minutes
  // DDoS confidence threshold
  DDOS_CONFIDENCE_THRESHOLD: 70,
  // Regional saturation threshold
  REGIONAL_SATURATION: 0.75, // 75% of regions affected
}

interface CheckMetrics {
  timestamps: Date[]
  latencies: number[]
  errorRates: number[]
  regionStatuses: Map<string, { up: number; down: number; total: number }>
}

/**
 * Collect metrics for a monitor over a time window
 */
async function collectMetrics(
  monitorId: string,
  windowMs: number
): Promise<CheckMetrics> {
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - windowMs)

  const checks = await prisma.monitorCheck.findMany({
    where: {
      monitorId,
      checkedAt: {
        gte: startTime,
        lte: endTime,
      },
    },
    select: {
      checkedAt: true,
      totalTime: true,
      status: true,
      region: true,
    },
    orderBy: {
      checkedAt: 'asc',
    },
  })

  const metrics: CheckMetrics = {
    timestamps: [],
    latencies: [],
    errorRates: [],
    regionStatuses: new Map(),
  }

  // Group by time bucket for error rate calculation
  const timeBuckets = new Map<string, { total: number; errors: number }>()

  for (const check of checks) {
    metrics.timestamps.push(check.checkedAt)
    
    if (check.status === 'up' || check.status === 'degraded') {
      metrics.latencies.push(check.totalTime)
    }

    // Track per-region status
    const regionStats = metrics.regionStatuses.get(check.region) || { up: 0, down: 0, total: 0 }
    regionStats.total++
    if (check.status === 'up') {
      regionStats.up++
    } else if (check.status === 'down') {
      regionStats.down++
    }
    metrics.regionStatuses.set(check.region, regionStats)

    // Time bucket for error rate
    const bucketKey = check.checkedAt.toISOString().slice(0, 15) + '0:00' // 10-min buckets
    const bucket = timeBuckets.get(bucketKey) || { total: 0, errors: 0 }
    bucket.total++
    if (check.status === 'down') {
      bucket.errors++
    }
    timeBuckets.set(bucketKey, bucket)
  }

  // Calculate error rates per bucket
  timeBuckets.forEach((bucket) => {
    metrics.errorRates.push(bucket.errors / bucket.total)
  })

  return metrics
}

/**
 * Calculate baseline metrics from historical data
 */
async function calculateBaseline(
  monitorId: string
): Promise<{
  avgLatency: number
  stdLatency: number
  avgErrorRate: number
  p95Latency: number
} | null> {
  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - THRESHOLDS.BASELINE_WINDOW)

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
      status: true,
    },
  })

  if (checks.length < THRESHOLDS.MIN_SAMPLE_SIZE) {
    return null
  }

  const latencies = checks.map(c => c.totalTime)
  const avgLatency = mean(latencies)
  const stdLatency = standardDeviation(latencies)
  
  // Sort for percentile calculation
  latencies.sort((a, b) => a - b)
  const p95Index = Math.floor(latencies.length * 0.95)
  const p95Latency = latencies[p95Index] || latencies[latencies.length - 1]

  // Calculate baseline error rate
  const totalChecks = checks.length
  const errorChecks = checks.filter(c => c.status === 'down').length
  const avgErrorRate = totalChecks > 0 ? errorChecks / totalChecks : 0

  return {
    avgLatency,
    stdLatency,
    avgErrorRate,
    p95Latency,
  }
}

/**
 * Detect latency anomalies using Z-score
 */
function detectLatencyAnomaly(
  currentMetrics: CheckMetrics,
  baseline: { avgLatency: number; stdLatency: number }
): { isAnomaly: boolean; score: number; details: string } {
  if (currentMetrics.latencies.length < THRESHOLDS.MIN_SAMPLE_SIZE) {
    return { isAnomaly: false, score: 0, details: 'Insufficient data' }
  }

  const currentAvg = mean(currentMetrics.latencies)
  const z = (currentAvg - baseline.avgLatency) / (baseline.stdLatency || 1)

  // Z-score > 3 indicates significant anomaly
  const isAnomaly = z > THRESHOLDS.LATENCY_ZSCORE
  const score = Math.min(100, Math.max(0, (z / 5) * 100))

  return {
    isAnomaly,
    score,
    details: isAnomaly 
      ? `Latency spike detected: ${currentAvg.toFixed(0)}ms avg vs ${baseline.avgLatency.toFixed(0)}ms baseline (z-score: ${z.toFixed(2)})`
      : 'No significant latency anomaly',
  }
}

/**
 * Detect error rate anomalies
 */
function detectErrorFlood(
  currentMetrics: CheckMetrics,
  baseline: { avgErrorRate: number }
): { isAnomaly: boolean; score: number; details: string } {
  if (currentMetrics.errorRates.length === 0) {
    return { isAnomaly: false, score: 0, details: 'No error data' }
  }

  const currentErrorRate = mean(currentMetrics.errorRates)
  const errorRatio = baseline.avgErrorRate > 0 
    ? currentErrorRate / baseline.avgErrorRate 
    : currentErrorRate * 100 // If baseline is 0, any errors are significant

  const isAnomaly = currentErrorRate > THRESHOLDS.ERROR_RATE_THRESHOLD ||
                    (baseline.avgErrorRate > 0 && errorRatio > 10)

  // Calculate anomaly score (0-100)
  const score = Math.min(100, currentErrorRate * 200)

  return {
    isAnomaly,
    score,
    details: isAnomaly
      ? `Error flood detected: ${(currentErrorRate * 100).toFixed(1)}% error rate vs ${(baseline.avgErrorRate * 100).toFixed(1)}% baseline`
      : 'Error rate within normal range',
  }
}

/**
 * Detect regional saturation (potential DDoS)
 */
function detectRegionalSaturation(
  currentMetrics: CheckMetrics
): { isAnomaly: boolean; score: number; affectedRegions: string[]; details: string } {
  const affectedRegions: string[] = []
  let totalSaturationScore = 0

  currentMetrics.regionStatuses.forEach((stats, region) => {
    const failureRate = stats.total > 0 ? stats.down / stats.total : 0
    if (failureRate > 0.5) { // More than 50% failures in region
      affectedRegions.push(region)
      totalSaturationScore += failureRate
    }
  })

  const regionCount = currentMetrics.regionStatuses.size
  const saturationRatio = regionCount > 0 ? affectedRegions.length / regionCount : 0
  
  const isAnomaly = saturationRatio >= THRESHOLDS.REGIONAL_SATURATION
  const score = Math.min(100, saturationRatio * 150)

  return {
    isAnomaly,
    score,
    affectedRegions,
    details: isAnomaly
      ? `Regional saturation detected: ${affectedRegions.length}/${regionCount} regions affected`
      : 'Regional distribution normal',
  }
}

/**
 * Main DDoS detection function
 * Returns confidence score (0-100) and detailed signals
 */
export async function detectDDoS(
  monitorId: string
): Promise<{
  confidence: number
  isSuspected: boolean
  signals: DDoSSignal[]
  recommendation: string
}> {
  const [currentMetrics, baseline] = await Promise.all([
    collectMetrics(monitorId, THRESHOLDS.DETECTION_WINDOW),
    calculateBaseline(monitorId),
  ])

  if (!baseline) {
    return {
      confidence: 0,
      isSuspected: false,
      signals: [],
      recommendation: 'Insufficient baseline data for DDoS detection',
    }
  }

  const signals: DDoSSignal[] = []
  let totalConfidence = 0

  // Check 1: Latency spike
  const latencyAnomaly = detectLatencyAnomaly(currentMetrics, baseline)
  if (latencyAnomaly.isAnomaly) {
    signals.push({
      monitorId,
      confidence: latencyAnomaly.score,
      type: 'LATENCY_SPIKE',
      regions: Array.from(currentMetrics.regionStatuses.keys()),
      metrics: {
        errorRate: mean(currentMetrics.errorRates),
        avgLatency: mean(currentMetrics.latencies),
        requestCount: currentMetrics.timestamps.length,
        baselineErrorRate: baseline.avgErrorRate,
        baselineLatency: baseline.avgLatency,
      },
      detectedAt: new Date(),
    })
    totalConfidence += latencyAnomaly.score * 0.3 // 30% weight
  }

  // Check 2: Error flood
  const errorFlood = detectErrorFlood(currentMetrics, baseline)
  if (errorFlood.isAnomaly) {
    signals.push({
      monitorId,
      confidence: errorFlood.score,
      type: 'ERROR_FLOOD',
      regions: Array.from(currentMetrics.regionStatuses.keys()),
      metrics: {
        errorRate: mean(currentMetrics.errorRates),
        avgLatency: mean(currentMetrics.latencies),
        requestCount: currentMetrics.timestamps.length,
        baselineErrorRate: baseline.avgErrorRate,
        baselineLatency: baseline.avgLatency,
      },
      detectedAt: new Date(),
    })
    totalConfidence += errorFlood.score * 0.4 // 40% weight
  }

  // Check 3: Regional saturation
  const regionalSaturation = detectRegionalSaturation(currentMetrics)
  if (regionalSaturation.isAnomaly) {
    signals.push({
      monitorId,
      confidence: regionalSaturation.score,
      type: 'REGIONAL_SATURATION',
      regions: regionalSaturation.affectedRegions,
      metrics: {
        errorRate: mean(currentMetrics.errorRates),
        avgLatency: mean(currentMetrics.latencies),
        requestCount: currentMetrics.timestamps.length,
        baselineErrorRate: baseline.avgErrorRate,
        baselineLatency: baseline.avgLatency,
      },
      detectedAt: new Date(),
    })
    totalConfidence += regionalSaturation.score * 0.3 // 30% weight
  }

  const confidence = Math.min(100, totalConfidence)
  const isSuspected = confidence >= THRESHOLDS.DDOS_CONFIDENCE_THRESHOLD

  // Generate recommendation
  let recommendation = 'No DDoS indicators detected. Monitor continues normally.'
  if (isSuspected) {
    if (signals.length >= 2) {
      recommendation = 'Strong DDoS indicators detected across multiple signals. Consider activating DDoS mitigation and reviewing traffic logs.'
    } else {
      recommendation = 'Potential DDoS indicators detected. Monitor closely and prepare mitigation strategies.'
    }
  } else if (signals.length > 0) {
    recommendation = 'Some anomalies detected but confidence below DDoS threshold. Continue monitoring.'
  }

  return {
    confidence,
    isSuspected,
    signals,
    recommendation,
  }
}

/**
 * General anomaly detection (broader than DDoS)
 */
export async function detectAnomalies(
  monitorId: string
): Promise<AnomalyDetection> {
  const [currentMetrics, baseline] = await Promise.all([
    collectMetrics(monitorId, THRESHOLDS.DETECTION_WINDOW),
    calculateBaseline(monitorId),
  ])

  const detection: AnomalyDetection = {
    monitorId,
    overallScore: 0,
    isAnomaly: false,
    severity: 'low',
    detectedAt: new Date(),
    features: {},
  }

  if (!baseline) {
    return detection
  }

  const scores = {
    latency: 0,
    error: 0,
    traffic: 0,
  }

  // Latency anomaly
  const latencyResult = detectLatencyAnomaly(currentMetrics, baseline)
  if (latencyResult.isAnomaly) {
    scores.latency = latencyResult.score
    detection.features = { ...detection.features, latency_spike: true, latency_zscore: latencyResult.score }
  }

  // Error anomaly
  const errorResult = detectErrorFlood(currentMetrics, baseline)
  if (errorResult.isAnomaly) {
    scores.error = errorResult.score
    detection.features = { ...detection.features, error_spike: true, error_rate: errorResult.score }
  }

  // Traffic pattern anomaly (requests per minute)
  const currentRpm = currentMetrics.timestamps.length / (THRESHOLDS.DETECTION_WINDOW / 60000)
  if (currentRpm > 100) { // More than 100 checks per minute is unusual
    scores.traffic = Math.min(100, (currentRpm / 200) * 100)
    detection.features = { ...detection.features, high_traffic: true, requests_per_minute: currentRpm }
  }

  // Calculate overall score
  detection.latencyScore = scores.latency
  detection.errorScore = scores.error
  detection.trafficScore = scores.traffic
  detection.overallScore = Math.max(scores.latency, scores.error, scores.traffic)

  // Determine if anomaly and severity
  detection.isAnomaly = detection.overallScore > 50
  if (detection.overallScore > 80) {
    detection.severity = 'high'
  } else if (detection.overallScore > 60) {
    detection.severity = 'medium'
  }

  return detection
}

/**
 * Store network event for incident correlation
 */
export async function storeNetworkEvent(
  monitorId: string,
  eventType: 'LATENCY_SPIKE' | 'PACKET_LOSS' | 'DDOS_SUSPECTED' | 'REGION_FAILURE',
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING',
  description: string,
  confidence: number,
  region?: string,
  incidentId?: string,
  evidence?: Record<string, unknown>
): Promise<void> {
  await prisma.networkEvent.create({
    data: {
      monitorId,
      eventType,
      severity,
      description,
      region,
      confidence,
      incidentId,
      evidence: evidence as any,
    },
  })
}
