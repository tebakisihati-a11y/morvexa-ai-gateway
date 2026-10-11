import type { SystemMetrics } from "./types";

/**
 * Authoritative default system telemetry metrics
 * Shared across the overview UI and edge health telemetry endpoints
 */
export const DEFAULT_SYSTEM_METRICS: SystemMetrics = {
  rps: 38.4,
  avgTtftMs: 142,
  cacheHitRatio: 0.28,
  errorRate: 0.0012,
  activeKeysCount: 14,
  totalRequests24h: 128940,
};
