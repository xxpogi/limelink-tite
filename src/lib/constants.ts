// Application constants

export const APP_NAME = 'LimeLink'
export const APP_TAGLINE = 'Production-grade observability platform'

// Monitor intervals (in seconds)
export const MONITOR_INTERVALS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
] as const

// Monitor timeouts (in seconds)
export const MONITOR_TIMEOUTS = [
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
] as const

// Edge regions for monitoring
export const REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', flag: '🇺🇸' },
  { id: 'us-west-1', name: 'US West (N. California)', flag: '🇺🇸' },
  { id: 'eu-west-1', name: 'Europe (Ireland)', flag: '🇮🇪' },
  { id: 'eu-central-1', name: 'Europe (Frankfurt)', flag: '🇩🇪' },
  { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬' },
  { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵' },
  { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳' },
  { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷' },
] as const

// Time ranges for dashboards
export const TIME_RANGES = [
  { value: '15m', label: 'Last 15 minutes', ms: 15 * 60 * 1000 },
  { value: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { value: '6h', label: 'Last 6 hours', ms: 6 * 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
] as const

// Incident severities
export const SEVERITIES = [
  { value: 'CRITICAL', label: 'Critical', color: '#ef4444' },
  { value: 'MAJOR', label: 'Major', color: '#f97316' },
  { value: 'MINOR', label: 'Minor', color: '#eab308' },
  { value: 'WARNING', label: 'Warning', color: '#3b82f6' },
] as const

// Alert event types
export const ALERT_EVENTS = [
  { value: 'MONITOR_DOWN', label: 'Monitor Down', description: 'When a monitor detects downtime' },
  { value: 'MONITOR_UP', label: 'Monitor Up', description: 'When a monitor recovers' },
  { value: 'MONITOR_DEGRADED', label: 'Monitor Degraded', description: 'When performance degrades' },
  { value: 'INCIDENT_CREATED', label: 'Incident Created', description: 'When a new incident is created' },
  { value: 'INCIDENT_RESOLVED', label: 'Incident Resolved', description: 'When an incident is resolved' },
  { value: 'ANOMALY_DETECTED', label: 'Anomaly Detected', description: 'When unusual behavior is detected' },
  { value: 'DDOS_SUSPECTED', label: 'DDoS Suspected', description: 'When a potential DDoS is detected' },
  { value: 'SLO_BREACH', label: 'SLO Breach', description: 'When an SLO is breached' },
  { value: 'SSL_EXPIRING', label: 'SSL Expiring', description: 'When SSL certificate is about to expire' },
] as const

// Team roles
export const TEAM_ROLES = [
  { value: 'OWNER', label: 'Owner', description: 'Full access to everything' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage monitors and team members' },
  { value: 'MEMBER', label: 'Member', description: 'Can create and edit monitors' },
  { value: 'VIEWER', label: 'Viewer', description: 'View-only access' },
] as const

// Chart colors
export const CHART_COLORS = {
  up: '#10b981',
  down: '#ef4444',
  degraded: '#f59e0b',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#f97316',
  grid: '#e5e7eb',
  darkGrid: '#374151',
} as const

// DDoS detection thresholds
export const DDOS_THRESHOLDS = {
  // Latency spike threshold (Z-score)
  LATENCY_ZSCORE: 3,
  // Error rate threshold for DDoS suspicion
  ERROR_RATE_THRESHOLD: 0.5,
  // Minimum requests to consider for DDoS
  MIN_REQUESTS: 100,
  // Time window for detection (ms)
  DETECTION_WINDOW: 5 * 60 * 1000, // 5 minutes
  // Confidence threshold for DDoS classification
  CONFIDENCE_THRESHOLD: 70,
} as const

// SLO defaults
export const SLO_DEFAULTS = {
  AVAILABILITY: 99.9,
  LATENCY_P95: 200, // ms
  LATENCY_P99: 500, // ms
  ERROR_RATE: 0.1, // %
} as const

// Rate limiting
export const RATE_LIMITS = {
  // Per IP
  IP: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  // Per user
  USER: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
  },
  // Per API key
  API_KEY: {
    windowMs: 60 * 1000, // 1 minute
    max: 120,
  },
} as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // ms
  MAX_DELAY: 30000, // ms
  BACKOFF_MULTIPLIER: 2,
} as const
