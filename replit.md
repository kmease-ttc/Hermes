# Hermes - SEO Orchestrator

## Overview

Hermes is a production-ready multi-site SEO monitoring and diagnosis platform. Originally built for empathyhealthclinic.com, it now supports multiple sites through a comprehensive site registry system. The system collects data from multiple sources (GA4, Search Console, Google Ads, SERP tracking), performs automated analysis using rolling averages and z-score detection, generates root cause hypotheses, and creates actionable tickets for SEO, Dev, and Ads teams.

Key capabilities:
- **Multi-Site Registry**: Configure and manage multiple websites with full config including tech stack, repo/deploy settings, integrations, and guardrails
- Daily automated diagnostics at 7am America/Chicago timezone
- On-demand analysis via API or dashboard
- Multi-source data collection from Google APIs and website health checks
- SERP tracking with SerpApi integration
- Smart drop detection with statistical analysis
- Automated ticket generation with prioritization

### Sites Registry (NEW)
The platform now supports orchestrating SEO diagnostics across multiple sites:
- Full site configuration (tech stack, repository, deployment method)
- Per-site integration credentials (GA4, GSC, Google Ads, Clarity)
- Crawl settings and guardrails for automated fixes
- Health score tracking and audit logging
- Soft delete for preserving historical data

## User Preferences

Preferred communication style: Simple, everyday language.

### UI Component Preferences
- **BenchmarkPositionBar**: Horizontal gradient bars showing percentile ranges (p25/p50/p75/p90) with white marker dots - use for metric comparisons across the platform
- **Performance Score blocks**: Left-anchored 96px panels with gold ring styling for score displays
- **InlinePrompt**: Embedded mission prompts in header containers with border-top separators
- **CrewDashboardShell**: Standard shell for all crew dashboards with consistent header actions and mission/KPI structures
- **MissionOverviewWidget**: Consolidated mission widget with top-aligned gold score ring (aligned to header, not vertically centered)
- **Missing data states**: Explicit messages showing which API fields are unavailable, with "Run Scan" CTAs

### Liquid Glass Analytics Components (NEW)
Reusable analytics visualization package in `client/src/components/analytics/`:
- **GlassChartContainer**: Shared glass-styled container for all charts (subtle translucency, no heavy shadows)
- **GlassBarChart**: Flat rectangular bars with rounded corners, hover brightness (no 3D effects)
- **GlassLineChart**: Thin smooth lines with circular dots, primary=blue, secondary=purple
- **GlassAreaChart**: Flat filled areas with low opacity (10-20%), crisp top lines
- **GlassDonutChart**: Completely flat top-down 2D only (no bevel, no thickness, no shadows)
- **GlassSparkline**: Minimal sparklines for metric cards (thin line, optional soft fill)
- **GlassMetricCard**: KPI cards with label, value, delta indicator, optional sparkline

Color system: Uses ARCLO semantic colors only (success=green, warning=yellow, danger=red, info=blue, purple=secondary)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for meta images and Replit integration
- **Styling**: TailwindCSS v4 with custom clinical theme (slate/sky colors)
- **UI Components**: shadcn/ui components built on Radix UI primitives
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter (lightweight React router)
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API Pattern**: RESTful endpoints under `/api/*`
- **Scheduler**: node-cron for daily automated runs
- **Logging**: Custom structured logger with module-based categorization

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

### Data Connectors
The system has modular connectors for each data source:
- **GA4 Connector**: Google Analytics Data API
  - Sessions, users, events, conversions by date/channel/landing page/device/geo
  - Realtime tag health check (are events firing?)
  - Channel and landing page performance trends
  - Engagement metrics (bounce rate, session duration)
- **GSC Connector**: Search Console API
  - Clicks, impressions, CTR, positions by query and page
  - Sitemaps list with submission/download timestamps
  - URL inspection for indexing status
- **Ads Connector**: Google Ads API (requires Developer Token)
  - Spend, clicks, impressions, CPC by campaign
  - Campaign status (paused, limited, budget)
  - Policy issues and disapprovals
  - Conversion action tracking status
- **Website Checker**: HTTP-based health checks
  - robots.txt parsing (disallowed paths, sitemap links)
  - Sitemap.xml validation and URL extraction
  - HTTP headers capture (x-robots-tag, cache-control)
  - Redirect chain detection
  - Canonical tag verification
  - Uptime monitoring
- **Clarity Connector**: Microsoft Clarity integration
  - Dashboard links for session recordings and heatmaps
  - Evidence links in reports for user behavior analysis

### Analysis Engine
- Detects drops using 7-day rolling averages
- Calculates z-scores for statistical significance (-2 threshold)
- Multi-source diagnostic context (tag health, sitemaps, page errors)
- Generates ranked root cause hypotheses with confidence levels
- Categories: Tracking, Server Errors, Missing Pages, Indexing, Canonicalization, Paid Traffic
- Creates actionable tickets assigned to SEO/Dev/Ads teams

### Gold Standard Worker Blueprint
All microservice workers must follow the Gold Standard Worker Blueprint (see `docs/worker-blueprint.md`):

**Required Endpoints:**
- `GET /health` - Health check with service metadata
- `GET /smoke-test` - Minimal end-to-end validation
- `GET /capabilities` - Declare supported outputs and inputs
- `POST /run` - Execute a job with payload

**Standard Response Shape:**
```json
{
  "ok": true,
  "service": "<service_slug>",
  "version": "<semver>",
  "schema_version": "2025-12-25",
  "request_id": "<correlation_id>",
  "data": { ... }
}
```

**Key Rules:**
- All `/api/*` routes return JSON only (never HTML)
- Auth via `x-api-key` header (Hermes sends both `x-api-key` and `Authorization: Bearer` for compatibility)
- Hermes sends `X-Request-Id` for correlation
- Bitwarden secrets: `{ "base_url": "https://..../api", "api_key": "..." }`
- Workers echo `request_id` in responses

**API Key Fingerprint Diagnostics:**
- Hermes computes SHA256 fingerprint of api_key (first 6 + last 6 chars, e.g., "9f2c1a…a31b77")
- Workers should expose `expected_key_fingerprint` in `/health` response for key alignment verification
- Fingerprint mismatch triggers `api_key_mismatch` failure bucket with actionable fix suggestion
- Fingerprints are safe to display (never exposes raw keys)

### Authentication
- Google OAuth 2.0 for API access
- Tokens stored in database with refresh capability
- Scopes: Analytics readonly, Webmasters readonly, AdWords

## External Dependencies

### Google APIs
- **Google Analytics Data API v1beta**: GA4 metrics and dimensions
- **Google Search Console API v1**: Search analytics and indexing data
- **Google Ads API**: Campaign performance and policy status

### Database
- **PostgreSQL**: Primary data store (provisioned via Replit)
- Connection via `DATABASE_URL` environment variable

### Bitwarden Secrets Manager
The platform uses Bitwarden Secrets Manager for secure credential storage:
- **SDK**: `@bitwarden/sdk-napi` (official Node.js bindings)
- **API URL**: `https://vault.bitwarden.com/api`
- **Identity URL**: `https://vault.bitwarden.com/identity`
- Secrets are listed by organization ID, not project ID (SDK requirement)
- Machine account must have read access to the project containing secrets

#### Secret Alias Support
The secret-loader supports fallback aliases for flexible naming:
- Each service has a **preferred** secret name (e.g., `SEO_SERP_Keyword`)
- If preferred secret is not found, **alias** names are tried in order (e.g., `SEO_Serp_Keyword`, `seo_serp_keyword`)
- This handles mixed-case keys or legacy naming conventions
- Configure aliases in `shared/serviceSecretMap.ts` via the `aliasSecrets` array
- Logs indicate which secret name was resolved (preferred vs alias)

### Required Environment Variables
```
DOMAIN=empathyhealthclinic.com
GOOGLE_CLIENT_ID=<oauth_client_id>
GOOGLE_CLIENT_SECRET=<oauth_client_secret>
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/callback
GA4_PROPERTY_ID=<property_id>
GSC_SITE=sc-domain:empathyhealthclinic.com
ADS_CUSTOMER_ID=123-456-7890
DATABASE_URL=postgresql://...
BWS_ACCESS_TOKEN=<bitwarden_machine_account_token>
BWS_PROJECT_ID=<bitwarden_project_id>
BWS_ORGANIZATION_ID=<bitwarden_organization_id>
```

### NPM Packages (Key Dependencies)
- `googleapis`: Google API client library
- `drizzle-orm` + `pg`: Database access
- `node-cron`: Scheduled task execution
- `express`: HTTP server
- `@tanstack/react-query`: Frontend data fetching
- `recharts`: Dashboard charts

## Public API Reference

### Authentication
All API endpoints (except `/api/health`) require an API key via:
- Header: `X-API-Key: <your-key>` 
- Header: `Authorization: Bearer <your-key>`

Set `TRAFFIC_DOCTOR_API_KEY` in Replit Secrets.

### Endpoints

#### GET /api/health (Public)
Returns server health status. No authentication required.

```bash
curl https://your-app.replit.app/api/health
```

Response:
```json
{
  "ok": true,
  "version": "1.0.0",
  "env": "production",
  "serverTime": "2024-12-19T12:00:00.000Z",
  "dbConnected": true,
  "lastRunAt": "2024-12-19T07:00:00.000Z",
  "lastRunStatus": "completed"
}
```

#### GET /api/status
Returns detailed source connection status.

```bash
curl -H "X-API-Key: YOUR_KEY" https://your-app.replit.app/api/status
```

#### POST /api/run
Triggers a full diagnostic run with 30-day analysis.

```bash
curl -X POST -H "X-API-Key: YOUR_KEY" https://your-app.replit.app/api/run
```

Response:
```json
{
  "runId": "run_1702987200000_abc12345",
  "startedAt": "2024-12-19T12:00:00.000Z",
  "finishedAt": "2024-12-19T12:00:45.000Z",
  "summary": "Detected 2 traffic anomalies",
  "anomaliesDetected": 2,
  "reportId": 15,
  "ticketCount": 3
}
```

#### POST /api/run/smoke
Quick connectivity test for all data sources.

```bash
curl -X POST -H "X-API-Key: YOUR_KEY" https://your-app.replit.app/api/run/smoke
```

#### GET /api/report/latest
Returns the most recent diagnostic report.

```bash
curl -H "X-API-Key: YOUR_KEY" https://your-app.replit.app/api/report/latest
```

#### GET /api/tickets/latest
Returns recent tickets. Optional `?limit=N` parameter.

```bash
curl -H "X-API-Key: YOUR_KEY" https://your-app.replit.app/api/tickets/latest?limit=5
```