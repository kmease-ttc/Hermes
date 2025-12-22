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