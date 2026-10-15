import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetResetTokensForTest, issuePasswordResetToken } from "../src/lib/auth/resetTokens";
import { resetVerificationTokensForTest } from "../src/lib/auth/verificationTokens";
import {
  issueSessionToken,
  verifySessionToken,
  isSessionCurrent,
  SESSION_COOKIE,
} from "../src/lib/auth/session";
import { resetStoreForTest } from "../src/lib/supabase/store";
import { resetIpRateLimits } from "../src/lib/gateway/ipRateLimit";
import { getPasswordEpoch } from "../src/lib/customer/store";

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

function get(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  return app.request(`${BASE}${path}`, { method: "GET", headers });
}

/** Extracts the session cookie value from a Set-Cookie header. */
function sessionCookieFrom(res: Response): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`));
  if (!match || !match[1]) return null;
  return `${SESSION_COOKIE}=${match[1]}`;
}

async function registerAndLogin(email: string, password = "rahasia123") {
  await post("/api/customer/auth/register", { name: "Budi Santoso", email, password });
  const login = await post("/api/customer/auth/login", { email, password });
  return sessionCookieFrom(login);
}

beforeEach(() => {
  resetLoginThrottle();
  resetResetTokensForTest();
  resetVerificationTokensForTest();
  resetIpRateLimits();
  resetStoreForTest();
});

describe("Session invalidation on password reset", () => {
  it("accepts a session issued by a fresh login", async () => {
    const cookie = await registerAndLogin("epoch-1@example.com");
    expect(cookie).not.toBeNull();

    const res = await get("/api/customer/auth/session", cookie!);
    expect((await res.json()).authenticated).toBe(true);
  });

  it("rejects the old session once the password is reset", async () => {
    const email = "epoch-2@example.com";
    const cookie = await registerAndLogin(email);
    expect((await (await get("/api/customer/auth/session", cookie!)).json()).authenticated).toBe(true);

    // Drive the real reset flow through the API.
    const { rawToken } = await issuePasswordResetToken({ customerId: "cust-x", email });
    const reset = await post("/api/customer/auth/reset-password", {
      token: rawToken,
      password: "passwordbaru456",
    });
    expect(reset.status).toBe(200);

    // The pre-reset cookie must now be refused.
    const after = await get("/api/customer/auth/session", cookie!);
    expect((await after.json()).authenticated).toBe(false);
  });

  it("keeps the user signed in with the session returned by the reset itself", async () => {
    const email = "epoch-3@example.com";
    await registerAndLogin(email);

    const { rawToken } = await issuePasswordResetToken({ customerId: "cust-x", email });
    const reset = await post("/api/customer/auth/reset-password", {
      token: rawToken,
      password: "passwordbaru456",
    });

    const freshCookie = sessionCookieFrom(reset);
    expect(freshCookie).not.toBeNull();

    const res = await get("/api/customer/auth/session", freshCookie!);
    expect((await res.json()).authenticated).toBe(true);
  });

  it("lets the user log in again with the new password after a reset", async () => {
    const email = "epoch-4@example.com";
    await registerAndLogin(email);

    const { rawToken } = await issuePasswordResetToken({ customerId: "cust-x", email });
    await post("/api/customer/auth/reset-password", { token: rawToken, password: "passwordbaru456" });

    const relogin = await post("/api/customer/auth/login", { email, password: "passwordbaru456" });
    expect(relogin.status).toBe(200);

    const cookie = sessionCookieFrom(relogin);
    expect((await (await get("/api/customer/auth/session", cookie!)).json()).authenticated).toBe(true);
  });

  it("rejects the old password after a reset", async () => {
    const email = "epoch-5@example.com";
    await registerAndLogin(email);

    const { rawToken } = await issuePasswordResetToken({ customerId: "cust-x", email });
    await post("/api/customer/auth/reset-password", { token: rawToken, password: "passwordbaru456" });

    const oldLogin = await post("/api/customer/auth/login", { email, password: "rahasia123" });
    expect(oldLogin.status).toBe(401);
  });

  it("treats a token with no pwdAt as current until the first reset", () => {
    // Legacy tokens decode to pwdAt = 0, and an account with no reset also
    // reports 0, so deploying this change does not sign everyone out.
    expect(isSessionCurrent({ pwdAt: 0 }, 0)).toBe(true);
    expect(isSessionCurrent({ pwdAt: 0 }, 1000)).toBe(false);
    expect(isSessionCurrent({ pwdAt: 1000 }, 1000)).toBe(true);
    expect(isSessionCurrent({ pwdAt: 1000 }, 0)).toBe(true);
  });

  it("round-trips the epoch through the signed token", () => {
    const token = issueSessionToken({
      sub: "cust-1",
      email: "a@b.com",
      name: "A",
      provider: "email",
      pwdAt: 12345,
    });
    const claims = verifySessionToken(token);
    expect(claims?.pwdAt).toBe(12345);
  });

  it("defaults the epoch to 0 when the issuer omits it", () => {
    const token = issueSessionToken({
      sub: "cust-1",
      email: "a@b.com",
      name: "A",
      provider: "email",
    });
    expect(verifySessionToken(token)?.pwdAt).toBe(0);
  });

  it("bumps the stored epoch when the password is reset", async () => {
    const email = "epoch-6@example.com";
    await registerAndLogin(email);
    expect(await getPasswordEpoch(email)).toBe(0);

    const { rawToken } = await issuePasswordResetToken({ customerId: "cust-x", email });
    await post("/api/customer/auth/reset-password", { token: rawToken, password: "passwordbaru456" });

    expect(await getPasswordEpoch(email)).toBeGreaterThan(0);
  });

  it("still rejects a tampered token", () => {
    const token = issueSessionToken({
      sub: "cust-1",
      email: "a@b.com",
      name: "A",
      provider: "email",
      pwdAt: 999,
    });
    expect(verifySessionToken(token + "x")).toBeNull();
  });
});
