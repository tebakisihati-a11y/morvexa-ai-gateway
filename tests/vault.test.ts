import { describe, it, expect } from "vitest";
import {
  encryptProviderSecret,
  decryptProviderSecret,
  maskProviderKey,
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
