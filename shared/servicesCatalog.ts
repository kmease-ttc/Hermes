export interface ServiceDefinition {
  slug: string;
  displayName: string;
  category: 'data' | 'analysis' | 'execution' | 'infrastructure' | 'platform_dependency';
  descriptionMd: string;
  testMode: 'worker' | 'connector' | 'platform';
  secretKeyName?: string;
  expectedSignals?: string[];
}

export const servicesCatalog: ServiceDefinition[] = [
  {
    slug: "google_data_connector",
    displayName: "Google Data Connector",
    category: "data",
    testMode: "connector",
    secretKeyName: "GOOGLE_CLIENT_SECRET",
    expectedSignals: ["ga4_sessions", "ga4_users", "gsc_clicks", "gsc_impressions"],
    descriptionMd: `Unified OAuth connector that pulls data from GA4, Google Search Console, and Google Ads using a single authenticated session. This is the primary data ingestion point for all Google-sourced metrics.

**Capabilities:**
- GA4: Sessions, users, events, conversions by date/channel/landing page/device/geo
- GSC: Clicks, impressions, CTR, positions by query and page
- Ads: Spend, clicks, impressions, CPC by campaign

**Test Connection:** Validates OAuth tokens exist and can refresh, then fetches a small sample of data from each API.`
  },
  {
    slug: "google_ads",
    displayName: "Google Ads",
    category: "data",
    testMode: "connector",
    secretKeyName: "GOOGLE_ADS_DEVELOPER_TOKEN",
    expectedSignals: ["ads_spend", "ads_clicks", "ads_impressions", "ads_cpc"],
    descriptionMd: `Connects to Google Ads API to fetch campaign performance data including spend, clicks, impressions, and policy issues. Requires Developer Token approval from Google.

**Capabilities:**
- Campaign performance metrics
- Policy issues and disapprovals detection
- Conversion action tracking status
- Budget and bidding status

**Test Connection:** Validates developer token and OAuth, then fetches campaign list.`
  },
  {
    slug: "serp_intel",
    displayName: "SERP & Keyword Intelligence",
    category: "data",
    testMode: "worker",
    secretKeyName: "SERP_API_KEY",
    expectedSignals: ["keyword_positions", "serp_features", "competitor_rankings"],
    descriptionMd: `Tracks keyword rankings and SERP features using SerpAPI. Monitors your position for target keywords and detects changes in search results over time.

**Capabilities:**
- Track keyword positions for your domain
- Detect SERP features (featured snippets, local pack, etc.)
- Monitor competitor rankings
- Historical position tracking

**Test Connection:** Calls SerpAPI with a test query to verify API key works.`
  },
  {
    slug: "crawl_render",
    displayName: "Crawl & Render Service",
    category: "execution",
    testMode: "worker",
    expectedSignals: ["page_status_codes", "redirect_chains", "indexability"],
    descriptionMd: `Performs technical SEO checks on your website including status codes, redirects, canonicals, and indexability. Can be configured for shallow or deep crawls.

**Capabilities:**
- robots.txt parsing and validation
- Sitemap.xml validation and URL extraction
- HTTP headers capture (x-robots-tag, cache-control)
- Redirect chain detection
- Canonical tag verification

**Test Connection:** Fetches robots.txt and checks homepage status code.`
  },
  {
    slug: "anomaly_detector",
    displayName: "Anomaly Detector",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["traffic_drops", "z_scores", "rolling_averages"],
    descriptionMd: `Detects significant drops in traffic and engagement using statistical analysis. Uses 7-day rolling averages and z-score calculations to identify anomalies.

**Capabilities:**
- Calculate 7-day rolling averages
- Compute z-scores for statistical significance (-2 threshold)
- Multi-source diagnostic context
- Generate ranked root cause hypotheses

**Test Connection:** Runs analysis on recent data to verify calculation pipeline.`
  },
  {
    slug: "hypothesis_engine",
    displayName: "Hypothesis Engine",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["root_causes", "confidence_levels", "recommendations"],
    descriptionMd: `Takes detected anomalies and generates ranked root cause hypotheses with confidence levels. Categories include Tracking, Server Errors, Missing Pages, Indexing, Canonicalization, and Paid Traffic issues.

**Capabilities:**
- Generate ranked root cause hypotheses
- Assign confidence levels to each hypothesis
- Categorize issues by type
- Link evidence to hypotheses

**Test Connection:** Generates test hypothesis from sample data.`
  },
  {
    slug: "ticket_generator",
    displayName: "Ticket Generator",
    category: "execution",
    testMode: "worker",
    expectedSignals: ["tickets_created", "priority_assignments"],
    descriptionMd: `Creates actionable tickets from hypotheses and assigns them to appropriate teams (SEO, Dev, Ads). Each ticket includes steps, priority, and expected impact.

**Capabilities:**
- Create prioritized tickets (P0-P3)
- Assign to SEO, Dev, or Ads teams
- Include action steps and evidence
- Track ticket status

**Test Connection:** Creates a test ticket to verify pipeline.`
  },
  {
    slug: "report_generator",
    displayName: "Report Generator",
    category: "execution",
    testMode: "worker",
    expectedSignals: ["reports_generated", "markdown_output"],
    descriptionMd: `Generates comprehensive diagnostic reports in markdown format. Reports include executive summary, detected issues, recommendations, and evidence links.

**Capabilities:**
- Generate markdown reports
- Include executive summary
- Link to evidence and Clarity recordings
- Create action items

**Test Connection:** Generates a sample report from test data.`
  },
  {
    slug: "scheduler",
    displayName: "Scheduler Service",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["scheduled_runs", "cron_status"],
    descriptionMd: `Manages scheduled diagnostic runs. Default schedule is daily at 7am America/Chicago timezone. Can be configured for different frequencies or disabled entirely.

**Capabilities:**
- Daily automated diagnostics
- Configurable timezone
- Manual trigger support
- Run history tracking

**Test Connection:** Verifies scheduler is running and next run time.`
  },
  {
    slug: "audit_log_observability",
    displayName: "Audit Log & Observability",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["run_history", "health_status", "change_logs"],
    descriptionMd: `Stores run history, service health, job outcomes, and change logs across the entire system, enabling you to trace any recommendation back to inputs and see what actually changed.

It also powers alerts (run failed, API quota hit, big traffic drop, indexing issue detected) and becomes essential once you scale beyond a single site.

**Capabilities:**
- Run history with full input/output capture
- Service health monitoring
- Change log tracking
- Alert triggers

**Test Connection:** Writes a test log entry and reads it back.`
  },
  {
    slug: "bitwarden_vault",
    displayName: "Bitwarden Secrets Manager",
    category: "platform_dependency",
    testMode: "platform",
    secretKeyName: "BWS_ACCESS_TOKEN",
    expectedSignals: ["secrets_count", "vault_health"],
    descriptionMd: `Integrates with Bitwarden Secrets Manager for secure credential storage. All API keys and sensitive configuration are stored here and retrieved at runtime.

**Capabilities:**
- Secure secret storage
- Runtime secret retrieval
- Secret rotation support
- Access logging

**Test Connection:** Lists secrets in the configured project (verifies API access).`
  },
  {
    slug: "postgres_db",
    displayName: "PostgreSQL Database",
    category: "platform_dependency",
    testMode: "platform",
    expectedSignals: ["db_connected", "query_latency"],
    descriptionMd: `Primary data store for all collected metrics, reports, tickets, and configuration. Managed by Replit with automatic backups.

**Capabilities:**
- Persistent data storage
- Drizzle ORM integration
- Transaction support
- Automatic backups

**Test Connection:** Runs SELECT 1 to verify connectivity.`
  },
  {
    slug: "clarity_connector",
    displayName: "Microsoft Clarity",
    category: "data",
    testMode: "worker",
    secretKeyName: "CLARITY_API_KEY",
    expectedSignals: ["session_recordings", "heatmaps"],
    descriptionMd: `Integrates with Microsoft Clarity for user behavior analytics. Provides session recordings and heatmaps as evidence in diagnostic reports.

**Capabilities:**
- Dashboard link generation
- Session recording references
- Heatmap evidence links

**Test Connection:** Validates API key format and connectivity.`
  },
  {
    slug: "openai_integration",
    displayName: "OpenAI Integration",
    category: "infrastructure",
    testMode: "connector",
    secretKeyName: "OPENAI_API_KEY",
    expectedSignals: ["ai_responses", "token_usage"],
    descriptionMd: `Powers AI-assisted analysis and report generation using OpenAI models via Replit AI Integrations.

**Capabilities:**
- Natural language analysis
- Report summarization
- Recommendation generation

**Test Connection:** Sends a minimal API request to verify connectivity.`
  },
  {
    slug: "orchestrator",
    displayName: "Orchestrator (Hermes)",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["orchestration_health", "pipeline_status"],
    descriptionMd: `The core coordination service that ties all other services together. Manages the diagnostic pipeline from data collection through ticket generation.

**Capabilities:**
- Pipeline orchestration
- Service coordination
- Error handling and recovery
- Status aggregation

**Test Connection:** Runs a health check on all connected services.`
  },
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return servicesCatalog.find(s => s.slug === slug);
}

export function getServicesByCategory(category: string): ServiceDefinition[] {
  return servicesCatalog.filter(s => s.category === category);
}
