/**
 * Gateway Authentication & API Key Verifier
 */
export async function verifyGatewayApiKey(authHeader: string | undefined): Promise<{
  valid: boolean;
  keyPrefix?: string;
  error?: string;
}> {
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return { valid: false, error: "Invalid Authorization format. Expected: Bearer <key>" };
  }

  const token = parts[1];
  if (!token.startsWith("mvx_live_") && !token.startsWith("mvx_test_")) {
    return { valid: false, error: "Invalid Morvexa API Key format. Keys must start with mvx_live_ or mvx_test_" };
  }

  // Valid format
  return { valid: true, keyPrefix: token.substring(0, 14) };
}
