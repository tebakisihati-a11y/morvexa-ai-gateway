import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { issueOwnerToken, OWNER_COOKIE } from "../src/lib/auth/ownerSession";
import { generateCsrfToken, CSRF_COOKIE, CSRF_HEADER } from "../src/lib/gateway/csrf";
import { getGuardrailsConfig, updateGuardrailsConfig, sanitizePii } from "../src/lib/owner/guardrails";

describe("Owner Guardrails API + PII Sanitization", () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...previousEnv, OWNER_PASSCODE: "test-owner-pass" };
    delete process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;
    // reset to defaults
    updateGuardrailsConfig({ maskPii: true, promptCaching: true, monthlyBudgetCeiling: 50 });
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  function ownerHeaders(method = "GET"): Record<string, string> {
    const ownerToken = issueOwnerToken();
    const csrfToken = generateCsrfToken();
    const headers: Record<string, string> = {
      Cookie: `${OWNER_COOKIE}=${ownerToken}; ${CSRF_COOKIE}=${csrfToken}`,
      "Content-Type": "application/json",
    };
    if (method === "POST") {
      headers[CSRF_HEADER] = csrfToken;
    }
    return headers;
  }

  it("rejects unauthenticated GET to guardrails", async () => {
    const res = await app.request("http://localhost/api/owner/guardrails");
    expect(res.status).toBe(403);
  });

  it("returns default config with valid owner session", async () => {
    const res = await app.request("http://localhost/api/owner/guardrails", {
      headers: ownerHeaders(),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.maskPii).toBe(true);
    expect(data.promptCaching).toBe(true);
    expect(data.monthlyBudgetCeiling).toBe(50);
  });

  it("persists guardrails toggle via POST", async () => {
    const res = await app.request("http://localhost/api/owner/guardrails", {
      method: "POST",
      headers: ownerHeaders("POST"),
      body: JSON.stringify({ maskPii: false, promptCaching: false, monthlyBudgetCeiling: 200 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.maskPii).toBe(false);
    expect(data.monthlyBudgetCeiling).toBe(200);

    // Verify GET reflects persisted state
    const getRes = await app.request("http://localhost/api/owner/guardrails", {
      headers: ownerHeaders(),
    });
    const after = await getRes.json();
    expect(after.maskPii).toBe(false);
    expect(after.monthlyBudgetCeiling).toBe(200);
  });

  it("sanitizePii redacts emails, credit cards, and API keys", () => {
    const leaked = "Contact dev@acme.ai or card 4111111111111111 key sk-live-abc123xyz";
    const clean = sanitizePii(leaked);
    expect(clean).not.toContain("dev@acme.ai");
    expect(clean).not.toContain("4111111111111111");
    expect(clean).not.toContain("sk-live-abc123xyz");
    expect(clean).toContain("[REDACTED]");
  });

  it("maskPii=false keeps payload intact", () => {
    updateGuardrailsConfig({ maskPii: false });
    const cfg = getGuardrailsConfig();
    expect(cfg.maskPii).toBe(false);
  });
});
