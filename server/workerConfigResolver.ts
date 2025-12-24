import { logger } from "./utils/logger";
import { BitwardenProvider } from "./vault/BitwardenProvider";
import { getServiceBySlug, SERVICE_SECRET_MAP, ServiceSecretMapping } from "@shared/serviceSecretMap";

export interface WorkerConfig {
  base_url: string | null;
  api_key: string | null;
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
    return {
      ...DEFAULT_CONFIG,
      error: `No Bitwarden secret configured for service: ${serviceSlug}`,
      secretName: null,
    };
  }

  const provider = BitwardenProvider.getInstance();
  const secretName = mapping.bitwardenSecret;

  try {
    const secretValue = await provider.getSecret(secretName);

    if (!secretValue) {
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "null",
        error: `Secret not found in Bitwarden: ${secretName}`,
      };
    }

    const trimmedValue = secretValue.trim();

    if (!trimmedValue.startsWith("{")) {
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "string",
        api_key: trimmedValue,
        error: "Secret is plain string (not JSON) - treating as API key only, base_url missing",
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
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "json",
        raw: parsed,
        base_url: normalized.base_url,
        api_key: normalized.api_key,
        error: `Invalid base_url: must start with http:// or https://`,
      };
    }

    // Only require base_url for workers that need it
    // api_key is optional - connection tests can run without it (unauthenticated health checks)
    if (mapping.requiresBaseUrl && !normalized.base_url) {
      return {
        ...DEFAULT_CONFIG,
        secretName,
        rawValueType: "json",
        raw: parsed,
        base_url: normalized.base_url,
        api_key: normalized.api_key,
        health_path: normalized.health_path,
        start_path: normalized.start_path,
        status_path: normalized.status_path,
        valid: false,
        error: "missing base_url",
      };
    }

    return {
      base_url: normalized.base_url,
      api_key: normalized.api_key,
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
