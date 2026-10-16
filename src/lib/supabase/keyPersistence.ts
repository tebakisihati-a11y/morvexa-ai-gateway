/**
 * Durable API key persistence and customer-owned key operations.
 *
 * Split out of ./store.ts because that module is reached from the client-rendered
 * owner console. This one imports the JSON store, which imports node:fs, so it
 * must never enter a client bundle. Importing it from server route handlers
 * only keeps the boundary clean.
 *
 * Ownership is the reason this module exists: a key minted by a purchase used to
 * live in memory alone, so the customer held a secret the server forgot on the
 * next deploy. Keys are now stamped with the owning customer and written through
 * to Supabase (service role) with a JSON fallback.
 */

import { isSupabaseAdminConfigured, getSupabaseAdminClient } from "./client";
import { keyRow, rowToKey, getApiKeyMemory, prependApiKeyToMemory } from "./store";
import { readCollection, writeCollection } from "../persistence/jsonStore";
import type { ApiKeyItem } from "../types";

let keysHydrated = false;

/** Loads durable keys into memory once, so ownership lookups stay synchronous. */
export async function hydrateApiKeys(): Promise<void> {
  if (keysHydrated) return;
  keysHydrated = true;

  const memory = getApiKeyMemory();

  const local = readCollection<ApiKeyItem>("api-keys", []);
  if (local.length) {
    for (const row of local) {
      if (!memory.some((k) => k.id === row.id)) memory.push(row);
    }
  }

  if (!isSupabaseAdminConfigured) return;
  try {
    const client = await getSupabaseAdminClient();
    const { data, error } = await client
      .from("api_keys")
      .select("*")
      .not("customer_id", "is", null);
    if (error || !data) return;

    for (const row of data) {
      const mapped = rowToKey(row);
      const index = memory.findIndex((k) => k.id === mapped.id);
      if (index === -1) memory.push(mapped);
      else memory[index] = mapped;
    }
  } catch {
    // Falls back to memory + the local collection.
  }
}

/** Persists a key to the durable store and the local collection. */
export async function persistKey(item: ApiKeyItem): Promise<void> {
  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      await client.from("api_keys").upsert(keyRow(item), { onConflict: "id" });
    } catch {
      // The local collection below still records it.
    }
  }
  await writeCollection("api-keys", getApiKeyMemory().filter((k) => k.customerId));
}

/**
 * Lists the keys owned by one customer.
 *
 * Scoped by customer_id, which is derived from the session rather than the
 * request, so a caller cannot enumerate another tenant's keys.
 */
export async function getApiKeysForCustomer(customerId: string): Promise<ApiKeyItem[]> {
  await hydrateApiKeys();

  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      const { data, error } = await client
        .from("api_keys")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (!error && data) return data.map(rowToKey);
    } catch {
      // Falls through to memory.
    }
  }

  return getApiKeyMemory()
    .filter((k) => k.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Issues a key owned by a customer.
 *
 * Separate from createApiKey(), which models an operator-created org key and
 * records an owner-side audit entry. This one stamps ownership and persists it,
 * so the issuing customer can later list and revoke it.
 */
export async function createApiKeyForCustomer(params: {
  customerId: string;
  customerEmail: string;
  name: string;
  rateLimitRpm: number;
  dailyTokenLimit: number;
  planCode?: string;
}): Promise<{ key: ApiKeyItem; rawSecret: string }> {
  const { generateSecureApiKey } = await import("../auth/keys");
  const generated = await generateSecureApiKey("live");

  const newKey: ApiKeyItem = {
    id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: params.name,
    prefix: generated.keyPrefix,
    maskedKey: generated.maskedKey,
    hash: generated.keyHash,
    isActive: true,
    rateLimitRpm: params.rateLimitRpm,
    dailyTokenLimit: params.dailyTokenLimit,
    createdAt: new Date().toISOString(),
    lastUsedAt: undefined,
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    planCode: params.planCode,
    tokensUsed: 0,
    totalTokenCap: params.dailyTokenLimit,
    healthStatus: "healthy",
  };

  prependApiKeyToMemory(newKey);
  await persistKey(newKey);

  try {
    const { recordAuditLog } = await import("../audit/logger");
    recordAuditLog({
      actorType: "user",
      actorId: params.customerId,
      action: "API_KEY_CREATED",
      resourceType: "api_key",
      resourceId: newKey.id,
      status: "success",
      details: { name: params.name, maskedKey: newKey.maskedKey, selfService: true },
    });
  } catch {
    // Fail-open for logging.
  }

  return { key: newKey, rawSecret: generated.rawSecret };
}

/**
 * Revokes a key, but only when `customerId` owns it.
 *
 * The ownership check is what stops one tenant revoking another's key by
 * guessing an id.
 */
export async function revokeApiKeyForCustomer(
  id: string,
  customerId: string
): Promise<boolean> {
  await hydrateApiKeys();

  const item = getApiKeyMemory().find((k) => k.id === id);
  if (!item || item.customerId !== customerId) return false;

  item.isActive = false;
  item.healthStatus = "revoked";
  item.issueReason = "Dicabut oleh pemilik akun.";
  await persistKey(item);

  try {
    const { recordAuditLog } = await import("../audit/logger");
    recordAuditLog({
      actorType: "user",
      actorId: customerId,
      action: "API_KEY_REVOKED",
      resourceType: "api_key",
      resourceId: id,
      status: "success",
      details: { name: item.name, maskedKey: item.maskedKey, selfService: true },
    });
  } catch {
    // Fail-open for logging.
  }

  return true;
}

/** Test helper: re-arms hydration so a test can load a fresh fixture. */
export function resetApiKeyHydration(): void {
  keysHydrated = false;
}
