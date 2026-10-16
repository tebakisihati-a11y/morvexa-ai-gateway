/**
 * Durable customer persistence (Supabase).
 *
 * Customer accounts, orders, activities and credentials live in the `customers`,
 * `customer_orders`, `customer_activities` and `customer_credentials` tables.
 * Until now nothing wrote profiles there: `registration` pushed to memory and
 * the JSON file, which a serverless host discards on every deploy, so every
 * account created in production disappeared at the next redeploy.
 *
 * Two things had to be true before these tables could be used.
 *
 * First, the client. All four tables enable RLS with `auth.uid() = id` policies,
 * and this application authenticates with its own HMAC cookie rather than
 * Supabase Auth, so `auth.uid()` is always null. The anon key therefore sees no
 * rows and can write none. These functions use the service-role client, which
 * bypasses RLS and is server-only.
 *
 * Second, the columns. The original tables predate email verification, the
 * password epoch, and key ownership, so migration 20261016 adds them. A missing
 * column surfaces as a Supabase error, which these functions report and treat as
 * "fall back to the JSON store" rather than a hard failure - a deployment that
 * has not applied the migration keeps working exactly as it did before.
 */

import { isSupabaseAdminConfigured, getSupabaseAdminClient } from "../supabase/client";
// Type-only import: erased at compile time, so this does not create a runtime
// cycle with store.ts, which imports this module's writers.
import type {
  CustomerUser,
  CustomerOrder,
  CustomerActivityLog,
  CustomerCredential,
} from "./store";

/** True when profiles can be persisted durably. */
export function isDurableCustomerStore(): boolean {
  return isSupabaseAdminConfigured;
}

let warnedOnce = false;

/**
 * Reports a failed Supabase call, once per process.
 *
 * The common cause is a missing column because the migration was not applied,
 * and repeating that on every request would bury the log. The caller falls back
 * to the JSON store either way.
 */
function reportFailure(operation: string, error: unknown): void {
  if (warnedOnce) return;
  warnedOnce = true;
  console.error(
    `[Morvexa Durable] Supabase ${operation} failed; falling back to the JSON store. ` +
      "Apply supabase/migrations/20261016_durable_ownership_throttle_audit.sql. Cause:",
    error
  );
}

/* ---------------------------------------------------------------------------
   Row mapping
   ------------------------------------------------------------------------- */

function customerToRow(user: CustomerUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    avatar: user.avatar ?? null,
    registered_at: user.registeredAt,
    last_login_at: user.lastLoginAt,
    status: user.status,
    email_verified: user.emailVerified ?? false,
    current_plan: user.currentPlan,
    token_balance: user.tokenBalance,
    tokens_used: user.tokensUsed,
    total_orders_count: user.totalOrdersCount,
    total_spent_idr: user.totalSpentIdr,
  };
}

function rowToCustomer(row: any): CustomerUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    provider: row.provider ?? "email",
    avatar: row.avatar ?? undefined,
    registeredAt: row.registered_at,
    lastLoginAt: row.last_login_at,
    status: row.status ?? "active",
    emailVerified: row.email_verified ?? false,
    currentPlan: row.current_plan,
    tokenBalance: Number(row.token_balance ?? 0),
    tokensUsed: Number(row.tokens_used ?? 0),
    totalOrdersCount: row.total_orders_count ?? 0,
    totalSpentIdr: Number(row.total_spent_idr ?? 0),
  };
}

function orderToRow(order: CustomerOrder) {
  return {
    id: order.id,
    customer_id: order.customerId,
    customer_email: order.customerEmail,
    customer_name: order.customerName,
    order_type: order.orderType,
    product_code: order.productCode,
    product_name: order.productName,
    amount_idr: order.amountIdr,
    tokens_granted: order.tokensGranted,
    payment_method: order.paymentMethod,
    status: order.status,
    api_key_dispatched: order.apiKeyDispatched ?? null,
    created_at: order.createdAt,
  };
}

function rowToOrder(row: any): CustomerOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    orderType: row.order_type,
    productCode: row.product_code,
    productName: row.product_name,
    amountIdr: Number(row.amount_idr ?? 0),
    tokensGranted: Number(row.tokens_granted ?? 0),
    paymentMethod: row.payment_method,
    status: row.status,
    apiKeyDispatched: row.api_key_dispatched ?? undefined,
    createdAt: row.created_at,
  };
}

function activityToRow(log: CustomerActivityLog) {
  return {
    id: log.id,
    timestamp: log.timestamp,
    customer_id: log.customerId,
    customer_email: log.customerEmail,
    activity_type: log.activityType,
    description: log.description,
    details: log.details ?? {},
  };
}

function rowToActivity(row: any): CustomerActivityLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    activityType: row.activity_type,
    description: row.description,
    details: row.details ?? {},
  };
}

/* ---------------------------------------------------------------------------
   Reads
   ------------------------------------------------------------------------- */

export interface DurableSnapshot {
  customers: CustomerUser[];
  orders: CustomerOrder[];
  activities: CustomerActivityLog[];
  credentials: CustomerCredential[];
}

/**
 * Loads every customer record into memory.
 *
 * Returns null when the store is not configured or the read failed, so the
 * caller keeps whatever it already had instead of replacing it with an empty
 * list. Activities are capped: the owner feed only renders the recent tail, and
 * pulling years of it into memory on each cold start would not scale.
 */
export async function loadCustomerSnapshot(): Promise<DurableSnapshot | null> {
  if (!isSupabaseAdminConfigured) return null;

  const client = await getSupabaseAdminClient();
  if (!client) return null;

  try {
    const [customers, orders, activities, credentials] = await Promise.all([
      client.from("customers").select("*").order("registered_at", { ascending: false }),
      client.from("customer_orders").select("*").order("created_at", { ascending: false }),
      client
        .from("customer_activities")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500),
      client.from("customer_credentials").select("*"),
    ]);

    const firstError = customers.error || orders.error || activities.error || credentials.error;
    if (firstError) {
      reportFailure("snapshot read", firstError);
      return null;
    }

    return {
      customers: (customers.data ?? []).map(rowToCustomer),
      orders: (orders.data ?? []).map(rowToOrder),
      activities: (activities.data ?? []).map(rowToActivity),
      credentials: (credentials.data ?? []).map((row: any) => ({
        customerId: row.customer_id,
        email: row.email,
        passwordHash: row.password_hash,
        failedAttempts: row.failed_attempts ?? 0,
        lockedUntil: Number(row.locked_until ?? 0),
        createdAt: row.created_at,
        lastVerifiedAt: row.last_verified_at ?? undefined,
        passwordChangedAt: Number(row.password_changed_at ?? 0),
      })),
    };
  } catch (error) {
    reportFailure("snapshot read", error);
    return null;
  }
}

/* ---------------------------------------------------------------------------
   Writes
   ------------------------------------------------------------------------- */

export async function upsertCustomerDurable(user: CustomerUser): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  try {
    const client = await getSupabaseAdminClient();
    const { error } = await client
      .from("customers")
      .upsert(customerToRow(user), { onConflict: "id" });
    if (error) reportFailure("customer upsert", error);
  } catch (error) {
    reportFailure("customer upsert", error);
  }
}

export async function upsertCredentialDurable(credential: CustomerCredential): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  try {
    const client = await getSupabaseAdminClient();
    const { error } = await client.from("customer_credentials").upsert(
      {
        customer_id: credential.customerId,
        email: credential.email,
        password_hash: credential.passwordHash,
        failed_attempts: credential.failedAttempts,
        locked_until: credential.lockedUntil,
        created_at: credential.createdAt,
        last_verified_at: credential.lastVerifiedAt ?? null,
        password_changed_at: credential.passwordChangedAt ?? 0,
      },
      { onConflict: "email" }
    );
    if (error) reportFailure("credential upsert", error);
  } catch (error) {
    reportFailure("credential upsert", error);
  }
}

export async function insertOrderDurable(order: CustomerOrder): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  try {
    const client = await getSupabaseAdminClient();
    const { error } = await client.from("customer_orders").upsert(orderToRow(order), {
      onConflict: "id",
    });
    if (error) reportFailure("order insert", error);
  } catch (error) {
    reportFailure("order insert", error);
  }
}

export async function insertActivityDurable(log: CustomerActivityLog): Promise<void> {
  if (!isSupabaseAdminConfigured) return;
  try {
    const client = await getSupabaseAdminClient();
    const { error } = await client.from("customer_activities").upsert(activityToRow(log), {
      onConflict: "id",
    });
    if (error) reportFailure("activity insert", error);
  } catch (error) {
    reportFailure("activity insert", error);
  }
}
