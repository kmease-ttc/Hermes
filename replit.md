# Hermes - SEO Orchestrator

## Overview
Hermes is a production-ready, multi-site SEO monitoring and diagnosis platform. It automates data collection from various sources (GA4, Search Console, Google Ads, SERP tracking), performs statistical analysis to detect anomalies, generates root cause hypotheses, and creates actionable tickets for SEO, Dev, and Ads teams. Its core purpose is to provide comprehensive, automated SEO diagnostics and actionable insights across multiple websites, previously proven effective for empathyhealthclinic.com, and now capable of orchestrating full SEO operations for diverse clients. The platform aims to streamline SEO management, improve site health, and boost organic performance through proactive identification and resolution of issues.

Key capabilities include:
- Multi-Site Registry for comprehensive site configuration and management.
- Daily automated diagnostics and on-demand analysis.
- Multi-source data collection from Google APIs and website health checks.
- Smart drop detection using statistical analysis.
- Automated, prioritized ticket generation for various teams.

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

### Overlay Surface Design (CRITICAL)
All overlay/pullout UI must use opaque surfaces for readability:
- **CSS Variable**: `--color-overlay-surface: rgba(17, 24, 39, 0.95)` (95% opacity dark surface)
- **Affected Components**: Sheet, Dialog, AlertDialog, DropdownMenu, Select, Popover, ContextMenu, Command, HoverCard, Menubar, NavigationMenu
- **Rule**: Background content must NOT be legible through any pullout/overlay panel
- **Usage**: `bg-[var(--color-overlay-surface)] backdrop-blur-md`

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4 with custom clinical theme
- **UI Components**: shadcn/ui built on Radix UI
- **State Management**: TanStack React Query
- **Routing**: Wouter
- **Charts**: Recharts

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **API Pattern**: RESTful endpoints (`/api/*`)
- **Scheduler**: node-cron for daily automated runs
- **Logging**: Custom structured logger

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit

### Data Connectors
Modular connectors integrate with various data sources:
- **GA4 Connector**: Google Analytics Data API (sessions, users, events, conversions, real-time tag health)
- **GSC Connector**: Search Console API (clicks, impressions, CTR, positions, sitemaps, URL inspection)
- **Ads Connector**: Google Ads API (spend, clicks, impressions, campaign status, policy issues)
- **Website Checker**: HTTP-based health checks (robots.txt, sitemap.xml validation, HTTP headers, redirects, canonicals, uptime)
- **Clarity Connector**: Microsoft Clarity (dashboard links for session recordings and heatmaps)

### Analysis Engine
Detects drops using 7-day rolling averages and z-scores, generating ranked root cause hypotheses (e.g., Tracking, Server Errors, Indexing) with multi-source diagnostic context. Creates actionable tickets for SEO/Dev/Ads teams.

### Mission Execution System
A unified pipeline across 12 "crews" (e.g., popular, speedster, scotty) defined in `shared/missions/missionRegistry.ts`. Missions have impact, effort, autoFixable flags, and cooldowns.

### Gold Standard Worker Blueprint
All microservice workers adhere to a blueprint defining required endpoints (`/health`, `/smoke-test`, `/capabilities`, `/run`), a standard JSON response shape, API key authentication (`x-api-key` or `Authorization: Bearer`), `X-Request-Id` correlation, and API key fingerprint diagnostics for verification.

### Worker Validation Harness
Automated validation infrastructure (`server/validation/`) uses Zod schemas to test worker responses against health, smoke-test, and capabilities endpoints. It generates detailed reports with pass/fail status, categorized by service and crew.

### Authentication
Google OAuth 2.0 for API access, with tokens stored in the database. API endpoints require `X-API-Key` or `Authorization: Bearer` headers.

## External Dependencies

### Google APIs
- **Google Analytics Data API v1beta**
- **Google Search Console API v1**
- **Google Ads API**

### Database
- **PostgreSQL**: Primary data store.

### Bitwarden Secrets Manager
Used for secure credential storage via `@bitwarden/sdk-napi`. Supports secret aliasing for flexible naming conventions.

### Required Environment Variables
- `DOMAIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GA4_PROPERTY_ID`, `GSC_SITE`, `ADS_CUSTOMER_ID`
- `DATABASE_URL`
- `BWS_ACCESS_TOKEN`, `BWS_PROJECT_ID`, `BWS_ORGANIZATION_ID`

### NPM Packages (Key Dependencies)
- `googleapis`
- `drizzle-orm`, `pg`
- `node-cron`
- `express`
- `@tanstack/react-query`
- `recharts`