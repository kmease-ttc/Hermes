import { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
import { logger } from "../utils/logger";

const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedSecret {
  value: string;
  expiresAt: number;
}

export class BitwardenProvider implements VaultProvider {
  private accessToken: string;
  private baseUrl: string;
  private secretCache: Map<string, CachedSecret> = new Map();

  constructor() {
    this.accessToken = process.env.BWS_ACCESS_TOKEN || process.env.BITWARDEN_ACCESS_TOKEN || '';
    this.baseUrl = process.env.BITWARDEN_API_URL || 'https://api.bitwarden.com';
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  async getSecret(secretId: string): Promise<string | null> {
    if (!this.accessToken) {
      logger.warn('Vault', 'Bitwarden access token not configured');
      return null;
    }

    const cached = this.secretCache.get(secretId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const response = await fetch(`${this.baseUrl}/secrets/${secretId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn('Vault', `Secret not found: ${secretId}`);
          return null;
        }
        throw new Error(`Bitwarden API error: ${response.status}`);
      }

      const data = await response.json();
      const value = data.value || data.secret || '';

      this.secretCache.set(secretId, {
        value,
        expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
      });

      logger.info('Vault', `Retrieved secret: ${this.maskId(secretId)}`);
      return value;
    } catch (error: any) {
      logger.error('Vault', `Failed to retrieve secret: ${this.maskId(secretId)}`, { 
        error: error.message 
      });
      return null;
    }
  }

  async getSecrets(secretIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const id of secretIds) {
      const value = await this.getSecret(id);
      if (value) {
        results.set(id, value);
      }
    }
    
    return results;
  }

  async healthCheck(): Promise<VaultHealthStatus> {
    if (!this.accessToken) {
      return {
        connected: false,
        provider: 'bitwarden',
        lastCheck: new Date(),
        error: 'Access token not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/accounts/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          connected: false,
          provider: 'bitwarden',
          lastCheck: new Date(),
          error: `API returned ${response.status}`,
        };
      }

      return {
        connected: true,
        provider: 'bitwarden',
        lastCheck: new Date(),
      };
    } catch (error: any) {
      return {
        connected: false,
        provider: 'bitwarden',
        lastCheck: new Date(),
        error: error.message,
      };
    }
  }

  async listSecrets(): Promise<VaultSecretMeta[]> {
    if (!this.accessToken) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/secrets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn('Vault', `Failed to list secrets: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const secrets = data.data || data.secrets || [];

      return secrets.map((s: any) => ({
        id: s.id,
        key: s.key || s.name || 'Unknown',
        maskedValue: this.maskValue(s.value),
        createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
      }));
    } catch (error: any) {
      logger.error('Vault', 'Failed to list secrets', { error: error.message });
      return [];
    }
  }

  private maskId(id: string): string {
    if (id.length <= 8) return '****';
    return `...${id.slice(-4)}`;
  }

  private maskValue(value?: string): string {
    if (!value || value.length < 4) return '****';
    return `****${value.slice(-4)}`;
  }

  clearCache(): void {
    this.secretCache.clear();
  }
}

export const bitwardenProvider = new BitwardenProvider();
