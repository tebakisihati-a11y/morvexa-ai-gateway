import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetIpRateLimits } from "../src/lib/gateway/ipRateLimit";
import { resetVerificationTokensForTest } from "../src/lib/auth/verificationTokens";
import { resetStoreForTest } from "../src/lib/supabase/store";
import { CSRF_COOKIE } from "../src/lib/gateway/csrf";

const BASE = "http://localhost:3000";

function post(path: string, body: unknown, cookie?: string, csrf?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return app.request(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** Pulls a named cookie out of a Set-Cookie response header. */
function cookieValue(res: Response, name: string): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(new RegExp(`${name}=([^;,]*)`));
  return match?.[1] ?? null;
}

describe("Customer purchase endpoint authorization", () => {
  beforeEach(() => {
    resetLoginThrottle();
    resetIpRateLimits();
    resetVerificationTokensForTest();
    resetStoreForTest();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses an unauthenticated purchase instead of issuing a free API key", async () => {
    // Before the fix this returned 200 with a live rawSecret for any caller, and
    // took the victim's email straight from the request body.
    const res = await post("/api/customer/purchase-model", {
      customerEmail: "attacker@example.com",
      modelId: "model_haiku_tokens",
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("rawSecret");
  });

  it("refuses a session-authenticated purchase that omits the CSRF token", async () => {
    const email = "budi@example.com";
    await post("/api/customer/auth/register", { name: "Budi", email, password: "rahasia123" });
    const login = await post("/api/customer/auth/login", { email, password: "rahasia123" });
    expect(login.status).toBe(200);

    const session = cookieValue(login, "mvx_session");
    expect(session).toBeTruthy();

    // Session cookie present, CSRF token absent: the signature of a forged
    // cross-site request.
    const res = await post(
      "/api/customer/purchase-model",
      { modelId: "model_haiku_tokens" },
      `mvx_session=${session}`
    );
    expect(res.status).toBe(403);
  });

  it("ignores a caller-supplied email and uses the session identity", async () => {
    const email = "budi@example.com";
    await post("/api/customer/auth/register", { name: "Budi", email, password: "rahasia123" });
    const login = await post("/api/customer/auth/login", { email, password: "rahasia123" });

    const session = cookieValue(login, "mvx_session");
    const csrf = cookieValue(login, CSRF_COOKIE);
    expect(session).toBeTruthy();
    expect(csrf).toBeTruthy();

    const res = await post(
      "/api/customer/purchase-model",
      {
        // A caller trying to direct the key to a different address.
        customerEmail: "someone-else@example.com",
        customerName: "Someone Else",
        modelId: "model_haiku_tokens",
      },
      `mvx_session=${session}; ${CSRF_COOKIE}=${csrf}`,
      csrf!
    );

    // If the product id is not in the catalog the handler answers 404 before
    // ordering, which still proves the request passed authorization. When it
    // does order, the email must be the session's, never the body's.
    if (res.status === 200) {
      const body: any = await res.json();
      expect(body.order.customerEmail).toBe(email);
      expect(JSON.stringify(body)).not.toContain("someone-else@example.com");
    } else {
      expect([400, 404]).toContain(res.status);
    }
  });

  it("refuses owner dashboard data to an anonymous caller in production", async () => {
    // This endpoint returns every customer's email, plan, orders and activity.
    // In development an implicit bypass lets the local UI and test suite reach
    // privileged routes; production must never admit an anonymous caller.
    vi.stubEnv("NODE_ENV", "production");

    const res = await app.request(`${BASE}/api/customer/dashboard-data`, { method: "GET" });
    expect(res.status).toBe(403);
  });

  it("refuses privileged routes when the dev bypass is not explicitly enabled", async () => {
    // The bypass used to key off NODE_ENV alone, so any environment that was
    // not production - a Vercel preview, a container started with NODE_ENV
    // unset - served the full owner dataset to anonymous callers. Turning the
    // flag off has to be enough to close it.
    vi.stubEnv("MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED", "");
    vi.stubEnv("NODE_ENV", "test");

    for (const path of [
      "/api/customer/dashboard-data",
      "/api/audit/logs",
      "/api/billing/reconcile/logs",
    ]) {
      const res = await app.request(`${BASE}${path}`, { method: "GET" });
      // Routes vary between 401 and 403; either is a refusal. What matters is
      // that none of them returns data.
      expect([401, 403], `${path} must not answer an anonymous caller`).toContain(res.status);
    }
  });

  it("still refuses privileged routes when the flag is set but NODE_ENV is production", async () => {
    vi.stubEnv("MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED", "true");
    vi.stubEnv("NODE_ENV", "production");

    const res = await app.request(`${BASE}/api/customer/dashboard-data`, { method: "GET" });
    expect(res.status).toBe(403);
  });
});
