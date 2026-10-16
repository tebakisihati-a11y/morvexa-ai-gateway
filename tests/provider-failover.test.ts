import { describe, it, expect, afterEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";

/**
 * Live failover + burst behaviour of the proxy routes.
 *
 * These exercise the real request path through Hono (not the adapter in
 * isolation), with global fetch stubbed so no network call leaves the process.
 * The assertions are about what the gateway *does*: which provider it ends up
 * using, what headers it reports, and that a burst stays within the documented
 * RPM ceiling instead of failing open.
 */

const TEST_KEY = "mvx_live_test_key_123456";
const AUTH = { Authorization: `Bearer ${TEST_KEY}`, "Content-Type": "application/json" };

function sseResponse(body = "data: ok\n\n"): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.PRIVATE_SERVER_URL;
});

describe("Provider failover on POST /api/v1/messages", () => {
  it("fails over to the next provider when the primary returns 429", async () => {
    // Primary for a claude model is anthropic; deepseek is the same-priority
    // fallback. Make anthropic answer 429 and deepseek answer 200.
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.DEEPSEEK_API_KEY = "sk-ds-test";

    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("anthropic.com")) {
          return new Response(JSON.stringify({ error: "rate limited" }), { status: 429 });
        }
        return sseResponse("data: recovered\n\n");
      })
    );

    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: AUTH,
      body: JSON.stringify({ model: "claude-3-7-sonnet", stream: true, messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    // Anthropic was tried and rejected; the chain continued to another provider.
    expect(calls.some((u) => u.includes("anthropic.com"))).toBe(true);
    expect(calls.some((u) => !u.includes("anthropic.com"))).toBe(true);
    expect(res.headers.get("X-Morvexa-Live")).toBe("true");
    expect(res.headers.get("X-Morvexa-Failover")).toBe("true");
    expect(res.headers.get("X-Morvexa-Provider")).not.toBe("anthropic");
  });

  it("prefers the primary provider when it succeeds, marking no failover", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-openai-test";

    vi.stubGlobal("fetch", vi.fn(async () => sseResponse()));

    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: AUTH,
      body: JSON.stringify({ model: "claude-3-7-sonnet", stream: true, messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Morvexa-Provider")).toBe("anthropic");
    expect(res.headers.get("X-Morvexa-Failover")).toBe("false");
  });

  it("uses the simulated stream when no upstream key is configured", async () => {
    // No provider env keys set: the gateway must not call out at all.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: AUTH,
      body: JSON.stringify({ model: "claude-3-7-sonnet", stream: true, messages: [{ role: "user", content: "hi" }] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Morvexa-Live")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Burst load stays within the rate-limit ceiling", () => {
  it("serves the burst up to the limit and then returns 429 with Retry-After", async () => {
    // The seeded test key carries a 120 RPM limit. Fire concurrently so the
    // window is shared, then assert the ceiling held and the later calls are
    // throttled rather than silently let through.
    const burst = 140;
    const results = await Promise.all(
      Array.from({ length: burst }, () =>
        app.request("/api/v1/messages", {
          method: "POST",
          headers: AUTH,
          body: JSON.stringify({ model: "claude-3-7-sonnet", stream: false, messages: [{ role: "user", content: "burst" }] }),
        })
      )
    );

    const ok = results.filter((r) => r.status === 200).length;
    const throttled = results.filter((r) => r.status === 429).length;

    expect(ok).toBeGreaterThan(0);
    expect(ok).toBeLessThanOrEqual(120);
    expect(throttled).toBeGreaterThan(0);

    const limited = results.find((r) => r.status === 429)!;
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(limited.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
