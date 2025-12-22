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
    displayName: "Google Data Connector (GSC + GA4)",
    category: "data",
    testMode: "connector",
    secretKeyName: "GOOGLE_CLIENT_SECRET",
    expectedSignals: ["impressions", "clicks", "ctr", "position", "sessions", "users"],
    descriptionMd: `Unified OAuth connector that pulls data from GA4, Google Search Console, and Google Ads using a single authenticated session. This is the primary data ingestion point for all Google-sourced metrics.

**Capabilities:**
- GA4: Sessions, users, events, conversions by date/channel/landing page/device/geo
- GSC: Clicks, impressions, CTR, positions by query and page
- Ads: Spend, clicks, impressions, CPC by campaign

**Test Connection:** Validates OAuth tokens exist and can refresh, then fetches a small sample of data from each API.`
  },
  {
    slug: "google_ads_connector",
    displayName: "Google Ads",
    category: "data",
    testMode: "connector",
    secretKeyName: "GOOGLE_ADS_DEVELOPER_TOKEN",
    expectedSignals: ["spend", "impressions", "clicks", "cpc", "conversions", "policy_issues"],
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
    category: "analysis",
    testMode: "worker",
    secretKeyName: "SERP_API_KEY",
    expectedSignals: ["keyword_rankings", "serp_features", "position_changes", "volatility"],
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
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["crawl_status", "render_status", "robots_txt", "sitemap", "redirect_chains"],
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
    slug: "core_web_vitals",
    displayName: "Core Web Vitals Monitor",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["lcp", "cls", "inp", "performance_score", "regressions"],
    descriptionMd: `Monitors PageSpeed Insights and CrUX performance signals including LCP, CLS, and INP. Tracks performance regressions and alerts on significant drops.

**Capabilities:**
- LCP, CLS, INP tracking
- Performance score monitoring
- Regression detection
- Mobile vs Desktop comparison

**Test Connection:** Fetches a PageSpeed report for the configured domain.`
  },
  {
    slug: "competitive_snapshot",
    displayName: "Competitive Snapshot Service",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["competitors", "ranking_pages", "page_templates", "content_structure"],
    descriptionMd: `Creates competitive baselines by analyzing who ranks for your target keywords, their page structures, titles/meta/H1 patterns, and URL templates.

**Capabilities:**
- Competitor identification
- Page structure analysis
- Content template comparison
- SERP feature capture

**Test Connection:** Analyzes a sample SERP to verify capability.`
  },
  {
    slug: "content_gap",
    displayName: "Competitive Intelligence & Content Gap",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["content_gaps", "missing_sections", "schema_differences", "internal_link_gaps"],
    descriptionMd: `Compares your pages against competitors to identify missing sections, weak coverage areas, FAQ opportunities, schema gaps, and internal linking improvements.

**Capabilities:**
- Content gap identification
- Missing section detection
- Schema comparison
- Internal link opportunity finding

**Test Connection:** Runs a sample comparison to verify pipeline.`
  },
  {
    slug: "content_decay",
    displayName: "Content Decay Monitor",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["decay_signals", "refresh_candidates", "competitor_replacement"],
    descriptionMd: `Identifies pages losing impressions, clicks, or rankings over time. Prioritizes content refresh candidates and detects when competitors are replacing your rankings.

**Capabilities:**
- Decay signal detection
- Refresh prioritization
- Competitor replacement alerts
- Historical trend analysis

**Test Connection:** Analyzes recent GSC data for decay patterns.`
  },
  {
    slug: "content_qa",
    displayName: "Content QA / Policy Validator",
    category: "analysis",
    testMode: "worker",
    expectedSignals: ["qa_score", "violations", "compliance_status", "fix_list"],
    descriptionMd: `Validates content against best-practice rulesets including E-E-A-T guidelines, compliance requirements, structure standards, and thin content detection.

**Capabilities:**
- Quality score calculation
- Compliance checking
- Structure validation
- Thin content detection

**Test Connection:** Runs validation on a sample page.`
  },
  {
    slug: "backlink_authority",
    displayName: "Backlink & Authority Signals",
    category: "data",
    testMode: "worker",
    expectedSignals: ["new_links", "lost_links", "domain_authority", "anchor_distribution", "link_velocity"],
    descriptionMd: `Tracks backlink acquisition and loss, domain authority changes, anchor text distribution, link velocity trends, and compares metrics against competitors.

**Capabilities:**
- New/lost link tracking
- Domain authority monitoring
- Anchor text analysis
- Competitor comparison

**Test Connection:** Fetches backlink sample for configured domain.`
  },
  {
    slug: "content_generator",
    displayName: "Content Generator",
    category: "execution",
    testMode: "worker",
    expectedSignals: ["drafts", "content_blocks", "faq_schema", "internal_links"],
    descriptionMd: `Drafts content for blogs, pages, and content refreshes based on keyword intent, competitor gaps, and SEO best practices.

**Capabilities:**
- Blog post drafting
- Page content generation
- FAQ schema creation
- Internal link suggestions

**Test Connection:** Generates a sample content block.`
  },
  {
    slug: "site_executor",
    displayName: "Site Change Executor",
    category: "execution",
    testMode: "worker",
    expectedSignals: ["pr_created", "changes_applied", "rollback_available"],
    descriptionMd: `Applies approved changes to your website via GitHub PR. Supports dry-run mode, before/after snapshots, and rollback capability.

**Capabilities:**
- GitHub PR creation
- Dry-run mode
- Change snapshots
- Rollback support

**Test Connection:** Verifies GitHub access and repo connectivity.`
  },
  {
    slug: "orchestrator",
    displayName: "Orchestrator / Job Runner",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["job_status", "run_history", "error_rates"],
    descriptionMd: `The core coordination service that manages scheduled jobs, retries, rate limits, timeouts, and run status tracking across the entire diagnostic pipeline.

**Capabilities:**
- Pipeline orchestration
- Service coordination
- Error handling and recovery
- Status aggregation

**Test Connection:** Runs a health check on all connected services.`
  },
  {
    slug: "audit_log",
    displayName: "Audit Log & Observability",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["run_logs", "health_metrics", "alerts", "change_audit"],
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
    slug: "notifications",
    displayName: "Notifications Service",
    category: "infrastructure",
    testMode: "worker",
    expectedSignals: ["email_sent", "slack_sent", "alert_delivered"],
    descriptionMd: `Sends Email, SMS, and Slack alerts including daily summaries, critical drop notifications, indexing emergencies, and approval prompts for pending changes.

**Capabilities:**
- Email notifications
- Slack integration
- SMS alerts
- Approval workflows

**Test Connection:** Sends a test notification to configured channel.`
  },
  {
    slug: "bitwarden_vault",
    displayName: "Bitwarden Secrets Manager",
    category: "platform_dependency",
    testMode: "platform",
    secretKeyName: "BWS_ACCESS_TOKEN",
    expectedSignals: ["vault_status", "secrets_available"],
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
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return servicesCatalog.find(s => s.slug === slug);
}

export function getServicesByCategory(category: string): ServiceDefinition[] {
  return servicesCatalog.filter(s => s.category === category);
}
