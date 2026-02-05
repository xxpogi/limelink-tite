# LimeLink Implementation Guide

## System Overview

LimeLink is a production-grade observability platform built with a modern, scalable architecture. This guide explains the key implementation decisions and how the system works.

## Architecture Decisions

### Why Next.js App Router?
- **Server Components** reduce client-side JavaScript and improve SEO
- **Server Actions** provide type-safe API endpoints without separate route handlers
- **Edge Runtime** enables global low-latency execution for checks
- **Vercel Integration** provides native cron jobs, analytics, and seamless deployment

### Database Design

The schema uses **soft deletes** (`deletedAt` timestamp) for all entities to maintain referential integrity and audit trails. **Time-series data** is optimized with:
- Composite indexes on `(monitorId, checkedAt)` for efficient queries
- Hourly aggregation table for fast analytics
- Separate `MonitorCheckHourly` table for pre-computed rollups

### Multi-Tenancy
- **Row-level security** through `team_id` on all resources
- **Project-based isolation** within teams
- **RBAC middleware** enforces permissions at the route level

### Local RCA (100% Free - No External AI)

Unlike platforms that require expensive OpenAI API calls, LimeLink uses **local statistical analysis** for root cause analysis:

**Benefits:**
- ✅ Zero API costs
- ✅ No external dependencies
- ✅ Faster processing (no network latency)
- ✅ Privacy (data never leaves your infrastructure)
- ✅ Consistent results (deterministic algorithms)

**How it works:**
1. Collect metrics (pre-incident, during, baseline)
2. Analyze error patterns and status codes
3. Apply rule-based classification
4. Generate human-readable explanation
5. Provide actionable recommendations

## Core Services

### 1. Monitoring Service (`src/services/monitoring.ts`)

**Key Functions:**
- `executeCheck()` - Performs HTTP/HTTPS health checks from edge regions
- `aggregateCheckResults()` - Implements quorum-based status determination
- `getMonitorsDueForCheck()` - Finds monitors ready for their next check

**Quorum Logic:**
```
UP: ≥50% regions report success AND ≤1 region down
DOWN: ≥2 regions fail OR ≥50% regions fail
DEGRADED: 1 region fails OR some regions degraded
```

### 2. DDoS Detection Service (`src/services/ddos-detection.ts`)

**Three-Pronged Detection:**
1. **Latency Spike Detection**: Z-score > 3 indicates anomaly
2. **Error Flood Detection**: >50% error rate or 10x baseline
3. **Regional Saturation**: 75%+ regions affected

**Confidence Calculation:**
- Latency anomaly: 30% weight
- Error flood: 40% weight
- Regional saturation: 30% weight
- Threshold: 70% confidence for DDoS classification

### 3. Local RCA Service (`src/services/rca.ts`)

**100% Free Local Analysis - No External AI Required**

**Analysis Pipeline:**
1. **Data Collection**: Gather 30min pre-incident, during-incident, and 7-day baseline metrics
2. **Pattern Recognition**:
   - SSL errors (certificate issues)
   - DNS failures (resolution problems)
   - Timeouts (resource exhaustion)
   - 5xx errors (application failures)
   - Latency spikes (network degradation)
   - Regional patterns (single vs global)

3. **Rule-Based Classification:**
   | Pattern | Category | Confidence |
  |---------|----------|------------|
   | SSL/Certificate errors | SSL_ERROR | 85% |
   | DNS resolution failures | DNS_FAILURE | 90% |
   | Connection timeouts | TIMEOUT | 80% |
   | HTTP 5xx status codes | SERVER_ERROR | 85% |
   | >300% latency increase | NETWORK_DEGRADATION | 70% |
   | Single region affected | REGIONAL_ISSUE | 65% |
   | All regions down | COMPLETE_OUTAGE | 90% |

4. **Recommendation Generation**: Based on category, provide specific remediation steps

**Example Output:**
```
Summary: API Server experienced a server_error starting at 2024-01-15T10:30:00Z. 
         Server error (503) indicating application-level failure. 
         This affected 3 region(s).

Root Cause: Service Unavailable - server is overloaded or in maintenance

Category: SERVER_ERROR
Confidence: 85%

Evidence:
- HTTP 503 errors across 3 regions
- 95.2% error rate during incident
- Error rate spiked from 0.01% to 95.2%

Reasoning: 
Analysis of 3 monitoring regions shows 3 regions affected. 
Error rate spiked from 0.01% to 95.2%, indicating a sudden failure. 
Most common HTTP status code: 503 (observed 45 times).

Recommendations:
- Check if server is under maintenance
- Scale up resources to handle load
- Review application error logs
```

### 4. Alerting Service (`src/services/alerts.ts`)

**Channel Support:**
- **Webhooks**: Generic with HMAC signature verification
- **Discord**: Rich embeds with color-coded severity
- **Slack**: Block Kit formatting with action buttons
- **Email**: SMTP integration placeholder

**Smart Features:**
- Cooldown periods prevent alert spam
- Severity filtering per channel
- Retry with exponential backoff
- Delivery tracking and audit trail

### 5. SLO Service (`src/services/slo.ts`)

**Supported Metrics:**
- Availability: Percentage of successful checks
- Latency P95/P99: Percentile response times
- Error Rate: Percentage of failed requests

**Error Budget Calculation:**
```
Availability: budget = 100% - target
Latency: budget = target (lower is better)
Error Rate: budget = target (lower is better)
Burn Rate = budget used / budget total * 100
```

**Fast Burn Detection:**
- Triggers when 2% of budget consumed in 1 hour
- Early warning for rapid degradation

## Data Flow

### Check Execution Flow
```
1. Vercel Cron (1 min) → GET /api/cron/checks
2. Find monitors due for check
3. For each monitor:
   a. Execute checks in parallel (US, EU, APAC)
   b. Store individual results
   c. Aggregate with quorum logic
   d. Update monitor status
   e. Check for incidents
   f. If DOWN: classify, create incident, check DDoS, alert
   g. If UP (was DOWN): resolve incident, alert recovery
4. Queue Local RCA generation (async, no external API)
```

### Local RCA Generation Flow (100% Free)
```
1. Incident created/updated with significant change
2. Collect context:
   - Pre-incident metrics (30 min before)
   - During-incident metrics
   - Historical baseline (7 days)
   - Related network events
3. Analyze patterns locally:
   - Error message categorization
   - Status code analysis
   - Latency trend calculation
   - Regional impact assessment
4. Apply rule-based classification
5. Generate human-readable explanation
6. Create actionable recommendations
7. Store RCA report (no external API calls)
```

### Incident Detection Flow
```
1. Check results aggregated from all regions
2. Apply quorum logic to determine status
3. If DOWN detected:
   - Classify based on error type, status code, region impact
   - Determine severity (Critical/Major/Minor/Warning)
   - Create incident record
   - Store network events
   - Dispatch alerts
   - Queue Local RCA (free, no AI API)
```

## Edge Functions

### Check Endpoint (`src/app/api/check/route.ts`)

**Runtime**: Edge (Vercel Edge Network)
**Purpose**: Execute HTTP/HTTPS checks from specific regions

**Key Features:**
- AbortController for timeout handling
- SSL certificate validation
- Content matching
- Detailed timing breakdown (DNS, TCP, TLS, TTFB)

### Cron Endpoint (`src/app/api/cron/checks/route.ts`)

**Runtime**: Node.js (Serverless)
**Purpose**: Orchestrate monitor checks and incident management

**Security:**
- Authorization header verification
- Cron secret required

## Database Indexing Strategy

### Time-Series Queries
```sql
-- For monitor detail charts
CREATE INDEX idx_monitor_checks_monitor_time 
ON monitor_checks(monitor_id, checked_at);

-- For regional analysis
CREATE INDEX idx_monitor_checks_monitor_region_time 
ON monitor_checks(monitor_id, region, checked_at);

-- For status-based filtering
CREATE INDEX idx_monitor_checks_status 
ON monitor_checks(status);
```

### Lookup Queries
```sql
-- For incident lookups
CREATE INDEX idx_incidents_monitor_status 
ON incidents(monitor_id, status);

-- For alert history
CREATE INDEX idx_alert_history_config_created 
ON alert_history(alert_config_id, created_at);
```

## Performance Optimizations

### Database
- Connection pooling with Prisma (Neon-compatible)
- Selective column queries to reduce data transfer
- Hourly aggregation for dashboard queries
- Soft deletes with partial indexes

### Edge Functions
- Minimal dependencies for fast cold starts
- Dynamic imports for heavy libraries
- 30-second timeout for long checks
- Parallel execution across regions

### Frontend
- Server Components for initial data fetch
- Incremental Static Regeneration for status pages
- Skeleton loaders instead of spinners
- Framer Motion for smooth transitions

### Local RCA (No External API)
- No network latency (local computation)
- No rate limits or quotas
- No API costs
- Deterministic results
- Faster processing (< 1 second)

## Security Considerations

### Authentication
- bcrypt for password hashing (12 rounds)
- JWT with httpOnly cookies
- CSRF protection via double-submit cookie

### Authorization
- Middleware-based RBAC enforcement
- Resource-level permission checking
- API key scoped access

### Data Protection
- Environment variables for secrets
- No PII in logs
- Signed webhook payloads (HMAC)
- TLS 1.3 for all connections

## Cost Analysis (100% Free)

### What's Free
- ✅ Unlimited monitors
- ✅ Unlimited checks
- ✅ Unlimited team members
- ✅ Unlimited alerts
- ✅ Local RCA (no AI API costs)
- ✅ All features (no paywalls)

### Required Costs (Infrastructure)
- PostgreSQL database (Neon free tier: 500 MB, 190 compute hours/month)
- Vercel hosting (free tier: 100 GB bandwidth, 125k function invocations/day)

**Total Cost: $0/month** (within free tiers)

### Comparison with Alternatives

| Feature | LimeLink | UptimeRobot | Datadog | BetterUptime |
|---------|----------|-------------|---------|--------------|
| Monitors | Unlimited | 50 (free) | $15/host | 10 (free) |
| RCA | ✅ Free Local | ❌ Paid | ✅ Paid | ✅ Paid |
| Team Members | Unlimited | 1 (free) | $$$ | 3 (free) |
| Alert Channels | Unlimited | Limited | ✅ | Limited |
| API Costs | $0 | $0 | $0 | $0 |
| Total Cost | **$0** | $7-54/mo | $15+/mo | $20+/mo |

## Deployment Checklist

### Pre-Deployment
- [ ] Set up Neon PostgreSQL database
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Set up Vercel project
- [ ] Configure cron job secret

### Post-Deployment
- [ ] Verify health endpoint responds
- [ ] Create first team and project
- [ ] Add test monitor
- [ ] Verify checks are executing
- [ ] Test alert channels
- [ ] Verify Local RCA generation (no API key needed)

### Monitoring
- [ ] Set up self-monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Set up database monitoring
- [ ] Configure log aggregation

## Troubleshooting

### Common Issues

**Checks not executing:**
- Verify CRON_SECRET is set
- Check Vercel Cron logs
- Verify monitors are ACTIVE status

**RCA not generating:**
- No API key needed (Local RCA)
- Check incident has sufficient data
- Review server logs for errors

**Alerts not sending:**
- Verify alert config isActive
- Check cooldown periods
- Review alert history for errors

**Database connection errors:**
- Verify DATABASE_URL format
- Check Neon connection limits
- Ensure pooling is configured

## Next Steps

1. **Install dependencies**: `npm install`
2. **Set up environment**: Copy `.env.example` to `.env.local`
3. **Run migrations**: `npx prisma migrate dev`
4. **Start development**: `npm run dev`
5. **Deploy to Vercel**: Connect GitHub repo and deploy

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in Vercel dashboard
3. Inspect database with Prisma Studio
4. Review RCA analysis in incident details

## Key Difference: Local RCA

The main differentiator from other platforms is the **100% free Local RCA**:

- **No OpenAI API Key Required**
- **No Per-Analysis Costs**
- **No Rate Limits**
- **Privacy-Preserving** (data never leaves your infrastructure)
- **Deterministic Results** (same input = same output)

The trade-off:
- Less "creative" analysis than LLMs
- More structured, rule-based output
- Perfect for technical root cause identification

For most infrastructure monitoring use cases, Local RCA provides faster, cheaper, and more consistent results than LLM-based approaches.
