import { logger } from "./utils/logger";
import { getServiceBySlug, SERVICE_SECRET_MAP, ServiceSecretMapping } from "@shared/serviceSecretMap";
import { computeKeyFingerprint } from "./diagnosticsRunner";

export interface WorkerConfig {
  base_url: string | null;
  api_key: string | null;
  api_key_fingerprint: string | null;
  health_path: string;
  start_path: string;
  status_path: string;
  raw: any;
  valid: boolean;
  error: string | null;
  secretName: string | null;
  rawValueType: "json" | "string" | "null";
  parseError: string | null;
}

export interface ServiceConfigDebug {
  serviceSlug: string;
  envVar: string | null;
  baseUrlEnvVar: string | null;
  envVarFound: boolean;
  baseUrlFound: boolean;
  rawValueType: "json" | "string" | "null";
  parsed: {
    base_url_present: boolean;
    api_key_present: boolean;
    base_url: string | null;
    health_path: string;
  };
  parseError: string | null;
  finalState: "ready" | "needs_config" | "blocked" | "error";
  blockingReason: string | null;
}

const DEFAULT_CONFIG: WorkerConfig = {
  base_url: null,
  api_key: null,
  api_key_fingerprint: null,
  health_path: "/health",
  start_path: "/api/run",
  status_path: "/api/status",
  raw: null,
  valid: false,
  error: null,
  secretName: null,
  rawValueType: "null",
  parseError: null,
};

async function getIntegrationBaseUrl(serviceSlug: string): Promise<string | null> {
  try {
    const { storage } = await import("./storage");
    const integration = await storage.getIntegrationById(serviceSlug);
    if (integration?.baseUrl) {
      return integration.baseUrl.trim().replace(/\/+$/, "");
    }
  } catch (err: any) {
    logger.debug("WorkerConfig", `Could not fetch integration base_url for ${serviceSlug}: ${err.message}`);
  }
  return null;
}

export async function resolveWorkerConfig(
  serviceSlug: string,
  siteId?: string
): Promise<WorkerConfig> {
  const mapping = getServiceBySlug(serviceSlug);

  if (!mapping) {
    return {
      ...DEFAULT_CONFIG,
      error: `Service not found in mapping: ${serviceSlug}`,
    };
  }

  if (mapping.type === "planned") {
    return {
      ...DEFAULT_CONFIG,
      error: `Service is planned but not yet built: ${serviceSlug}`,
    };
  }

  // Infrastructure services that don't need external config
  if (!mapping.requiresBaseUrl && !mapping.envVar) {
    return {
      ...DEFAULT_CONFIG,
      valid: true,
      error: null,
      secretName: `internal:${serviceSlug}`,
      rawValueType: "null",
    };
  }

  // Resolve API key from env var
  const apiKey = mapping.envVar ? process.env[mapping.envVar] || null : null;

  // Resolve base URL: env var first, then integrations database
  let baseUrl = mapping.baseUrlEnvVar ? process.env[mapping.baseUrlEnvVar] || null : null;

  if (!baseUrl) {
    baseUrl = await getIntegrationBaseUrl(serviceSlug);
    if (baseUrl) {
      logger.info("WorkerConfig", `Found base_url in integrations database for ${serviceSlug}`);
    }
  }

  const normalizedBaseUrl = baseUrl ? baseUrl.trim().replace(/\/+$/, "") : null;
  const apiKeyFingerprint = apiKey ? computeKeyFingerprint(apiKey) : null;

  logger.info("WorkerConfig", `Resolving config for ${serviceSlug}`, {
    hasApiKey: !!apiKey,
    hasBaseUrl: !!normalizedBaseUrl,
    baseUrl: normalizedBaseUrl,
  });

  if (mapping.requiresBaseUrl && !normalizedBaseUrl) {
    return {
      ...DEFAULT_CONFIG,
      secretName: `env:${mapping.envVar || mapping.baseUrlEnvVar}`,
      rawValueType: apiKey ? "string" : "null",
      api_key: apiKey,
      api_key_fingerprint: apiKeyFingerprint,
      base_url: null,
      valid: false,
      error: `Base URL not configured. Set ${mapping.baseUrlEnvVar} env var or configure in Integrations.`,
    };
  }

  return {
    base_url: normalizedBaseUrl,
    api_key: apiKey,
    api_key_fingerprint: apiKeyFingerprint,
    health_path: mapping.workerEndpoints?.health || "/health",
    start_path: mapping.workerEndpoints?.run || "/api/run",
    status_path: "/api/status",
    raw: { source: "env_vars" },
    valid: true,
    error: null,
    secretName: `env:${mapping.envVar || mapping.baseUrlEnvVar}`,
    rawValueType: apiKey ? "string" : "null",
    parseError: null,
  };
}

export async function getServiceConfigDebug(
  serviceSlug: string,
  siteId?: string
): Promise<ServiceConfigDebug> {
  const mapping = getServiceBySlug(serviceSlug);

  if (!mapping) {
    return {
      serviceSlug,
      envVar: null,
      baseUrlEnvVar: null,
      envVarFound: false,
      baseUrlFound: false,
      rawValueType: "null",
      parsed: {
        base_url_present: false,
        api_key_present: false,
        base_url: null,
        health_path: "/health",
      },
      parseError: null,
      finalState: "error",
      blockingReason: `Service not found in SERVICE_SECRET_MAP: ${serviceSlug}`,
    };
  }

  if (mapping.type === "planned") {
    return {
      serviceSlug,
      envVar: mapping.envVar || null,
      baseUrlEnvVar: mapping.baseUrlEnvVar || null,
      envVarFound: false,
      baseUrlFound: false,
      rawValueType: "null",
      parsed: {
        base_url_present: false,
        api_key_present: false,
        base_url: null,
        health_path: "/health",
      },
      parseError: null,
      finalState: "blocked",
      blockingReason: "Service is planned but not yet built",
    };
  }

  const config = await resolveWorkerConfig(serviceSlug, siteId);

  let finalState: "ready" | "needs_config" | "blocked" | "error" = "ready";
  let blockingReason: string | null = null;

  if (!config.valid) {
    if (mapping.requiresBaseUrl && !config.base_url) {
      finalState = "needs_config";
      blockingReason = `Set ${mapping.baseUrlEnvVar} in environment`;
    } else if (!config.api_key) {
      finalState = "needs_config";
      blockingReason = `Set ${mapping.envVar} in environment`;
    } else {
      finalState = "error";
      blockingReason = config.error || "Unknown config error";
    }
  }

  return {
    serviceSlug,
    envVar: mapping.envVar || null,
    baseUrlEnvVar: mapping.baseUrlEnvVar || null,
    envVarFound: !!config.api_key,
    baseUrlFound: !!config.base_url,
    rawValueType: config.rawValueType,
    parsed: {
      base_url_present: !!config.base_url,
      api_key_present: !!config.api_key,
      base_url: config.base_url,
      health_path: config.health_path,
    },
    parseError: config.parseError,
    finalState,
    blockingReason,
  };
}

export function getAllServiceMappings(): ServiceSecretMapping[] {
  return SERVICE_SECRET_MAP;
}
