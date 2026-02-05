// Incident management service
import { prisma } from '@/lib/prisma'
import { Incident, IncidentSeverity, IncidentStatus } from '@/types'
import { IncidentClassification } from '@prisma/client'

/**
 * Create a new incident from monitor check results
 */
export async function createIncident(
  monitorId: string,
  classification: IncidentClassification,
  severity: IncidentSeverity,
  affectedRegions: string[],
  errorRate: number,
  avgLatency: number,
  title?: string,
  description?: string
): Promise<Incident> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: { project: true },
  })

  if (!monitor) {
    throw new Error('Monitor not found')
  }

  const incidentTitle = title || `${monitor.name} - ${classification.replace(/_/g, ' ')}`
  const incidentDescription = description || `Automated incident detection for ${monitor.url}`

  const incident = await prisma.incident.create({
    data: {
      monitorId,
      severity,
      status: 'OPEN',
      classification,
      title: incidentTitle,
      description: incidentDescription,
      startedAt: new Date(),
      affectedRegions,
      avgLatency,
    },
  })

  // Create initial incident update
  await prisma.incidentUpdate.create({
    data: {
      incidentId: incident.id,
      status: 'detected',
      message: `Incident automatically detected: ${classification.replace(/_/g, ' ')}`,
      createdBy: 'system',
    },
  })

  return {
    id: incident.id,
    monitorId: incident.monitorId,
    severity: incident.severity as IncidentSeverity,
    status: incident.status as IncidentStatus,
    classification: incident.classification,
    title: incident.title,
    description: incident.description || undefined,
    startedAt: incident.startedAt,
    affectedRegions: incident.affectedRegions,
    avgLatency: incident.avgLatency || undefined,
  }
}

/**
 * Resolve an incident
 */
export async function resolveIncident(
  incidentId: string,
  autoResolved: boolean = false
): Promise<Incident> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  })

  if (!incident) {
    throw new Error('Incident not found')
  }

  if (incident.status === 'RESOLVED' || incident.status === 'AUTO_RESOLVED') {
    throw new Error('Incident already resolved')
  }

  const now = new Date()
  const duration = Math.floor((now.getTime() - incident.startedAt.getTime()) / 1000)

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: autoResolved ? 'AUTO_RESOLVED' : 'RESOLVED',
      resolvedAt: now,
      duration,
    },
  })

  // Create resolution update
  await prisma.incidentUpdate.create({
    data: {
      incidentId,
      status: 'resolved',
      message: autoResolved 
        ? 'Incident automatically resolved - monitor is now up'
        : 'Incident resolved',
      createdBy: 'system',
    },
  })

  return {
    id: updated.id,
    monitorId: updated.monitorId,
    severity: updated.severity as IncidentSeverity,
    status: updated.status as IncidentStatus,
    classification: updated.classification,
    title: updated.title,
    description: updated.description || undefined,
    startedAt: updated.startedAt,
    resolvedAt: updated.resolvedAt || undefined,
    duration: updated.duration || undefined,
    affectedRegions: updated.affectedRegions,
    avgLatency: updated.avgLatency || undefined,
  }
}

/**
 * Acknowledge an incident
 */
export async function acknowledgeIncident(
  incidentId: string,
  userId: string
): Promise<Incident> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
  })

  if (!incident) {
    throw new Error('Incident not found')
  }

  if (incident.status !== 'OPEN') {
    throw new Error('Can only acknowledge open incidents')
  }

  const updated = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: 'ACKNOWLEDGED',
    },
  })

  // Create acknowledgment update
  await prisma.incidentUpdate.create({
    data: {
      incidentId,
      status: 'acknowledged',
      message: 'Incident acknowledged',
      createdBy: userId,
    },
  })

  return {
    id: updated.id,
    monitorId: updated.monitorId,
    severity: updated.severity as IncidentSeverity,
    status: updated.status as IncidentStatus,
    classification: updated.classification,
    title: updated.title,
    description: updated.description || undefined,
    startedAt: updated.startedAt,
    affectedRegions: updated.affectedRegions,
    avgLatency: updated.avgLatency || undefined,
  }
}

/**
 * Add an update to an incident
 */
export async function addIncidentUpdate(
  incidentId: string,
  status: string,
  message: string,
  userId?: string
): Promise<void> {
  await prisma.incidentUpdate.create({
    data: {
      incidentId,
      status,
      message,
      createdBy: userId || 'system',
    },
  })
}

/**
 * Check if there's an open incident for a monitor
 */
export async function getOpenIncident(monitorId: string): Promise<Incident | null> {
  const incident = await prisma.incident.findFirst({
    where: {
      monitorId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
    orderBy: {
      startedAt: 'desc',
    },
  })

  if (!incident) return null

  return {
    id: incident.id,
    monitorId: incident.monitorId,
    severity: incident.severity as IncidentSeverity,
    status: incident.status as IncidentStatus,
    classification: incident.classification,
    title: incident.title,
    description: incident.description || undefined,
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt || undefined,
    affectedRegions: incident.affectedRegions,
    avgLatency: incident.avgLatency || undefined,
    duration: incident.duration || undefined,
  }
}

/**
 * Get incidents for a project
 */
export async function getIncidents(
  projectId: string,
  options: {
    status?: IncidentStatus[]
    severity?: IncidentSeverity[]
    limit?: number
    offset?: number
  } = {}
): Promise<{ incidents: Incident[]; total: number }> {
  const { status, severity, limit = 20, offset = 0 } = options

  // Get monitors in project
  const monitors = await prisma.monitor.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true },
  })

  const monitorIds = monitors.map(m => m.id)

  const where: any = {
    monitorId: { in: monitorIds },
  }

  if (status && status.length > 0) {
    where.status = { in: status }
  }

  if (severity && severity.length > 0) {
    where.severity = { in: severity }
  }

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.incident.count({ where }),
  ])

  return {
    incidents: incidents.map(i => ({
      id: i.id,
      monitorId: i.monitorId,
      severity: i.severity as IncidentSeverity,
      status: i.status as IncidentStatus,
      classification: i.classification,
      title: i.title,
      description: i.description || undefined,
      startedAt: i.startedAt,
      resolvedAt: i.resolvedAt || undefined,
      duration: i.duration || undefined,
      affectedRegions: i.affectedRegions,
      avgLatency: i.avgLatency || undefined,
      rootCauseId: i.rootCauseId || undefined,
      anomalyScore: i.anomalyScore || undefined,
      ddosConfidence: i.ddosConfidence || undefined,
    })),
    total,
  }
}

/**
 * Get incident details with updates
 */
export async function getIncidentDetails(incidentId: string): Promise<{
  incident: Incident
  updates: Array<{
    id: string
    status: string
    message: string
    createdBy?: string
    createdAt: Date
  }>
  monitor: {
    id: string
    name: string
    url: string
  }
} | null> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      monitor: {
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      updates: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!incident) return null

  return {
    incident: {
      id: incident.id,
      monitorId: incident.monitorId,
      severity: incident.severity as IncidentSeverity,
      status: incident.status as IncidentStatus,
      classification: incident.classification,
      title: incident.title,
      description: incident.description || undefined,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt || undefined,
      duration: incident.duration || undefined,
      affectedRegions: incident.affectedRegions,
      avgLatency: incident.avgLatency || undefined,
      rootCauseId: incident.rootCauseId || undefined,
      anomalyScore: incident.anomalyScore || undefined,
      ddosConfidence: incident.ddosConfidence || undefined,
    },
    updates: incident.updates.map(u => ({
      id: u.id,
      status: u.status,
      message: u.message,
      createdBy: u.createdBy || undefined,
      createdAt: u.createdAt,
    })),
    monitor: incident.monitor,
  }
}

/**
 * Classify an incident based on check patterns
 */
export function classifyIncident(
  errorMessage: string,
  statusCode?: number,
  regionsAffected: number = 1,
  totalRegions: number = 3
): IncidentClassification {
  // Check for SSL errors
  if (errorMessage.toLowerCase().includes('ssl') || 
      errorMessage.toLowerCase().includes('certificate') ||
      errorMessage.toLowerCase().includes('tls')) {
    return 'SSL_EXPIRY'
  }

  // Check for DNS errors
  if (errorMessage.toLowerCase().includes('enotfound') ||
      errorMessage.toLowerCase().includes('dns') ||
      errorMessage.toLowerCase().includes('getaddrinfo')) {
    return 'DNS_ISSUE'
  }

  // Check for timeout
  if (errorMessage.toLowerCase().includes('timeout') ||
      errorMessage.toLowerCase().includes('econnreset') ||
      statusCode === 504) {
    return 'TIMEOUT'
  }

  // Check for server errors
  if (statusCode && statusCode >= 500) {
    // If all regions affected, likely a server issue
    if (regionsAffected === totalRegions) {
      return 'OUTAGE'
    }
    return 'ERROR_SPIKE'
  }

  // Partial region failure
  if (regionsAffected < totalRegions && regionsAffected > 0) {
    return 'NETWORK_DEGRADATION'
  }

  return 'UNKNOWN'
}

/**
 * Determine incident severity based on impact
 */
export function determineSeverity(
  classification: IncidentClassification,
  regionsAffected: number,
  totalRegions: number,
  errorRate: number
): IncidentSeverity {
  // Critical: Complete outage or DDoS
  if (classification === 'POSSIBLE_DDOS' || 
      (regionsAffected === totalRegions && errorRate > 0.9)) {
    return 'CRITICAL'
  }

  // Major: Most regions down or SSL issue
  if (regionsAffected >= totalRegions * 0.75 || 
      classification === 'SSL_EXPIRY') {
    return 'MAJOR'
  }

  // Minor: Some regions affected
  if (regionsAffected > 1 || errorRate > 0.5) {
    return 'MINOR'
  }

  return 'WARNING'
}
