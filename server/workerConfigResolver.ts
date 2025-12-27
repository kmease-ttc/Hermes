import { logger } from "./utils/logger";
import { bitwardenProvider } from "./vault/BitwardenProvider";
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
  bitwardenSecretName: string | null;
  secretFound: boolean;
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

function normalizeKeys(parsed: any): { base_url: string | null; api_key: string | null; health_path: string; start_path: string; status_path: string } {
  const baseUrl = parsed.base_url || parsed.baseUrl || parsed.url || parsed.host || null;
  const apiKey = parsed.api_key || parsed.apiKey || parsed.key || parsed.token || null;
  const healthPath = parsed.health_path || parsed.healthPath || "/health";
  const startPath = parsed.start_path || parsed.startPath || "/api/run";
  const statusPath = parsed.status_path || parsed.statusPath || "/api/status";

  return {
    base_url: baseUrl ? String(baseUrl).trim().replace(/\/+$/, "") : null,
    api_key: apiKey ? String(apiKey).trim() : null,
    health_path: healthPath,
    start_path: startPath,
    status_path: statusPath,
  };
}

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

async function resolveFromFallbackEnvVars(mapping: ServiceSecretMapping): Promise<WorkerConfig> {
  const apiKey = mapping.fallbackEnvVar ? process.env[mapping.fallbackEnvVar] : null;
  let baseUrl = mapping.fallbackBaseUrlEnvVar ? process.env[mapping.fallbackBaseUrlEnvVar] : null;
  
  // Also check integrations database for base_url if not in env vars
  if (!baseUrl) {
    baseUrl = await getIntegrationBaseUrl(mapping.serviceSlug);
    if (baseUrl) {
      logger.info("WorkerConfig", `Found base_url in integrations database for ${mapping.serviceSlug}`);
    }
  }
  
  const apiKeyFingerprint = apiKey ? computeKeyFingerprint(apiKey) : null;
  const normalizedBaseUrl = baseUrl ? baseUrl.trim().replace(/\/+$/, "") : null;
  
  logger.info("WorkerConfig", `Using fallback env vars for ${mapping.serviceSlug}`, {
    hasApiKey: !!apiKey,
    hasBaseUrl: !!baseUrl,
    baseUrl: normalizedBaseUrl,
  });
  
  if (mapping.requiresBaseUrl && !normalizedBaseUrl) {
    return {
      ...DEFAULT_CONFIG,
      secretName: `env:${mapping.fallbackEnvVar || mapping.fallbackBaseUrlEnvVar}`,
      rawValueType: "string",
      api_key: apiKey || null,
      api_key_fingerprint: apiKeyFingerprint,
      base_url: null,
      valid: false,
      error: `Base URL not configured. Set ${mapping.fallbackBaseUrlEnvVar} env var or configure in Integrations.`,
    };
  }
  
  return {
    base_url: normalizedBaseUrl,
    api_key: apiKey || null,
    api_key_fingerprint: apiKeyFingerprint,
    health_path: mapping.workerEndpoints?.health || "/health",
    start_path: mapping.workerEndpoints?.run || "/api/run",
    status_path: "/api/status",
    raw: { source: "fallback_env_vars" },
    valid: true,
    error: null,
    secretName: `env:${mapping.fallbackEnvVar || mapping.fallbackBaseUrlEnvVar}`,
    rawValueType: "string",
    parseError: null,
  };
}

async function tryGetSecretWithAliases(
  preferredSecret: string,
  aliasSecrets: string[] | undefined
): Promise<{ value: string | null; resolvedName: string }> {
  // Try preferred secret first
  const preferredValue = await bitwardenProvider.getSecret(preferredSecret);
  if (preferredValue) {
    logger.info("WorkerConfig", `Found preferred secret: ${preferredSecret}`);
    return { value: preferredValue, resolvedName: preferredSecret };
  }

  // Try aliases in order
  if (aliasSecrets && aliasSecrets.length > 0) {
    logger.info("WorkerConfig", `Preferred secret not found, trying ${aliasSecrets.length} aliases for ${preferredSecret}`);
    for (const alias of aliasSecrets) {
      const aliasValue = await bitwardenProvider.getSecret(alias);
      if (aliasValue) {
        logger.info("WorkerConfig", `Found alias secret: ${alias} (preferred was: ${preferredSecret})`);
        return { value: aliasValue, resolvedName: alias };
      }
    }
    logger.warn("WorkerConfig", `No aliases found either. Tried: [${preferredSecret}, ${aliasSecrets.join(", ")}]`);
  }

  return { value: null, resolvedName: preferredSecret };
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

  if (!mapping.bitwardenSecret) {
    // Check for fallback env vars (Replit secrets)
    if (mapping.fallbackEnvVar || mapping.fallbackBaseUrlEnvVar) {
      return resolveFromFallbackEnvVars(mapping);
    }
    return {
      ...DEFAULT_CONFIG,
      error: `No Bitwarden secret configured for service: ${serviceSlug}`,
      secretName: null,
    };
  }

  try {
    // Try preferred secret first, then aliases
    const { value: secretValue, resolvedName: secretName } = await tryGetSecretWithAliases(
      mapping.bitwardenSecret,
      mapping.aliasSecrets
    );

    if (!secretValue) {
      // Try fallback env vars before failing
      if (mapping.fallbackEnvVar || mapping.fallbackBaseUrlEnvVar) {
        logger.info("WorkerConfig", `No Bitwarden secrets found, trying fallback env vars for ${serviceSlug}`);
        return resolveFromFallbackEnvVars(mapping);
      }
      return {
        ...DEFAULT_CONFIG,
        secretName: mapping.bitwardenSecret,
        rawValueType: "null",
        error: `Secret not found in Bitwarden: ${mapping.bitwardenSecret}${mapping.aliasSecrets?.length ? ` (also tried aliases: ${mapping.aliasSecrets.join(", ")})` : ""}`,
      };
    }

    const trimmedValue = secretValue.trim();

    if (!trimmedValue.startsWith("{")) {
      // Plain string secret = API key only, try to get base_url from fallback env var or integrations DB
      let baseUrl = mapping.fallbackBaseUrlEnvVar ? process.env[mapping.fallbackBaseUrlEnvVar] : null;
      
      // Also check integrations database for base_url if not in env vars
      if (!baseUrl) {
        baseUrl = await getIntegrationBaseUrl(serviceSlug);
        if (baseUrl) {
          logger.info("WorkerConfig", `Found base_url in integrations database for ${serviceSlug}`);
        }
      }
      
      const normalizedBaseUrl = baseUrl ? baseUrl.trim().replace(/\/+$/, "") : null;
      
      if (mapping.requiresBaseUrl && !normalizedBaseUrl) {
        return {
          ...DEFAULT_CONFIG,
          secretName,
          rawValueType: "string",
          api_key: trimmedValue,
          api_key_fingerprint: computeKeyFingerprint(trimmedValue),
          error: `Secret is API key only, base_url missing. Set in Integrations page or ${mapping.fallbackBaseUrlEnvVar} env var.`,
        };
      }
      
      logger.info("WorkerConfig", `Using Bitwarden API key + base URL for ${serviceSlug}`, {
        secretName,
        baseUrl: normalizedBaseUrl,
      });
      
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "string",
        api_key: trimmedValue,
        api_key_fingerprint: computeKeyFingerprint(trimmedValue),
        base_url: normalizedBaseUrl,
        valid: true,
        error: null,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmedValue);
    } catch (e: any) {
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "string",
        parseError: e.message,
        error: `JSON parse failed: ${e.message}`,
      };
    }

    const normalized = normalizeKeys(parsed);

    if (normalized.base_url && !normalized.base_url.startsWith("http")) {
      // Invalid base_url in Bitwarden secret - try fallback env var
      const fallbackBaseUrl = mapping.fallbackBaseUrlEnvVar ? process.env[mapping.fallbackBaseUrlEnvVar] : null;
      const normalizedFallbackBaseUrl = fallbackBaseUrl ? fallbackBaseUrl.trim().replace(/\/+$/, "") : null;
      
      if (normalizedFallbackBaseUrl && normalizedFallbackBaseUrl.startsWith("http")) {
        logger.info("WorkerConfig", `Invalid Bitwarden base_url for ${serviceSlug}, using fallback env var`, {
          secretName,
          invalidBaseUrl: normalized.base_url,
          fallbackEnvVar: mapping.fallbackBaseUrlEnvVar,
        });
        
        return {
          base_url: normalizedFallbackBaseUrl,
          api_key: normalized.api_key,
          api_key_fingerprint: normalized.api_key ? computeKeyFingerprint(normalized.api_key) : null,
          health_path: normalized.health_path,
          start_path: normalized.start_path,
          status_path: normalized.status_path,
          raw: parsed,
          valid: true,
          error: null,
          secretName,
          rawValueType: "json",
          parseError: null,
        };
      }
      
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "json",
        raw: parsed,
        base_url: normalized.base_url,
        api_key: normalized.api_key,
        api_key_fingerprint: normalized.api_key ? computeKeyFingerprint(normalized.api_key) : null,
        error: `Invalid base_url: must start with http:// or https://`,
      };
    }

    if (mapping.type === "worker" && normalized.base_url && !normalized.base_url.includes("/api")) {
      logger.warn("WorkerConfig", `base_url for ${serviceSlug} should include /api suffix per Gold Standard`, {
        base_url: normalized.base_url,
        recommendation: `${normalized.base_url}/api`,
      });
    }

    // Only require base_url for workers that need it
    // api_key is optional - connection tests can run without it (unauthenticated health checks)
    const apiKeyFingerprint = normalized.api_key ? computeKeyFingerprint(normalized.api_key) : null;
    
    if (mapping.requiresBaseUrl && !normalized.base_url) {
      // Try fallback base URL env var
      const fallbackBaseUrl = mapping.fallbackBaseUrlEnvVar ? process.env[mapping.fallbackBaseUrlEnvVar] : null;
      const normalizedFallbackBaseUrl = fallbackBaseUrl ? fallbackBaseUrl.trim().replace(/\/+$/, "") : null;
      
      if (normalizedFallbackBaseUrl) {
        logger.info("WorkerConfig", `Using Bitwarden API key + fallback base URL for ${serviceSlug}`, {
          secretName,
          fallbackEnvVar: mapping.fallbackBaseUrlEnvVar,
        });
        
        return {
          base_url: normalizedFallbackBaseUrl,
          api_key: normalized.api_key,
          api_key_fingerprint: apiKeyFingerprint,
          health_path: normalized.health_path,
          start_path: normalized.start_path,
          status_path: normalized.status_path,
          raw: parsed,
          valid: true,
          error: null,
          secretName,
          rawValueType: "json",
          parseError: null,
        };
      }
      
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "json",
        raw: parsed,
        base_url: normalized.base_url,
        api_key: normalized.api_key,
        api_key_fingerprint: apiKeyFingerprint,
        health_path: normalized.health_path,
        start_path: normalized.start_path,
        status_path: normalized.status_path,
        valid: false,
        error: `missing base_url. Set ${mapping.fallbackBaseUrlEnvVar} env var.`,
      };
    }

    return {
      base_url: normalized.base_url,
      api_key: normalized.api_key,
      api_key_fingerprint: apiKeyFingerprint,
      health_path: normalized.health_path,
      start_path: normalized.start_path,
      status_path: normalized.status_path,
      raw: parsed,
      valid: true,
      error: null,
      secretName,
      rawValueType: "json",
      parseError: null,
    };
  } catch (error: any) {
    logger.error("WorkerConfig", `Failed to resolve config for ${serviceSlug}`, { error: error.message });
    return {
      ...DEFAULT_CONFIG,
      secretName,
      error: error.message,
    };
  }
}

export async function getServiceConfigDebug(
  serviceSlug: string,
  siteId?: string
): Promise<ServiceConfigDebug> {
  const mapping = getServiceBySlug(serviceSlug);

  if (!mapping) {
    return {
      serviceSlug,
      bitwardenSecretName: null,
      secretFound: false,
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
      bitwardenSecretName: mapping.bitwardenSecret,
      secretFound: false,
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
    if (config.rawValueType === "null") {
      finalState = "needs_config";
      blockingReason = `Secret not found: ${mapping.bitwardenSecret}`;
    } else if (config.parseError) {
      finalState = "error";
      blockingReason = `JSON parse error: ${config.parseError}`;
    } else if (mapping.requiresBaseUrl && !config.base_url) {
      finalState = "needs_config";
      blockingReason = "base_url missing in secret JSON";
    } else if (!config.api_key) {
      finalState = "needs_config";
      blockingReason = "api_key missing in secret JSON";
    } else {
      finalState = "error";
      blockingReason = config.error || "Unknown config error";
    }
  }

  return {
    serviceSlug,
    bitwardenSecretName: mapping.bitwardenSecret,
    secretFound: config.rawValueType !== "null",
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
