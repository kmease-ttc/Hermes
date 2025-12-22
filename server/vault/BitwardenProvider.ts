import { VaultProvider, VaultHealthStatus, VaultSecretMeta } from "./VaultProvider";
import { logger } from "../utils/logger";

const SECRET_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedSecret {
  value: string;
  expiresAt: number;
}

export type BitwardenStatusReason = 
  | "CONNECTED"
  | "MISSING_TOKEN"
  | "MISSING_PROJECT_ID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PROJECT_NOT_FOUND"
  | "ZERO_SECRETS"
  | "API_ERROR"
  | "NETWORK_ERROR"
  | "SDK_ERROR";

export interface BitwardenStatus {
  connected: boolean;
  reason: BitwardenStatusReason;
  httpStatus?: number;
  projectId: string | null;
  secretsFound: number;
  lastError: string | null;
  secretKeys?: string[];
}

interface SecretData {
  id: string;
  key: string;
  value: string;
  note?: string;
  creationDate?: string;
  revisionDate?: string;
}

export class BitwardenProvider implements VaultProvider {
  private accessToken: string;
  private projectId: string;
  private organizationId: string;
  private secretCache: Map<string, CachedSecret> = new Map();
  private client: any = null;
  private initialized: boolean = false;

  constructor() {
    this.accessToken = process.env.BWS_ACCESS_TOKEN || process.env.BITWARDEN_ACCESS_TOKEN || '';
    this.projectId = process.env.BWS_PROJECT_ID || '';
    // Organization ID can be in env or extracted from token (second part of token is org ID)
    this.organizationId = process.env.BWS_ORGANIZATION_ID || 
      (this.accessToken ? this.accessToken.split('.')[1] : '');
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  hasProjectId(): boolean {
    return !!this.projectId;
  }

  getProjectId(): string | null {
    return this.projectId || null;
  }

  getOrganizationId(): string | null {
    return this.organizationId || null;
  }

  private async getClient(): Promise<any> {
    if (this.client && this.initialized) {
      return this.client;
    }

    try {
      const { BitwardenClient, DeviceType } = await import("@bitwarden/sdk-napi");
      
      const settings: any = {
        apiUrl: process.env.BWS_API_URL || "https://vault.bitwarden.com/api",
        identityUrl: process.env.BWS_IDENTITY_URL || "https://vault.bitwarden.com/identity",
        userAgent: "Hermes-SEO-Orchestrator/1.0.0",
        deviceType: DeviceType.SDK,
      };

      this.client = new BitwardenClient(settings);
      await this.client.auth().loginAccessToken(this.accessToken, null);
      this.initialized = true;
      
      logger.info("Vault", "Bitwarden SDK client initialized successfully");
      return this.client;
    } catch (error: any) {
      logger.error("Vault", "Failed to initialize Bitwarden SDK client", { error: error.message });
      throw error;
    }
  }

  async getDetailedStatus(): Promise<BitwardenStatus> {
    if (!this.accessToken) {
      return {
        connected: false,
        reason: "MISSING_TOKEN",
        projectId: null,
        secretsFound: 0,
        lastError: "BWS_ACCESS_TOKEN not set in environment",
      };
    }

    if (!this.projectId) {
      return {
        connected: false,
        reason: "MISSING_PROJECT_ID",
        projectId: null,
        secretsFound: 0,
        lastError: "BWS_PROJECT_ID not set in environment. Add it to Replit Secrets.",
      };
    }

    try {
      const client = await this.getClient();
      
      // List secrets using organization ID (SDK requires org ID, not project ID)
      logger.info("Vault", `Listing secrets for org: ${this.organizationId.slice(0, 4)}...${this.organizationId.slice(-4)}`);
      const secretsResponse = await client.secrets().list(this.organizationId);
      
      const secrets: SecretData[] = secretsResponse?.data || [];
      const secretKeys = secrets.map((s: SecretData) => s.key);
      
      logger.info("Vault", `Found ${secrets.length} secrets in Bitwarden organization`);

      if (secrets.length === 0) {
        return {
          connected: true,
          reason: "ZERO_SECRETS",
          projectId: this.projectId,
          secretsFound: 0,
          lastError: "Connected, but no secrets found in this project.",
          secretKeys: [],
        };
      }

      return {
        connected: true,
        reason: "CONNECTED",
        projectId: this.projectId,
        secretsFound: secrets.length,
        lastError: null,
        secretKeys,
      };
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      logger.error("Vault", "Bitwarden SDK error", { error: errorMessage });

      if (errorMessage.includes("Unauthorized") || errorMessage.includes("401")) {
        return {
          connected: false,
          reason: "UNAUTHORIZED",
          projectId: this.projectId,
          secretsFound: 0,
          lastError: "Token invalid or expired. Rotate BWS_ACCESS_TOKEN.",
        };
      }

      if (errorMessage.includes("Forbidden") || errorMessage.includes("403")) {
        return {
          connected: false,
          reason: "FORBIDDEN",
          projectId: this.projectId,
          secretsFound: 0,
          lastError: "Machine account doesn't have access to this project.",
        };
      }

      if (errorMessage.includes("not found") || errorMessage.includes("404") || errorMessage.includes("Project")) {
        return {
          connected: false,
          reason: "PROJECT_NOT_FOUND",
          projectId: this.projectId,
          secretsFound: 0,
          lastError: "Project ID is wrong or project doesn't exist.",
        };
      }

      return {
        connected: false,
        reason: "SDK_ERROR",
        projectId: this.projectId,
        secretsFound: 0,
        lastError: `SDK error: ${errorMessage.slice(0, 200)}`,
      };
    }
  }

  async getSecret(secretKey: string): Promise<string | null> {
    if (!this.accessToken) {
      logger.warn('Vault', 'Bitwarden access token not configured');
      return null;
    }

    const cached = this.secretCache.get(secretKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const client = await this.getClient();
      
      const secretsResponse = await client.secrets().list(this.organizationId);
      const secrets: SecretData[] = secretsResponse?.data || [];
      
      const secret = secrets.find((s: SecretData) => s.key === secretKey);
      
      if (!secret) {
        logger.warn('Vault', `Secret not found: ${secretKey}`);
        return null;
      }

      const secretDetails = await client.secrets().get(secret.id);
      const value = secretDetails?.value || '';

      this.secretCache.set(secretKey, {
        value,
        expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
      });

      logger.info('Vault', `Retrieved secret: ${secretKey}`);
      return value;
    } catch (error: any) {
      logger.error('Vault', `Failed to retrieve secret: ${secretKey}`, { 
        error: error.message 
      });
      return null;
    }
  }

  async getSecrets(secretKeys: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    if (!this.accessToken || !this.organizationId) {
      return results;
    }

    try {
      const client = await this.getClient();
      
      const secretsResponse = await client.secrets().list(this.organizationId);
      const secrets: SecretData[] = secretsResponse?.data || [];

      for (const key of secretKeys) {
        const secret = secrets.find((s: SecretData) => s.key === key);
        if (secret) {
          try {
            const secretDetails = await client.secrets().get(secret.id);
            if (secretDetails?.value) {
              results.set(key, secretDetails.value);
              this.secretCache.set(key, {
                value: secretDetails.value,
                expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
              });
            }
          } catch (e: any) {
            logger.warn('Vault', `Failed to get secret value for: ${key}`);
          }
        }
      }
      
      logger.info('Vault', `Retrieved ${results.size}/${secretKeys.length} secrets from Bitwarden`);
    } catch (error: any) {
      logger.error('Vault', 'Failed to get secrets batch', { error: error.message });
    }
    
    return results;
  }

  async healthCheck(): Promise<VaultHealthStatus> {
    const status = await this.getDetailedStatus();
    
    return {
      connected: status.connected,
      provider: 'bitwarden',
      lastCheck: new Date(),
      error: status.lastError || undefined,
      reason: status.reason,
      projectId: status.projectId,
      secretsFound: status.secretsFound,
    } as VaultHealthStatus;
  }

  async listSecrets(): Promise<VaultSecretMeta[]> {
    if (!this.accessToken || !this.organizationId) {
      return [];
    }

    try {
      const client = await this.getClient();
      
      const secretsResponse = await client.secrets().list(this.organizationId);
      const secrets: SecretData[] = secretsResponse?.data || [];

      return secrets.map((s: SecretData) => ({
        id: s.id,
        key: s.key,
        maskedValue: this.maskValue(s.value),
        createdAt: s.creationDate ? new Date(s.creationDate) : undefined,
      }));
    } catch (error: any) {
      logger.error('Vault', 'Failed to list secrets', { error: error.message });
      return [];
    }
  }

  async getAllSecretValues(): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    if (!this.accessToken || !this.organizationId) {
      return results;
    }

    try {
      const client = await this.getClient();
      
      const secretsResponse = await client.secrets().list(this.organizationId);
      const secrets: SecretData[] = secretsResponse?.data || [];

      for (const secret of secrets) {
        try {
          const secretDetails = await client.secrets().get(secret.id);
          if (secretDetails?.value) {
            results.set(secret.key, secretDetails.value);
            this.secretCache.set(secret.key, {
              value: secretDetails.value,
              expiresAt: Date.now() + SECRET_CACHE_TTL_MS,
            });
          }
        } catch (e: any) {
          logger.warn('Vault', `Failed to get secret value for: ${secret.key}`);
        }
      }
      
      logger.info('Vault', `Loaded ${results.size} secret values from Bitwarden`);
    } catch (error: any) {
      logger.error('Vault', 'Failed to get all secret values', { error: error.message });
    }
    
    return results;
  }

  private maskValue(value?: string): string {
    if (!value || value.length < 4) return '****';
    return `****${value.slice(-4)}`;
  }

  clearCache(): void {
    this.secretCache.clear();
    this.client = null;
    this.initialized = false;
  }
}

export const bitwardenProvider = new BitwardenProvider();
