import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetIpRateLimits } from "../src/lib/gateway/ipRateLimit";
import {
  issueOwnerToken,
  verifyOwnerToken,
  verifyOwnerPasscode,
  OWNER_COOKIE,
} from "../src/lib/auth/ownerSession";

const BASE = "http://localhost:3000";

function post(path: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  return app.request(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Owner console authentication", () => {
  const ORIGINAL = process.env.OWNER_PASSCODE;

  beforeEach(() => {
    resetIpRateLimits();
    process.env.OWNER_PASSCODE = "correct-horse-battery-staple";
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.OWNER_PASSCODE;
    else process.env.OWNER_PASSCODE = ORIGINAL;
  });

  it("rejects the passcodes the old client-side gate accepted", async () => {
    // The browser used to accept any of these. They must not work now.
    for (const guess of ["admin", "morvexa-owner", "abcd", "1234"]) {
      const res = await post("/api/owner/auth/login", { passcode: guess });
      expect(res.status).toBe(401);
    }
  });

  it("issues an owner session for the correct passcode", async () => {
    const res = await post("/api/owner/auth/login", {
      passcode: "correct-horse-battery-staple",
    });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${OWNER_COOKIE}=`);
  });

  it("fails closed when no passcode is configured", async () => {
    delete process.env.OWNER_PASSCODE;
    const res = await post("/api/owner/auth/login", { passcode: "anything" });
    expect(res.status).toBe(503);
  });

  it("reports session state from the cookie, not the request body", async () => {
    const anon = await app.request(`${BASE}/api/owner/auth/session`);
    expect((await anon.json()).authenticated).toBe(false);

    const token = issueOwnerToken();
    const authed = await app.request(`${BASE}/api/owner/auth/session`, {
      headers: { Cookie: `${OWNER_COOKIE}=${token}` },
    });
    expect((await authed.json()).authenticated).toBe(true);
  });

  it("does not accept a forged or tampered owner token", () => {
    const token = issueOwnerToken();
    expect(verifyOwnerToken(token)).not.toBeNull();
    expect(verifyOwnerToken(`${token}x`)).toBeNull();
    expect(verifyOwnerToken("garbage")).toBeNull();
    expect(verifyOwnerToken(undefined)).toBeNull();

    // A payload claiming owner with no valid signature must be rejected.
    const forgedPayload = Buffer.from(
      JSON.stringify({ role: "owner", iat: 0, exp: 9999999999 })
    ).toString("base64url");
    expect(verifyOwnerToken(`${forgedPayload}.not-a-real-signature`)).toBeNull();
  });

  it("accepts an owner session as proof for privileged endpoints", async () => {
    const token = issueOwnerToken();
    const res = await app.request(`${BASE}/api/customer/dashboard-data`, {
      headers: { Cookie: `${OWNER_COOKIE}=${token}` },
    });
    expect(res.status).toBe(200);
  });

  it("compares the passcode without leaking length", () => {
    expect(verifyOwnerPasscode("correct-horse-battery-staple")).toBe(true);
    expect(verifyOwnerPasscode("correct-horse-battery-stapl")).toBe(false);
    expect(verifyOwnerPasscode("")).toBe(false);
    expect(verifyOwnerPasscode(undefined)).toBe(false);
    expect(verifyOwnerPasscode(12345)).toBe(false);
  });
});
