import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../src/lib/gateway/app";
import {
  isDedicatedEligible,
  requestDedicatedEnvironment,
  recordHealthProbe,
  deprovisionEnvironment,
  getActiveDedicatedEndpoint,
  resetProvisioningTestStore,
} from "../src/lib/infrastructure/provisioning";

describe("Hybrid Infrastructure & Provisioning Engine", () => {
  beforeEach(() => {
    resetProvisioningTestStore();
  });

  describe("Plan Entitlement Verification", () => {
    it("allows Apex Scale and Zenith Enterprise plans for dedicated infrastructure", () => {
      expect(isDedicatedEligible("apex")).toBe(true);
      expect(isDedicatedEligible("zenith")).toBe(true);
      expect(isDedicatedEligible("enterprise")).toBe(true);
    });

    it("rejects Developer Starter and Pro Workspace plans from dedicated provisioning", () => {
      expect(isDedicatedEligible("developer")).toBe(false);
      expect(isDedicatedEligible("pro")).toBe(false);
    });
  });

  describe("Provisioning Lifecycle State Machine", () => {
    it("rejects provisioning for ineligible plans with an informative message", async () => {
      const result = await requestDedicatedEnvironment({
        orgId: "org_startup_starter",
        planCode: "pro",
        region: "sin",
        modelTier: "isolated_proxy",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.message).toContain("not eligible for dedicated infrastructure");
    });

    it("successfully provisions dedicated isolated environment for eligible plans", async () => {
      const result = await requestDedicatedEnvironment({
        orgId: "org_enterprise_acme",
        planCode: "apex",
        region: "sin",
        modelTier: "custom_cluster",
        dedicatedHostUrl: "http://localhost:5002",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("active");
      expect(result.envId).toBeDefined();
      expect(result.endpointUrl).toBe("http://localhost:5002");

      // Verify active endpoint is routed
      const activeEndpoint = getActiveDedicatedEndpoint("org_enterprise_acme");
      expect(activeEndpoint).toBe("http://localhost:5002");
    });
  });

  describe("Health Probing & Fault Degradation", () => {
    it("transitions environment to DEGRADED upon 3 consecutive probe failures", async () => {
      const prov = await requestDedicatedEnvironment({
        orgId: "org_fault_test",
        planCode: "zenith",
        region: "fra",
        modelTier: "private_gpu",
      });

      const envId = prov.envId!;

      // 1st failure: warning
      const probe1 = recordHealthProbe(envId, false);
      expect(probe1?.consecutiveFailures).toBe(1);
      expect(probe1?.status).toBe("active");

      // 2nd failure: warning
      const probe2 = recordHealthProbe(envId, false);
      expect(probe2?.consecutiveFailures).toBe(2);
      expect(probe2?.status).toBe("active");

      // 3rd failure: degraded threshold reached
      const probe3 = recordHealthProbe(envId, false);
      expect(probe3?.consecutiveFailures).toBe(3);
      expect(probe3?.status).toBe("degraded");
      expect(probe3?.liveness).toBe("failing");

      // Recovery probe: returns to active
      const probeRecovery = recordHealthProbe(envId, true);
      expect(probeRecovery?.consecutiveFailures).toBe(0);
      expect(probeRecovery?.status).toBe("active");
      expect(probeRecovery?.liveness).toBe("ok");
    });

    it("deprovisions environment gracefully", async () => {
      const prov = await requestDedicatedEnvironment({
        orgId: "org_deprov",
        planCode: "apex",
        region: "iad",
        modelTier: "isolated_proxy",
      });

      expect(deprovisionEnvironment(prov.envId!)).toBe(true);
      expect(getActiveDedicatedEndpoint("org_deprov")).toBeNull();
    });
  });

  describe("HTTP Gateway Endpoints for Infrastructure", () => {
    it("returns 403 when requesting provisioning with an ineligible plan", async () => {
      const res = await app.request("/api/infrastructure/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "org_small",
          planCode: "developer",
        }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("not eligible");
    });

    it("returns 201 when requesting provisioning with an eligible Apex plan", async () => {
      const res = await app.request("/api/infrastructure/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "org_big_fintech",
          planCode: "apex",
          region: "sin",
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe("active");

      // Query health via GET
      const healthRes = await app.request(`/api/infrastructure/environments/${json.envId}`);
      expect(healthRes.status).toBe(200);
      const healthJson = await healthRes.json();
      expect(healthJson.status).toBe("active");

      // Post health probe via POST
      const probeRes = await app.request(`/api/infrastructure/environments/${json.envId}/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true }),
      });
      expect(probeRes.status).toBe(200);

      // Deprovision via DELETE
      const deleteRes = await app.request(`/api/infrastructure/environments/${json.envId}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);
    });
  });
});
