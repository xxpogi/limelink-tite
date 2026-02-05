# LimeLink Observability Platform - System Architecture

## Overview

LimeLink is a production-grade website uptime & observability platform built on a modern, scalable architecture. It provides global edge-based monitoring, local statistical root cause analysis, and Grafana-grade dashboards - 100% free with no external AI costs.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Status Page │  │   API        │  │   Webhooks   │      │
│  │  (Next.js)   │  │  (Public)    │  │  (REST)      │  │  (Inbound)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                                  │
│  ┌─────────────────┬─────────────────┬─────────────────┐                    │
│  │   US-East       │   EU-West       │  APAC-Singapore │                    │
│  │  (iad1)         │   (lhr1)        │   (sin1)        │                    │
│  │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │                    │
│  │ │ Edge Check  │ │ │ Edge Check  │ │ │ Edge Check  │ │                    │
│  │ │ Functions   │ │ │ Functions   │ │ │ Functions   │ │                    │
│  │ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │                    │
│  └─────────────────┴─────────────────┴─────────────────┘                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              CRON JOBS (Vercel Cron)                │                    │
│  │  • Monitor Scheduler (every 30s-5min)               │                    │
│  │  • Anomaly Detection (every 5min)                   │                    │
│  │  • SLO Calculation (hourly)                         │                    │
│  │  • Alert Aggregation (every minute)                 │                    │
│  └─────────────────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    NEXT.JS APP ROUTER                                │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │   Server    │  │   Server    │  │    Route    │  │   Local    │  │    │
│  │  │   Actions   │  │ Components  │  │   Handlers  │  │    RCA     │  │    │
│  │  │             │  │             │  │             │  │ (Statistical│  │    │
│  │  │ • Auth      │  │ • Dashboard │  │ • Webhooks  │  │  Analysis) │  │    │
│  │  │ • CRUD      │  │ • Monitors  │  │ • Checks    │  │            │  │    │
│  │  │ • RBAC      │  │ • Incidents │  │ • Alerts    │  │ • Patterns │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  │                                                                      │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    SERVICE LAYER                             │    │    │
│  │  │  • MonitorService    • DDoSDetectionService                 │    │    │
│  │  │  • AlertService      • SLOCalculatorService                 │    │    │
│  │  │  • LocalRCAService   • TeamPermissionService                │    │    │
│  │  │  • CheckAggregator   • DashboardEngine                      │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA ACCESS LAYER                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │   Prisma    │  │  Connection │  │   Query     │  │   Cache    │  │    │
│  │  │    ORM      │  │    Pool     │  │  Optimizer  │  │  (Redis)   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    NEON POSTGRESQL                                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │    Auth     │  │   Monitor   │  │   Check     │  │   Audit    │  │    │
│  │  │    Data     │  │    Data     │  │    Data     │  │    Logs    │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  │                                                                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │   SLO/      │  │   Alert     │  │   Local     │  │   Team/    │  │    │
│  │  │    SLA      │  │   History   │  │    RCA      │  │   RBAC     │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    EXTERNAL SERVICES                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │    │
│  │  │   Discord   │  │    Slack    │  │   Email     │                  │    │
│  │  │   Webhooks  │  │   Webhooks  │  │   (SMTP)    │                  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │    │
│  │                                                                      │    │
│  │  Note: No OpenAI or external AI services required                   │    │
│  │  All analysis is performed locally using statistical algorithms     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Global Edge Monitoring System

**Purpose:** Execute health checks from multiple global regions for accurate quorum-based uptime detection.

**Architecture:**
- **Edge Functions:** Deployed to Vercel Edge Network (US-East, EU-West, APAC)
- **Check Execution:** HTTP/HTTPS checks with configurable intervals (30s to 5min)
- **Metrics Captured:**
  - Response time (TTFB, total)
  - Status code
  - SSL certificate validity
  - Response body hash/match
  - DNS resolution time
  - TCP connection time
- **Quorum Logic:**
  - Downtime confirmed when ≥2 regions report failure
  - Degraded when 1 region fails
  - False-positive suppression via retry logic

### 2. DDoS & Network Anomaly Detection

**Purpose:** Identify attacks and network degradation before they cause total outages.

**Detection Signals:**
- **Latency Spike Detection:** Z-score > 3 across regions
- **Packet Loss Indicators:**
  - TCP handshake failure rate > threshold
  - Intermittent timeout patterns
  - High retry variance
- **DDoS Heuristics:**
  - Request rate anomalies
  - Response code flooding (429, 5xx)
  - Regional saturation correlation
- **Classification:**
  - `NETWORK_DEGRADATION` - Gradual performance decline
  - `PACKET_LOSS` - Intermittent connectivity issues
  - `POSSIBLE_DDOS` - Attack pattern detected

### 3. Local Root Cause Analysis (RCA) - 100% FREE

**Purpose:** Automatically explain incidents using local statistical analysis - no external AI costs.

**Key Benefits:**
- ✅ **Zero Cost**: No OpenAI API or external AI service fees
- ✅ **Privacy**: Data never leaves your infrastructure
- ✅ **Speed**: No network latency, results in < 1 second
- ✅ **Consistency**: Deterministic algorithms, same results every time
- ✅ **Reliability**: No dependency on external service availability

**Data Aggregation:**
- Regional failure patterns
- Latency distributions (p50, p95, p99)
- Historical baselines
- Packet loss indicators
- Network event correlation
- Error message categorization
- Status code analysis

**Local Analysis Pipeline:**
1. **Pattern Recognition**: Analyze error types, status codes, latency trends
2. **Rule-Based Classification**: 
   - SSL_ERROR (certificate issues)
   - DNS_FAILURE (resolution problems)
   - TIMEOUT (resource exhaustion)
   - SERVER_ERROR (5xx application failures)
   - NETWORK_DEGRADATION (latency spikes)
   - REGIONAL_ISSUE (single region)
   - COMPLETE_OUTAGE (global failure)
3. **Confidence Scoring**: Weighted evidence-based scoring (40-95%)
4. **Recommendation Generation**: Category-specific remediation steps

**Output:**
- Human-readable root cause explanation
- Failure category classification
- Evidence-backed reasoning
- Actionable recommendations
- Confidence score (0-100%)

### 4. Alerting System

**Purpose:** Multi-channel notifications with rich context.

**Channels:**
- Generic Webhooks (signed payloads)
- Discord (rich embeds with charts)
- Slack (block kit formatting)

**Alert Types:**
- Downtime detected
- Service recovered
- Anomaly detected
- DDoS suspicion
- SLO breach
- Error budget depletion

**Features:**
- Retry with exponential backoff
- Alert grouping (no spam)
- Customizable templates
- Conditional rules

### 5. SLO/SLA Tracking

**Purpose:** Measure and alert on service level objectives.

**SLO Types:**
- Availability (uptime percentage)
- Latency (p95, p99 thresholds)
- Error rate (percentage of failed requests)

**Windows:**
- Rolling 7d, 30d, 90d
- Calendar month/quarter

**Error Budget:**
- Burn rate calculation
- Breach prediction
- Alert when 50%, 90%, 100% consumed

### 6. Dashboard System

**Purpose:** Grafana-grade customizable dashboards.

**Features:**
- Grid-based drag-and-drop layout
- Multiple panel types:
  - Time-series charts (latency, errors)
  - Heatmaps (regional health)
  - Gauges (SLO compliance)
  - Stat panels (single metrics)
  - Log streams
- Time range selector
- Shareable links
- Preset templates

### 7. RBAC & Team Management

**Purpose:** Multi-tenant access control.

**Roles:**
- **Owner:** Full access, team deletion
- **Admin:** Manage monitors, alerts, members
- **Member:** Create/edit own monitors, view all
- **Viewer:** Read-only access

**Implementation:**
- Middleware-based permission checking
- Resource-level access control
- Audit logging for all actions

## Data Flow

### Monitor Check Flow

```
1. Cron triggers check schedule (Vercel Cron)
2. Scheduler identifies monitors due for check
3. Edge function invoked in each region
4. Each edge function:
   - Executes HTTP request to target
   - Records metrics (latency, status, etc.)
   - Returns results to central collector
5. Collector aggregates results
6. Quorum logic determines final status
7. If status change detected:
   - Create/update incident
   - Trigger anomaly detection
   - Queue alert dispatch
   - Generate Local RCA (statistical analysis, no AI API)
8. Store check results (time-series optimized)
```

### Local RCA Generation Flow (100% Free)

```
1. Incident created/updated with significant change
2. Local RCA service collects context:
   - Last 24h of check data
   - Regional failure patterns
   - Historical baseline comparison
   - Related network events
3. Analyze patterns locally:
   - Error message categorization (SSL, DNS, Timeout, etc.)
   - Status code distribution analysis
   - Latency trend calculation (Z-score, percentiles)
   - Regional impact assessment
4. Apply rule-based classification:
   - Match patterns to known failure types
   - Calculate confidence based on evidence strength
5. Generate structured output:
   - Human-readable summary
   - Identified root cause
   - Step-by-step reasoning
   - Actionable recommendations
6. Store RCA with confidence level (no external API calls)
7. Update incident with RCA reference
8. Send RCA-complete notification (if configured)
```

### Alert Dispatch Flow

```
1. Event triggers (downtime, recovery, anomaly, SLO breach)
2. Load alert configurations for monitor/project
3. For each configured channel:
   - Build payload with context
   - Add signature for verification
   - Attempt delivery with timeout
   - On failure: retry with backoff (max 3)
   - Log delivery attempt
4. Store alert history
5. Update alert metrics (for analytics)
```

## Database Design Philosophy

### Time-Series Optimization

- **Check Data:** Partitioned conceptually by monitor_id + time
- **Aggregation:** Pre-computed rollups (hourly, daily)
- **Retention:** Configurable per project (default 90 days for raw, 1 year for aggregated)
- **Indexing:** 
  - monitor_id + checked_at (composite)
  - status (for filtering)
  - region (for regional queries)

### Multi-Tenancy

- **Row-level security:** team_id on all resources
- **Soft deletes:** deleted_at timestamp (NULL = active)
- **Audit logging:** Separate table with immutable records

### Performance

- **Connection pooling:** Neon + Prisma connection pool
- **Query optimization:** Indexed FKs, selective columns
- **Caching:** Redis for hot data (status page, recent checks)

## Security Architecture

### Authentication

- **Method:** Email/password with bcrypt hashing
- **Session:** JWT with httpOnly cookies
- **CSRF:** Double-submit cookie pattern
- **Rate Limiting:** Per-IP and per-user limits

### Authorization

- **RBAC Middleware:** Intercepts all protected routes
- **Resource Guards:** Verify team membership and role
- **API Keys:** Scoped to project/team with granular permissions

### Data Protection

- **Encryption at rest:** Neon handles this
- **Encryption in transit:** TLS 1.3
- **Secrets:** Vercel environment variables only
- **PII:** Minimal collection, no exposure in logs

## Scalability Considerations

### Edge Function Optimization

- **Cold start:** Minimize dependencies, use dynamic imports
- **Memory:** Keep under 128MB for fastest startup
- **Execution time:** Checks must complete in <10s
- **Retry logic:** Exponential backoff for target failures

### Database Scaling

- **Read replicas:** For analytics queries
- **Connection pooling:** Essential for serverless
- **Query optimization:** Avoid N+1, use select
- **Caching layer:** Redis for frequently accessed data

### Cron Scheduling

- **Batching:** Group checks by interval to reduce invocations
- **Jitter:** Add random delay to prevent thundering herd
- **Concurrency:** Limit concurrent checks per region

## Technology Decisions

### Why Next.js App Router?

- **Server Components:** Reduced client JS, better SEO
- **Server Actions:** Type-safe API without separate endpoints
- **Edge Runtime:** Global low-latency execution
- **Vercel Integration:** Native cron, analytics, deployment

### Why Neon PostgreSQL?

- **Serverless:** Auto-scaling with serverless apps
- **Connection pooling:** Built-in, essential for edge
- **Branching:** Easy staging environments
- **Time-series:** Good performance with proper indexing

### Why Prisma?

- **Type safety:** Generated types from schema
- **Migrations:** Version-controlled schema changes
- **Query optimization:** Efficient SQL generation
- **Ecosystem:** Best-in-class ORM for TypeScript

### Why Local RCA (No OpenAI)?

- **Cost:** $0 vs $0.01-0.10 per analysis with OpenAI
- **Speed:** <1s vs 2-5s with API call
- **Privacy:** Data stays local vs sent to external API
- **Reliability:** No dependency on external service uptime
- **Consistency:** Deterministic results vs variable LLM output

**Trade-offs:**
- Less "creative" analysis than LLMs
- More structured, rule-based output
- Perfect for technical root cause identification

### Why Recharts + Custom SVG?

- **Recharts:** Quick standard charts (line, bar, area)
- **Custom SVG:** Specialized visualizations (heatmaps, gauges)
- **Performance:** Canvas fallback for high-density data
- **Animation:** Framer Motion integration

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Production    │  │     Staging     │  │    Preview      │  │
│  │   (main)        │  │    (develop)    │  │   (PR branches) │  │
│  │                 │  │                 │  │                 │  │
│  │ • Edge Functions│  │ • Edge Functions│  │ • Edge Functions│  │
│  │ • Cron Jobs     │  │ • Cron Jobs     │  │ • (manual only) │  │
│  │ • Static Assets │  │ • Static Assets │  │ • Static Assets │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NEON                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Production    │  │     Staging     │  │    Preview      │  │
│  │    Database     │  │    Database     │  │    Database     │  │
│  │                 │  │                 │  │   (ephemeral)   │  │
│  │ • Main branch   │  │ • Staging       │  │                 │  │
│  │ • Auto-scale    │  │   branch        │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Monitoring the Monitor

LimeLink monitors itself:

- **Self-check monitor:** Verifies core functionality every minute
- **Health endpoint:** `/api/health` for external monitoring
- **Error tracking:** Sentry integration (optional)
- **Performance:** Vercel Analytics
- **Database:** Neon metrics dashboard

## Cost Analysis (100% Free)

### Infrastructure Costs (Free Tiers)
- **Vercel:** 100 GB bandwidth, 125k function invocations/day
- **Neon:** 500 MB storage, 190 compute hours/month
- **Local RCA:** $0 (no API costs)

**Total: $0/month**

### Comparison

| Platform | Monitors | RCA | Cost |
|----------|----------|-----|------|
| LimeLink | Unlimited | Free Local | $0 |
| UptimeRobot | 50 (free tier) | Paid plans | $7-54/mo |
| Datadog | Per host | Paid | $15+/mo |
| BetterUptime | 10 (free tier) | Paid | $20+/mo |

## Future Enhancements

- **Synthetic monitoring:** Browser-based checks (Playwright)
- **Log aggregation:** Ingest and analyze application logs
- **APM integration:** Connect to OpenTelemetry traces
- **Custom metrics:** User-defined metrics and dashboards
- **Multi-cloud:** AWS Lambda, Cloudflare Workers for checks
