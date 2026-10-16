import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetIpRateLimits } from "../src/lib/gateway/ipRateLimit";
import { resetVerificationTokensForTest } from "../src/lib/auth/verificationTokens";
import { resetStoreForTest } from "../src/lib/supabase/store";
import { resetCustomerAccessAudit, recentCustomerAccess } from "../src/lib/customer/accessAudit";
import { SESSION_COOKIE } from "../src/lib/auth/session";

const BASE = "http://localhost:3000";
const ORIGINAL_INSECURE = process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;

function post(path: string, body: unknown, cookie?: string, csrf?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return app.request(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

function del(path: string, cookie?: string, csrf?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;
  if (csrf) headers["X-CSRF-Token"] = csrf;
  return app.request(`${BASE}${path}`, { method: "DELETE", headers });
}

function cookieValue(res: Response, name: string): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  return raw.match(new RegExp(`${name}=([^;,]*)`))?.[1] ?? null;
}

/** Registers and logs in, returning a Cookie header plus the CSRF header value. */
async function signIn(email: string, password = "rahasia123") {
  await post("/api/customer/auth/register", { name: "Pengguna", email, password });
  const login = await post("/api/customer/auth/login", { email, password });
  const session = cookieValue(login, SESSION_COOKIE);
  const csrf = cookieValue(login, "mvx_csrf") ?? "";
  // The CSRF check is a double-submit: the token must appear in the cookie the
  // browser sends and in the header, so both travel in the Cookie header here.
  return { cookie: `${SESSION_COOKIE}=${session}; mvx_csrf=${csrf}`, csrf };
}

describe("Customer self-service API keys", () => {
  beforeEach(() => {
    resetLoginThrottle();
    resetIpRateLimits();
    resetVerificationTokensForTest();
    resetStoreForTest();
    resetCustomerAccessAudit();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (ORIGINAL_INSECURE === undefined) delete process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;
    else process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED = ORIGINAL_INSECURE;
  });

  it("refuses to list keys without a session", async () => {
    const res = await app.request(`${BASE}/api/customer/api-keys`);
    expect(res.status).toBe(401);
  });

  it("starts empty for a new account", async () => {
    const { cookie } = await signIn("kosong@example.com");
    const res = await app.request(`${BASE}/api/customer/api-keys`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    expect((await res.json()).keys).toEqual([]);
  });

  it("creates a key, shows the secret once, and never lists it again", async () => {
    const { cookie, csrf } = await signIn("kunci@example.com");

    const create = await post("/api/customer/api-keys", { name: "Produksi" }, cookie, csrf);
    expect(create.status).toBe(201);
    const created = await create.json();
    expect(created.rawSecret).toMatch(/^mvx_live_/);

    const list = await app.request(`${BASE}/api/customer/api-keys`, { headers: { Cookie: cookie } });
    const listed = (await list.json()).keys;
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Produksi");
    // The secret and its hash must not come back on a later read.
    expect(JSON.stringify(listed)).not.toContain(created.rawSecret);
    expect(listed[0].hash).toBeUndefined();
  });

  it("requires the CSRF token to create a key", async () => {
    const { cookie } = await signIn("csrf@example.com");
    const res = await post("/api/customer/api-keys", { name: "Tanpa CSRF" }, cookie);
    expect(res.status).toBe(403);
  });

  it("rejects a key name that is too short", async () => {
    const { cookie, csrf } = await signIn("pendek@example.com");
    const res = await post("/api/customer/api-keys", { name: "ab" }, cookie, csrf);
    expect(res.status).toBe(400);
  });

  it("revokes an owned key", async () => {
    const { cookie, csrf } = await signIn("cabut@example.com");
    const create = await post("/api/customer/api-keys", { name: "Sementara" }, cookie, csrf);
    const { key } = await create.json();

    const revoke = await del(`/api/customer/api-keys/${key.id}`, cookie, csrf);
    expect(revoke.status).toBe(200);

    const list = await app.request(`${BASE}/api/customer/api-keys`, { headers: { Cookie: cookie } });
    expect((await list.json()).keys[0].isActive).toBe(false);
  });

  it("will not let one account revoke another account's key", async () => {
    const owner = await signIn("pemilik@example.com");
    const create = await post("/api/customer/api-keys", { name: "Milik Saya" }, owner.cookie, owner.csrf);
    const { key } = await create.json();

    const attacker = await signIn("penyerang@example.com");
    const revoke = await del(`/api/customer/api-keys/${key.id}`, attacker.cookie, attacker.csrf);
    expect(revoke.status).toBe(404);

    // The owner's key is untouched.
    const list = await app.request(`${BASE}/api/customer/api-keys`, { headers: { Cookie: owner.cookie } });
    expect((await list.json()).keys[0].isActive).toBe(true);
  });

  it("does not return another account's keys", async () => {
    const first = await signIn("satu@example.com");
    await post("/api/customer/api-keys", { name: "Kunci Satu" }, first.cookie, first.csrf);

    const second = await signIn("dua@example.com");
    const list = await app.request(`${BASE}/api/customer/api-keys`, { headers: { Cookie: second.cookie } });
    expect((await list.json()).keys).toEqual([]);
  });
});

describe("Customer data access audit", () => {
  beforeEach(() => {
    resetCustomerAccessAudit();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (ORIGINAL_INSECURE === undefined) delete process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;
    else process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED = ORIGINAL_INSECURE;
  });

  it("records a refused read of customer data", async () => {
    delete process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED;

    const res = await app.request(`${BASE}/api/customer/dashboard-data`);
    expect(res.status).toBe(403);

    const entries = await recentCustomerAccess(10);
    expect(entries).toHaveLength(1);
    expect(entries[0].succeeded).toBe(false);
    expect(entries[0].recordsReturned).toBe(0);
  });

  it("counts the records a privileged read returns", async () => {
    // The suite opts into the insecure bypass for its fixtures; this asserts the
    // access trail captures that read rather than staying silent.
    const res = await app.request(`${BASE}/api/customer/dashboard-data`);
    expect(res.status).toBe(200);

    const entries = await recentCustomerAccess(10);
    expect(entries[0].succeeded).toBe(true);
    expect(entries[0].recordsReturned).toBeGreaterThanOrEqual(0);
    expect(entries[0].action).toBe("customer.read");
  });
});
