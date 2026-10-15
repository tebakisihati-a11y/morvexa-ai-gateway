import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../src/lib/gateway/app";
import { resetLoginThrottle } from "../src/lib/auth/password";
import { resetResetTokensForTest, hashResetToken } from "../src/lib/auth/resetTokens";
import { readCollection } from "../src/lib/persistence/jsonStore";
import { resetStoreForTest } from "../src/lib/supabase/store";

const BASE = "http://localhost:3000";

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function registerUser(email: string, password = "rahasia123", name = "Budi Santoso") {
  const res = await post("/api/customer/auth/register", { name, email, password });
  return { res, json: await res.json() };
}

async function loginUser(email: string, password: string) {
  const res = await post("/api/customer/auth/login", { email, password });
  return { res, json: await res.json() };
}

/**
 * Drives the reset flow the way the UI does: request a link, read the raw token
 * out of the email that the log transport printed, then redeem it.
 */
async function requestResetAndCaptureToken(email: string): Promise<string | null> {
  const logged: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args) => {
    logged.push(args.map(String).join(" "));
  });

  await post("/api/customer/auth/forgot-password", { email });
  spy.mockRestore();

  const output = logged.join("\n");
  const match = output.match(/reset-password\?token=([A-Za-z0-9_-]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

describe("Password reset flow", () => {
  beforeEach(() => {
    resetLoginThrottle();
    resetResetTokensForTest();
    resetStoreForTest();
  });

  describe("POST /api/customer/auth/forgot-password", () => {
    it("acknowledges the request for a registered address", async () => {
      await registerUser("reset-me@example.com");

      const res = await post("/api/customer/auth/forgot-password", {
        email: "reset-me@example.com",
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("Jika email tersebut terdaftar");
    });

    it("returns the identical body for an unknown address, so accounts cannot be enumerated", async () => {
      await registerUser("known@example.com");

      const known = await post("/api/customer/auth/forgot-password", { email: "known@example.com" });
      const unknown = await post("/api/customer/auth/forgot-password", {
        email: "nobody@example.com",
      });

      expect(unknown.status).toBe(known.status);
      expect(await unknown.json()).toEqual(await known.json());
    });

    it("sends no email for an unknown address", async () => {
      const logged: string[] = [];
      const spy = vi.spyOn(console, "log").mockImplementation((...args) => {
        logged.push(args.map(String).join(" "));
      });

      await post("/api/customer/auth/forgot-password", { email: "nobody@example.com" });
      spy.mockRestore();

      expect(logged.join("\n")).not.toContain("reset-password?token=");
    });

    it("rejects a malformed address with 400", async () => {
      const res = await post("/api/customer/auth/forgot-password", { email: "not-an-email" });
      expect(res.status).toBe(400);
    });

    it("throttles repeated requests for the same address", async () => {
      await registerUser("spam@example.com");

      let last = 200;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const res = await post("/api/customer/auth/forgot-password", { email: "spam@example.com" });
        last = res.status;
      }

      expect(last).toBe(429);
    });

    it("points the emailed link at the forwarded public host, not the internal one", async () => {
      await registerUser("link@example.com");

      const logged: string[] = [];
      const spy = vi.spyOn(console, "log").mockImplementation((...args) => {
        logged.push(args.map(String).join(" "));
      });

      await app.request(`${BASE}/api/customer/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-host": "morvexa-sistem.vercel.app",
          "x-forwarded-proto": "https",
        },
        body: JSON.stringify({ email: "link@example.com" }),
      });
      spy.mockRestore();

      expect(logged.join("\n")).toContain(
        "https://morvexa-sistem.vercel.app/reset-password?token="
      );
    });
  });

  describe("Token storage", () => {
    it("persists only the hash of the token, never the raw value", async () => {
      await registerUser("hash@example.com");
      const rawToken = await requestResetAndCaptureToken("hash@example.com");
      expect(rawToken).toBeTruthy();

      const stored = readCollection<{ tokenHash: string; email: string }>(
        "password_reset_tokens",
        []
      );
      const mine = stored.filter((entry) => entry.email === "hash@example.com");

      expect(mine.length).toBe(1);
      expect(mine[0].tokenHash).toBe(hashResetToken(rawToken!));
      expect(JSON.stringify(stored)).not.toContain(rawToken!);
    });

    it("keeps only the newest token per account, invalidating the previous link", async () => {
      await registerUser("rotate@example.com");

      const first = await requestResetAndCaptureToken("rotate@example.com");
      resetLoginThrottle();
      const second = await requestResetAndCaptureToken("rotate@example.com");

      expect(first).not.toBe(second);

      const withOld = await post("/api/customer/auth/reset-password", {
        token: first,
        password: "passwordbaru123",
      });
      expect(withOld.status).toBe(400);

      const withNew = await post("/api/customer/auth/reset-password", {
        token: second,
        password: "passwordbaru123",
      });
      expect(withNew.status).toBe(200);
    });
  });

  describe("POST /api/customer/auth/reset-password", () => {
    it("changes the password, signs the customer in, and invalidates the token", async () => {
      await registerUser("change@example.com", "passwordlama1");
      const token = await requestResetAndCaptureToken("change@example.com");
      expect(token).toBeTruthy();

      const res = await post("/api/customer/auth/reset-password", {
        token,
        password: "passwordbaru2",
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.user.email).toBe("change@example.com");

      // Signed in by the reset itself.
      const cookie = res.headers.get("set-cookie") || "";
      expect(cookie).toContain("mvx_session=");
      expect(cookie).toContain("HttpOnly");
    });

    it("rejects the token on a second use", async () => {
      await registerUser("once@example.com", "passwordlama1");
      const token = await requestResetAndCaptureToken("once@example.com");

      const first = await post("/api/customer/auth/reset-password", {
        token,
        password: "passwordbaru2",
      });
      expect(first.status).toBe(200);

      const second = await post("/api/customer/auth/reset-password", {
        token,
        password: "passwordlain3",
      });
      expect(second.status).toBe(400);
      expect((await second.json()).error).toContain("tidak valid atau sudah kedaluwarsa");
    });

    it("rejects a token that was never issued", async () => {
      await registerUser("fake@example.com");

      const res = await post("/api/customer/auth/reset-password", {
        token: "a".repeat(43),
        password: "passwordbaru2",
      });

      expect(res.status).toBe(400);
    });

    it("rejects an expired token", async () => {
      await registerUser("expired@example.com", "passwordlama1");

      const { issuePasswordResetToken } = await import("../src/lib/auth/resetTokens");
      const { rawToken } = await issuePasswordResetToken({
        customerId: "cust-expired",
        email: "expired@example.com",
        ttlMinutes: -1,
      });

      const res = await post("/api/customer/auth/reset-password", {
        token: rawToken,
        password: "passwordbaru2",
      });

      expect(res.status).toBe(400);
      expect((await res.json()).error).toContain("kedaluwarsa");
    });

    it("rejects a missing token", async () => {
      const res = await post("/api/customer/auth/reset-password", { password: "passwordbaru2" });
      expect(res.status).toBe(400);
    });

    it("enforces the password policy before consuming the token", async () => {
      await registerUser("weak@example.com", "passwordlama1");
      const token = await requestResetAndCaptureToken("weak@example.com");

      const weak = await post("/api/customer/auth/reset-password", { token, password: "short" });
      expect(weak.status).toBe(400);

      // The token must still work afterwards.
      const retry = await post("/api/customer/auth/reset-password", {
        token,
        password: "passwordbaru2",
      });
      expect(retry.status).toBe(200);
    });

    it("makes the new password work and the old one stop working", async () => {
      await registerUser("swap@example.com", "passwordlama1");
      const token = await requestResetAndCaptureToken("swap@example.com");

      await post("/api/customer/auth/reset-password", { token, password: "passwordbaru2" });
      resetLoginThrottle();

      const withOld = await loginUser("swap@example.com", "passwordlama1");
      expect(withOld.res.status).toBe(401);

      resetLoginThrottle();
      const withNew = await loginUser("swap@example.com", "passwordbaru2");
      expect(withNew.res.status).toBe(200);
      expect(withNew.json.success).toBe(true);
    });

    it("clears a lockout so a user who forgot their password can get back in", async () => {
      await registerUser("locked@example.com", "passwordlama1");

      // Trip the lockout with wrong guesses.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await loginUser("locked@example.com", "salahterus99");
      }
      resetLoginThrottle();
      const stillLocked = await loginUser("locked@example.com", "passwordlama1");
      expect(stillLocked.res.status).toBe(429);

      const token = await requestResetAndCaptureToken("locked@example.com");
      const reset = await post("/api/customer/auth/reset-password", {
        token,
        password: "passwordbaru2",
      });
      expect(reset.status).toBe(200);

      resetLoginThrottle();
      const afterReset = await loginUser("locked@example.com", "passwordbaru2");
      expect(afterReset.res.status).toBe(200);
    });

    it("records the reset in the activity log", async () => {
      await registerUser("audit@example.com", "passwordlama1");
      const token = await requestResetAndCaptureToken("audit@example.com");

      await post("/api/customer/auth/reset-password", { token, password: "passwordbaru2" });

      const activities = readCollection<{ activityType: string; customerEmail: string }>(
        "activities",
        []
      );
      const reset = activities.find((entry) => entry.activityType === "USER_PASSWORD_RESET");
      expect(reset).toBeDefined();
      expect(reset!.customerEmail).toBe("audit@example.com");
    });
  });
});
