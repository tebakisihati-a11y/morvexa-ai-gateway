/**
 * Morvexa Nexus — Cryptographic API Key Security Module
 * Implements NIST SP 800-63B compliant key generation, SHA-256 hashing, and masking.
 */

import { createHash, randomBytes } from "crypto";

export interface GeneratedApiKey {
  rawSecret: string;
  keyPrefix: "mvx_live_" | "mvx_test_";
  maskedKey: string;
  keyHash: string;
}

/**
 * Generates a cryptographically secure API key with high entropy.
 * Format: mvx_live_<32 hex chars> (e.g. mvx_live_a1b2c3d4e5f60718293a4b5c6d7e8f90)
 */
export function generateSecureApiKey(type: "live" | "test" = "live"): GeneratedApiKey {
  const keyPrefix = type === "live" ? "mvx_live_" : "mvx_test_";
  // 24 bytes of cryptographically secure random entropy produces 48 hex characters
  const entropyHex = randomBytes(24).toString("hex");
  const rawSecret = `${keyPrefix}${entropyHex}`;
  const maskedKey = `${keyPrefix}...${entropyHex.slice(-4)}`;
  const keyHash = hashApiKeySecret(rawSecret);

  return {
    rawSecret,
    keyPrefix,
    maskedKey,
    keyHash,
  };
}

/**
 * Computes the authoritative SHA-256 hex digest of a raw API key secret.
 */
export function hashApiKeySecret(rawSecret: string): string {
  return createHash("sha256").update(rawSecret.trim()).digest("hex");
}

/**
 * Validates whether an incoming token string conforms to the Morvexa key format.
 */
export function isValidApiKeyFormat(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  return /^mvx_(live|test)_[a-fA-F0-9]{32,64}$/.test(token.trim());
}

/**
 * Masks a raw key for safe presentation in dashboards and logs.
 */
export function maskApiKeySecret(rawSecret: string): string {
  if (!rawSecret) return "";
  const prefix = rawSecret.startsWith("mvx_test_") ? "mvx_test_" : "mvx_live_";
  const suffix = rawSecret.slice(-4);
  return `${prefix}...${suffix}`;
}
