export interface ServiceDefinition {
  slug: string;
  displayName: string;
  category: 'data' | 'analysis' | 'execution' | 'infrastructure' | 'platform_dependency';
  
  description: string;
  purpose: string;
  
  inputs: string[];
  outputs: string[];
  keyMetrics: string[];
  commonFailures: string[];
  
  runTriggers: ('scheduled' | 'manual' | 'on_change')[];
  
  testMode: 'worker' | 'connector' | 'platform';
  secretKeyName?: string;
}

export const slugLabels: Record<string, string> = {
  site_domain: "Site Domain",
  crawl_scope: "Crawl Scope",
  robots_txt: "robots.txt",
  sitemap_xml: "Sitemap XML",
  oauth_tokens: "OAuth Tokens",
  ga4_property_id: "GA4 Property ID",
  gsc_site: "GSC Site",
  ads_customer_id: "Ads Customer ID",
  serp_api_key: "SERP API Key",
  target_keywords: "Target Keywords",
  competitor_domains: "Competitor Domains",
  page_urls: "Page URLs",
  gsc_data: "GSC Data",
  ga4_data: "GA4 Data",
  content_rules: "Content Rules",
  github_repo: "GitHub Repository",
  github_token: "GitHub Token",
  notification_channels: "Notification Channels",
  bws_access_token: "BWS Access Token",
  database_url: "Database URL",
  
  impressions: "Impressions",
  clicks: "Clicks",
  ctr: "CTR",
  position: "Position",
  sessions: "Sessions",
  users: "Users",
  conversions: "Conversions",
  queries: "Queries",
  pages: "Pages",
  spend: "Spend",
  cpc: "CPC",
  policy_issues: "Policy Issues",
  campaign_status: "Campaign Status",
  
  keyword_rankings: "Keyword Rankings",
  serp_features: "SERP Features",
  position_changes: "Position Changes",
  volatility: "Volatility",
  opportunities: "Opportunities",
  
  pages_crawled: "Pages Crawled",
  indexable_pages: "Indexable Pages",
  non_200_urls: "Non-200 URLs",
  canonical_errors: "Canonical Errors",
  render_failures: "Render Failures",
  redirect_chains: "Redirect Chains",
  orphan_pages: "Orphan Pages",
  meta_tags: "Meta Tags",
  
  lcp: "LCP",
  cls: "CLS",
  inp: "INP",
  performance_score: "Performance Score",
  regressions: "Regressions",
  
  competitors: "Competitors",
  ranking_pages: "Ranking Pages",
  page_templates: "Page Templates",
  content_structure: "Content Structure",
  
  content_gaps: "Content Gaps",
  missing_sections: "Missing Sections",
  schema_differences: "Schema Differences",
  internal_link_gaps: "Internal Link Gaps",
  
  decay_signals: "Decay Signals",
  refresh_candidates: "Refresh Candidates",
  competitor_replacement: "Competitor Replacement",
  
  qa_score: "QA Score",
  violations: "Violations",
  compliance_status: "Compliance Status",
  fix_list: "Fix List",
  
  new_links: "New Links",
  lost_links: "Lost Links",
  domain_authority: "Domain Authority",
  anchor_distribution: "Anchor Distribution",
  link_velocity: "Link Velocity",
  
  drafts: "Drafts",
  content_blocks: "Content Blocks",
  faq_schema: "FAQ Schema",
  internal_links: "Internal Links",
  
  pr_created: "PR Created",
  changes_applied: "Changes Applied",
  rollback_available: "Rollback Available",
  
  job_status: "Job Status",
  run_history: "Run History",
  error_rates: "Error Rates",
  
  run_logs: "Run Logs",
  health_metrics: "Health Metrics",
  alerts: "Alerts",
  change_audit: "Change Audit",
  
  email_sent: "Email Sent",
  slack_sent: "Slack Sent",
  alert_delivered: "Alert Delivered",
  
  vault_status: "Vault Status",
  secrets_available: "Secrets Available",
  
  db_connected: "DB Connected",
  query_latency: "Query Latency",
  
  total_pages: "Total Pages",
  error_count: "Error Count",
  warning_count: "Warning Count",
  pages_analyzed: "Pages Analyzed",
  keywords_tracked: "Keywords Tracked",
  campaigns_active: "Campaigns Active",
  links_found: "Links Found",
  content_pieces: "Content Pieces",
  jobs_run: "Jobs Run",
  notifications_sent: "Notifications Sent",
  secrets_loaded: "Secrets Loaded",
  
  blocked_by_robots: "Blocked by robots.txt",
  js_render_blank: "JS Render Blank",
  timeout: "Timeout",
  oauth_expired: "OAuth Expired",
  oauth_invalid: "OAuth Invalid",
  api_key_invalid: "API Key Invalid",
  rate_limited: "Rate Limited",
  quota_exceeded: "Quota Exceeded",
  network_error: "Network Error",
  server_error: "Server Error",
  no_data: "No Data",
  missing_config: "Missing Config",
  permission_denied: "Permission Denied",
  invalid_response: "Invalid Response",
  missing_secret: "Missing Secret",
  db_connection_failed: "DB Connection Failed",
};

export function getSlugLabel(slug: string): string {
  return slugLabels[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const servicesCatalog: ServiceDefinition[] = [
  {
    slug: "google_data_connector",
    displayName: "Google Data Connector (GSC + GA4)",
    category: "data",
    description: "Unified OAuth connector that pulls data from GA4, Google Search Console, and Google Ads using a single authenticated session. This is the primary data ingestion point for all Google-sourced metrics.",
    purpose: "Fetch impressions, clicks, CTR, sessions, and users from Google APIs",
    inputs: ["oauth_tokens", "ga4_property_id", "gsc_site", "ads_customer_id"],
    outputs: ["impressions", "clicks", "ctr", "position", "sessions", "users", "conversions", "queries", "pages"],
    keyMetrics: ["impressions", "clicks", "sessions", "users"],
    commonFailures: ["oauth_expired", "oauth_invalid", "rate_limited", "quota_exceeded"],
    runTriggers: ["scheduled", "manual"],
    testMode: "connector",
    secretKeyName: "GOOGLE_CLIENT_SECRET",
  },
  {
    slug: "google_ads_connector",
    displayName: "Google Ads",
    category: "data",
    description: "Connects to Google Ads API to fetch campaign performance data including spend, clicks, impressions, and policy issues. Requires Developer Token approval from Google.",
    purpose: "Track ad spend, CPC, conversions, and policy issues",
    inputs: ["oauth_tokens", "ads_customer_id"],
    outputs: ["spend", "impressions", "clicks", "cpc", "conversions", "policy_issues", "campaign_status"],
    keyMetrics: ["spend", "clicks", "conversions", "campaigns_active"],
    commonFailures: ["oauth_expired", "api_key_invalid", "permission_denied", "quota_exceeded"],
    runTriggers: ["scheduled", "manual"],
    testMode: "connector",
    secretKeyName: "GOOGLE_ADS_DEVELOPER_TOKEN",
  },
  {
    slug: "serp_intel",
    displayName: "SERP & Keyword Intelligence",
    category: "analysis",
    description: "Tracks keyword rankings and SERP features using SerpAPI. Monitors your position for target keywords and detects changes in search results over time.",
    purpose: "Track keyword positions and SERP feature presence",
    inputs: ["serp_api_key", "target_keywords", "site_domain"],
    outputs: ["keyword_rankings", "serp_features", "position_changes", "volatility", "opportunities"],
    keyMetrics: ["keywords_tracked", "position_changes", "opportunities"],
    commonFailures: ["api_key_invalid", "rate_limited", "quota_exceeded", "no_data"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
    secretKeyName: "SERP_API_KEY",
  },
  {
    slug: "crawl_render",
    displayName: "Crawl & Render Service",
    category: "analysis",
    description: "Performs technical SEO checks on your website including status codes, redirects, canonicals, and indexability. Can be configured for shallow or deep crawls.",
    purpose: "Detect technical SEO issues via crawl + render",
    inputs: ["site_domain", "crawl_scope", "robots_txt", "sitemap_xml"],
    outputs: ["pages_crawled", "indexable_pages", "non_200_urls", "canonical_errors", "render_failures", "redirect_chains", "orphan_pages", "meta_tags"],
    keyMetrics: ["total_pages", "error_count", "warning_count"],
    commonFailures: ["blocked_by_robots", "js_render_blank", "timeout", "network_error"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "core_web_vitals",
    displayName: "Core Web Vitals Monitor",
    category: "analysis",
    description: "Monitors PageSpeed Insights and CrUX performance signals including LCP, CLS, and INP. Tracks performance regressions and alerts on significant drops.",
    purpose: "Track LCP, CLS, INP and detect performance regressions",
    inputs: ["site_domain", "page_urls"],
    outputs: ["lcp", "cls", "inp", "performance_score", "regressions"],
    keyMetrics: ["lcp", "cls", "inp", "performance_score"],
    commonFailures: ["timeout", "rate_limited", "no_data", "invalid_response"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "competitive_snapshot",
    displayName: "Competitive Snapshot Service",
    category: "analysis",
    description: "Creates competitive baselines by analyzing who ranks for your target keywords, their page structures, titles/meta/H1 patterns, and URL templates.",
    purpose: "Analyze competitor rankings and page structures",
    inputs: ["target_keywords", "competitor_domains", "serp_api_key"],
    outputs: ["competitors", "ranking_pages", "page_templates", "content_structure"],
    keyMetrics: ["competitors", "ranking_pages", "pages_analyzed"],
    commonFailures: ["api_key_invalid", "rate_limited", "no_data", "timeout"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "content_gap",
    displayName: "Competitive Intelligence & Content Gap",
    category: "analysis",
    description: "Compares your pages against competitors to identify missing sections, weak coverage areas, FAQ opportunities, schema gaps, and internal linking improvements.",
    purpose: "Identify content gaps vs competitors",
    inputs: ["site_domain", "competitor_domains", "page_urls"],
    outputs: ["content_gaps", "missing_sections", "schema_differences", "internal_link_gaps"],
    keyMetrics: ["content_gaps", "missing_sections", "internal_link_gaps"],
    commonFailures: ["timeout", "no_data", "rate_limited", "network_error"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "content_decay",
    displayName: "Content Decay Monitor",
    category: "analysis",
    description: "Identifies pages losing impressions, clicks, or rankings over time. Prioritizes content refresh candidates and detects when competitors are replacing your rankings.",
    purpose: "Detect pages losing traffic and prioritize refreshes",
    inputs: ["gsc_data", "ga4_data", "site_domain"],
    outputs: ["decay_signals", "refresh_candidates", "competitor_replacement"],
    keyMetrics: ["decay_signals", "refresh_candidates"],
    commonFailures: ["no_data", "missing_config", "timeout"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "content_qa",
    displayName: "Content QA / Policy Validator",
    category: "analysis",
    description: "Validates content against best-practice rulesets including E-E-A-T guidelines, compliance requirements, structure standards, and thin content detection.",
    purpose: "Validate content quality and compliance",
    inputs: ["page_urls", "content_rules"],
    outputs: ["qa_score", "violations", "compliance_status", "fix_list"],
    keyMetrics: ["qa_score", "violations", "pages_analyzed"],
    commonFailures: ["timeout", "no_data", "invalid_response", "network_error"],
    runTriggers: ["scheduled", "manual", "on_change"],
    testMode: "worker",
  },
  {
    slug: "backlink_authority",
    displayName: "Backlink & Authority Signals",
    category: "data",
    description: "Tracks backlink acquisition and loss, domain authority changes, anchor text distribution, link velocity trends, and compares metrics against competitors.",
    purpose: "Monitor backlinks, domain authority, and link velocity",
    inputs: ["site_domain", "competitor_domains"],
    outputs: ["new_links", "lost_links", "domain_authority", "anchor_distribution", "link_velocity"],
    keyMetrics: ["new_links", "lost_links", "domain_authority", "links_found"],
    commonFailures: ["api_key_invalid", "rate_limited", "quota_exceeded", "no_data"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "content_generator",
    displayName: "Content Generator",
    category: "execution",
    description: "Drafts content for blogs, pages, and content refreshes based on keyword intent, competitor gaps, and SEO best practices.",
    purpose: "Generate SEO-optimized content drafts",
    inputs: ["target_keywords", "content_gaps", "page_urls"],
    outputs: ["drafts", "content_blocks", "faq_schema", "internal_links"],
    keyMetrics: ["drafts", "content_pieces"],
    commonFailures: ["api_key_invalid", "rate_limited", "quota_exceeded", "timeout"],
    runTriggers: ["manual", "on_change"],
    testMode: "worker",
  },
  {
    slug: "site_executor",
    displayName: "Site Change Executor",
    category: "execution",
    description: "Applies approved changes to your website via GitHub PR. Supports dry-run mode, before/after snapshots, and rollback capability.",
    purpose: "Apply SEO changes via GitHub PR",
    inputs: ["github_repo", "github_token", "changes_applied"],
    outputs: ["pr_created", "changes_applied", "rollback_available"],
    keyMetrics: ["pr_created", "changes_applied"],
    commonFailures: ["permission_denied", "api_key_invalid", "network_error", "missing_config"],
    runTriggers: ["manual"],
    testMode: "worker",
  },
  {
    slug: "orchestrator",
    displayName: "Orchestrator / Job Runner",
    category: "infrastructure",
    description: "The core coordination service that manages scheduled jobs, retries, rate limits, timeouts, and run status tracking across the entire diagnostic pipeline.",
    purpose: "Coordinate service runs and track job status",
    inputs: ["site_domain"],
    outputs: ["job_status", "run_history", "error_rates"],
    keyMetrics: ["jobs_run", "error_rates"],
    commonFailures: ["timeout", "server_error", "db_connection_failed"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "audit_log",
    displayName: "Audit Log & Observability",
    category: "infrastructure",
    description: "Stores run history, service health, job outcomes, and change logs across the entire system. Enables tracing recommendations back to inputs and seeing what actually changed.",
    purpose: "Track run history, health metrics, and alerts",
    inputs: ["site_domain"],
    outputs: ["run_logs", "health_metrics", "alerts", "change_audit"],
    keyMetrics: ["run_logs", "alerts"],
    commonFailures: ["db_connection_failed", "server_error"],
    runTriggers: ["scheduled", "manual"],
    testMode: "worker",
  },
  {
    slug: "notifications",
    displayName: "Notifications Service",
    category: "infrastructure",
    description: "Sends Email, SMS, and Slack alerts including daily summaries, critical drop notifications, indexing emergencies, and approval prompts for pending changes.",
    purpose: "Send alerts via email, Slack, and SMS",
    inputs: ["notification_channels"],
    outputs: ["email_sent", "slack_sent", "alert_delivered"],
    keyMetrics: ["notifications_sent", "alert_delivered"],
    commonFailures: ["api_key_invalid", "rate_limited", "missing_config", "network_error"],
    runTriggers: ["scheduled", "manual", "on_change"],
    testMode: "worker",
  },
  {
    slug: "bitwarden_vault",
    displayName: "Bitwarden Secrets Manager",
    category: "platform_dependency",
    description: "Integrates with Bitwarden Secrets Manager for secure credential storage. All API keys and sensitive configuration are stored here and retrieved at runtime.",
    purpose: "Securely store and retrieve API keys",
    inputs: ["bws_access_token"],
    outputs: ["vault_status", "secrets_available"],
    keyMetrics: ["secrets_loaded", "secrets_available"],
    commonFailures: ["api_key_invalid", "permission_denied", "network_error", "missing_secret"],
    runTriggers: ["manual"],
    testMode: "platform",
    secretKeyName: "BWS_ACCESS_TOKEN",
  },
  {
    slug: "postgres_db",
    displayName: "PostgreSQL Database",
    category: "platform_dependency",
    description: "Primary data store for all collected metrics, reports, tickets, and configuration. Managed by Replit with automatic backups.",
    purpose: "Store metrics, reports, and configuration",
    inputs: ["database_url"],
    outputs: ["db_connected", "query_latency"],
    keyMetrics: ["db_connected", "query_latency"],
    commonFailures: ["db_connection_failed", "timeout", "permission_denied"],
    runTriggers: ["manual"],
    testMode: "platform",
  },
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return servicesCatalog.find(s => s.slug === slug);
}

export function getServicesByCategory(category: string): ServiceDefinition[] {
  return servicesCatalog.filter(s => s.category === category);
}

export function computeMissingOutputs(expectedOutputs: string[], actualOutputs: string[]): string[] {
  return expectedOutputs.filter(o => !actualOutputs.includes(o));
}

export function matchFailureSlug(errorMessage: string): string | null {
  const errorPatterns: Record<string, string[]> = {
    oauth_expired: ['token expired', 'refresh token', 'oauth expired'],
    oauth_invalid: ['invalid oauth', 'oauth error', 'authentication failed'],
    api_key_invalid: ['invalid api key', 'api key', 'unauthorized'],
    rate_limited: ['rate limit', 'too many requests', '429'],
    quota_exceeded: ['quota exceeded', 'quota limit', 'daily limit'],
    timeout: ['timeout', 'timed out', 'ETIMEDOUT'],
    network_error: ['network error', 'ENOTFOUND', 'ECONNREFUSED'],
    server_error: ['500', 'internal server error', 'server error'],
    no_data: ['no data', 'empty response', 'no results'],
    missing_config: ['missing config', 'not configured', 'config required'],
    permission_denied: ['permission denied', 'forbidden', '403'],
    invalid_response: ['invalid response', 'parse error', 'unexpected'],
    missing_secret: ['secret not found', 'missing secret', 'no secret'],
    db_connection_failed: ['database', 'connection failed', 'ECONNECT'],
    blocked_by_robots: ['robots.txt', 'blocked', 'disallow'],
    js_render_blank: ['blank page', 'no content', 'render failed'],
  };
  
  const lowerError = errorMessage.toLowerCase();
  for (const [slug, patterns] of Object.entries(errorPatterns)) {
    if (patterns.some(p => lowerError.includes(p))) {
      return slug;
    }
  }
  return null;
}
