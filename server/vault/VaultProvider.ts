export interface SecretValue {
  key: string;
  value: string;
}

export interface VaultHealthStatus {
  connected: boolean;
  provider: string;
  lastCheck: Date | null;
  error?: string;
}

export interface VaultSecret {
  id: string;
  key: string;
  value: string;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VaultSecretMeta {
  id: string;
  key: string;
  maskedValue: string;
  createdAt?: Date;
}

export interface VaultProvider {
  getSecret(secretId: string): Promise<string | null>;
  getSecrets(secretIds: string[]): Promise<Map<string, string>>;
  healthCheck(): Promise<VaultHealthStatus>;
  listSecrets?(): Promise<VaultSecretMeta[]>;
  isConfigured(): boolean;
}
