/**
 * CANONICAL REGISTRY - Single Source of Truth
 * 
 * This file defines the authoritative mapping between:
 * - Crew members (user-facing agents)
 * - Services (worker/integration backends)
 * - Metrics (data points produced by each service)
 * 
 * ALL parts of the app (server + client) MUST use these canonical IDs.
 * Do NOT create alternative naming in other files.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL METRIC KEYS
// ═══════════════════════════════════════════════════════════════════════════

export const METRIC_KEYS = {
  // GA4 Metrics
  'ga4.sessions': { label: 'Sessions', unit: 'count_monthly', source: 'ga4' },
  'ga4.users': { label: 'Users', unit: 'count_monthly', source: 'ga4' },
  'ga4.conversions': { label: 'Conversions', unit: 'count_monthly', source: 'ga4' },
  'ga4.conversion_rate': { label: 'Conversion Rate', unit: 'percent', source: 'ga4' },
  'ga4.bounce_rate': { label: 'Bounce Rate', unit: 'percent', source: 'ga4' },
  'ga4.session_duration': { label: 'Session Duration', unit: 'seconds', source: 'ga4' },
  'ga4.pages_per_session': { label: 'Pages/Session', unit: 'count', source: 'ga4' },

  // GSC Metrics
  'gsc.clicks': { label: 'Clicks', unit: 'count_monthly', source: 'gsc' },
  'gsc.impressions': { label: 'Impressions', unit: 'count_monthly', source: 'gsc' },
  'gsc.ctr': { label: 'Organic CTR', unit: 'percent', source: 'gsc' },
  'gsc.position': { label: 'Avg. Position', unit: 'position', source: 'gsc' },

  // Core Web Vitals
  'vitals.lcp': { label: 'LCP (Loading)', unit: 'seconds', source: 'core_web_vitals' },
  'vitals.cls': { label: 'CLS (Stability)', unit: 'score', source: 'core_web_vitals' },
  'vitals.inp': { label: 'INP (Interactivity)', unit: 'milliseconds', source: 'core_web_vitals' },
  'vitals.performance_score': { label: 'Performance Score', unit: 'score', source: 'core_web_vitals' },

  // SERP Tracking
  'serp.keywords_tracked': { label: 'Keywords Tracked', unit: 'count', source: 'serp_intel' },
  'serp.keywords_top10': { label: 'Keywords in Top 10', unit: 'count', source: 'serp_intel' },
  'serp.avg_position': { label: 'Avg. Keyword Position', unit: 'position', source: 'serp_intel' },

  // Technical SEO
  'tech.pages_crawled': { label: 'Pages Crawled', unit: 'count', source: 'crawl_render' },
  'tech.errors': { label: 'Technical Errors', unit: 'count', source: 'crawl_render' },
  'tech.warnings': { label: 'Technical Warnings', unit: 'count', source: 'crawl_render' },
  'tech.blocked_urls': { label: 'Blocked URLs', unit: 'count', source: 'crawl_render' },

  // Backlinks
  'links.total': { label: 'Total Backlinks', unit: 'count', source: 'backlink_authority' },
  'links.new': { label: 'New Links (30d)', unit: 'count', source: 'backlink_authority' },
  'links.lost': { label: 'Lost Links (30d)', unit: 'count', source: 'backlink_authority' },
  'links.domain_authority': { label: 'Domain Authority', unit: 'score', source: 'backlink_authority' },

  // Content Decay
  'content.decay_signals': { label: 'Decay Signals', unit: 'count', source: 'content_decay' },
  'content.refresh_candidates': { label: 'Refresh Candidates', unit: 'count', source: 'content_decay' },

  // Competitive Intelligence
  'competitive.gaps': { label: 'Content Gaps', unit: 'count', source: 'competitive_snapshot' },
  'competitive.opportunities': { label: 'Opportunities', unit: 'count', source: 'competitive_snapshot' },

  // Google Ads
  'ads.spend': { label: 'Ad Spend', unit: 'currency', source: 'google_ads_connector' },
  'ads.clicks': { label: 'Ad Clicks', unit: 'count', source: 'google_ads_connector' },
  'ads.impressions': { label: 'Ad Impressions', unit: 'count', source: 'google_ads_connector' },
  'ads.conversions': { label: 'Ad Conversions', unit: 'count', source: 'google_ads_connector' },
  'ads.cpc': { label: 'Cost per Click', unit: 'currency', source: 'google_ads_connector' },

  // AI Optimization
  'ai.coverage_score': { label: 'AI Coverage Score', unit: 'percent', source: 'ai_optimization' },
  'ai.llm_visibility': { label: 'LLM Visibility', unit: 'score', source: 'ai_optimization' },
} as const;

export type MetricKey = keyof typeof METRIC_KEYS;

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ServiceDefinition {
  id: string;
  displayName: string;
  description: string;
  metricsProduced: MetricKey[];
  secretName?: string;
}

export const SERVICES: Record<string, ServiceDefinition> = {
  google_data_connector: {
    id: 'google_data_connector',
    displayName: 'Google Data Connector',
    description: 'Fetches GA4 and GSC data from Google APIs',
    metricsProduced: [
      'ga4.sessions', 'ga4.users', 'ga4.conversions', 'ga4.conversion_rate',
      'ga4.bounce_rate', 'ga4.session_duration', 'ga4.pages_per_session',
      'gsc.clicks', 'gsc.impressions', 'gsc.ctr', 'gsc.position',
    ],
    secretName: 'SEO_Google_Connector',
  },
  core_web_vitals: {
    id: 'core_web_vitals',
    displayName: 'Core Web Vitals Monitor',
    description: 'Tracks LCP, CLS, INP from PageSpeed Insights',
    metricsProduced: ['vitals.lcp', 'vitals.cls', 'vitals.inp', 'vitals.performance_score'],
    secretName: 'SEO_Vital_Monitor',
  },
  serp_intel: {
    id: 'serp_intel',
    displayName: 'SERP & Keyword Intelligence',
    description: 'Tracks keyword rankings and SERP features',
    metricsProduced: ['serp.keywords_tracked', 'serp.keywords_top10', 'serp.avg_position'],
    secretName: 'SEO_SERP_Keyword',
  },
  crawl_render: {
    id: 'crawl_render',
    displayName: 'Technical SEO Crawler',
    description: 'Performs technical SEO audits and crawl diagnostics',
    metricsProduced: ['tech.pages_crawled', 'tech.errors', 'tech.warnings', 'tech.blocked_urls'],
    secretName: 'SEO_Technical_Crawler',
  },
  backlink_authority: {
    id: 'backlink_authority',
    displayName: 'Backlink & Authority Monitor',
    description: 'Tracks backlinks, domain authority, and link velocity',
    metricsProduced: ['links.total', 'links.new', 'links.lost', 'links.domain_authority'],
    secretName: 'SEO_Backlinks',
  },
  content_decay: {
    id: 'content_decay',
    displayName: 'Content Decay Monitor',
    description: 'Identifies content losing traffic and prioritizes refreshes',
    metricsProduced: ['content.decay_signals', 'content.refresh_candidates'],
    secretName: 'SEO_Content_Decay_Monitor',
  },
  competitive_snapshot: {
    id: 'competitive_snapshot',
    displayName: 'Competitive Intelligence',
    description: 'Analyzes competitor rankings and content gaps',
    metricsProduced: ['competitive.gaps', 'competitive.opportunities'],
    secretName: 'SEO_Competitive_Intel',
  },
  google_ads_connector: {
    id: 'google_ads_connector',
    displayName: 'Google Ads',
    description: 'Tracks ad performance, spend, and conversions',
    metricsProduced: ['ads.spend', 'ads.clicks', 'ads.impressions', 'ads.conversions', 'ads.cpc'],
    secretName: 'SEO_Google_Ads',
  },
  content_generator: {
    id: 'content_generator',
    displayName: 'Content Generator',
    description: 'Generates and validates SEO-optimized content',
    metricsProduced: [],
    secretName: 'SEO_Blog_Writer',
  },
  seo_kbase: {
    id: 'seo_kbase',
    displayName: 'SEO Knowledge Base',
    description: 'Stores and retrieves SEO learnings',
    metricsProduced: [],
    secretName: 'SEO_KBASE',
  },
  ai_optimization: {
    id: 'ai_optimization',
    displayName: 'AI Optimization',
    description: 'Optimizes content for AI assistants and LLMs',
    metricsProduced: ['ai.coverage_score', 'ai.llm_visibility'],
    secretName: 'SEO_AI_Optimization',
  },
  orchestrator: {
    id: 'orchestrator',
    displayName: 'Orchestrator',
    description: 'Coordinates all services and manages the diagnostic pipeline',
    metricsProduced: [],
    secretName: 'SEO_Orchestrator',
  },
} as const;

export type ServiceId = keyof typeof SERVICES;

// ═══════════════════════════════════════════════════════════════════════════
// CREW DEFINITIONS (User-Facing Agents)
// ═══════════════════════════════════════════════════════════════════════════

export interface CrewDefinition {
  crewId: string;
  nickname: string;
  role: string;
  services: ServiceId[];
  metricsOwned: MetricKey[];
  color: string;
}

export const CREW: Record<string, CrewDefinition> = {
  popular: {
    crewId: 'popular',
    nickname: 'Popular',
    role: 'Analytics & Signals',
    services: ['google_data_connector'],
    metricsOwned: [
      'ga4.sessions', 'ga4.users', 'ga4.conversions', 'ga4.conversion_rate',
      'ga4.bounce_rate', 'ga4.session_duration', 'ga4.pages_per_session',
      'gsc.clicks', 'gsc.impressions', 'gsc.ctr', 'gsc.position',
    ],
    color: '#14B8A6',
  },
  speedster: {
    crewId: 'speedster',
    nickname: 'Speedster',
    role: 'Performance Monitor',
    services: ['core_web_vitals'],
    metricsOwned: ['vitals.lcp', 'vitals.cls', 'vitals.inp', 'vitals.performance_score'],
    color: '#10B981',
  },
  lookout: {
    crewId: 'lookout',
    nickname: 'Lookout',
    role: 'SERP Tracking',
    services: ['serp_intel'],
    metricsOwned: ['serp.keywords_tracked', 'serp.keywords_top10', 'serp.avg_position'],
    color: '#EC4899',
  },
  scotty: {
    crewId: 'scotty',
    nickname: 'Scotty',
    role: 'Technical SEO',
    services: ['crawl_render'],
    metricsOwned: ['tech.pages_crawled', 'tech.errors', 'tech.warnings', 'tech.blocked_urls'],
    color: '#F97316',
  },
  beacon: {
    crewId: 'beacon',
    nickname: 'Beacon',
    role: 'Domain Authority',
    services: ['backlink_authority'],
    metricsOwned: ['links.total', 'links.new', 'links.lost', 'links.domain_authority'],
    color: '#F59E0B',
  },
  sentinel: {
    crewId: 'sentinel',
    nickname: 'Sentinel',
    role: 'Content Decay Monitor',
    services: ['content_decay'],
    metricsOwned: ['content.decay_signals', 'content.refresh_candidates'],
    color: '#6366F1',
  },
  natasha: {
    crewId: 'natasha',
    nickname: 'Natasha',
    role: 'Competitive Intelligence',
    services: ['competitive_snapshot'],
    metricsOwned: ['competitive.gaps', 'competitive.opportunities'],
    color: '#A855F7',
  },
  draper: {
    crewId: 'draper',
    nickname: 'Draper',
    role: 'Paid Ads',
    services: ['google_ads_connector'],
    metricsOwned: ['ads.spend', 'ads.clicks', 'ads.impressions', 'ads.conversions', 'ads.cpc'],
    color: '#FB7185',
  },
  hemingway: {
    crewId: 'hemingway',
    nickname: 'Hemingway',
    role: 'Content Strategy',
    services: ['content_generator'],
    metricsOwned: [],
    color: '#0EA5E9',
  },
  socrates: {
    crewId: 'socrates',
    nickname: 'Socrates',
    role: 'Knowledge Base',
    services: ['seo_kbase'],
    metricsOwned: [],
    color: '#84CC16',
  },
  atlas: {
    crewId: 'atlas',
    nickname: 'Atlas',
    role: 'AI Optimization',
    services: ['ai_optimization'],
    metricsOwned: ['ai.coverage_score', 'ai.llm_visibility'],
    color: '#D946EF',
  },
  major_tom: {
    crewId: 'major_tom',
    nickname: 'Major Tom',
    role: 'Mission Control',
    services: ['orchestrator'],
    metricsOwned: [],
    color: '#4F46E5',
  },
} as const;

export type CrewId = keyof typeof CREW;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps service_id to crew_id
 */
export const SERVICE_TO_CREW: Record<string, string> = {
  google_data_connector: 'popular',
  core_web_vitals: 'speedster',
  serp_intel: 'lookout',
  crawl_render: 'scotty',
  backlink_authority: 'beacon',
  content_decay: 'sentinel',
  competitive_snapshot: 'natasha',
  google_ads_connector: 'draper',
  content_generator: 'hemingway',
  seo_kbase: 'socrates',
  ai_optimization: 'atlas',
  orchestrator: 'major_tom',
};

/**
 * Get crew member by service ID
 */
export function getCrewByServiceId(serviceId: string): CrewDefinition | undefined {
  const crewId = SERVICE_TO_CREW[serviceId];
  return crewId ? CREW[crewId] : undefined;
}

/**
 * Get all metrics for a crew member
 */
export function getMetricsForCrew(crewId: string): MetricKey[] {
  return CREW[crewId]?.metricsOwned || [];
}

/**
 * Get metric definition
 */
export function getMetricDefinition(key: MetricKey) {
  return METRIC_KEYS[key];
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY KEY TRANSLATION (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps legacy metric keys (from worker outputs) to canonical keys
 */
export const LEGACY_TO_CANONICAL: Record<string, MetricKey> = {
  // Core Web Vitals worker outputs
  'lcp': 'vitals.lcp',
  'lcp_ms': 'vitals.lcp',
  'cls': 'vitals.cls',
  'inp': 'vitals.inp',
  'performance_score': 'vitals.performance_score',
  
  // GSC data
  'clicks': 'gsc.clicks',
  'impressions': 'gsc.impressions',
  'ctr': 'gsc.ctr',
  'position': 'gsc.position',
  'avg_position': 'gsc.position',
  
  // GA4 data
  'sessions': 'ga4.sessions',
  'users': 'ga4.users',
  'conversions': 'ga4.conversions',
  'bounceRate': 'ga4.bounce_rate',
  'avgSessionDuration': 'ga4.session_duration',
  'pagesPerSession': 'ga4.pages_per_session',
  
  // Benchmark API legacy keys
  'organic_ctr': 'gsc.ctr',
  'bounce_rate': 'ga4.bounce_rate',
  'session_duration': 'ga4.session_duration',
  'pages_per_session': 'ga4.pages_per_session',
  'conversion_rate': 'ga4.conversion_rate',
};

/**
 * Translate a legacy key to canonical key
 */
export function toCanonicalKey(legacyKey: string): MetricKey | null {
  if (legacyKey in METRIC_KEYS) {
    return legacyKey as MetricKey;
  }
  return LEGACY_TO_CANONICAL[legacyKey] || null;
}

/**
 * Translate canonical key back to legacy (for benchmarks API compatibility)
 */
export const CANONICAL_TO_BENCHMARK: Record<MetricKey, string> = {
  'vitals.lcp': 'lcp',
  'vitals.cls': 'cls',
  'vitals.inp': 'inp',
  'vitals.performance_score': 'performance_score',
  'gsc.clicks': 'clicks',
  'gsc.impressions': 'impressions',
  'gsc.ctr': 'organic_ctr',
  'gsc.position': 'avg_position',
  'ga4.sessions': 'sessions',
  'ga4.users': 'users',
  'ga4.conversions': 'conversions',
  'ga4.bounce_rate': 'bounce_rate',
  'ga4.session_duration': 'session_duration',
  'ga4.pages_per_session': 'pages_per_session',
  'ga4.conversion_rate': 'conversion_rate',
} as Record<MetricKey, string>;

export function toBenchmarkKey(canonicalKey: MetricKey): string {
  return CANONICAL_TO_BENCHMARK[canonicalKey] || canonicalKey;
}
