import { describe, it, expect } from "vitest";
import {
  generateSecureApiKey,
  hashApiKeySecret,
  isValidApiKeyFormat,
  maskApiKeySecret,
} from "../src/lib/auth/keys";

describe("Cryptographic API Key Module", () => {
  it("generates a live key with valid format, entropy, and matching hash", async () => {
    const key = await generateSecureApiKey("live");

    expect(key.keyPrefix).toBe("mvx_live_");
    expect(key.rawSecret.startsWith("mvx_live_")).toBe(true);
    expect(key.rawSecret.length).toBeGreaterThan(32);
    expect(key.maskedKey.startsWith("mvx_live_...")).toBe(true);
    expect(key.maskedKey.endsWith(key.rawSecret.slice(-4))).toBe(true);

    // Verify format validation
    expect(isValidApiKeyFormat(key.rawSecret)).toBe(true);

    // Verify key hash is consistent SHA-256
    expect(key.keyHash).toHaveLength(64);
    expect(key.keyHash).toBe(await hashApiKeySecret(key.rawSecret));
  });

  it("generates distinct test keys with mvx_test_ prefix", async () => {
    const key = await generateSecureApiKey("test");

    expect(key.keyPrefix).toBe("mvx_test_");
    expect(key.rawSecret.startsWith("mvx_test_")).toBe(true);
    expect(isValidApiKeyFormat(key.rawSecret)).toBe(true);
  });

  it("produces unique keys across multiple invocations (high entropy)", async () => {
    const generated = await Promise.all(
      Array.from({ length: 50 }, () => generateSecureApiKey("live"))
    );
    const keys = new Set(generated.map((key) => key.rawSecret));
    expect(keys.size).toBe(50);
  });

  it("computes deterministic SHA-256 hash digests", async () => {
    const secret = "mvx_live_0123456789abcdef0123456789abcdef";
    const hash1 = await hashApiKeySecret(secret);
    const hash2 = await hashApiKeySecret(secret);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    // Known-answer check against a standard SHA-256 implementation.
    expect(await hashApiKeySecret("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("correctly identifies valid and invalid API key formats", () => {
    expect(isValidApiKeyFormat("mvx_live_1234567890abcdef1234567890abcdef")).toBe(true);
    expect(isValidApiKeyFormat("mvx_test_1234567890abcdef1234567890abcdef")).toBe(true);
    expect(isValidApiKeyFormat("mvx_live_invalid_non_hex_chars_1234567890")).toBe(false);
    expect(isValidApiKeyFormat("invalid_prefix_1234567890abcdef12345678")).toBe(false);
    expect(isValidApiKeyFormat("")).toBe(false);
    expect(isValidApiKeyFormat(null)).toBe(false);
    expect(isValidApiKeyFormat(undefined)).toBe(false);
  });

  it("masks keys securely displaying only prefix and last 4 characters", () => {
    const liveKey = "mvx_live_abcdef1234567890abcdef1234567890";
    expect(maskApiKeySecret(liveKey)).toBe("mvx_live_...7890");

    const testKey = "mvx_test_1234567890abcdef1234567890abcdef";
    expect(maskApiKeySecret(testKey)).toBe("mvx_test_...cdef");

    expect(maskApiKeySecret("")).toBe("");
  });
});
