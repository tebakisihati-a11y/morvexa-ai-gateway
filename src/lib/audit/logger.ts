/**
 * Morvexa Nexus — Audit Logging Engine (Phase 7)
 * Implements append-only structured audit trails for all administrative,
 * security, billing, and infrastructure state mutations.
 */

export type AuditActionType =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "ROLE_ASSIGNED"
  | "ROLE_REVOKED"
  | "API_KEY_CREATED"
  | "API_KEY_ROTATED"
  | "API_KEY_REVOKED"
  | "API_KEY_REMEDIATED"
  | "BILLING_CHECKOUT_CREATED"
  | "BILLING_WEBHOOK_PROCESSED"
  | "BILLING_RECONCILED"
  | "SUBSCRIPTION_STATUS_CHANGED"
  | "INFRA_ENVIRONMENT_PROVISIONED"
  | "INFRA_ENVIRONMENT_DEPROVISIONED"
  | "CRON_JOB_EXECUTED"
  | "SYSTEM_CONFIG_UPDATED";

export type AuditActorType = "user" | "system" | "api_key" | "cron";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorType: AuditActorType;
  actorId: string;
  organizationId?: string;
  action: AuditActionType;
  resourceType: string;
  resourceId: string;
  status: "success" | "failure" | "denied";
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

// In-memory append-only log store for edge deployment & local tests
const memoryAuditLogs: AuditLogEntry[] = [];

/**
 * Resets the in-memory audit logs (for testing isolation)
 */
export function resetAuditLogs(): void {
  memoryAuditLogs.length = 0;
}

/**
 * Records an immutable audit log entry.
 */
export function recordAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): AuditLogEntry {
  const log: AuditLogEntry = {
    ...entry,
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  memoryAuditLogs.push(Object.freeze({ ...log }));
  return log;
}

/**
 * Queries audit logs with optional filters and pagination.
 */
export function queryAuditLogs(filter?: {
  actorId?: string;
  organizationId?: string;
  action?: AuditActionType;
  resourceType?: string;
  limit?: number;
}): AuditLogEntry[] {
  let logs = [...memoryAuditLogs];

  if (filter?.actorId) {
    logs = logs.filter((l) => l.actorId === filter.actorId);
  }
  if (filter?.organizationId) {
    logs = logs.filter((l) => l.organizationId === filter.organizationId);
  }
  if (filter?.action) {
    logs = logs.filter((l) => l.action === filter.action);
  }
  if (filter?.resourceType) {
    logs = logs.filter((l) => l.resourceType === filter.resourceType);
  }

  // Sort descending by timestamp
  logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (filter?.limit) {
    logs = logs.slice(0, filter.limit);
  }

  return logs;
}
