import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";
import {
  checkIpRateLimit,
  clientIpFromHeaders,
  resetIpRateLimits,
} from "../src/lib/gateway/ipRateLimit";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetResetTokensForTest } from "../src/lib/auth/resetTokens";

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

describe("Per-IP rate limiting", () => {
  beforeEach(() => {
    resetIpRateLimits();
    resetLoginThrottle();
    resetResetTokensForTest();
  });

  describe("clientIpFromHeaders", () => {
    it("takes the first entry of x-forwarded-for, which is the client", () => {
      const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
      expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
    });

    it("falls back to x-real-ip", () => {
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    });

    it("returns an empty string when no address can be attributed", () => {
      expect(clientIpFromHeaders(new Headers())).toBe("");
    });
  });

  describe("checkIpRateLimit", () => {
    it("allows up to the burst limit and blocks beyond it", () => {
      const now = Date.now();
      for (let i = 0; i < 10; i += 1) {
        expect(checkIpRateLimit("login", "10.0.0.1", now).allowed).toBe(true);
      }
      const blocked = checkIpRateLimit("login", "10.0.0.1", now);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("tracks each address independently", () => {
      const now = Date.now();
      for (let i = 0; i < 10; i += 1) checkIpRateLimit("login", "10.0.0.1", now);

      expect(checkIpRateLimit("login", "10.0.0.1", now).allowed).toBe(false);
      expect(checkIpRateLimit("login", "10.0.0.2", now).allowed).toBe(true);
    });

    it("tracks each endpoint independently", () => {
      const now = Date.now();
      for (let i = 0; i < 10; i += 1) checkIpRateLimit("login", "10.0.0.3", now);

      expect(checkIpRateLimit("login", "10.0.0.3", now).allowed).toBe(false);
      expect(checkIpRateLimit("register", "10.0.0.3", now).allowed).toBe(true);
    });

    it("frees the burst window once it slides past", () => {
      const now = Date.now();
      for (let i = 0; i < 10; i += 1) checkIpRateLimit("login", "10.0.0.4", now);
      expect(checkIpRateLimit("login", "10.0.0.4", now).allowed).toBe(false);

      expect(checkIpRateLimit("login", "10.0.0.4", now + 61_000).allowed).toBe(true);
    });

    it("blocks a slow sweep that stays under the burst limit", () => {
      // Register allows 5/min but only 20/hour. One request every 30s clears the
      // burst window every time yet must still trip the sustained limit.
      const start = Date.now();
      let blockedAt = -1;

      for (let i = 0; i < 25; i += 1) {
        const decision = checkIpRateLimit("register", "10.0.0.5", start + i * 30_000);
        if (!decision.allowed) {
          blockedAt = i;
          break;
        }
      }

      expect(blockedAt).toBe(20);
    });

    it("ignores an unknown endpoint", () => {
      expect(checkIpRateLimit("not-an-endpoint", "10.0.0.6").allowed).toBe(true);
    });
  });

  describe("HTTP integration", () => {
    it("returns 429 with Retry-After once an address exceeds the login limit", async () => {
      const ip = "203.0.113.50";
      let last: Response | null = null;

      for (let i = 0; i < 11; i += 1) {
        last = await post("/api/customer/auth/login", { email: "x@example.com", password: "nope1234" }, ip);
      }

      expect(last!.status).toBe(429);
      expect(last!.headers.get("retry-after")).toBeTruthy();
      expect((await last!.json()).error).toContain("Terlalu banyak percobaan");
    });

    it("limits register independently of login", async () => {
      const ip = "203.0.113.51";
      for (let i = 0; i < 11; i += 1) {
        await post("/api/customer/auth/login", { email: "y@example.com", password: "nope1234" }, ip);
      }

      const login = await post("/api/customer/auth/login", { email: "y@example.com", password: "nope1234" }, ip);
      expect(login.status).toBe(429);

      const register = await post(
        "/api/customer/auth/register",
        { name: "Baru Sekali", email: "baru@example.com", password: "rahasia123" },
        ip
      );
      expect(register.status).toBe(201);
    });

    it("does not let one noisy address lock out another", async () => {
      // Each attempt uses a distinct account, so the per-account throttle never
      // engages and the 429 can only come from the per-IP limit.
      const noisy = "203.0.113.52";
      for (let i = 0; i < 11; i += 1) {
        await post("/api/customer/auth/login", { email: `noise-${i}@example.com`, password: "nope1234" }, noisy);
      }
      const blocked = await post(
        "/api/customer/auth/login",
        { email: "noise-final@example.com", password: "nope1234" },
        noisy
      );
      expect(blocked.status).toBe(429);

      // A different address is unaffected by the noisy one.
      const quiet = await post(
        "/api/customer/auth/login",
        { email: "quiet@example.com", password: "nope1234" },
        "198.51.100.99"
      );
      expect(quiet.status).not.toBe(429);
    });

    it("limits forgot-password requests per address", async () => {
      const ip = "203.0.113.53";
      let last: Response | null = null;

      for (let i = 0; i < 6; i += 1) {
        last = await post("/api/customer/auth/forgot-password", { email: "nobody@example.com" }, ip);
      }

      expect(last!.status).toBe(429);
    });

    it("does not bucket requests that have no attributable address", async () => {
      // No x-forwarded-for. If the limiter treated "" as a single bucket, the
      // 6th request would 429 and one client could deny service to all others.
      // Distinct accounts keep the per-account throttle out of the way.
      for (let i = 0; i < 30; i += 1) {
        const res = await post("/api/customer/auth/forgot-password", { email: `anon-${i}@example.com` });
        expect(res.status).not.toBe(429);
      }
    });
  });
});
