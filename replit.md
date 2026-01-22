# Hermes - SEO Orchestrator

## Overview
Hermes is a production-ready, multi-site SEO monitoring and diagnosis platform. It automates data collection from various sources (GA4, Search Console, Google Ads, SERP tracking), performs statistical analysis to detect anomalies, generates root cause hypotheses, and creates actionable tickets for SEO, Dev, and Ads teams. Its core purpose is to provide comprehensive, automated SEO diagnostics and actionable insights across multiple websites, streamlining SEO management, improving site health, and boosting organic performance through proactive identification and resolution of issues.

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

### Authentication System
Email/password authentication with PostgreSQL session store, using PBKDF2 for password hashing. Cookies are HttpOnly, SameSite=lax, secure in production, with a 30-day expiry.

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Migrations**: Drizzle Kit

### Data Connectors
Modular connectors integrate with various data sources: GA4, Google Search Console, Google Ads, and custom Website Checker for HTTP-based health checks.

### Analysis Engine
Detects data drops using 7-day rolling averages and z-scores, generating ranked root cause hypotheses (e.g., Tracking, Server Errors, Indexing) with multi-source diagnostic context. Creates actionable tickets for SEO/Dev/Ads teams.

### Mission Execution System (Tasks)
A unified pipeline across 12 "crews" with defined impact, effort, autoFixable flags, and cooldowns. User-facing terminology uses "tasks" (internal APIs still reference "missions").

### Unified Crew Lineage System
All crew identity, theming, integrations, and scores are derived from a single canonical source, ensuring consistent scoring and status across the platform. Scores (0-100 health rating) and Tasks (open task count) are distinct concepts, clearly separated in data and UI presentation.

### Dashboard (Rebuilt Jan 2026)
The primary dashboard with report-style light theme answering user intents: rankings, movement, and next actions.

**Concept Renames:**
- Mission Control → Dashboard
- Crew → Agents

**Structure (7 sections):**
1. **Header**: SEO Performance Overview with Weekly Report badge and 4 KPI stat cards
2. **Ranking Momentum**: Improving / Needs Attention columns (7-day change)
3. **What To Do Next**: 4 prescriptive steps with Active/Locked states and unlock CTAs
4. **Pages to Optimize**: Action recommendations per page with keyword context
5. **Top Performers**: Green-tinted success section with protection advisory
6. **Agents**: Locked/unlockable capability cards (Technical SEO, Analytics, Content, Automation)
7. **How It Works**: Footer explaining the 4-step workflow

**Light Theme:**
- Uses `.dashboard-light` CSS class with inverted colors
- AppShell accepts `lightMode` prop for sidebar theming
- Body background overridden via `body:has(.dashboard-light)`

### Gold Standard Worker Blueprint
All microservice workers adhere to a blueprint defining required endpoints (`/health`, `/smoke-test`, `/capabilities`, `/run`), a standard JSON response shape, API key authentication, and `X-Request-Id` correlation.

### Worker Validation Harness
Automated validation infrastructure uses Zod schemas to test worker responses against health, smoke-test, and capabilities endpoints, generating detailed reports.

### Free Report v1 System
A shareable, read-only SEO diagnosis report generated from website scans, stored in a `free_reports` table. It uses a deterministic penalty-based scoring algorithm and transformers to compose 6 sections of the report.

**Visibility Modes (Jan 2026)**:
- **Full Visibility**: Crawl succeeded, all sections (Technical, Performance, Competitors, Keywords) display full data
- **Limited Visibility**: Crawl blocked/failed - shows LimitedVisibilityBanner with reason and recommended steps, hides Technical section
- Fields: `visibilityMode`, `limitedVisibilityReason`, `limitedVisibilitySteps[]`

### Change Governance System
A platform-wide governance layer that logs, validates, and batches all SEO changes. It uses a Change Log SDK, KB Validator, Cadence Checker, and Deploy Windows to manage the lifecycle of changes, from proposal to execution, with pre/post metrics capture.

### Internal API (Hermes ↔ SERP Worker)
Bidirectional communication between Hermes and external SERP Worker service.

**Authentication**:
- Header: `X-ARCLO-API-KEY`
- Validates against: `process.env.SEO_SCHEDULER_API_KEY`

**Endpoints**:
- `GET /api/internal/site/state?domain=` - Site configuration and scan state
- `GET /api/internal/site/authority?domain=` - Authority data with licensing check
- `GET /api/internal/site/recommendations?domain=&week=` - Page-specific recommendations
- `GET /api/internal/completed?domain=` - Completed work fingerprints
- `POST /api/internal/report` - Store report callback from Worker

**Recommendations Endpoint**:
Returns page-specific, varied, copy/paste-ready actions with deterministic variation per week. Implements:
- FAQ variance: 0→5-7, 1-3→3-5, 4-6→2-4, ≥7→no add
- Content variance: <450→600-900w, 450-900→250-500w, 900-1500→150-300w
- Link variance: 0→6-10, 1-2→4-6, 3-5→2-4, ≥6→no add
- Title changes only when issues exist (too long, missing city)
- Fingerprint suppression via `completed_work` table

**Limitation**: serp_keywords table lacks siteId; recommendations only use full-URL keywords to ensure domain safety.

## External Dependencies

### Google APIs
- **Google Analytics Data API v1beta**
- **Google Search Console API v1**
- **Google Ads API**

### Database
- **PostgreSQL**: Primary data store.

### Bitwarden Secrets Manager
Used for secure credential storage via `@bitwarden/sdk-napi`.

### Required Environment Variables
- `DOMAIN`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GA4_PROPERTY_ID`, `GSC_SITE`, `ADS_CUSTOMER_ID`
- `DATABASE_URL`
- `BWS_ACCESS_TOKEN`, `BWS_PROJECT_ID`, `BWS_ORGANIZATION_ID`

### Stale-While-Revalidate (SWR) Caching
Implements client-side caching with persistence using `@tanstack/react-query` and `@tanstack/query-sync-storage-persister` to prevent blank states during navigation and improve perceived performance.

### Key NPM Packages
- `googleapis`
- `drizzle-orm`, `pg`
- `node-cron`
- `express`
- `@tanstack/react-query`
- `recharts`