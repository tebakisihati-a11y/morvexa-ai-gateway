import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import { canPerform } from "../src/lib/auth/roles";
import { generateSecureApiKey } from "../src/lib/auth/keys";
import {
  calculateMidtransSignature,
  resetBillingTestStore,
  getTransaction,
} from "../src/lib/billing/midtrans";
import {
  reconcileSingleOrder,
  resetReconciliationStore,
} from "../src/lib/billing/reconciliation";
import {
  resetProvisioningTestStore,
  getEnvironment,
} from "../src/lib/infrastructure/provisioning";
import {
  resetStoreForTest,
  seedApiKeyForTest,
} from "../src/lib/supabase/store";
import { resetRateLimitStore } from "../src/lib/gateway/ratelimit";

describe("Tahap 8 — End-to-End SaaS Life-Cycle Integration Test", () => {
  const SERVER_KEY = "e2e_sandbox_server_key_secret";

  beforeEach(() => {
    process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;
    resetBillingTestStore();
    resetReconciliationStore();
    resetRateLimitStore();
    resetProvisioningTestStore();
    resetStoreForTest();
  });

  it("Executes the complete Morvexa SaaS Lifecycle: IAM -> Checkout -> Webhook -> Reconciliation -> Gateway -> Hybrid Infra", async () => {
    // ------------------------------------------------------------------------
    // Step 1: IAM & Role-Based Access Control Verification
    // ------------------------------------------------------------------------
    const orgId = "org_acme_ai";
    expect(canPerform("PLATFORM_OWNER", "org:manage_billing")).toBe(true);
    expect(canPerform("CUSTOMER_OWNER", "org:manage_billing")).toBe(true);
    expect(canPerform("CUSTOMER_DEVELOPER", "org:manage_billing")).toBe(false);
    expect(canPerform("CUSTOMER_DEVELOPER", "org:execute_ai_inference")).toBe(true);
    expect(canPerform("CUSTOMER_DEVELOPER", "devops:manage_infrastructure")).toBe(false);

    // ------------------------------------------------------------------------
    // Step 2: Customer Initiates Checkout for Apex Scale Plan (IDR 2,850,000)
    // ------------------------------------------------------------------------
    const checkoutRes = await app.request("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        planCode: "apex",
        amount: 2850000,
        customerName: "Acme Corp Lead",
        customerEmail: "billing@acme.corp",
      }),
    });

    expect(checkoutRes.status).toBe(201);
    const checkoutData = await checkoutRes.json();
    const orderId = checkoutData.orderId;
    expect(orderId).toMatch(/^MVX-\d+-[A-Z0-9]+$/);
    expect(checkoutData.snapToken).toBeDefined();

    // Verify initial transaction state in store is 'pending'
    const initialTx = getTransaction(orderId);
    expect(initialTx?.status).toBe("pending");
    expect(initialTx?.amount).toBe(2850000);

    // ------------------------------------------------------------------------
    // Step 3: Midtrans Webhook Callback Ingestion with SHA-512 Verification
    // ------------------------------------------------------------------------
    const statusCode = "200";
    const grossAmount = "2850000.00";
    const signature = calculateMidtransSignature(orderId, statusCode, grossAmount, SERVER_KEY);

    const webhookPayload = {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
      transaction_id: `trx_midtrans_${Date.now()}`,
      custom_field1: orgId,
      custom_field2: "apex",
    };

    const webhookRes = await app.request("/api/billing/webhooks/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    expect(webhookRes.status).toBe(200);
    const webhookResult = await webhookRes.json();
    expect(webhookResult.success).toBe(true);
    expect(webhookResult.status).toBe("settled");
    expect(webhookResult.subscriptionActivated).toBe(true);
    expect(webhookResult.invoiceId).toMatch(/^INV-\d{8}-[A-Z0-9-]+$/);

    // Verify transaction status transitioned to 'settled'
    const settledTx = getTransaction(orderId);
    expect(settledTx?.status).toBe("settled");
    expect(settledTx?.invoiceId).toBe(webhookResult.invoiceId);

    // Idempotency: Replaying webhook must be safely acknowledged without re-mutation
    const duplicateRes = await app.request("/api/billing/webhooks/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });
    expect(duplicateRes.status).toBe(200);
    const dupResult = await duplicateRes.json();
    expect(dupResult.duplicate).toBe(true);
    expect(dupResult.status).toBe("settled");

    // ------------------------------------------------------------------------
    // Step 4: Financial Reconciliation Verification
    // ------------------------------------------------------------------------
    const reconRecord = await reconcileSingleOrder(orderId, {
      mockGatewayStatus: "settlement",
      mockGatewayAmount: 2850000,
    });
    expect(reconRecord.resolved).toBe(true);
    expect(reconRecord.actionTaken).toBe("none"); // Already settled, no discrepancy

    // ------------------------------------------------------------------------
    // Step 5: Cryptographic API Key Issuance (NIST SP 800-63B Compliant)
    // ------------------------------------------------------------------------
    const keyGen = generateSecureApiKey("live");
    expect(keyGen.rawSecret).toMatch(/^mvx_live_[a-f0-9]+$/);
    expect(keyGen.maskedKey).toMatch(/^mvx_live_\.{3}[a-f0-9]{4}$/);
    expect(keyGen.keyHash).toHaveLength(64);

    seedApiKeyForTest({
      id: "key_acme_production",
      name: "Acme Production Gateway Key",
      prefix: "mvx_live_",
      secret: keyGen.rawSecret,
      rateLimitRpm: 300,
      dailyTokenLimit: 2500000,
      isActive: true,
    });

    // ------------------------------------------------------------------------
    // Step 6: AI Gateway Inference Execution & Rate Limit Enforcement
    // ------------------------------------------------------------------------
    const inferenceRes = await app.request("/api/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${keyGen.rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-7-sonnet",
        stream: false,
        messages: [{ role: "user", content: "Benchmark query from E2E suite." }],
      }),
    });

    expect(inferenceRes.status).toBe(200);
    const inferenceData = await inferenceRes.json();
    expect(inferenceData.role).toBe("assistant");
    expect(inferenceData.content[0].text).toContain("Morvexa Gateway");
    expect(inferenceData.usage.input_tokens).toBeGreaterThan(0);

    // ------------------------------------------------------------------------
    // Step 7: Hybrid Dedicated Infrastructure Provisioning
    // ------------------------------------------------------------------------
    const provisionRes = await app.request("/api/infrastructure/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId,
        planCode: "apex",
        region: "sin",
        modelTier: "dedicated_vllm",
        dedicatedHostUrl: "https://sin-node-apex.morvexa.internal:8000",
        memoryMb: 32768,
        cpuCores: 8,
      }),
    });

    expect(provisionRes.status).toBe(201);
    const provisionData = await provisionRes.json();
    expect(provisionData.success).toBe(true);
    expect(provisionData.status).toBe("active");
    expect(provisionData.endpointUrl).toContain("https://sin-node-");

    const envId = provisionData.envId;

    // ------------------------------------------------------------------------
    // Step 8: Infrastructure Health Probes & Auto-Degradation Simulation
    // ------------------------------------------------------------------------
    // 2 successful probes
    await app.request(`/api/infrastructure/environments/${envId}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    });
    await app.request(`/api/infrastructure/environments/${envId}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    });

    let envState = getEnvironment(envId);
    expect(envState?.consecutiveFailures).toBe(0);
    expect(envState?.status).toBe("active");

    // 3 consecutive failed probes -> Auto-degrades to fallback
    await app.request(`/api/infrastructure/environments/${envId}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false }),
    });
    await app.request(`/api/infrastructure/environments/${envId}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false }),
    });
    await app.request(`/api/infrastructure/environments/${envId}/probe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false }),
    });

    envState = getEnvironment(envId);
    expect(envState?.status).toBe("degraded");
    expect(envState?.consecutiveFailures).toBe(3);
    expect(envState?.liveness).toBe("failing");

    // ------------------------------------------------------------------------
    // Step 9: Controlled Environment Deprovisioning
    // ------------------------------------------------------------------------
    const deprovisionRes = await app.request(`/api/infrastructure/environments/${envId}`, {
      method: "DELETE",
    });
    expect(deprovisionRes.status).toBe(200);

    const checkEnv = getEnvironment(envId);
    expect(checkEnv?.status).toBe("deprovisioned");
  });
});

