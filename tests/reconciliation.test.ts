import { describe, it, expect, beforeEach } from "vitest";
import {
  reconcileSingleOrder,
  runAutomatedReconciliation,
  resetReconciliationStore,
  getReconciliationLogs,
} from "../src/lib/billing/reconciliation";
import {
  seedTransaction,
  getTransaction,
  resetBillingTestStore,
} from "../src/lib/billing/midtrans";
import {
  checkRateLimit,
  resetRateLimitStore,
} from "../src/lib/gateway/ratelimit";
import { app } from "../src/lib/gateway/app";
import { seedApiKeyForTest, resetStoreForTest } from "../src/lib/supabase/store";

describe("Tahap 7 — Automated Financial Reconciliation & Rate Limiter", () => {
  beforeEach(() => {
    resetBillingTestStore();
    resetReconciliationStore();
    resetRateLimitStore();
    resetStoreForTest();
  });

  describe("Reconciliation Engine (docs/billing/RECONCILIATION.md)", () => {
    it("1. Automatically settles missed/delayed webhook (UNSETTLED_CAPTURE)", async () => {
      const orderId = "MVX-RECON-001";
      seedTransaction(orderId, "pending", 750000, "org_test");

      const record = await reconcileSingleOrder(orderId, {
        mockGatewayStatus: "settlement",
        mockGatewayAmount: 750000,
      });

      expect(record.discrepancyType).toBe("UNSETTLED_CAPTURE");
      expect(record.severity).toBe("medium");
      expect(record.actionTaken).toBe("auto_settled");
      expect(record.resolved).toBe(true);
      expect(record.invoiceId).toMatch(/^INV-\d{8}-[A-Z0-9-]+$/);

      const updatedTx = getTransaction(orderId);
      expect(updatedTx?.status).toBe("settled");
      expect(updatedTx?.invoiceId).toBe(record.invoiceId);
    });

    it("2. Flags critical discrepancy and blocks auto-activation on AMOUNT_MISMATCH", async () => {
      const orderId = "MVX-RECON-002";
      seedTransaction(orderId, "pending", 1500000, "org_test");

      // Gateway reports captured amount of 100,000 instead of 1,500,000
      const record = await reconcileSingleOrder(orderId, {
        mockGatewayStatus: "settlement",
        mockGatewayAmount: 100000,
      });

      expect(record.discrepancyType).toBe("AMOUNT_MISMATCH");
      expect(record.severity).toBe("critical");
      expect(record.actionTaken).toBe("flagged_for_manual_review");
      expect(record.resolved).toBe(false);

      // Crucial: Must NEVER auto-settle fraudulent/mismatched transactions
      const txAfter = getTransaction(orderId);
      expect(txAfter?.status).toBe("pending");
      expect(txAfter?.invoiceId).toBeUndefined();
    });

    it("3. Cleans up expired transaction from gateway (EXPIRED_CLEANUP)", async () => {
      const orderId = "MVX-RECON-003";
      seedTransaction(orderId, "pending", 350000, "org_test");

      const record = await reconcileSingleOrder(orderId, {
        mockGatewayStatus: "expire",
      });

      expect(record.discrepancyType).toBe("EXPIRED_CLEANUP");
      expect(record.actionTaken).toBe("marked_expired");
      expect(record.resolved).toBe(true);

      const txAfter = getTransaction(orderId);
      expect(txAfter?.status).toBe("expired");
    });

    it("4. Cleans up denied/cancelled transaction (CANCELLED_CLEANUP)", async () => {
      const orderId = "MVX-RECON-004";
      seedTransaction(orderId, "pending", 350000, "org_test");

      const record = await reconcileSingleOrder(orderId, {
        mockGatewayStatus: "deny",
      });

      expect(record.discrepancyType).toBe("CANCELLED_CLEANUP");
      expect(record.actionTaken).toBe("marked_failed");
      expect(record.resolved).toBe(true);

      const txAfter = getTransaction(orderId);
      expect(txAfter?.status).toBe("failed");
    });

    it("5. Flags high-severity alert for ORPHAN_TRANSACTION", async () => {
      const nonExistentOrderId = "MVX-UNKNOWN-999";

      const record = await reconcileSingleOrder(nonExistentOrderId, {
        mockGatewayStatus: "settlement",
        mockGatewayAmount: 500000,
      });

      expect(record.discrepancyType).toBe("ORPHAN_TRANSACTION");
      expect(record.severity).toBe("high");
      expect(record.internalStatus).toBe("not_found");
      expect(record.actionTaken).toBe("flagged_for_manual_review");
      expect(record.resolved).toBe(false);
    });

    it("6. Correctly reports synchronized transactions with action 'none'", async () => {
      const orderId = "MVX-RECON-006";
      seedTransaction(orderId, "settled", 750000, "org_test");

      const record = await reconcileSingleOrder(orderId, {
        mockGatewayStatus: "settlement",
        mockGatewayAmount: 750000,
      });

      expect(record.actionTaken).toBe("none");
      expect(record.resolved).toBe(true);
    });

    it("7. Runs automated batch reconciliation filtering by pending age", async () => {
      const now = Date.now();
      // Old pending tx (15 mins old)
      seedTransaction("MVX-BATCH-OLD", "pending", 500000, "org_test", now - 15 * 60 * 1000);
      // Fresh pending tx (2 mins old)
      seedTransaction("MVX-BATCH-FRESH", "pending", 500000, "org_test", now - 2 * 60 * 1000);

      const batchResult = await runAutomatedReconciliation({
        minPendingAgeMs: 10 * 60 * 1000, // 10 minutes
        mockGatewayLookup: (orderId) => {
          if (orderId === "MVX-BATCH-OLD") return { status: "settlement", amount: 500000 };
          return null;
        },
      });

      // Should only scan the 15-min-old transaction
      expect(batchResult.scannedCount).toBe(1);
      expect(batchResult.resolvedCount).toBe(1);
      expect(batchResult.flaggedCount).toBe(0);

      const settledTx = getTransaction("MVX-BATCH-OLD");
      expect(settledTx?.status).toBe("settled");

      const freshTx = getTransaction("MVX-BATCH-FRESH");
      expect(freshTx?.status).toBe("pending");
    });
  });

  describe("Sliding-Window Rate Limiter (src/lib/gateway/ratelimit.ts)", () => {
    it("8. Allows requests within allowed RPM limit", () => {
      const key = "key_pro_user";
      const limit = 5;

      for (let i = 0; i < 5; i++) {
        const res = checkRateLimit(key, limit);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(limit - 1 - i);
      }
    });

    it("9. Rejects requests exceeding RPM limit with 429 retryAfter information", () => {
      const key = "key_limited_user";
      const limit = 3;

      checkRateLimit(key, limit);
      checkRateLimit(key, limit);
      checkRateLimit(key, limit);

      const blocked = checkRateLimit(key, limit);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("10. Recovers capacity after sliding window expires", () => {
      const key = "key_window_expiry";
      const limit = 2;
      const baseTime = 1000000;

      // Make 2 requests at baseTime
      checkRateLimit(key, limit, 60000, baseTime);
      checkRateLimit(key, limit, 60000, baseTime);

      // Blocked at baseTime + 10s
      const blocked = checkRateLimit(key, limit, 60000, baseTime + 10000);
      expect(blocked.allowed).toBe(false);

      // Allowed after window elapsed (baseTime + 61s)
      const allowed = checkRateLimit(key, limit, 60000, baseTime + 61000);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });
  });

  describe("Gateway HTTP Endpoints Integration", () => {
    it("11. Reconciles single order via POST /api/billing/reconcile/:orderId", async () => {
      const orderId = "MVX-HTTP-RECON";
      seedTransaction(orderId, "pending", 850000, "org_http");

      const res = await app.request(`/api/billing/reconcile/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockGatewayStatus: "settlement",
          mockGatewayAmount: 850000,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.orderId).toBe(orderId);
      expect(json.discrepancyType).toBe("UNSETTLED_CAPTURE");
      expect(json.actionTaken).toBe("auto_settled");
    });

    it("12. Queries reconciliation audit logs via GET /api/billing/reconcile/logs", async () => {
      await reconcileSingleOrder("ORPHAN-001", { mockGatewayStatus: "settlement" });
      await reconcileSingleOrder("ORPHAN-002", { mockGatewayStatus: "settlement" });

      const res = await app.request("/api/billing/reconcile/logs");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.count).toBeGreaterThanOrEqual(2);
      expect(json.logs.length).toBeGreaterThanOrEqual(2);
    });

    it("13. Enforces rate limiting on gateway endpoints returning HTTP 429", async () => {
      const testSecret = "mvx_live_ratelimit_secret_123456789";
      seedApiKeyForTest({
        id: "key_rl_test",
        name: "RL Test Key",
        prefix: "mvx_live_rl",
        secret: testSecret,
        rateLimitRpm: 2, // strictly 2 RPM limit
        dailyTokenLimit: 100000,
        isActive: true,
      });

      // Request 1: Allowed
      const res1 = await app.request("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "Hi" }] }),
      });
      expect(res1.status).toBe(200);

      // Request 2: Allowed
      const res2 = await app.request("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "Hi" }] }),
      });
      expect(res2.status).toBe(200);

      // Request 3: Blocked with HTTP 429 Too Many Requests
      const res3 = await app.request("/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${testSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "Hi" }] }),
      });
      expect(res3.status).toBe(429);
      expect(res3.headers.get("Retry-After")).toBeDefined();
      expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");

      const errJson = await res3.json();
      expect(errJson.error.code).toBe("rate_limit_exceeded");
    });
  });
});
