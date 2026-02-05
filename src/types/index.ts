// Core type definitions for LimeLink

// ═══════════════════════════════════════════════════════════════════════════════
// MONITORING
// ═══════════════════════════════════════════════════════════════════════════════

export type MonitorStatus = 'up' | 'down' | 'degraded' | 'paused'

export interface CheckResult {
  monitorId: string
  region: string
  status: MonitorStatus
  statusCode?: number
  totalTime: number // ms
  dnsTime?: number
  tcpTime?: number
  tlsTime?: number
  ttfb?: number
  error?: string
  responseSize?: number
  sslValid?: boolean
  sslExpiresAt?: Date
  checkedAt: Date
}

export interface RegionalStatus {
  region: string
  status: MonitorStatus
  latency: number
  lastCheckedAt: Date
}

export interface AggregatedStatus {
  status: MonitorStatus
  regions: RegionalStatus[]
  uptimePercentage: number
  avgResponseTime: number
  lastCheckedAt: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type IncidentSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING'
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'AUTO_RESOLVED'

export interface Incident {
  id: string
  monitorId: string
  severity: IncidentSeverity
  status: IncidentStatus
  classification: string
  title: string
  description?: string
  startedAt: Date
  resolvedAt?: Date
  duration?: number
  affectedRegions: string[]
  avgLatency?: number
  rootCauseId?: string
  anomalyScore?: number
  ddosConfidence?: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// DDoS & ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnomalyDetection {
  monitorId: string
  overallScore: number
  latencyScore?: number
  errorScore?: number
  trafficScore?: number
  isAnomaly: boolean
  severity: 'low' | 'medium' | 'high'
  detectedAt: Date
  features: Record<string, unknown>
}

export interface DDoSSignal {
  monitorId: string
  confidence: number
  type: 'LATENCY_SPIKE' | 'ERROR_FLOOD' | 'REGIONAL_SATURATION' | 'TRAFFIC_ANOMALY'
  regions: string[]
  metrics: {
    errorRate: number
    avgLatency: number
    requestCount: number
    baselineErrorRate: number
    baselineLatency: number
  }
  detectedAt: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// RCA (Root Cause Analysis)
// ═══════════════════════════════════════════════════════════════════════════════

export interface RCAResult {
  id: string
  summary: string
  rootCause: string
  category: string
  confidence: number
  evidence: {
    keyMetrics: string[]
    anomalies: string[]
    timeline: string[]
  }
  reasoning: string
  recommendations: string[]
  dataWindow: {
    start: Date
    end: Date
  }
  regionSummary: Record<string, {
    status: string
    latency: number
    errors: number
  }>
  createdAt: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export type AlertChannelType = 'WEBHOOK' | 'DISCORD' | 'SLACK' | 'EMAIL'
export type AlertEventType = 
  | 'MONITOR_DOWN'
  | 'MONITOR_UP'
  | 'MONITOR_DEGRADED'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_RESOLVED'
  | 'ANOMALY_DETECTED'
  | 'DDOS_SUSPECTED'
  | 'SLO_BREACH'
  | 'SSL_EXPIRING'

export interface AlertPayload {
  event: AlertEventType
  monitor: {
    id: string
    name: string
    url: string
    status: MonitorStatus
  }
  incident?: {
    id: string
    severity: IncidentSeverity
    title: string
    affectedRegions: string[]
  }
  timestamp: Date
  details: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLO
// ═══════════════════════════════════════════════════════════════════════════════

export type SloMetric = 'AVAILABILITY' | 'LATENCY_P95' | 'LATENCY_P99' | 'ERROR_RATE'
export type SloWindow = 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'NINETY_DAYS'

export interface SloDefinition {
  id: string
  projectId: string
  monitorId?: string
  name: string
  metric: SloMetric
  threshold: number
  window: SloWindow
  isActive: boolean
}

export interface SloWindowData {
  sloId: string
  windowStart: Date
  windowEnd: Date
  actualValue: number
  targetValue: number
  errorBudgetTotal: number
  errorBudgetUsed: number
  errorBudgetRemaining: number
  burnRate: number
  isBreached: boolean
  breachedAt?: Date
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export type PanelType = 
  | 'TIME_SERIES'
  | 'BAR_CHART'
  | 'PIE_CHART'
  | 'STAT'
  | 'GAUGE'
  | 'HEATMAP'
  | 'LOG_STREAM'
  | 'TABLE'
  | 'MARKDOWN'

export interface DashboardPanel {
  id: string
  title: string
  panelType: PanelType
  monitorId?: string
  metric: string
  aggregation: string
  query?: Record<string, unknown>
  config?: {
    colors?: string[]
    thresholds?: { value: number; color: string }[]
    legend?: boolean
    showGrid?: boolean
  }
  position: {
    x: number
    y: number
    w: number
    h: number
  }
}

export interface Dashboard {
  id: string
  name: string
  description?: string
  panels: DashboardPanel[]
  timeRange: string
  refreshInterval?: number
  isPublic: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH & RBAC
// ═══════════════════════════════════════════════════════════════════════════════

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export interface UserSession {
  id: string
  email: string
  name: string | null
}

export interface TeamMember {
  id: string
  userId: string
  teamId: string
  role: TeamRole
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl?: string | null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface TimeSeriesPoint {
  timestamp: Date
  value: number
  region?: string
}

export interface HeatmapData {
  region: string
  hour: string
  value: number
}

export interface LatencyDistribution {
  bucket: string
  count: number
}
