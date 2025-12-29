/**
 * Canonical mapping of Bitwarden secrets to services.
 * This is the single source of truth for service configuration.
 * 
 * IMPORTANT: Never use fuzzy matching or string inference.
 * All mappings must be explicit.
 */

export type ServiceType = 
  | "infrastructure"  // Internal Hermes modules (no base_url needed)
  | "connector"       // Data connectors (Google, etc.)
  | "worker"          // Remote worker services (need base_url + api_key)
  | "planned";        // Not yet built

export interface ServiceSecretMapping {
  serviceSlug: string;
  displayName: string;
  bitwardenSecret: string | null;  // Primary/preferred secret name (null = no secret needed or planned)
  aliasSecrets?: string[];         // Alternative secret names to try if preferred is not found (order matters)
  type: ServiceType;
  requiresBaseUrl: boolean;        // Workers need base_url, infrastructure does not
  category: "google" | "analysis" | "content" | "infrastructure" | "execution";
  fallbackEnvVar?: string;         // Optional: env var for API key fallback when Bitwarden secret not JSON
  fallbackBaseUrlEnvVar?: string;  // Optional: env var for base URL fallback
  workerEndpoints?: Record<string, string>;  // Worker API endpoints
  requiresBearer?: boolean;        // Optional: if true, send Authorization: Bearer header in addition to x-api-key
}

/**
 * Canonical mapping table.
 * 
 * IMPORTANT: serviceSlug MUST match the slug in servicesCatalog.ts
 * Use the exact catalog slugs, not custom names.
 */
export const SERVICE_SECRET_MAP: ServiceSecretMapping[] = [
  // Infrastructure Services (internal to Hermes, no base_url needed)
  {
    serviceSlug: "audit_log",  // Matches catalog
    displayName: "Audit Log & Observability",
    bitwardenSecret: "SEO_Audit_Log",
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    fallbackEnvVar: "SEO_AUDIT_LOG_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_AUDIT_LOG_BASE_URL",
  },
  {
    serviceSlug: "orchestrator",  // Matches catalog
    displayName: "Orchestrator / Job Runner",
    bitwardenSecret: "SEO_Orchestrator",
    aliasSecrets: ["SEO_SCHEDULER_API_KEY", "seo_orchestrator"],
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    fallbackEnvVar: "SEO_ORCHESTRATOR_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_ORCHESTRATOR_BASE_URL",
    workerEndpoints: {
      health: "/api/v1/health",
      smokeTest: "/api/v1/health",
      capabilities: "/api/v1/services",
      run: "/api/v1/services"
    }
  },
  {
    serviceSlug: "notifications",  // Matches catalog
    displayName: "Notifications Service",
    bitwardenSecret: "SEO_Notifications",
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",  // Use /health - worker has no dedicated smoke-test endpoint
      capabilities: "/capabilities",
      run: "/run"
    }
  },

  // Google Connectors (worker-based - calls external worker with api_key)
  {
    serviceSlug: "google_data_connector",  // Matches catalog
    displayName: "Google Data Connector (GSC + GA4)",
    bitwardenSecret: "SEO_Google_Connector",  // JSON: { base_url, api_key }
    type: "worker",
    requiresBaseUrl: true,  // Now uses external worker endpoint
    category: "google",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/smoke-test",
      capabilities: "/capabilities",
      run: "/run"
    }
  },

  // Analysis Workers (need base_url + api_key)
  {
    serviceSlug: "serp_intel",  // Matches catalog
    displayName: "SERP & Keyword Intelligence",
    bitwardenSecret: "SEO_SERP_Keyword",  // Preferred: JSON: { base_url, api_key }
    aliasSecrets: ["SEO_Serp_Keyword", "seo_serp_keyword", "SERP_Intel", "serp_intel"],
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SERP_INTELLIGENCE_API_KEY",  // Replit secret for API key
    fallbackBaseUrlEnvVar: "SERP_INTELLIGENCE_BASE_URL",  // Env var for base URL
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/serp/sites",  // GET endpoint that lists configured sites
      capabilities: "/api/capabilities",
      sites: "/api/serp/sites",
      summary: "/api/serp/summary",
      movers: "/api/serp/movers",
      keywords: "/api/serp/keywords",
      rankingsOverTime: "/api/serp/rankings-over-time",
      competitors: "/api/serp/competitors",
      scanMetadata: "/api/serp/scan-metadata",
      topKeywords: "/api/serp/top-keywords",
      snapshot: "/api/serp/snapshot",
      tasks: "/api/tasks",
      artifacts: "/api/artifacts"
    }
  },
  {
    serviceSlug: "crawl_render",  // Matches catalog
    displayName: "Technical SEO",
    bitwardenSecret: "SEO_Technical_Crawler",  // Preferred: JSON: { base_url, api_key }
    aliasSecrets: ["SEO_technical_crawler", "seo_technical_crawler", "Technical_Crawler", "Crawl_Render"],
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SEO_TECHNICAL_CRAWLER_API_KEY",  // Replit secret for API key
    fallbackBaseUrlEnvVar: "SEO_TECHNICAL_CRAWLER_BASE_URL",  // Env var for base URL
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/smoke-test",
      capabilities: "/api/capabilities",
      run: "/api/run",
      crawlStart: "/api/crawl/start",
      crawlStatus: "/api/crawl/status"
    }
  },
  {
    serviceSlug: "core_web_vitals",  // Matches catalog
    displayName: "Core Web Vitals Monitor",
    bitwardenSecret: "SEO_Vital_Monitor",  // Preferred: JSON: { base_url, api_key }
    aliasSecrets: ["SEO_CORE_WEB_VITALS", "SEO_Core_Web_Vitals", "seo_core_web_vitals", "Core_Web_Vitals", "CWV_Monitor"],
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SEO_CORE_WEB_VITALS_API_KEY",  // Replit secret for API key
    fallbackBaseUrlEnvVar: "SEO_CORE_WEB_VITALS_BASE_URL",  // Env var for base URL
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/health",  // Use health as smoke test since no dedicated smoke endpoint
      capabilities: "/api/capabilities",
      authCheck: "/api/auth/check",
      websites: "/api/v1/websites",
      triggerRun: "/api/v1/runs",
      getRun: "/api/v1/runs",
      results: "/api/v1/websites/:website_id/results/latest",
      timeseries: "/api/v1/websites/:website_id/results/timeseries",
      regressions: "/api/v1/websites/:website_id/regressions",
      summary: "/api/v1/websites/:website_id/summary"
    }
  },
  {
    serviceSlug: "backlink_authority",  // Matches catalog
    displayName: "Backlink & Authority Signals",
    bitwardenSecret: "SEO_Backlinks",  // Preferred: JSON: { base_url (with /api), api_key }
    aliasSecrets: ["SEO_backlinks", "seo_backlinks", "Backlink_Authority", "Backlinks"],
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SEO_BACKLINKS_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_BACKLINKS_BASE_URL",
    workerEndpoints: {
      health: "/health",  // base_url includes /api
      smokeTest: "/health",
      capabilities: "/capabilities",
      authCheck: "/auth/check",
      run: "/backlinks/authority/refresh"
    }
  },
  {
    serviceSlug: "competitive_snapshot",  // Matches catalog
    displayName: "Competitive Intelligence",
    bitwardenSecret: "SEO_Competitive_Intel",  // Preferred
    aliasSecrets: ["SEO_competitive_intel", "seo_competitive_intel", "Competitive_Intel", "Competitive_Snapshot"],
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SEO_COMPETITIVE_INTEL_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_COMPETITIVE_INTEL_BASE_URL",
    workerEndpoints: {
      health: "/health",  // base_url includes /api
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/run",
      authCheck: "/auth/check",
      report: "/report"
    }
  },

  // Content Workers
  {
    serviceSlug: "content_generator",  // Matches catalog
    displayName: "Content Generator",
    bitwardenSecret: "SEO_Blog_Writer",  // Preferred: JSON: { base_url (with /api), api_key }
    aliasSecrets: ["SEO_Content_GENERATOR", "SEO_content_generator", "SEO_blog_writer", "seo_blog_writer", "Blog_Writer", "Content_Generator"],
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    fallbackEnvVar: "SEO_BLOG_WRITER_API_KEY",  // Replit secret for API key
    fallbackBaseUrlEnvVar: "SEO_BLOG_WRITER_BASE_URL",  // Env var for base URL
    workerEndpoints: {
      health: "/health",  // base_url already includes /api
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/run"
    }
  },
  {
    serviceSlug: "content_decay",  // Matches catalog
    displayName: "Content Decay Monitor",
    bitwardenSecret: "SEO_Content_Decay_Monitor",  // Preferred: JSON: { base_url, api_key }
    aliasSecrets: ["SEO_content_decay_monitor", "seo_content_decay_monitor", "Content_Decay_Monitor", "Content_Decay"],
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    fallbackEnvVar: "SEO_CONTENT_DECAY_MONITOR_API_KEY",  // Replit secret for API key
    fallbackBaseUrlEnvVar: "SEO_CONTENT_DECAY_MONITOR_BASE_URL",  // Env var for base URL
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",  // Use /health for smoke test
      capabilities: "/capabilities",
      run: "/run"
    }
  },
  {
    serviceSlug: "content_qa",  // Matches catalog
    displayName: "Content QA / Policy Validator",
    bitwardenSecret: "SEO_Content_Validator",  // Preferred
    aliasSecrets: ["SEO_content_validator", "seo_content_validator", "Content_Validator", "Content_QA"],
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",  // Worker uses /health for smoke test
      capabilities: "/capabilities",
      run: "/validate"
    }
  },
  {
    serviceSlug: "seo_kbase",  // Matches catalog
    displayName: "SEO Knowledge Base",
    bitwardenSecret: "SEO_KBASE",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    fallbackEnvVar: "SEO_KBASE_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_KBASE_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/smoke-test",
      capabilities: "/capabilities",
      run: "/run"
    }
  },

  // Planned / Not Built Yet
  {
    serviceSlug: "google_ads_connector",  // Matches catalog
    displayName: "Google Ads",
    bitwardenSecret: null,
    type: "planned",
    requiresBaseUrl: false,
    category: "google"
  },
  {
    serviceSlug: "site_executor",  // Matches catalog
    displayName: "Site Change Executor",
    bitwardenSecret: "SEO_DEPLOYER",
    aliasSecrets: ["SEO_Deployer", "seo_deployer", "Site_Executor"],
    type: "worker",
    requiresBaseUrl: true,
    category: "execution",
    fallbackEnvVar: "SEO_DEPLOYER_API_KEY",
    fallbackBaseUrlEnvVar: "SEO_DEPLOYER_BASE_URL",
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/smoke-test",
      capabilities: "/api/capabilities",
      run: "/api/run",
      createPr: "/api/pr/create",
      prStatus: "/api/pr/status"
    }
  }
];

// Helper functions for lookups
export function getServiceBySlug(slug: string): ServiceSecretMapping | undefined {
  return SERVICE_SECRET_MAP.find(s => s.serviceSlug === slug);
}

export function getServiceBySecret(secretName: string): ServiceSecretMapping | undefined {
  return SERVICE_SECRET_MAP.find(s => s.bitwardenSecret === secretName);
}

export function getServicesRequiringSecrets(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.bitwardenSecret !== null);
}

export function getWorkerServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "worker");
}

export function getPlannedServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "planned");
}

// Config state types
export type ConfigState = "ready" | "needs_config" | "blocked";

export interface ServiceConfigStatus {
  serviceSlug: string;
  displayName: string;
  configState: ConfigState;
  secretPresent: boolean;
  connectionConfigPresent: boolean;  // base_url + api_key for workers
  blockingReason: string | null;
  type: ServiceType;
  category: string;
}

/**
 * Determine the configuration state for a service based on Bitwarden secret status.
 * 
 * Rules:
 * 1. If service is planned/not built: configState = blocked
 * 2. If secret is missing: configState = needs_config
 * 3. If worker secret exists but base_url is missing: configState = needs_config
 * 4. Otherwise: configState = ready
 * 
 * IMPORTANT: "Ready" means the service CAN be connected, not that it HAS returned outputs.
 */
export function determineConfigState(
  mapping: ServiceSecretMapping,
  secretExists: boolean,
  hasBaseUrl: boolean
): ServiceConfigStatus {
  // Planned services are blocked
  if (mapping.type === "planned") {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "blocked",
      secretPresent: false,
      connectionConfigPresent: false,
      blockingReason: "Not built yet",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Secret missing
  if (!secretExists) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      secretPresent: false,
      connectionConfigPresent: false,
      blockingReason: `Bitwarden secret not found: ${mapping.bitwardenSecret}`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // For workers that require base_url, check if it's present
  if (mapping.requiresBaseUrl && !hasBaseUrl) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      secretPresent: true,
      connectionConfigPresent: false,
      blockingReason: "Worker base_url missing in Bitwarden secret",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Ready - secret exists and has required config
  return {
    serviceSlug: mapping.serviceSlug,
    displayName: mapping.displayName,
    configState: "ready",
    secretPresent: true,
    connectionConfigPresent: true,
    blockingReason: null,
    type: mapping.type,
    category: mapping.category
  };
}
