import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { issueOwnerToken, OWNER_COOKIE } from "../src/lib/auth/ownerSession";

describe("Owner Key Provisioning & Customer Issue Resolver APIs", () => {
  const previousEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...previousEnv, OWNER_PASSCODE: "secret-owner-pass-123" };
    delete process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;
  });

  afterEach(() => {
    process.env = { ...previousEnv };
  });

  function ownerCookieHeader(): string {
    const token = issueOwnerToken();
    return `${OWNER_COOKIE}=${token}`;
  }

  it("rejects unauthenticated requests to provisioning queue", async () => {
    const res = await app.request("http://localhost/api/owner/provisioning/queue");
    expect(res.status).toBe(403);
  });

  it("lists provisioning queue with valid owner cookie", async () => {
    const res = await app.request("http://localhost/api/owner/provisioning/queue", {
      headers: { Cookie: ownerCookieHeader() },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.queue).toBeDefined();
    expect(Array.isArray(data.queue)).toBe(true);
    expect(data.policy.autoApprovalEnabled).toBe(true);
  });

  it("approves a pending key request and mints key with rawSecret", async () => {
    const res = await app.request("http://localhost/api/owner/provisioning/approve", {
      method: "POST",
      headers: {
        Cookie: ownerCookieHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: "req-901",
        rateLimitRpm: 120,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.rawSecret).toMatch(/^mvx_(live|test)_/);
    expect(data.key.id).toBeDefined();
    expect(data.request.status).toBe("manual_approved");
  });

  it("rejects an unauthenticated request to resolver incidents", async () => {
    const res = await app.request("http://localhost/api/owner/resolver/incidents");
    expect(res.status).toBe(403);
  });

  it("lists customer health incidents and runs key probe", async () => {
    const res = await app.request("http://localhost/api/owner/resolver/incidents", {
      headers: { Cookie: ownerCookieHeader() },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.incidents)).toBe(true);
    expect(data.incidents.length).toBeGreaterThan(0);

    // Probe key
    const probeRes = await app.request("http://localhost/api/owner/resolver/probe-key", {
      method: "POST",
      headers: {
        Cookie: ownerCookieHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyId: "key-cust-3" }),
    });
    expect(probeRes.status).toBe(200);
    const probeData = await probeRes.json();
    expect(probeData.statusCode).toBe(401);
    expect(probeData.health).toBe("failing");
  });

  it("remediates invalid hash with 1-click rehash", async () => {
    const res = await app.request("http://localhost/api/owner/resolver/fix-key", {
      method: "POST",
      headers: {
        Cookie: ownerCookieHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyId: "key-cust-3", action: "rehash" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newSecret).toMatch(/^mvx_(live|test)_/);
    expect(data.updatedKey.healthStatus).toBe("healthy");

    // Re-probing the key now succeeds
    const reProbe = await app.request("http://localhost/api/owner/resolver/probe-key", {
      method: "POST",
      headers: {
        Cookie: ownerCookieHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyId: "key-cust-3" }),
    });
    const probeData = await reProbe.json();
    expect(probeData.statusCode).toBe(200);
    expect(probeData.health).toBe("optimal");
  });

  it("boosts quota for customer with 429 quota exhaustion", async () => {
    const res = await app.request("http://localhost/api/owner/resolver/fix-key", {
      method: "POST",
      headers: {
        Cookie: ownerCookieHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keyId: "key-cust-2",
        action: "boost_quota",
        boostTokens: 500_000,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.updatedKey.healthStatus).toBe("healthy");
  });
});
