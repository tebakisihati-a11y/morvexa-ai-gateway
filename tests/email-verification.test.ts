import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetResetTokensForTest } from "../src/lib/auth/resetTokens";
import {
  resetVerificationTokensForTest,
  hashVerificationToken,
  issueEmailVerificationToken,
} from "../src/lib/auth/verificationTokens";
import { readCollection } from "../src/lib/persistence/jsonStore";
import { findCustomerByEmail, isEmailVerified } from "../src/lib/customer/store";
import { resetStoreForTest } from "../src/lib/supabase/store";
import { resetIpRateLimits } from "../src/lib/gateway/ipRateLimit";

const BASE = "http://localhost:3000";

function post(path: string, body: unknown, ip?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;

  return app.request(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function registerUser(email: string, password = "rahasia123", name = "Budi Santoso") {
  const res = await post("/api/customer/auth/register", { name, email, password });
  return { res, json: await res.json() };
}

/** Issues a real token through the production code path. */
async function issueToken(email: string): Promise<string> {
  const { rawToken } = await issueEmailVerificationToken({
    customerId: "cust-test",
    email,
  });
  return rawToken;
}

function storedTokens() {
  return readCollection<{ tokenHash: string; email: string; expiresAt: string }>(
    "email_verification_tokens",
    []
  );
}

beforeEach(() => {
  resetLoginThrottle();
  resetResetTokensForTest();
  resetVerificationTokensForTest();
  resetIpRateLimits();
  resetStoreForTest();
});

describe("Email verification", () => {
  it("marks a new account unverified", async () => {
    const { res, json } = await registerUser("verif-1@example.com");
    expect(res.status).toBe(201);

    const user = findCustomerByEmail("verif-1@example.com");
    expect(user).toBeDefined();
    expect(isEmailVerified(user!)).toBe(false);
    expect(json.user.emailVerified).toBe(false);
  });

  it("asks the customer to verify rather than claiming the account is ready", async () => {
    const { json } = await registerUser("verif-2@example.com");
    expect(json.emailDelivered).toBe(false); // log transport under test
    expect(json.message).toContain("verifikasi");
  });

  it("stores only the hash of the verification token", async () => {
    await registerUser("verif-3@example.com");

    const entry = storedTokens().find((t) => t.email === "verif-3@example.com");
    expect(entry).toBeDefined();
    // A 64-char hex digest, never the raw base64url token.
    expect(entry!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects an unknown token", async () => {
    const res = await post("/api/customer/auth/verify-email", { token: "not-a-real-token" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("tidak valid");
  });

  it("rejects a request with no token", async () => {
    const res = await post("/api/customer/auth/verify-email", {});
    expect(res.status).toBe(400);
  });

  it("verifies an account given a valid token", async () => {
    await registerUser("verif-4@example.com");
    const rawToken = await issueToken("verif-4@example.com");

    const res = await post("/api/customer/auth/verify-email", { token: rawToken });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.alreadyVerified).toBe(false);
    expect(isEmailVerified(findCustomerByEmail("verif-4@example.com")!)).toBe(true);
  });

  it("is idempotent: redeeming the same link twice still reports success", async () => {
    await registerUser("verif-5@example.com");
    const rawToken = await issueToken("verif-5@example.com");

    expect((await post("/api/customer/auth/verify-email", { token: rawToken })).status).toBe(200);

    const second = await post("/api/customer/auth/verify-email", { token: rawToken });
    expect(second.status).toBe(200);
    expect((await second.json()).alreadyVerified).toBe(true);
  });

  it("rejects an expired token", async () => {
    const { rawToken } = await issueEmailVerificationToken({
      customerId: "cust-x",
      email: "verif-6@example.com",
      ttlMinutes: -1,
    });

    const res = await post("/api/customer/auth/verify-email", { token: rawToken });
    expect(res.status).toBe(400);
  });

  it("invalidates the previous token when a new one is issued", async () => {
    await registerUser("verif-7@example.com");
    const first = await issueToken("verif-7@example.com");
    const second = await issueToken("verif-7@example.com");

    expect(first).not.toBe(second);
    expect((await post("/api/customer/auth/verify-email", { token: first })).status).toBe(400);
    expect((await post("/api/customer/auth/verify-email", { token: second })).status).toBe(200);
  });

  it("does not disclose account existence when resending", async () => {
    await registerUser("verif-8@example.com");

    const known = await post("/api/customer/auth/resend-verification", { email: "verif-8@example.com" });
    const unknown = await post("/api/customer/auth/resend-verification", { email: "nobody-here@example.com" });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    // Byte-identical bodies, so the response cannot be used to probe accounts.
    expect(await known.text()).toBe(await unknown.text());
  });

  it("treats pre-existing accounts with no flag as verified", async () => {
    // A record lacking the field entirely must count as verified, or accounts
    // created before verification existed would be locked out.
    const user = findCustomerByEmail("dev@acme.ai");
    expect(user).toBeDefined();
    expect(isEmailVerified(user!)).toBe(true);

    const legacy = { ...user!, emailVerified: undefined };
    expect(isEmailVerified(legacy as any)).toBe(true);
  });

  it("keys the hash function deterministically", async () => {
    expect(await hashVerificationToken("abc")).toBe(await hashVerificationToken("abc"));
    expect(await hashVerificationToken("abc")).not.toBe(await hashVerificationToken("abd"));
  });
});
