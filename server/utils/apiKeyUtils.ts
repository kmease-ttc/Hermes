import crypto from "crypto";

const API_KEY_PREFIX = "ark";
const KEY_LENGTH = 32;

export function generateApiKey(environment: "prod" | "dev" = "prod"): {
  plaintext: string;
  hashedKey: string;
  prefix: string;
} {
  const randomBytes = crypto.randomBytes(KEY_LENGTH);
  const randomPart = randomBytes.toString("base64url").slice(0, 32);
  
  const plaintext = `${API_KEY_PREFIX}_${environment}_${randomPart}`;
  const prefix = plaintext.slice(0, 16);
  const hashedKey = hashApiKey(plaintext);
  
  return { plaintext, hashedKey, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function isValidHashedKey(hashedKey: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hashedKey);
}

export function verifyApiKey(plaintext: string, hashedKey: string): boolean {
  const computedHash = hashApiKey(plaintext);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hashedKey, "hex")
  );
}

export function maskApiKey(prefix: string): string {
  return `${prefix}${"*".repeat(20)}`;
}

export function generateKeyId(): string {
  return crypto.randomUUID();
}

export const AVAILABLE_SCOPES = [
  { id: "read", label: "Read", description: "Read access to data" },
  { id: "write", label: "Write", description: "Write access to data" },
  { id: "empathy:apply", label: "Empathy Apply", description: "Apply changes to Empathy Health site" },
  { id: "empathy:preview", label: "Empathy Preview", description: "Preview changes to Empathy Health site" },
  { id: "diagnostics:run", label: "Run Diagnostics", description: "Run diagnostic scans" },
  { id: "workers:execute", label: "Execute Workers", description: "Execute worker services" },
] as const;

export type ApiKeyScope = typeof AVAILABLE_SCOPES[number]["id"];
