/**
 * Access trail for customer PII.
 *
 * The owner console reads every customer's email, plan, spend and activity
 * through /api/customer/dashboard-data. When that route was briefly reachable
 * without credentials, there was no record of who had read it or how much - the
 * data left and nothing noticed. This module answers that question after the
 * fact: who looked, when, at what scope, and how many records they received.
 *
 * Separate from audit/logger.ts on purpose. That log's `actor_id` is a UUID with
 * a foreign key to auth.users, and owner sessions are not Supabase users, so an
 * owner read either fails the constraint or needs a null actor. This table has
 * no such constraint and holds exactly the fields this question needs.
 *
 * Writes are best-effort: losing an audit row must not fail the read it
 * describes, and a successful-but-unlogged read is better than a denied one.
 */

import { isSupabaseAdminConfigured, getSupabaseAdminClient } from "../supabase/client";
import { readCollection, writeCollection } from "../persistence/jsonStore";

export type AccessActorType = "owner_session" | "admin_secret" | "cron_secret" | "anonymous";

export interface CustomerAccessEntry {
  id: string;
  occurredAt: string;
  actorType: AccessActorType;
  actorId: string;
  action: string;
  scope: string;
  recordsReturned: number;
  ipAddress?: string;
  userAgent?: string;
  succeeded: boolean;
}

const COLLECTION = "customer-access-audit";
const MAX_LOCAL_ROWS = 5_000;

let warnedOnce = false;

function entryToRow(entry: CustomerAccessEntry) {
  return {
    id: entry.id,
    occurred_at: entry.occurredAt,
    actor_type: entry.actorType,
    actor_id: entry.actorId,
    action: entry.action,
    scope: entry.scope,
    records_returned: entry.recordsReturned,
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
    succeeded: entry.succeeded,
  };
}

/**
 * Records one read of customer data.
 *
 * `recordsReturned` is the point of the entry: an access that returns thousands
 * of rows is the shape of an exfiltration, and it should be visible without
 * reconstructing the response.
 */
export async function recordCustomerAccess(entry: {
  actorType: AccessActorType;
  actorId: string;
  action: string;
  scope: string;
  recordsReturned: number;
  ipAddress?: string;
  userAgent?: string;
  succeeded?: boolean;
}): Promise<void> {
  const full: CustomerAccessEntry = {
    id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString(),
    actorType: entry.actorType,
    actorId: entry.actorId,
    action: entry.action,
    scope: entry.scope,
    recordsReturned: entry.recordsReturned,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    succeeded: entry.succeeded ?? true,
  };

  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      await client.from("customer_access_audit").insert(entryToRow(full));
      return;
    } catch (error) {
      if (!warnedOnce) {
        warnedOnce = true;
        console.error(
          "[Morvexa Access Audit] Could not persist access entry; using the local store. " +
            "Apply supabase/migrations/20261016_durable_ownership_throttle_audit.sql. Cause:",
          error
        );
      }
    }
  }

  try {
    const rows = readCollection<CustomerAccessEntry>(COLLECTION, []);
    rows.unshift(full);
    await writeCollection(
      COLLECTION,
      rows.length > MAX_LOCAL_ROWS ? rows.slice(0, MAX_LOCAL_ROWS) : rows
    );
  } catch {
    // See the module header: never fail the read over its audit entry.
  }
}

/**
 * Returns the most recent access entries, newest first.
 *
 * Used by the owner console to show recent reads of customer data.
 */
export async function recentCustomerAccess(limit = 50): Promise<CustomerAccessEntry[]> {
  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      const { data, error } = await client
        .from("customer_access_audit")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          occurredAt: row.occurred_at,
          actorType: row.actor_type,
          actorId: row.actor_id,
          action: row.action,
          scope: row.scope,
          recordsReturned: row.records_returned ?? 0,
          ipAddress: row.ip_address ?? undefined,
          userAgent: row.user_agent ?? undefined,
          succeeded: row.succeeded ?? true,
        }));
      }
    } catch {
      // Falls through to the local store.
    }
  }

  return readCollection<CustomerAccessEntry>(COLLECTION, []).slice(0, limit);
}

/** Test helper. */
export function resetCustomerAccessAudit(): void {
  void writeCollection(COLLECTION, []);
}
