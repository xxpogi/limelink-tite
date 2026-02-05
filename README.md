# LimeLink - Production-Grade Observability Platform

LimeLink is a comprehensive website uptime and observability platform that monitors websites and APIs globally, detects outages and anomalies, and provides local root cause analysis - 100% free with no external AI costs.

## Features

### Core Monitoring
- **Global Edge-Based Checks**: Run checks from North America, Europe, and Asia-Pacific
- **Multi-Region Monitoring**: Independent per-region latency and status
- **Quorum-Based Detection**: False-positive suppression through consensus
- **SSL Certificate Monitoring**: Automatic expiration alerts

### DDoS & Anomaly Detection
- **Latency Spike Detection**: Z-score based anomaly detection
- **Error Rate Analysis**: Flood detection and threshold monitoring
- **Regional Saturation Detection**: Identify distributed attacks
- **Confidence Scoring**: Evidence-based DDoS classification

### Local Root Cause Analysis (100% Free)
- **Statistical Pattern Analysis**: Rule-based incident classification
- **Evidence-Based Reasoning**: No hallucinations, only real metrics
- **Actionable Recommendations**: Step-by-step remediation guidance
- **Historical Baseline Comparison**: Context-aware analysis
- **No External AI Required**: Completely free, no API costs

### Alerting System
- **Multi-Channel Support**: Webhooks, Discord, Slack, Email
- **Rich Embeds**: Charts and summaries in notifications
- **Signed Payloads**: Secure webhook verification
- **Smart Rate Limiting**: Prevent alert fatigue

### SLO/SLA Tracking
- **Custom SLO Definitions**: Availability, latency, error rate
- **Error Budget Tracking**: Burn rate calculation and prediction
- **Fast Burn Alerts**: Detect rapid budget depletion
- **Rolling Windows**: 7d, 30d, 90d time windows

### Grafana-Style Dashboards
- **Drag-and-Drop Layout**: Customizable grid-based panels
- **Multiple Panel Types**: Time-series, heatmaps, gauges, stats
- **Time Range Selector**: 15m to 30d time ranges
- **Preset Templates**: Quick-start dashboard configurations

### Team Management
- **RBAC System**: Owner, Admin, Member, Viewer roles
- **Project-Based Organization**: Separate workspaces per team
- **Audit Logging**: Track all actions for compliance
- **Invite System**: Email-based team invitations

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: Tailwind CSS + CSS Variables
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Statistics**: Simple Statistics (local library)
- **Deployment**: Vercel (Edge + Cron)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd limelink
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

4. Run database migrations
```bash
npx prisma migrate dev
```

5. Generate Prisma client
```bash
npx prisma generate
```

6. Start the development server
```bash
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `CRON_SECRET` | Secret for cron job auth | For production |
| `WEBHOOK_SECRET` | Secret for webhook signing | Optional |

**Note**: No OpenAI API key or any external AI service required. All analysis is performed locally using statistical algorithms.

## Architecture

### Data Flow

```
1. Vercel Cron triggers check schedule (every minute)
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
   - Generate Local RCA (statistical analysis, no external API)
8. Store check results (time-series optimized)
```

### RCA (Root Cause Analysis) - 100% Local

Unlike other platforms that require expensive AI APIs, LimeLink uses local statistical analysis:

```
1. Collect metrics (30 min before, during incident, 7-day baseline)
2. Analyze patterns:
   - Error type classification (SSL, DNS, Timeout, 5xx, etc.)
   - Latency trend analysis
   - Regional impact assessment
   - Status code distribution
3. Apply rule-based classification:
   - SSL_ERROR: Certificate issues
   - DNS_FAILURE: Resolution problems
   - TIMEOUT: Connection/resource issues
   - SERVER_ERROR: Application failures (502, 503, 504)
   - NETWORK_DEGRADATION: Latency spikes
   - REGIONAL_ISSUE: Single region affected
   - COMPLETE_OUTAGE: All regions down
4. Generate human-readable explanation
5. Provide actionable recommendations
```

### Database Design

The schema uses **soft deletes** (`deletedAt` timestamp) for all entities to maintain referential integrity and audit trails. **Time-series data** is optimized with:
- Composite indexes on `(monitorId, checkedAt)` for efficient queries
- Hourly aggregation table for fast analytics
- Separate `MonitorCheckHourly` table for pre-computed rollups

### Multi-Tenancy
- **Row-level security** through `team_id` on all resources
- **Project-based isolation** within teams
- **RBAC middleware** enforces permissions at the route level

## API Endpoints

### Health Check
```
GET /api/health
```

### Edge Check (Internal)
```
POST /api/check
```

### Cron Job (Internal)
```
GET /api/cron/checks
Authorization: Bearer <CRON_SECRET>
```

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Cron Configuration

The `vercel.json` file configures the cron job to run every minute:

```json
{
  "crons": [
    {
      "path": "/api/cron/checks",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

### Database Setup (Neon)

1. Create a Neon project
2. Copy the connection string
3. Add to environment variables

## Development

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name <migration-name>

# Deploy to production
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Prettier for formatting

## Monitoring & Observability

LimeLink monitors itself:
- Health endpoint at `/api/health`
- Self-check monitor validates core functionality
- Database connectivity checks

## License

MIT License - See LICENSE file

## Roadmap

- [ ] Synthetic monitoring with Playwright
- [ ] Log aggregation
- [ ] OpenTelemetry integration
- [ ] Custom metrics
- [ ] Multi-cloud check execution

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Why LimeLink?

**100% Free** - No hidden costs:
- ✅ No OpenAI API costs (local statistical analysis)
- ✅ No per-check fees
- ✅ No per-alert charges
- ✅ No user seat limits
- ✅ No feature restrictions

Compare to alternatives:
- UptimeRobot: Limited free tier, paid plans for advanced features
- Datadog: Expensive per-host pricing
- PagerDuty: Per-user pricing adds up quickly
- BetterUptime: Free tier has significant limits

LimeLink provides enterprise-grade observability without enterprise-grade pricing.
