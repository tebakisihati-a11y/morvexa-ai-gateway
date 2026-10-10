/**
 * Morvexa Nexus — Hybrid Infrastructure & Provisioning Types
 */

export type InfrastructureTier = "shared" | "dedicated";

export type ProvisioningStatus =
  | "requested"
  | "validating"
  | "approved"
  | "provisioning"
  | "configuring"
  | "health_check"
  | "active"
  | "degraded"
  | "deprovisioning"
  | "deprovisioned"
  | "failed";

export interface DedicatedEnvironmentSpec {
  envId?: string;
  orgId: string;
  planCode: "developer" | "pro" | "apex" | "zenith";
  region: "sin" | "fra" | "iad" | "nrt" | "local";
  modelTier: "custom_cluster" | "private_gpu" | "isolated_proxy";
  dedicatedHostUrl?: string;
  memoryMb?: number;
  cpuCores?: number;
}

export interface EnvironmentHealthStatus {
  envId: string;
  orgId: string;
  status: ProvisioningStatus;
  liveness: "ok" | "failing";
  readiness: "ok" | "warming_up" | "failing";
  lastProbeAt: string;
  consecutiveFailures: number;
  endpointUrl: string;
}

export interface ProvisioningJobResult {
  success: boolean;
  jobId: string;
  envId?: string;
  status: ProvisioningStatus;
  endpointUrl?: string;
  message: string;
}
