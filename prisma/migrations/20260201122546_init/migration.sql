-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MonitorType" AS ENUM ('HTTP', 'HTTPS', 'TCP', 'ICMP', 'DNS');

-- CreateEnum
CREATE TYPE "MonitorMethod" AS ENUM ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS');

-- CreateEnum
CREATE TYPE "MonitorStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'WARNING');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'AUTO_RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentClassification" AS ENUM ('OUTAGE', 'DEGRADATION', 'PACKET_LOSS', 'NETWORK_DEGRADATION', 'POSSIBLE_DDOS', 'SSL_EXPIRY', 'DNS_ISSUE', 'TIMEOUT', 'ERROR_SPIKE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NetworkEventType" AS ENUM ('LATENCY_SPIKE', 'PACKET_LOSS', 'DDOS_SUSPECTED', 'REGION_FAILURE', 'SSL_ISSUE', 'DNS_FAILURE', 'TIMEOUT_SPIKE', 'ERROR_FLOOD');

-- CreateEnum
CREATE TYPE "AlertChannelType" AS ENUM ('WEBHOOK', 'DISCORD', 'SLACK', 'EMAIL');

-- CreateEnum
CREATE TYPE "AlertEventType" AS ENUM ('MONITOR_DOWN', 'MONITOR_UP', 'MONITOR_DEGRADED', 'INCIDENT_CREATED', 'INCIDENT_RESOLVED', 'ANOMALY_DETECTED', 'DDOS_SUSPECTED', 'SLO_BREACH', 'ERROR_BUDGET_BURN', 'SSL_EXPIRING');

-- CreateEnum
CREATE TYPE "SloMetric" AS ENUM ('AVAILABILITY', 'LATENCY_P95', 'LATENCY_P99', 'ERROR_RATE');

-- CreateEnum
CREATE TYPE "SloWindow" AS ENUM ('SEVEN_DAYS', 'THIRTY_DAYS', 'NINETY_DAYS');

-- CreateEnum
CREATE TYPE "PanelType" AS ENUM ('TIME_SERIES', 'BAR_CHART', 'PIE_CHART', 'STAT', 'GAUGE', 'HEATMAP', 'LOG_STREAM', 'TABLE', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE', 'JOIN', 'LEAVE', 'EXPORT', 'ALERT_SENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailVerified" TIMESTAMP(3),
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "invitedBy" TEXT,
    "inviteEmail" TEXT,
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "publicBrandColor" TEXT DEFAULT '#3B82F6',
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitors" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MonitorType" NOT NULL DEFAULT 'HTTPS',
    "url" TEXT NOT NULL,
    "method" "MonitorMethod" NOT NULL DEFAULT 'GET',
    "interval" INTEGER NOT NULL DEFAULT 300,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "retries" INTEGER NOT NULL DEFAULT 2,
    "headers" JSONB,
    "body" TEXT,
    "expectedStatus" INTEGER,
    "expectedContent" TEXT,
    "checkSsl" BOOLEAN NOT NULL DEFAULT true,
    "sslExpiryDays" INTEGER DEFAULT 30,
    "followRedirects" BOOLEAN NOT NULL DEFAULT true,
    "regions" TEXT[] DEFAULT ARRAY['us-east-1', 'eu-west-1', 'ap-southeast-1']::TEXT[],
    "status" "MonitorStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "uptimePercentage" DOUBLE PRECISION DEFAULT 100,
    "avgResponseTime" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_regions" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "avgLatency" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitor_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_checks" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "dnsTime" INTEGER,
    "tcpTime" INTEGER,
    "tlsTime" INTEGER,
    "ttfb" INTEGER,
    "totalTime" INTEGER NOT NULL,
    "statusCode" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "responseSize" INTEGER,
    "responseHash" TEXT,
    "sslValid" BOOLEAN,
    "sslExpiresAt" TIMESTAMP(3),
    "sslIssuer" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkIndex" INTEGER NOT NULL,

    CONSTRAINT "monitor_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitor_checks_hourly" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "totalChecks" INTEGER NOT NULL,
    "upCount" INTEGER NOT NULL,
    "downCount" INTEGER NOT NULL,
    "degradedCount" INTEGER NOT NULL,
    "avgLatency" DOUBLE PRECISION NOT NULL,
    "minLatency" INTEGER NOT NULL,
    "maxLatency" INTEGER NOT NULL,
    "p95Latency" INTEGER NOT NULL,
    "p99Latency" INTEGER NOT NULL,
    "errorCodes" JSONB,

    CONSTRAINT "monitor_checks_hourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'CRITICAL',
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "classification" "IncidentClassification" NOT NULL DEFAULT 'UNKNOWN',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "affectedRegions" TEXT[],
    "errorRate" DOUBLE PRECISION,
    "avgLatency" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rootCauseId" TEXT,
    "anomalyScore" DOUBLE PRECISION,
    "ddosConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_updates" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_scores" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "latencyScore" DOUBLE PRECISION,
    "errorScore" DOUBLE PRECISION,
    "trafficScore" DOUBLE PRECISION,
    "features" JSONB,
    "algorithm" TEXT NOT NULL DEFAULT 'zscore',
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "severity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_events" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "incidentId" TEXT,
    "eventType" "NetworkEventType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'WARNING',
    "description" TEXT NOT NULL,
    "region" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "latency" INTEGER,
    "errorRate" DOUBLE PRECISION,
    "requestCount" INTEGER,
    "evidence" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "network_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rca_reports" (
    "id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "recommendations" TEXT[],
    "dataWindowStart" TIMESTAMP(3) NOT NULL,
    "dataWindowEnd" TIMESTAMP(3) NOT NULL,
    "regionSummary" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rca_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelType" "AlertChannelType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "slackWebhookUrl" TEXT,
    "discordWebhookUrl" TEXT,
    "emailAddresses" TEXT[],
    "events" "AlertEventType"[],
    "monitorIds" TEXT[],
    "severityFilter" "IncidentSeverity"[],
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "alert_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_history" (
    "id" TEXT NOT NULL,
    "alertConfigId" TEXT NOT NULL,
    "eventType" "AlertEventType" NOT NULL,
    "monitorId" TEXT,
    "incidentId" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "alert_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slo_definitions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "monitorId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metric" "SloMetric" NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'lt',
    "threshold" DOUBLE PRECISION NOT NULL,
    "window" "SloWindow" NOT NULL DEFAULT 'THIRTY_DAYS',
    "burnRateAlert" DOUBLE PRECISION,
    "fastBurnAlert" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "slo_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slo_window_data" (
    "id" TEXT NOT NULL,
    "sloId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "errorBudgetTotal" DOUBLE PRECISION NOT NULL,
    "errorBudgetUsed" DOUBLE PRECISION NOT NULL,
    "errorBudgetRemaining" DOUBLE PRECISION NOT NULL,
    "burnRate" DOUBLE PRECISION NOT NULL,
    "isBreached" BOOLEAN NOT NULL DEFAULT false,
    "breachedAt" TIMESTAMP(3),
    "totalChecks" INTEGER NOT NULL,
    "goodChecks" INTEGER NOT NULL,
    "badChecks" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slo_window_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "defaultTimeRange" TEXT NOT NULL DEFAULT '24h',
    "refreshInterval" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "presetType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_panels" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "panelType" "PanelType" NOT NULL,
    "monitorId" TEXT,
    "metric" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL DEFAULT 'avg',
    "query" JSONB,
    "config" JSONB,
    "positionX" INTEGER NOT NULL DEFAULT 0,
    "positionY" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 6,
    "height" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "metadata" JSONB,
    "teamId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_keyHash_idx" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_keys_teamId_idx" ON "api_keys"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_slug_idx" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_ownerId_idx" ON "teams"("ownerId");

-- CreateIndex
CREATE INDEX "teams_deletedAt_idx" ON "teams"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_inviteToken_key" ON "team_members"("inviteToken");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE INDEX "team_members_inviteToken_idx" ON "team_members"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_publicSlug_key" ON "projects"("publicSlug");

-- CreateIndex
CREATE INDEX "projects_teamId_idx" ON "projects"("teamId");

-- CreateIndex
CREATE INDEX "projects_publicSlug_idx" ON "projects"("publicSlug");

-- CreateIndex
CREATE INDEX "projects_deletedAt_idx" ON "projects"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_teamId_slug_key" ON "projects"("teamId", "slug");

-- CreateIndex
CREATE INDEX "monitors_projectId_idx" ON "monitors"("projectId");

-- CreateIndex
CREATE INDEX "monitors_status_idx" ON "monitors"("status");

-- CreateIndex
CREATE INDEX "monitors_deletedAt_idx" ON "monitors"("deletedAt");

-- CreateIndex
CREATE INDEX "monitors_projectId_status_idx" ON "monitors"("projectId", "status");

-- CreateIndex
CREATE INDEX "monitor_regions_monitorId_idx" ON "monitor_regions"("monitorId");

-- CreateIndex
CREATE INDEX "monitor_regions_region_idx" ON "monitor_regions"("region");

-- CreateIndex
CREATE UNIQUE INDEX "monitor_regions_monitorId_region_key" ON "monitor_regions"("monitorId", "region");

-- CreateIndex
CREATE INDEX "monitor_checks_monitorId_checkedAt_idx" ON "monitor_checks"("monitorId", "checkedAt");

-- CreateIndex
CREATE INDEX "monitor_checks_monitorId_region_checkedAt_idx" ON "monitor_checks"("monitorId", "region", "checkedAt");

-- CreateIndex
CREATE INDEX "monitor_checks_checkedAt_idx" ON "monitor_checks"("checkedAt");

-- CreateIndex
CREATE INDEX "monitor_checks_status_idx" ON "monitor_checks"("status");

-- CreateIndex
CREATE INDEX "monitor_checks_hourly_monitorId_hour_idx" ON "monitor_checks_hourly"("monitorId", "hour");

-- CreateIndex
CREATE INDEX "monitor_checks_hourly_hour_idx" ON "monitor_checks_hourly"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "monitor_checks_hourly_monitorId_region_hour_key" ON "monitor_checks_hourly"("monitorId", "region", "hour");

-- CreateIndex
CREATE INDEX "incidents_monitorId_idx" ON "incidents"("monitorId");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_startedAt_idx" ON "incidents"("startedAt");

-- CreateIndex
CREATE INDEX "incidents_monitorId_startedAt_idx" ON "incidents"("monitorId", "startedAt");

-- CreateIndex
CREATE INDEX "incidents_classification_idx" ON "incidents"("classification");

-- CreateIndex
CREATE INDEX "incident_updates_incidentId_idx" ON "incident_updates"("incidentId");

-- CreateIndex
CREATE INDEX "incident_updates_createdAt_idx" ON "incident_updates"("createdAt");

-- CreateIndex
CREATE INDEX "anomaly_scores_monitorId_idx" ON "anomaly_scores"("monitorId");

-- CreateIndex
CREATE INDEX "anomaly_scores_createdAt_idx" ON "anomaly_scores"("createdAt");

-- CreateIndex
CREATE INDEX "anomaly_scores_monitorId_createdAt_idx" ON "anomaly_scores"("monitorId", "createdAt");

-- CreateIndex
CREATE INDEX "anomaly_scores_isAnomaly_idx" ON "anomaly_scores"("isAnomaly");

-- CreateIndex
CREATE INDEX "network_events_monitorId_idx" ON "network_events"("monitorId");

-- CreateIndex
CREATE INDEX "network_events_eventType_idx" ON "network_events"("eventType");

-- CreateIndex
CREATE INDEX "network_events_startedAt_idx" ON "network_events"("startedAt");

-- CreateIndex
CREATE INDEX "network_events_monitorId_startedAt_idx" ON "network_events"("monitorId", "startedAt");

-- CreateIndex
CREATE INDEX "rca_reports_createdAt_idx" ON "rca_reports"("createdAt");

-- CreateIndex
CREATE INDEX "rca_reports_confidence_idx" ON "rca_reports"("confidence");

-- CreateIndex
CREATE INDEX "alert_configs_projectId_idx" ON "alert_configs"("projectId");

-- CreateIndex
CREATE INDEX "alert_configs_deletedAt_idx" ON "alert_configs"("deletedAt");

-- CreateIndex
CREATE INDEX "alert_history_alertConfigId_idx" ON "alert_history"("alertConfigId");

-- CreateIndex
CREATE INDEX "alert_history_createdAt_idx" ON "alert_history"("createdAt");

-- CreateIndex
CREATE INDEX "alert_history_status_idx" ON "alert_history"("status");

-- CreateIndex
CREATE INDEX "slo_definitions_projectId_idx" ON "slo_definitions"("projectId");

-- CreateIndex
CREATE INDEX "slo_definitions_monitorId_idx" ON "slo_definitions"("monitorId");

-- CreateIndex
CREATE INDEX "slo_definitions_deletedAt_idx" ON "slo_definitions"("deletedAt");

-- CreateIndex
CREATE INDEX "slo_window_data_sloId_idx" ON "slo_window_data"("sloId");

-- CreateIndex
CREATE INDEX "slo_window_data_windowStart_idx" ON "slo_window_data"("windowStart");

-- CreateIndex
CREATE INDEX "slo_window_data_isBreached_idx" ON "slo_window_data"("isBreached");

-- CreateIndex
CREATE UNIQUE INDEX "slo_window_data_sloId_windowStart_key" ON "slo_window_data"("sloId", "windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "dashboards_publicSlug_key" ON "dashboards"("publicSlug");

-- CreateIndex
CREATE INDEX "dashboards_projectId_idx" ON "dashboards"("projectId");

-- CreateIndex
CREATE INDEX "dashboards_publicSlug_idx" ON "dashboards"("publicSlug");

-- CreateIndex
CREATE INDEX "dashboards_deletedAt_idx" ON "dashboards"("deletedAt");

-- CreateIndex
CREATE INDEX "dashboard_panels_dashboardId_idx" ON "dashboard_panels"("dashboardId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_teamId_idx" ON "audit_logs"("teamId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitors" ADD CONSTRAINT "monitors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_regions" ADD CONSTRAINT "monitor_regions_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitor_checks" ADD CONSTRAINT "monitor_checks_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_rootCauseId_fkey" FOREIGN KEY ("rootCauseId") REFERENCES "rca_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_events" ADD CONSTRAINT "network_events_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_events" ADD CONSTRAINT "network_events_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configs" ADD CONSTRAINT "alert_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_history" ADD CONSTRAINT "alert_history_alertConfigId_fkey" FOREIGN KEY ("alertConfigId") REFERENCES "alert_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slo_definitions" ADD CONSTRAINT "slo_definitions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slo_window_data" ADD CONSTRAINT "slo_window_data_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "slo_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_panels" ADD CONSTRAINT "dashboard_panels_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
