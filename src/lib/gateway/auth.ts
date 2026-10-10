/**
 * Gateway Authentication & API Key Verifier
 * Authenticates bearer tokens via SHA-256 hash lookup against active database records.
 * Resolves SEC-01 by rejecting unhashed or arbitrary pseudo-tokens.
 */

import { findApiKeyBySecret } from "../supabase/store";
import type { ApiKeyItem } from "../types";

export interface GatewayAuthResult {
  valid: boolean;
  keyPrefix?: string;
  apiKey?: ApiKeyItem;
  orgId?: string;
  error?: string;
}

export async function verifyGatewayApiKey(
  authHeader: string | undefined
): Promise<GatewayAuthResult> {
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return { valid: false, error: "Invalid Authorization format. Expected: Bearer <key>" };
  }

  const token = parts[1];
  if (!token.startsWith("mvx_live_") && !token.startsWith("mvx_test_")) {
    return {
      valid: false,
      error: "Invalid Morvexa API Key format. Keys must start with mvx_live_ or mvx_test_",
    };
  }

  // Authoritative SHA-256 database/memory verification
  const keyRecord = await findApiKeyBySecret(token);
  if (!keyRecord) {
    return {
      valid: false,
      error: "Invalid API key: Key does not exist or has not been registered.",
    };
  }

  if (!keyRecord.isActive) {
    return {
      valid: false,
      error: "Invalid API key: Key has been revoked.",
    };
  }

  return {
    valid: true,
    keyPrefix: keyRecord.prefix,
    apiKey: keyRecord,
    orgId: "org_default",
  };
}
