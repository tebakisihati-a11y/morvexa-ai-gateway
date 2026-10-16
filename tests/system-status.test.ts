import { describe, it, expect, afterEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { buildSystemStatus } from "../src/lib/status/systemStatus";

const TOUCHED = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "GROQ_API_KEY",
] as const;

afterEach(() => {
  for (const key of TOUCHED) delete process.env[key];
});

describe("Public system status", () => {
  it("serves /api/v1/status without authentication", async () => {
    const res = await app.request("/api/v1/status", { method: "GET" });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.state).toBeDefined();
    expect(Array.isArray(json.components)).toBe(true);
    expect(json.components.length).toBeGreaterThan(0);
  });

  it("never exposes a credential value through the status payload", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-super-secret-value";
    const res = await app.request("/api/v1/status", { method: "GET" });
    const raw = await res.text();

    // The whole point of a public status route: it may say a provider is
    // configured, but the secret itself must not appear anywhere in the body.
    expect(raw).not.toContain("sk-ant-super-secret-value");
  });

  it("reports the routing component as operational only once a live key exists", () => {
    const withoutKeys = buildSystemStatus();
    const routingWithout = withoutKeys.components.find((c) => c.id === "routing");
    expect(routingWithout?.state).toBe("degraded");

    process.env.OPENAI_API_KEY = "sk-openai-test";
    const withKey = buildSystemStatus();
    const routingWith = withKey.components.find((c) => c.id === "routing");
    expect(routingWith?.state).toBe("operational");
  });

  it("headlines the worst component state rather than a hopeful default", () => {
    // No upstream key and no email/store config in the test environment, so at
    // least one component is degraded and the headline must say so.
    const status = buildSystemStatus();
    expect(status.state).toBe("degraded");
  });
});
