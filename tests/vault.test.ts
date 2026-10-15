import { describe, it, expect, afterEach, vi } from "vitest";
import {
  encryptProviderSecret,
  decryptProviderSecret,
  maskProviderKey,
  resetEphemeralMasterKey,
} from "../src/lib/gateway/vault";
import { MODEL_REGISTRY } from "../src/lib/gateway/adapters";

describe("BYOK Secret Vault & Envelope Encryption", () => {
  it("should encrypt and decrypt provider secrets with AES-256-GCM without data loss", () => {
    const rawSecret = "sk-ant-api03-abcdef1234567890secretkey";
    const encrypted = encryptProviderSecret(rawSecret);

    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.cipherText).not.toEqual(rawSecret);

    const decrypted = decryptProviderSecret(encrypted);
    expect(decrypted).toEqual(rawSecret);
  });

  it("should correctly mask provider API keys for UI display", () => {
    const testKey = "sk-ant-api03-abcdef9999";
    const masked = maskProviderKey(testKey);
    expect(masked).toEqual("sk-ant...9999");
    expect(masked).not.toContain("abcdef");
  });

  it("should contain verified models with authoritative cost specs in Model Registry", () => {
    const claude = MODEL_REGISTRY["claude-3-7-sonnet"];
    expect(claude).toBeDefined();
    expect(claude.provider).toEqual("anthropic");
    expect(claude.inputCostPer1k).toBeGreaterThan(0);
    expect(claude.supportsStreaming).toBe(true);

    const gpt4o = MODEL_REGISTRY["gpt-4o"];
    expect(gpt4o).toBeDefined();
    expect(gpt4o.provider).toEqual("openai");
  });
});

describe("Vault master key hardening", () => {
  const ORIGINAL_KEY = process.env.ENCRYPTION_MASTER_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
    else process.env.ENCRYPTION_MASTER_KEY = ORIGINAL_KEY;
    vi.unstubAllEnvs();
    resetEphemeralMasterKey();
  });

  it("fails closed in production when no master key is configured", () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    vi.stubEnv("NODE_ENV", "production");

    // Previously this silently used the public constant
    // "morvexa_master_vault_key_32bytes", so anyone who read the repo could
    // decrypt every stored tenant key.
    expect(() => encryptProviderSecret("sk-secret")).toThrow(/ENCRYPTION_MASTER_KEY/);
  });

  it("uses a configured master key in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ENCRYPTION_MASTER_KEY = "a".repeat(48);
    resetEphemeralMasterKey();

    const payload = encryptProviderSecret("sk-secret");
    expect(decryptProviderSecret(payload)).toBe("sk-secret");
  });

  it("generates an unguessable per-process key outside production", () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    vi.stubEnv("NODE_ENV", "test");
    resetEphemeralMasterKey();

    const payload = encryptProviderSecret("sk-secret");
    expect(decryptProviderSecret(payload)).toBe("sk-secret");

    // A new process key must not be able to read the previous ciphertext.
    resetEphemeralMasterKey();
    expect(() => decryptProviderSecret(payload)).toThrow();
  });
});
