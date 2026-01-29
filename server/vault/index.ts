import type { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
import { logger } from "../utils/logger";

class EnvVaultProvider implements VaultProvider {
  isConfigured(): boolean {
    return true;
  }

  async getSecret(key: string): Promise<string | null> {
    const value = process.env[key];
    return value || null;
  }

  async getSecrets(keys: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    for (const key of keys) {
      const value = process.env[key];
      if (value) {
        results.set(key, value);
      }
    }
    return results;
  }

  async healthCheck(): Promise<VaultHealthStatus> {
    return {
      connected: true,
      provider: 'env',
      lastCheck: new Date(),
    };
  }

  async listSecrets(): Promise<VaultSecretMeta[]> {
    return [];
  }
}

const envProvider = new EnvVaultProvider();

export function getVaultProvider(): VaultProvider {
  return envProvider;
}

export async function resolveIntegrationSecrets(
  integrationType: string,
  vaultProvider: string,
  vaultItemId: string | null,
  metaJson: any
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  switch (integrationType) {
    case 'ga4':
      secrets.propertyId = process.env.GA4_PROPERTY_ID || metaJson?.property_id || '';
      break;
    case 'gsc':
      secrets.siteUrl = process.env.GSC_SITE || metaJson?.property || '';
      break;
    case 'google_ads':
      secrets.customerId = process.env.ADS_CUSTOMER_ID || metaJson?.customer_id || '';
      secrets.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
      break;
    case 'serp':
      secrets.apiKey = process.env.SERP_API_KEY || '';
      break;
    case 'clarity':
      secrets.apiKey = process.env.CLARITY_API_KEY || '';
      break;
    case 'google_oauth':
      secrets.clientId = process.env.GOOGLE_CLIENT_ID || '';
      secrets.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
      break;
  }

  return secrets;
}

export async function checkVaultHealth(): Promise<{
  env: VaultHealthStatus;
}> {
  const envStatus = await envProvider.healthCheck();
  return { env: envStatus };
}

export async function getServiceSecrets(
  serviceName: string
): Promise<{ base_url?: string; api_key?: string } | null> {
  const envKeyMap: Record<string, { baseUrl: string; apiKey: string }> = {
    'seo_kbase': {
      baseUrl: 'SEO_KBASE_BASE_URL',
      apiKey: 'SEO_KBASE_API_KEY'
    },
    'seo_change_executor': {
      baseUrl: 'SEO_CHANGE_EXECUTOR_BASE_URL',
      apiKey: 'SEO_CHANGE_EXECUTOR_API_KEY'
    },
    'seo_serp': {
      baseUrl: 'SEO_SERP_BASE_URL',
      apiKey: 'SEO_SERP_API_KEY'
    },
    'seo_core_web_vitals': {
      baseUrl: 'SEO_CORE_WEB_VITALS_BASE_URL',
      apiKey: 'SEO_CORE_WEB_VITALS_API_KEY'
    },
  };

  const envKeys = envKeyMap[serviceName];
  if (!envKeys) {
    logger.warn("Vault", `Unknown service: ${serviceName}`);
    return null;
  }

  const base_url = process.env[envKeys.baseUrl];
  const api_key = process.env[envKeys.apiKey];

  if (!base_url && !api_key) {
    return null;
  }

  return { base_url, api_key };
}

export type { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
