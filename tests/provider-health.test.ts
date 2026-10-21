import { describe, expect, it, vi } from "vitest";
import { checkProviderHealth } from "../src/lib/gateway/providerHealth";

describe("provider connection checks", () => {
  it("checks model-list access without sending an inference request", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });

    const result = await checkProviderHealth("openai", "provider-test-secret", fetchMock);
    expect(result.state).toBe("healthy");
    expect(result.message).toContain("daftar model");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer provider-test-secret" }),
      })
    );
    expect(JSON.stringify(result)).not.toContain("provider-test-secret");
  });

  it("reports rejected credentials without returning provider response details", async () => {
    const result = await checkProviderHealth(
      "anthropic",
      "provider-test-secret",
      async () => new Response("private provider response", { status: 401 })
    );

    expect(result.state).toBe("degraded");
    expect(result.message).toContain("menolak kredensial");
    expect(JSON.stringify(result)).not.toContain("private provider response");
    expect(JSON.stringify(result)).not.toContain("provider-test-secret");
  });

  it("does not make network calls for an unconfigured provider", async () => {
    const fetchMock = vi.fn();
    const result = await checkProviderHealth("groq", undefined, fetchMock);

    expect(result.state).toBe("unconfigured");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
