import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import {
  executeReconciliationCron,
  executeSubscriptionLifecycleCron,
  verifyCronAuthorization,
} from "../src/lib/cron/scheduler";
import {
  resetAuditLogs,
  recordAuditLog,
  queryAuditLogs,
} from "../src/lib/audit/logger";
import {
  resetBillingTestStore,
  seedTransaction,
  getTransaction,
} from "../src/lib/billing/midtrans";
import { resetReconciliationStore } from "../src/lib/billing/reconciliation";

describe("Phase 7 — Automation, Observability & Security Hardening", () => {
  beforeEach(() => {
    resetAuditLogs();
    resetBillingTestStore();
    resetReconciliationStore();
    delete process.env.CRON_SECRET;
  });

  describe("Audit Logging Engine", () => {
    it("records immutable audit log entries with unique IDs and timestamps", () => {
      const entry = recordAuditLog({
        actorType: "user",
        actorId: "usr_admin_123",
        organizationId: "org_nexus_1",
        action: "ROLE_ASSIGNED",
        resourceType: "organization_member",
        resourceId: "mem_456",
        status: "success",
        details: { assignedRole: "CUSTOMER_ADMIN" },
      });

      expect(entry.id).toMatch(/^aud_\d+_/);
      expect(entry.timestamp).toBeDefined();
      expect(entry.action).toBe("ROLE_ASSIGNED");

      const logs = queryAuditLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].id).toBe(entry.id);
    });

    it("supports querying audit logs by actorId and organizationId", () => {
      recordAuditLog({
        actorType: "user",
        actorId: "usr_alice",
        organizationId: "org_alpha",
        action: "API_KEY_CREATED",
        resourceType: "api_key",
        resourceId: "key_1",
        status: "success",
      });

      recordAuditLog({
        actorType: "user",
        actorId: "usr_bob",
        organizationId: "org_beta",
        action: "API_KEY_REVOKED",
        resourceType: "api_key",
        resourceId: "key_2",
        status: "success",
      });

      const aliceLogs = queryAuditLogs({ actorId: "usr_alice" });
      expect(aliceLogs.length).toBe(1);
      expect(aliceLogs[0].organizationId).toBe("org_alpha");

      const betaLogs = queryAuditLogs({ organizationId: "org_beta" });
      expect(betaLogs.length).toBe(1);
      expect(betaLogs[0].actorId).toBe("usr_bob");
    });
  });

  describe("Cron Job Scheduler Engine", () => {
    it("verifies cron authorization correctly when secret is set", () => {
      process.env.CRON_SECRET = "super_secure_cron_token_xyz";
      expect(verifyCronAuthorization(null)).toBe(false);
      expect(verifyCronAuthorization("Bearer wrong_token")).toBe(false);
      expect(
        verifyCronAuthorization("Bearer super_secure_cron_token_xyz")
      ).toBe(true);
    });

    it("executes reconciliation cron job and logs audit event", async () => {
      const result = await executeReconciliationCron();
      expect(result.job).toBe("reconciliation_cron");
      expect(result.success).toBe(true);

      const logs = queryAuditLogs({ action: "CRON_JOB_EXECUTED" });
      expect(logs.length).toBe(1);
      expect(logs[0].actorType).toBe("cron");
      expect(logs[0].resourceType).toBe("billing_reconciliation");
    });

    it("executes subscription lifecycle cron and expires stale pending transactions", async () => {
      const staleTimestamp = Date.now() - 36 * 60 * 60 * 1000; // 36 hours ago
      seedTransaction("ORDER-STALE-1", "pending", 500000, "org_test", staleTimestamp);
      seedTransaction("ORDER-FRESH-1", "pending", 500000, "org_test", Date.now());

      const result = await executeSubscriptionLifecycleCron();
      expect(result.success).toBe(true);
      expect(result.details.expiredTransactionsCount).toBe(1);

      // Verify stale transaction was marked expired
      const staleTx = getTransaction("ORDER-STALE-1");
      expect(staleTx?.status).toBe("expired");

      // Verify fresh transaction remains pending
      const freshTx = getTransaction("ORDER-FRESH-1");
      expect(freshTx?.status).toBe("pending");
    });
  });

  describe("API Endpoints for Automation & Audit", () => {
    it("POST /api/cron/reconcile triggers reconciliation successfully", async () => {
      const res = await app.request("/api/cron/reconcile", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.job).toBe("reconciliation_cron");
      expect(json.success).toBe(true);
    });

    it("POST /api/cron/reconcile rejects unauthorized request when secret configured", async () => {
      process.env.CRON_SECRET = "secret_key_123";
      const res = await app.request("/api/cron/reconcile", {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid_secret",
        },
      });

      expect(res.status).toBe(401);
    });

    it("GET /api/audit/logs returns list of recorded events", async () => {
      recordAuditLog({
        actorType: "api_key",
        actorId: "key_live_123",
        action: "BILLING_RECONCILED",
        resourceType: "transaction",
        resourceId: "tx_999",
        status: "success",
      });

      const res = await app.request("/api/audit/logs", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.count).toBeGreaterThanOrEqual(1);
      expect(json.logs[0].action).toBe("BILLING_RECONCILED");
    });
  });
});
