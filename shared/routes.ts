/**
 * Canonical Route Definitions
 * 
 * This is the single source of truth for all routes in the application.
 * All navigation should use these constants/builders instead of hardcoded strings.
 * 
 * ROUTE STRUCTURE:
 * - Marketing routes: Public-facing funnel pages (/, /scan, /signup, etc.)
 * - App routes: Authenticated application pages (all under /app/*)
 * 
 * ROUTING DECISIONS:
 * - /app/agents/:agentId - Canonical route for individual crew member pages
 * - /app/crew - Crew hiring/discovery page
 * - /app/dashboard - Main mission control (aliases: /app/mission-control)
 * - All crew member pages accessible via /app/agents/{service_id}
 * 
 * DEPRECATED ROUTES (with redirects):
 * - /crew/:agentId → /app/agents/:agentId (server-side + client-side redirect)
 * - /mission-control → /app/mission-control (redirect)
 * - /dashboard → /app/dashboard (redirect)
 * - All old root-level app routes → /app/* equivalents
 */

// ============================================
// MARKETING ROUTES (Public Funnel)
// ============================================

export const ROUTES = {
  // Marketing pages (public)
  LANDING: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  VERIFY_EMAIL: "/verify-email",
  RESEND_VERIFICATION: "/resend-verification",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  SCAN: "/scan",
  SCAN_PREVIEW: "/scan/preview/:scanId",
  REPORT: "/report/:scanId",
  FREE_REPORT: "/report/free/:reportId",
  FREE_REPORT_SHARE: "/report/free/:reportId/share/:shareToken",
  SHARED_REPORT: "/share/:token",
  HOW_IT_WORKS: "/how-it-works",
  USE_CASES: "/use-cases",
  PRICING: "/pricing",
  EXAMPLES: "/examples",
  EXAMPLE_PREVIEW: "/examples/:exampleId",
  MANAGED_SITE: "/managed-site",
  CREATE_SITE: "/create-site",
  WEBSITE_GENERATOR: "/tools/website-generator",
  SITE_PREVIEW: "/preview/:siteId",
  
  // App core pages (authenticated)
  HOME: "/app",
  DASHBOARD: "/app/dashboard",
  MISSION_CONTROL: "/app/mission-control",
  SELECT_SITE: "/app/select-site",
  
  // Crew system
  CREW: "/app/crew",
  AGENTS: "/app/agents",
  AGENT_DETAIL: "/app/agents/:agentId",
  
  // Feature pages (crew-specific tools that have dedicated routes)
  KEYWORDS: "/app/keywords",
  AUTHORITY: "/app/authority",
  SPEEDSTER: "/app/speedster",
  SOCRATES: "/app/socrates",
  
  // Reports
  WEBSITE_REPORT: "/app/reports/website",
  DEVELOPER_REPORT: "/app/reports/developer",
  
  // System pages
  TICKETS: "/app/tickets",
  CHANGES: "/app/changes",
  RUNS: "/app/runs",
  RUN_DETAIL: "/app/runs/:runId",
  AUDIT: "/app/audit",
  BENCHMARKS: "/app/benchmarks",
  ACHIEVEMENTS: "/app/achievements",
  
  // Settings & Configuration
  INTEGRATIONS: "/app/integrations",
  SETTINGS: "/app/settings",
  SETTINGS_WEBSITES: "/app/settings/websites",
  SETTINGS_WEBSITE_DETAIL: "/app/settings/websites/:siteId",
  SITES: "/app/sites",
  SITE_DETAIL: "/app/sites/:siteId",
  SITE_NEW: "/app/sites/new",
  HELP: "/app/help",
  
  // Developer pages
  DEV_PALETTE: "/app/dev/palette",
  DEV_LINEAGE: "/app/dev/lineage",
  
  // Legal pages (public)
  TERMS: "/terms",
  PRIVACY: "/privacy",
} as const;

// ============================================
// ROUTE BUILDERS
// ============================================

export const buildRoute = {
  // Marketing route builders
  scanPreview: (scanId: string) => `/scan/preview/${scanId}`,
  report: (scanId: string) => `/report/${scanId}`,
  freeReport: (reportId: string) => `/report/free/${reportId}`,
  freeReportShare: (reportId: string, shareToken: string) => `/report/free/${reportId}/share/${shareToken}`,
  sharedReport: (token: string) => `/share/${token}`,
  examplePreview: (exampleId: string) => `/examples/${exampleId}`,
  sitePreview: (siteId: string, token?: string) => token ? `/preview/${siteId}?token=${token}` : `/preview/${siteId}`,
  
  // App route builders
  agent: (agentId: string) => `/app/agents/${agentId}`,
  run: (runId: string) => `/app/runs/${runId}`,
  site: (siteId: string) => `/app/sites/${siteId}`,
  settingsTab: (tab: string) => `/app/settings?tab=${tab}`,
  settingsWebsite: (siteId: string) => `/app/settings/websites/${siteId}`,
} as const;

// ============================================
// DEPRECATED ROUTES → REDIRECT TARGETS
// These are old routes that should redirect to new /app/* paths
// ============================================

export const DEPRECATED_ROUTES: Record<string, string | ((params: Record<string, string>) => string)> = {
  // Old root-level app routes → new /app/* routes
  "/dashboard": ROUTES.DASHBOARD,
  "/mission-control": ROUTES.MISSION_CONTROL,
  "/crew": ROUTES.CREW,
  "/agents": ROUTES.AGENTS,
  "/keywords": ROUTES.KEYWORDS,
  "/authority": ROUTES.AUTHORITY,
  "/speedster": ROUTES.SPEEDSTER,
  "/socrates": ROUTES.SOCRATES,
  "/tickets": ROUTES.TICKETS,
  "/changes": ROUTES.CHANGES,
  "/runs": ROUTES.RUNS,
  "/audit": ROUTES.AUDIT,
  "/benchmarks": ROUTES.BENCHMARKS,
  "/achievements": ROUTES.ACHIEVEMENTS,
  "/integrations": ROUTES.INTEGRATIONS,
  "/settings": ROUTES.SETTINGS,
  "/settings/websites": ROUTES.SETTINGS_WEBSITES,
  "/sites": ROUTES.SITES,
  "/sites/new": ROUTES.SITE_NEW,
  "/help": ROUTES.HELP,
  "/dev/palette": ROUTES.DEV_PALETTE,
  "/dev/lineage": ROUTES.DEV_LINEAGE,
  
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
  
  // Old agent routes without /app prefix
  "/agents/:agentId": (params) => buildRoute.agent(params.agentId),
  
  // Old run/site routes without /app prefix
  "/runs/:runId": (params) => buildRoute.run(params.runId),
  "/sites/:siteId": (params) => buildRoute.site(params.siteId),
  "/settings/websites/:siteId": (params) => buildRoute.settingsWebsite(params.siteId),
  
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
      if (agentId === "speedster") return ROUTES.SPEEDSTER;
      if (agentId === "socrates") return ROUTES.SOCRATES;
      if (agentId === "lookout") return ROUTES.KEYWORDS;
      if (agentId === "authority") return ROUTES.AUTHORITY;
      return buildRoute.agent(agentId);
    },
  },
  {
    pattern: /^\/agents\/([a-zA-Z0-9_-]+)$/,
    resolve: (match: RegExpMatchArray) => buildRoute.agent(match[1]),
  },
  {
    pattern: /^\/runs\/([a-zA-Z0-9_-]+)$/,
    resolve: (match: RegExpMatchArray) => buildRoute.run(match[1]),
  },
  {
    pattern: /^\/sites\/([a-zA-Z0-9_-]+)$/,
    resolve: (match: RegExpMatchArray) => {
      if (match[1] === "new") return ROUTES.SITE_NEW;
      return buildRoute.site(match[1]);
    },
  },
  {
    pattern: /^\/settings\/websites\/([a-zA-Z0-9_-]+)$/,
    resolve: (match: RegExpMatchArray) => buildRoute.settingsWebsite(match[1]),
  },
];

// ============================================
// ROUTE VALIDATION
// ============================================

const ALL_STATIC_ROUTES = new Set([
  // Marketing routes
  ROUTES.LANDING,
  ROUTES.SCAN,
  ROUTES.SIGNUP,
  ROUTES.HOW_IT_WORKS,
  ROUTES.USE_CASES,
  ROUTES.PRICING,
  ROUTES.MANAGED_SITE,
  
  // App routes
  ROUTES.HOME,
  ROUTES.DASHBOARD,
  ROUTES.MISSION_CONTROL,
  ROUTES.SELECT_SITE,
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
  ROUTES.SETTINGS_WEBSITES,
  ROUTES.SITES,
  ROUTES.SITE_NEW,
  ROUTES.HELP,
  ROUTES.DEV_PALETTE,
  ROUTES.DEV_LINEAGE,
  
  // Legal routes
  ROUTES.TERMS,
  ROUTES.PRIVACY,
]);

const DYNAMIC_ROUTE_PATTERNS = [
  // Marketing dynamic routes
  /^\/scan\/preview\/[a-zA-Z0-9_-]+$/,
  /^\/report\/[a-zA-Z0-9_-]+$/,
  /^\/report\/free\/[a-zA-Z0-9_-]+$/,
  /^\/report\/free\/[a-zA-Z0-9_-]+\/share\/[a-zA-Z0-9_-]+$/,
  /^\/share\/[a-zA-Z0-9_-]+$/,
  /^\/examples\/[a-zA-Z0-9_-]+$/,
  
  // App dynamic routes
  /^\/app\/agents\/[a-zA-Z0-9_-]+$/,
  /^\/app\/runs\/[a-zA-Z0-9_-]+$/,
  /^\/app\/sites\/[a-zA-Z0-9_-]+$/,
  /^\/app\/settings\/websites\/[a-zA-Z0-9_-]+$/,
];

export function isValidRoute(path: string): boolean {
  const basePath = path.split("?")[0].split("#")[0];
  
  if (ALL_STATIC_ROUTES.has(basePath)) return true;
  
  for (const pattern of DYNAMIC_ROUTE_PATTERNS) {
    if (pattern.test(basePath)) return true;
  }
  
  return false;
}

export function resolveDeprecatedRoute(path: string): string | null {
  if (DEPRECATED_ROUTES[path]) {
    const target = DEPRECATED_ROUTES[path];
    if (typeof target === "string") return target;
  }
  
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

export function getSafeRoute(
  targetRoute: string,
  fallbackRoute: string = ROUTES.DASHBOARD
): string {
  const redirected = resolveDeprecatedRoute(targetRoute);
  if (redirected) return redirected;
  
  if (isValidRoute(targetRoute)) return targetRoute;
  
  console.warn(`[Routes] Invalid route "${targetRoute}", falling back to "${fallbackRoute}"`);
  return fallbackRoute;
}

export function getPostActionRoute(
  currentRoute: string,
  preferredRoute?: string
): string {
  if (preferredRoute && isValidRoute(preferredRoute)) {
    return preferredRoute;
  }
  
  if (isValidRoute(currentRoute)) {
    return currentRoute;
  }
  
  return ROUTES.DASHBOARD;
}

// ============================================
// ROUTE TYPE HELPERS
// ============================================

export function isMarketingRoute(path: string): boolean {
  const basePath = path.split("?")[0].split("#")[0];
  const marketingPaths = [
    ROUTES.LANDING,
    ROUTES.SCAN,
    ROUTES.SIGNUP,
    ROUTES.HOW_IT_WORKS,
    ROUTES.USE_CASES,
    ROUTES.PRICING,
    ROUTES.MANAGED_SITE,
    ROUTES.TERMS,
    ROUTES.PRIVACY,
  ];
  
  if (marketingPaths.includes(basePath as typeof marketingPaths[number])) return true;
  if (/^\/scan\/preview\/[a-zA-Z0-9_-]+$/.test(basePath)) return true;
  if (/^\/report\/[a-zA-Z0-9_-]+$/.test(basePath)) return true;
  
  return false;
}

export function isAppRoute(path: string): boolean {
  const basePath = path.split("?")[0].split("#")[0];
  return basePath.startsWith("/app");
}

// ============================================
// KNOWN AGENT IDS (for validation)
// Service IDs as defined in client/src/config/agents.ts
// ============================================

export const KNOWN_AGENT_IDS = [
  "competitive_snapshot",
  "serp_intel",
  "google_data_connector",
  "crawl_render",
  "core_web_vitals",
  "content_decay",
  "content_generator",
  "backlink_authority",
  "seo_kbase",
  "ai_optimization",
  "google_ads_connector",
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
  "draper": "google_ads_connector",
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
  "google_ads_connector": "google_ads_connector",
};

export function resolveAgentSlug(slug: string): string {
  return SLUG_TO_SERVICE_ID[slug] || slug;
}
