import { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
import { bitwardenProvider } from "./BitwardenProvider";
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

export function getVaultProvider(provider: string = 'env'): VaultProvider {
  switch (provider) {
    case 'bitwarden':
      return bitwardenProvider;
    case 'env':
    default:
      return envProvider;
  }
}

export async function resolveIntegrationSecrets(
  integrationType: string,
  vaultProvider: string,
  vaultItemId: string | null,
  metaJson: any
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};
  const provider = getVaultProvider(vaultProvider);

  if (vaultProvider === 'env') {
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
  } else if (vaultProvider === 'bitwarden' && vaultItemId) {
    const secretValue = await provider.getSecret(vaultItemId);
    if (secretValue) {
      try {
        const parsed = JSON.parse(secretValue);
        Object.assign(secrets, parsed);
      } catch {
        secrets.value = secretValue;
      }
    }
  }

  return secrets;
}

export async function checkVaultHealth(): Promise<{
  bitwarden: VaultHealthStatus;
  env: VaultHealthStatus;
}> {
  const [bitwardenStatus, envStatus] = await Promise.all([
    bitwardenProvider.healthCheck(),
    envProvider.healthCheck(),
  ]);

  return {
    bitwarden: bitwardenStatus,
    env: envStatus,
  };
}

export { VaultProvider, VaultHealthStatus, VaultSecretMeta };
export { bitwardenProvider } from "./BitwardenProvider";
