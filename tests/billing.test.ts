import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import {
  calculateMidtransSignature,
  verifyMidtransSignature,
  mapMidtransStatus,
  canTransitionStatus,
  processMidtransWebhook,
  resetBillingTestStore,
  seedTransaction,
  getTransaction,
} from "../src/lib/billing/midtrans";
import type { MidtransNotificationPayload } from "../src/lib/billing/types";

describe("Midtrans Payment Gateway & Webhook Integration", () => {
  const SERVER_KEY = "test_server_key_sb_12345";

  beforeEach(() => {
    resetBillingTestStore();
  });

  describe("Cryptographic Signature Verification", () => {
    it("computes authentic SHA-512 signature matching Midtrans specification", () => {
      const orderId = "MVX-TEST-001";
      const statusCode = "200";
      const grossAmount = "750000.00";

      const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY);
      expect(signature).toHaveLength(128); // 128 hex chars for SHA-512

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signature,
        transaction_status: "settlement",
        transaction_id: "tx-midtrans-100",
      };

      expect(verifyMidtransSignature(payload, SERVER_KEY)).toBe(true);
    });

    it("rejects forged or tampered signatures", () => {
      const payload: MidtransNotificationPayload = {
        order_id: "MVX-TEST-002",
        status_code: "200",
        gross_amount: "750000.00",
        signature_key: "forged_invalid_signature_key_hex_value".repeat(4).slice(0, 128),
        transaction_status: "settlement",
        transaction_id: "tx-midtrans-101",
      };

      expect(verifyMidtransSignature(payload, SERVER_KEY)).toBe(false);
    });
  });

  describe("Status Mapping & Monotonic Transitions", () => {
    it("correctly maps Midtrans gateway statuses", () => {
      expect(mapMidtransStatus("settlement")).toBe("settled");
      expect(mapMidtransStatus("capture", "accept")).toBe("settled");
      expect(mapMidtransStatus("capture", "challenge")).toBe("pending");
      expect(mapMidtransStatus("pending")).toBe("pending");
      expect(mapMidtransStatus("deny")).toBe("failed");
      expect(mapMidtransStatus("cancel")).toBe("failed");
      expect(mapMidtransStatus("expire")).toBe("expired");
      expect(mapMidtransStatus("refund")).toBe("refunded");
    });

    it("protects settled transactions from downgrading back to pending or expired", () => {
      expect(canTransitionStatus("pending", "settled")).toBe(true);
      expect(canTransitionStatus("pending", "expired")).toBe(true);
      expect(canTransitionStatus("pending", "failed")).toBe(true);

      // Monotonic guard: once settled, cannot regress
      expect(canTransitionStatus("settled", "pending")).toBe(false);
      expect(canTransitionStatus("settled", "expired")).toBe(false);
      expect(canTransitionStatus("settled", "failed")).toBe(false);
      expect(canTransitionStatus("settled", "refunded")).toBe(true);
    });
  });

  describe("Webhook Ingestion & Idempotency", () => {
    it("successfully settles payment, activates subscription, and generates invoice", async () => {
      const orderId = "MVX-SETTLE-001";
      const grossAmount = "750000.00";
      const statusCode = "200";
      const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY);

      seedTransaction(orderId, "pending", 750000, "org_test_123");

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signature,
        transaction_status: "settlement",
        transaction_id: "midtrans-tx-001",
        custom_field1: "org_test_123",
      };

      const result = await processMidtransWebhook(payload, { serverKey: SERVER_KEY });

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(false);
      expect(result.status).toBe("settled");
      expect(result.subscriptionActivated).toBe(true);
      expect(result.invoiceId).toMatch(/^INV-\d{8}-/);

      // Verify stored state in transaction registry
      const stored = getTransaction(orderId);
      expect(stored?.status).toBe("settled");
      expect(stored?.amount).toBe(750000);
    });

    it("enforces replay defense on duplicate webhook deliveries (idempotency)", async () => {
      const orderId = "MVX-REPLAY-001";
      const grossAmount = "750000.00";
      const statusCode = "200";
      const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY);

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signature,
        transaction_status: "settlement",
        transaction_id: "midtrans-tx-replay-1",
      };

      // First delivery
      const firstResult = await processMidtransWebhook(payload, { serverKey: SERVER_KEY });
      expect(firstResult.success).toBe(true);
      expect(firstResult.duplicate).toBe(false);
      expect(firstResult.subscriptionActivated).toBe(true);

      // Replay delivery
      const secondResult = await processMidtransWebhook(payload, { serverKey: SERVER_KEY });
      expect(secondResult.success).toBe(true);
      expect(secondResult.duplicate).toBe(true);
      expect(secondResult.subscriptionActivated).toBe(false);
      expect(secondResult.invoiceId).toBe(firstResult.invoiceId);
    });

    it("handles failed and expired payments without activating subscriptions", async () => {
      const orderId = "MVX-FAIL-001";
      const grossAmount = "750000.00";
      const statusCode = "202";
      const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY);

      const payload: MidtransNotificationPayload = {
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signature,
        transaction_status: "deny",
        transaction_id: "midtrans-tx-fail-1",
      };

      const result = await processMidtransWebhook(payload, { serverKey: SERVER_KEY });
      expect(result.success).toBe(true);
      expect(result.status).toBe("failed");
      expect(result.subscriptionActivated).toBe(false);
      expect(result.invoiceId).toBeUndefined();

      const stored = getTransaction(orderId);
      expect(stored?.status).toBe("failed");
    });
  });

  describe("HTTP Gateway Endpoints for Billing", () => {
    it("creates a sandbox checkout session via POST /api/billing/checkout", async () => {
      const res = await app.request("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "org_acme_corp",
          planCode: "pro",
          amount: 750000,
          customerName: "Acme Corp Developer",
          customerEmail: "dev@acme.com",
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.orderId).toMatch(/^MVX-/);
      expect(json.snapToken).toMatch(/^snap-token-/);
      expect(json.redirectUrl).toContain("sandbox.midtrans.com");
      expect(json.amount).toBe(750000);

      // Verify transaction was registered as pending
      const checkRes = await app.request(`/api/billing/transactions/${json.orderId}`);
      expect(checkRes.status).toBe(200);
      const checkJson = await checkRes.json();
      expect(checkJson.status).toBe("pending");
    });

    it("processes webhook through HTTP POST /api/billing/webhooks/midtrans", async () => {
      const orderId = "MVX-HTTP-WEBHOOK-01";
      const grossAmount = "2500000.00";
      const statusCode = "200";

      // Uses default server key fallback or env
      const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, "dummy_sandbox_key");

      const res = await app.request("/api/billing/webhooks/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signature,
          transaction_status: "settlement",
          transaction_id: "http-tx-999",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("settled");
      expect(json.subscriptionActivated).toBe(true);
    });

    it("rejects unauthorized webhook with 401 if signature is forged", async () => {
      const res = await app.request("/api/billing/webhooks/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "MVX-FORGED-01",
          status_code: "200",
          gross_amount: "100000.00",
          signature_key: "forged_signature_here",
          transaction_status: "settlement",
          transaction_id: "http-tx-forged",
        }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain("signature");
    });
  });
});
