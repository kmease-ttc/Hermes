/**
 * Canonical mapping of environment variables to services.
 * This is the single source of truth for service configuration.
 *
 * All worker config (base URL + API key) is resolved from environment variables
 * set in the Vercel dashboard (or .env.local for development).
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
  type: ServiceType;
  requiresBaseUrl: boolean;        // Workers need base_url, infrastructure does not
  category: "google" | "analysis" | "content" | "infrastructure" | "execution";
  envVar?: string;                 // Env var for API key
  baseUrlEnvVar?: string;          // Env var for base URL
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
  // Infrastructure Services
  {
    serviceSlug: "audit_log",  // Matches catalog
    displayName: "Audit Log & Observability",
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    envVar: "SEO_AUDIT_LOG_API_KEY",
    baseUrlEnvVar: "SEO_AUDIT_LOG_BASE_URL",
  },
  {
    serviceSlug: "orchestrator",  // Matches catalog
    displayName: "Orchestrator / Job Runner",
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    envVar: "SEO_ORCHESTRATOR_API_KEY",
    baseUrlEnvVar: "SEO_ORCHESTRATOR_BASE_URL",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "infrastructure",
    envVar: "SEO_NOTIFICATIONS_API_KEY",
    baseUrlEnvVar: "SEO_NOTIFICATIONS_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/run"
    }
  },

  // Google Connectors (worker-based - calls external worker with api_key)
  {
    serviceSlug: "google_data_connector",  // Matches catalog
    displayName: "Google Data Connector (GSC + GA4)",
    type: "worker",
    requiresBaseUrl: true,
    category: "google",
    envVar: "SEO_GOOGLE_CONNECTOR_API_KEY",
    baseUrlEnvVar: "SEO_GOOGLE_CONNECTOR_BASE_URL",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SERP_INTELLIGENCE_API_KEY",
    baseUrlEnvVar: "SERP_INTELLIGENCE_BASE_URL",
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/serp/sites",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SEO_TECHNICAL_CRAWLER_API_KEY",
    baseUrlEnvVar: "SEO_TECHNICAL_CRAWLER_BASE_URL",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SEO_CORE_WEB_VITALS_API_KEY",
    baseUrlEnvVar: "SEO_CORE_WEB_VITALS_BASE_URL",
    workerEndpoints: {
      health: "/api/health",
      smokeTest: "/api/health",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SEO_BACKLINKS_API_KEY",
    baseUrlEnvVar: "SEO_BACKLINKS_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",
      capabilities: "/capabilities",
      authCheck: "/auth/check",
      run: "/backlinks/authority/refresh"
    }
  },
  {
    serviceSlug: "competitive_snapshot",  // Matches catalog
    displayName: "Competitive Intelligence",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SEO_COMPETITIVE_INTEL_API_KEY",
    baseUrlEnvVar: "SEO_COMPETITIVE_INTEL_BASE_URL",
    workerEndpoints: {
      health: "/health",
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
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    envVar: "SEO_BLOG_WRITER_API_KEY",
    baseUrlEnvVar: "SEO_BLOG_WRITER_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/run"
    }
  },
  {
    serviceSlug: "content_decay",  // Matches catalog
    displayName: "Content Decay Monitor",
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    envVar: "SEO_CONTENT_DECAY_MONITOR_API_KEY",
    baseUrlEnvVar: "SEO_CONTENT_DECAY_MONITOR_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/run"
    }
  },
  {
    serviceSlug: "content_qa",  // Matches catalog
    displayName: "Content QA / Policy Validator",
    type: "worker",
    requiresBaseUrl: true,
    category: "content",
    envVar: "SEO_CONTENT_QA_API_KEY",
    baseUrlEnvVar: "SEO_CONTENT_QA_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/health",
      capabilities: "/capabilities",
      run: "/validate"
    }
  },
  {
    serviceSlug: "seo_kbase",  // Matches catalog
    displayName: "SEO Knowledge Base",
    type: "worker",
    requiresBaseUrl: true,
    category: "analysis",
    envVar: "SEO_KBASE_API_KEY",
    baseUrlEnvVar: "SEO_KBASE_BASE_URL",
    workerEndpoints: {
      health: "/health",
      smokeTest: "/smoke-test",
      capabilities: "/capabilities",
      run: "/run"
    }
  },
  {
    serviceSlug: "technical_seo",
    displayName: "Technical SEO (Unified)",
    type: "infrastructure",  // Internal orchestration service
    requiresBaseUrl: false,  // Calls crawl_render, core_web_vitals, content_decay internally
    category: "analysis",
    workerEndpoints: {
      health: "/api/health",
      run: "/api/agents/technical-seo/run"
    }
  },

  // Planned / Not Built Yet
  {
    serviceSlug: "google_ads_connector",  // Matches catalog
    displayName: "Google Ads",
    type: "planned",
    requiresBaseUrl: false,
    category: "google"
  },
  {
    serviceSlug: "site_executor",  // Matches catalog
    displayName: "Site Change Executor",
    type: "worker",
    requiresBaseUrl: true,
    category: "execution",
    envVar: "SEO_DEPLOYER_API_KEY",
    baseUrlEnvVar: "SEO_DEPLOYER_BASE_URL",
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

export function getWorkerServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "worker");
}

export function getPlannedServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.type === "planned");
}

export function getConfiguredServices(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP.filter(s => s.envVar || s.baseUrlEnvVar);
}

// Config state types
export type ConfigState = "ready" | "needs_config" | "blocked";

export interface ServiceConfigStatus {
  serviceSlug: string;
  displayName: string;
  configState: ConfigState;
  envVarPresent: boolean;
  connectionConfigPresent: boolean;  // base_url + api_key for workers
  blockingReason: string | null;
  type: ServiceType;
  category: string;
}

/**
 * Determine the configuration state for a service based on environment variables.
 *
 * Rules:
 * 1. If service is planned/not built: configState = blocked
 * 2. If env var is missing: configState = needs_config
 * 3. If worker env var exists but base_url is missing: configState = needs_config
 * 4. Otherwise: configState = ready
 *
 * IMPORTANT: "Ready" means the service CAN be connected, not that it HAS returned outputs.
 */
export function determineConfigState(
  mapping: ServiceSecretMapping,
  hasApiKey: boolean,
  hasBaseUrl: boolean
): ServiceConfigStatus {
  // Planned services are blocked
  if (mapping.type === "planned") {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "blocked",
      envVarPresent: false,
      connectionConfigPresent: false,
      blockingReason: "Not built yet",
      type: mapping.type,
      category: mapping.category
    };
  }

  // Infrastructure services that don't need external config
  if (!mapping.requiresBaseUrl && !mapping.envVar) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "ready",
      envVarPresent: true,
      connectionConfigPresent: true,
      blockingReason: null,
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
      envVarPresent: hasApiKey,
      connectionConfigPresent: false,
      blockingReason: `Set ${mapping.baseUrlEnvVar} in environment`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // API key missing but base URL present
  if (!hasApiKey && mapping.envVar) {
    return {
      serviceSlug: mapping.serviceSlug,
      displayName: mapping.displayName,
      configState: "needs_config",
      envVarPresent: false,
      connectionConfigPresent: false,
      blockingReason: `Set ${mapping.envVar} in environment`,
      type: mapping.type,
      category: mapping.category
    };
  }

  // Ready
  return {
    serviceSlug: mapping.serviceSlug,
    displayName: mapping.displayName,
    configState: "ready",
    envVarPresent: hasApiKey,
    connectionConfigPresent: true,
    blockingReason: null,
    type: mapping.type,
    category: mapping.category
  };
}
