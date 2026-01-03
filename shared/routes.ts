/**
 * Canonical Route Definitions
 * 
 * This is the single source of truth for all routes in the application.
 * All navigation should use these constants/builders instead of hardcoded strings.
 * 
 * ROUTING DECISIONS:
 * - /agents/:agentId - Canonical route for individual crew member pages
 * - /crew - Crew hiring/discovery page
 * - /dashboard - Main mission control (aliases: /mission-control, /)
 * - All crew member pages accessible via /agents/{service_id}
 * 
 * DEPRECATED ROUTES (with redirects):
 * - /crew/:agentId → /agents/:agentId (server-side + client-side redirect)
 * - /mission-control → /dashboard (alias, both work)
 * - /crew/speedster → /speedster (redirect)
 * - /crew/socrates → /socrates (redirect)
 */

// ============================================
// CANONICAL ROUTES
// ============================================

export const ROUTES = {
  // Core pages
  HOME: "/",
  DASHBOARD: "/dashboard",
  MISSION_CONTROL: "/mission-control", // Alias for dashboard
  
  // Crew system
  CREW: "/crew", // Crew hiring/discovery page
  AGENTS: "/agents", // List of all agents
  AGENT_DETAIL: "/agents/:agentId", // Individual crew member page
  
  // Feature pages (crew-specific tools that have dedicated routes)
  KEYWORDS: "/keywords", // Lookout SERP tracking
  AUTHORITY: "/authority", // Authority/backlink analysis
  SPEEDSTER: "/speedster", // Core Web Vitals
  SOCRATES: "/socrates", // Knowledge base
  
  // System pages
  TICKETS: "/tickets",
  CHANGES: "/changes",
  RUNS: "/runs",
  RUN_DETAIL: "/runs/:runId",
  AUDIT: "/audit",
  BENCHMARKS: "/benchmarks",
  ACHIEVEMENTS: "/achievements",
  
  // Settings & Configuration
  INTEGRATIONS: "/integrations",
  SETTINGS: "/settings",
  SITES: "/sites",
  SITE_DETAIL: "/sites/:siteId",
  SITE_NEW: "/sites/new",
  HELP: "/help",
  
  // Developer pages
  DEV_PALETTE: "/dev/palette",
  DEV_LINEAGE: "/dev/lineage",
} as const;

// ============================================
// ROUTE BUILDERS
// ============================================

export const buildRoute = {
  agent: (agentId: string) => `/agents/${agentId}`,
  run: (runId: string) => `/runs/${runId}`,
  site: (siteId: string) => `/sites/${siteId}`,
  settingsTab: (tab: string) => `/settings?tab=${tab}`,
} as const;

// ============================================
// DEPRECATED ROUTES → REDIRECT TARGETS
// ============================================

export const DEPRECATED_ROUTES: Record<string, string | ((params: Record<string, string>) => string)> = {
  // Old crew-based agent routes
  "/crew/:agentId": (params) => buildRoute.agent(params.agentId),
  "/crew/speedster": ROUTES.SPEEDSTER,
  "/crew/socrates": ROUTES.SOCRATES,
  "/crew/lookout": ROUTES.KEYWORDS,
  "/crew/natasha": buildRoute.agent("natasha"),
  "/crew/hemingway": buildRoute.agent("hemingway"),
  "/crew/marcus": buildRoute.agent("marcus"),
  "/crew/pulse": buildRoute.agent("pulse"),
  "/crew/scotty": buildRoute.agent("scotty"),
  "/crew/popular": buildRoute.agent("popular"),
  "/crew/authority": ROUTES.AUTHORITY,
  
  // Ensure consistent casing
  "/Agents": ROUTES.AGENTS,
  "/Dashboard": ROUTES.DASHBOARD,
  "/Crew": ROUTES.CREW,
};

// Pattern-based redirects for dynamic segments
export const DEPRECATED_PATTERNS = [
  {
    pattern: /^\/crew\/([a-zA-Z0-9_-]+)$/,
    resolve: (match: RegExpMatchArray) => {
      const agentId = match[1];
      // If it's a known standalone route, redirect there
      if (agentId === "speedster") return ROUTES.SPEEDSTER;
      if (agentId === "socrates") return ROUTES.SOCRATES;
      if (agentId === "lookout") return ROUTES.KEYWORDS;
      if (agentId === "authority") return ROUTES.AUTHORITY;
      // Otherwise redirect to agent detail
      return buildRoute.agent(agentId);
    },
  },
];

// ============================================
// ROUTE VALIDATION
// ============================================

const ALL_STATIC_ROUTES = new Set([
  ROUTES.HOME,
  ROUTES.DASHBOARD,
  ROUTES.MISSION_CONTROL,
  ROUTES.CREW,
  ROUTES.AGENTS,
  ROUTES.KEYWORDS,
  ROUTES.AUTHORITY,
  ROUTES.SPEEDSTER,
  ROUTES.SOCRATES,
  ROUTES.TICKETS,
  ROUTES.CHANGES,
  ROUTES.RUNS,
  ROUTES.AUDIT,
  ROUTES.BENCHMARKS,
  ROUTES.ACHIEVEMENTS,
  ROUTES.INTEGRATIONS,
  ROUTES.SETTINGS,
  ROUTES.SITES,
  ROUTES.SITE_NEW,
  ROUTES.HELP,
  ROUTES.DEV_PALETTE,
  ROUTES.DEV_LINEAGE,
]);

const DYNAMIC_ROUTE_PATTERNS = [
  /^\/agents\/[a-zA-Z0-9_-]+$/,
  /^\/runs\/[a-zA-Z0-9_-]+$/,
  /^\/sites\/[a-zA-Z0-9_-]+$/,
];

export function isValidRoute(path: string): boolean {
  // Check query params and hash stripped
  const basePath = path.split("?")[0].split("#")[0];
  
  // Check static routes
  if (ALL_STATIC_ROUTES.has(basePath)) return true;
  
  // Check dynamic patterns
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(basePath)) return true;
  }
  
  return false;
}

export function resolveDeprecatedRoute(path: string): string | null {
  // Check static deprecated routes
  if (DEPRECATED_ROUTES[path]) {
    const target = DEPRECATED_ROUTES[path];
    if (typeof target === "string") return target;
    // For pattern-based, we need params - handled by DEPRECATED_PATTERNS
  }
  
  // Check pattern-based redirects
  for (const { pattern, resolve } of DEPRECATED_PATTERNS) {
    const match = path.match(pattern);
    if (match) {
      return resolve(match);
    }
  }
  
  return null;
}

// ============================================
// NAVIGATION HELPERS
// ============================================

/**
 * Safe navigation helper - ensures we never navigate to invalid routes
 */
export function getSafeRoute(
  targetRoute: string,
  fallbackRoute: string = ROUTES.DASHBOARD
): string {
  // First check if it's a deprecated route that should be redirected
  const redirected = resolveDeprecatedRoute(targetRoute);
  if (redirected) return redirected;
  
  // Check if the route is valid
  if (isValidRoute(targetRoute)) return targetRoute;
  
  // Fall back to dashboard
  console.warn(`[Routes] Invalid route "${targetRoute}", falling back to "${fallbackRoute}"`);
  return fallbackRoute;
}

/**
 * Post-action navigation helper
 * Returns to the best available page after an action completes
 */
export function getPostActionRoute(
  currentRoute: string,
  preferredRoute?: string
): string {
  // If a preferred route is given and valid, use it
  if (preferredRoute && isValidRoute(preferredRoute)) {
    return preferredRoute;
  }
  
  // Stay on current page if it's valid
  if (isValidRoute(currentRoute)) {
    return currentRoute;
  }
  
  // Fall back to dashboard
  return ROUTES.DASHBOARD;
}

// ============================================
// KNOWN AGENT IDS (for validation)
// Service IDs as defined in client/src/config/agents.ts
// ============================================

export const KNOWN_AGENT_IDS = [
  "competitive_snapshot",   // Natasha - Competitive Intelligence
  "serp_intel",             // Lookout - SERP Tracking
  "google_data_connector",  // Popular - Analytics & Signals
  "crawl_render",           // Scotty - Technical SEO
  "core_web_vitals",        // Speedster - Performance Monitoring
  "content_decay",          // Sentinel - Content Decay
  "content_generator",      // Hemingway - Content Strategy
  "backlink_authority",     // Beacon - Domain Authority
  "seo_kbase",              // Socrates - Knowledge Base
  "ai_optimization",        // Atlas - AI Optimization
] as const;

export type AgentId = typeof KNOWN_AGENT_IDS[number];

export function isKnownAgent(agentId: string): agentId is AgentId {
  return KNOWN_AGENT_IDS.includes(agentId as AgentId);
}

// ============================================
// SLUG TO SERVICE_ID MAPPING
// Maps friendly URL slugs to service IDs
// ============================================

export const SLUG_TO_SERVICE_ID: Record<string, string> = {
  "natasha": "competitive_snapshot",
  "lookout": "serp_intel",
  "popular": "google_data_connector",
  "scotty": "crawl_render",
  "speedster": "core_web_vitals",
  "sentinel": "content_decay",
  "hemingway": "content_generator",
  "beacon": "backlink_authority",
  "socrates": "seo_kbase",
  "atlas": "ai_optimization",
  // Direct service_id mappings (identity)
  "competitive_snapshot": "competitive_snapshot",
  "serp_intel": "serp_intel",
  "google_data_connector": "google_data_connector",
  "crawl_render": "crawl_render",
  "core_web_vitals": "core_web_vitals",
  "content_decay": "content_decay",
  "content_generator": "content_generator",
  "backlink_authority": "backlink_authority",
  "seo_kbase": "seo_kbase",
  "ai_optimization": "ai_optimization",
};

export function resolveAgentSlug(slug: string): string {
  return SLUG_TO_SERVICE_ID[slug] || slug;
}
