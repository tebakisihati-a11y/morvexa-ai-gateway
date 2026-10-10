/**
 * Morvexa Nexus — Hybrid Infrastructure Provisioning Engine
 * Manages shared edge multi-tenancy vs dedicated isolated environments.
 * Enforces plan eligibility, lifecycle state machine, and health monitoring.
 */

import type {
  DedicatedEnvironmentSpec,
  EnvironmentHealthStatus,
  ProvisioningJobResult,
} from "./types";

interface EnvironmentRecord {
  envId: string;
  orgId: string;
  planCode: string;
  region: string;
  endpointUrl: string;
  status: EnvironmentHealthStatus["status"];
  liveness: "ok" | "failing";
  readiness: "ok" | "warming_up" | "failing";
  consecutiveFailures: number;
  lastProbeAt: string;
  createdAt: string;
}

const memoryEnvironments = new Map<string, EnvironmentRecord>();

/**
 * Resets provisioning state (used by test suites).
 */
export function resetProvisioningTestStore(): void {
  memoryEnvironments.clear();
}

/**
 * Determines whether a plan code is entitled to provision dedicated environments.
 * Only Apex Scale and Zenith Enterprise qualify; Developer and Pro are rejected.
 */
export function isDedicatedEligible(planCode: string): boolean {
  const normalized = planCode.toLowerCase();
  return normalized === "apex" || normalized === "zenith" || normalized === "enterprise";
}

/**
 * Requests and provisions a dedicated isolated environment for an organization.
 */
export async function requestDedicatedEnvironment(
  spec: DedicatedEnvironmentSpec
): Promise<ProvisioningJobResult> {
  const jobId = `job_prov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // 1. Entitlement check
  if (!isDedicatedEligible(spec.planCode)) {
    return {
      success: false,
      jobId,
      status: "failed",
      message: `Plan '${spec.planCode}' is not eligible for dedicated infrastructure. Dedicated environments require Apex Scale or Zenith Enterprise.`,
    };
  }

  // 2. Assign environment ID and endpoint
  const envId = spec.envId || `env_ded_${spec.orgId.slice(0, 8)}_${spec.region}`;
  const endpointUrl =
    spec.dedicatedHostUrl ||
    process.env.PRIVATE_SERVER_URL ||
    "http://localhost:5002";

  // 3. Register active environment in state store
  const record: EnvironmentRecord = {
    envId,
    orgId: spec.orgId,
    planCode: spec.planCode,
    region: spec.region,
    endpointUrl,
    status: "active",
    liveness: "ok",
    readiness: "ok",
    consecutiveFailures: 0,
    lastProbeAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  memoryEnvironments.set(envId, record);

  return {
    success: true,
    jobId,
    envId,
    status: "active",
    endpointUrl,
    message: `Dedicated environment successfully provisioned in region ${spec.region.toUpperCase()}.`,
  };
}

/**
 * Records a synthetic or live health probe against an isolated environment.
 * Enforces the 3-failure threshold rule: >= 3 consecutive probe failures marks status as DEGRADED.
 */
export function recordHealthProbe(
  envId: string,
  isSuccessful: boolean
): EnvironmentHealthStatus | null {
  const env = memoryEnvironments.get(envId);
  if (!env) return null;

  env.lastProbeAt = new Date().toISOString();

  if (isSuccessful) {
    env.consecutiveFailures = 0;
    env.liveness = "ok";
    env.readiness = "ok";
    if (env.status === "degraded") {
      env.status = "active";
    }
  } else {
    env.consecutiveFailures += 1;
    if (env.consecutiveFailures >= 3) {
      env.status = "degraded";
      env.liveness = "failing";
      env.readiness = "failing";
    }
  }

  return {
    envId: env.envId,
    orgId: env.orgId,
    status: env.status,
    liveness: env.liveness,
    readiness: env.readiness,
    lastProbeAt: env.lastProbeAt,
    consecutiveFailures: env.consecutiveFailures,
    endpointUrl: env.endpointUrl,
  };
}

/**
 * Returns the active dedicated endpoint for an organization, or null if using shared edge proxy.
 */
export function getActiveDedicatedEndpoint(orgId: string): string | null {
  for (const env of memoryEnvironments.values()) {
    if (env.orgId === orgId && env.status === "active") {
      return env.endpointUrl;
    }
  }
  return null;
}

/**
 * Retrieves environment details by envId.
 */
export function getEnvironment(envId: string): EnvironmentHealthStatus | null {
  const env = memoryEnvironments.get(envId);
  if (!env) return null;

  return {
    envId: env.envId,
    orgId: env.orgId,
    status: env.status,
    liveness: env.liveness,
    readiness: env.readiness,
    lastProbeAt: env.lastProbeAt,
    consecutiveFailures: env.consecutiveFailures,
    endpointUrl: env.endpointUrl,
  };
}

/**
 * Deprovisions an isolated environment.
 */
export function deprovisionEnvironment(envId: string): boolean {
  const env = memoryEnvironments.get(envId);
  if (!env) return false;

  env.status = "deprovisioned";
  return true;
}
