import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * BYOK (Bring Your Own Key) Secret Vault
 * Implements AES-256-GCM envelope encryption for storing tenant third-party provider keys.
 * Raw API keys are never stored in plaintext or returned to the browser.
 */

export interface EncryptedVaultPayload {
  cipherText: string; // Base64
  iv: string;         // Base64 (12 bytes)
  authTag: string;    // Base64 (16 bytes)
  keyVersion: string;
}

let ephemeralMasterKey: Buffer | null = null;

/**
 * Resolves the AES-256 master key that wraps every stored provider secret.
 *
 * There is deliberately no hardcoded fallback. A constant such as
 * "morvexa_master_vault_key_32bytes" is public knowledge, so anyone who read
 * the repository could decrypt the tenant keys in any deployment that forgot
 * to set ENCRYPTION_MASTER_KEY.
 *
 * Instead:
 *   - a configured ENCRYPTION_MASTER_KEY always wins;
 *   - outside production, a random per-process key is generated so local
 *     development and the test suite keep working, but it is unguessable and
 *     dies with the process (so sandbox ciphertext is not portable, which is
 *     the correct trade-off);
 *   - in production with no key configured, this throws, so a misconfigured
 *     deployment fails loudly instead of silently writing weakly-wrapped
 *     secrets to durable storage.
 */
function getMasterKey(): Buffer {
  const envKey = process.env.ENCRYPTION_MASTER_KEY;
  if (envKey && envKey.length >= 32) {
    return Buffer.from(envKey.slice(0, 32), "utf-8");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing ENCRYPTION_MASTER_KEY (min 32 chars). Set it before storing provider credentials."
    );
  }

  ephemeralMasterKey ??= randomBytes(32);
  return ephemeralMasterKey;
}

/** Test helper: forces a new random master key. */
export function resetEphemeralMasterKey(): void {
  ephemeralMasterKey = null;
}

/**
 * Encrypts a customer-provided third-party key using AES-256-GCM.
 */
export function encryptProviderSecret(plainSecret: string): EncryptedVaultPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKey(), iv);

  let encrypted = cipher.update(plainSecret.trim(), "utf-8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    cipherText: encrypted,
    iv: iv.toString("base64"),
    authTag,
    keyVersion: "v1",
  };
}

/**
 * Decrypts an encrypted vault payload strictly within server-side memory.
 */
export function decryptProviderSecret(payload: EncryptedVaultPayload): string {
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const decipher = createDecipheriv("aes-256-gcm", getMasterKey(), iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(payload.cipherText, "base64", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

/**
 * Masks a third-party key for safe presentation in tenant dashboards.
 * Example: sk-ant-api03-abcdef123456 -> sk-ant-...3456
 */
export function maskProviderKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}
