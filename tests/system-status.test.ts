import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";
import { buildSystemStatus } from "../src/lib/status/systemStatus";

const TOUCHED = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "BREVO_API_KEY",
  "RESEND_API_KEY",
  "MORVEXA_EMAIL_FROM",
] as const;
const originalProviderEnv = Object.fromEntries(
  TOUCHED.map((key) => [key, process.env[key]])
);

beforeEach(() => {
  for (const key of TOUCHED) delete process.env[key];
});

afterEach(() => {
  for (const key of TOUCHED) {
    const original = originalProviderEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
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

  it("reports that production requests fail closed when no provider is configured", () => {
    vi.stubEnv("NODE_ENV", "production");

    try {
      const status = buildSystemStatus();
      const routing = status.components.find((component) => component.id === "routing");
      expect(routing?.detail).toContain("HTTP 503");
      expect(routing?.detail).not.toContain("simulasi");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("requires a verified Brevo sender before reporting email delivery as operational", () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const missingSender = buildSystemStatus().components.find((component) => component.id === "email");
    expect(missingSender?.state).toBe("degraded");
    expect(missingSender?.detail).toContain("sender Brevo terverifikasi");

    process.env.MORVEXA_EMAIL_FROM = "Morvexa <sender@example.com>";
    const configured = buildSystemStatus().components.find((component) => component.id === "email");
    expect(configured?.state).toBe("operational");
  });

  it("headlines the worst component state rather than a hopeful default", () => {
    // No upstream key and no email/store config in the test environment, so at
    // least one component is degraded and the headline must say so.
    const status = buildSystemStatus();
    expect(status.state).toBe("degraded");
  });
});
