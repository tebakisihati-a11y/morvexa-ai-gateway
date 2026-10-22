/**
 * Owner API key management sub-router.
 *
 * Split into its own Hono app so the catch-all edge function in app.ts does
 * not tree-shake it out under Vercel bundling. Mounted at /api/owner/keys.
 */
import { Hono } from "hono";
import type { ApiKeyItem } from "../types";

const keysApp = new Hono(); // mounted at /api/owner/keys by app.route() in app.ts

keysApp.use("/*", async (c, next) => {
  const { isPrivilegedRequest } = await import("./privilegeCheck");
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Forbidden: Owner session required" }, 403);
  }
  return next();
});

keysApp.get("/", async (c) => {
  const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import("../supabase/client");
  if (!isSupabaseAdminConfigured) {
    const { getApiKeys } = await import("../supabase/store");
    return c.json({ keys: await getApiKeys() }, 200);
  }
  const client = await getSupabaseAdminClient();
  const { data, error } = await client.from("api_keys").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Morvexa Owner Keys] Read failed:", error);
    return c.json({ error: "Gagal membaca daftar API key." }, 500);
  }
  return c.json(
    {
      keys: data.map((d: any) => ({
        id: d.id,
        name: d.name,
        prefix: d.key_prefix,
        maskedKey: d.masked_key,
        isActive: d.is_active,
        rateLimitRpm: d.rate_limit_rpm,
        dailyTokenLimit: d.daily_token_limit,
        createdAt: d.created_at,
        lastUsedAt: d.last_used_at,
      })),
    },
    200
  );
});

keysApp.post("/create", async (c) => {
  const { enforceCsrfToken } = await import("./csrf");
  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;
  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  const rpm = Number(body?.rateLimitRpm) || 60;
  const dailyTokens = Number(body?.dailyTokenLimit) || 500000;
  if (name.length < 3 || name.length > 60) return c.json({ error: "Nama key wajib diisi (3-60 karakter)." }, 400);

  const { generateSecureApiKey } = await import("../auth/keys");
  const generated = await generateSecureApiKey("live");
  const newKey: ApiKeyItem = {
    id: globalThis.crypto.randomUUID(),
    name,
    prefix: generated.keyPrefix,
    maskedKey: generated.maskedKey,
    hash: generated.keyHash,
    isActive: true,
    rateLimitRpm: rpm,
    dailyTokenLimit: dailyTokens,
    createdAt: new Date().toISOString(),
    lastUsedAt: undefined,
    customerEmail: undefined,
    tokensUsed: 0,
    totalTokenCap: dailyTokens,
    healthStatus: "healthy",
    planCode: "apex",
  };

  const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import("../supabase/client");
  if (isSupabaseAdminConfigured) {
    const client = await getSupabaseAdminClient();
    const { error } = await client.from("api_keys").insert({
      org_id: "org_default",
      name: newKey.name,
      key_prefix: newKey.prefix,
      masked_key: newKey.maskedKey,
      key_hash: newKey.hash,
      is_active: true,
      rate_limit_rpm: rpm,
      daily_token_limit: dailyTokens,
    });
    if (error) console.error("[Morvexa Owner Keys] Create persist failed:", error);
  }
  return c.json({ key: newKey, rawSecret: generated.rawSecret }, 200);
});

keysApp.post("/revoke", async (c) => {
  const { enforceCsrfToken } = await import("./csrf");
  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;
  const body = await c.req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return c.json({ error: "id key wajib diisi." }, 400);
  const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import("../supabase/client");
  if (!isSupabaseAdminConfigured) return c.json({ error: "Storage belum terkonfigurasi." }, 503);
  const client = await getSupabaseAdminClient();
  const { error } = await client.from("api_keys").update({ is_active: false }).eq("id", id);
  if (error) return c.json({ error: "Gagal revoke key." }, 500);
  const { recordAuditLog } = await import("../audit/logger");
  await recordAuditLog({ actorType: "user", actorId: "owner", action: "API_KEY_REVOKED", resourceType: "api_keys", resourceId: id, status: "success" });
  return c.json({ success: true }, 200);
});

keysApp.post("/regenerate", async (c) => {
  const { enforceCsrfToken } = await import("./csrf");
  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;
  const body = await c.req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return c.json({ error: "id key wajib diisi." }, 400);
  const { getSupabaseAdminClient, isSupabaseAdminConfigured } = await import("../supabase/client");
  const { generateSecureApiKey } = await import("../auth/keys");
  const generated = await generateSecureApiKey("live");
  if (isSupabaseAdminConfigured) {
    const client = await getSupabaseAdminClient();
    const { error } = await client.from("api_keys").update({ key_hash: generated.keyHash, key_prefix: generated.keyPrefix, masked_key: generated.maskedKey, is_active: true }).eq("id", id);
    if (error) return c.json({ error: "Gagal rotate key." }, 500);
  }
  const { recordAuditLog } = await import("../audit/logger");
  await recordAuditLog({ actorType: "user", actorId: "owner", action: "API_KEY_ROTATED", resourceType: "api_keys", resourceId: id, status: "success", details: { newMaskedKey: generated.maskedKey } });
  return c.json({ rawSecret: generated.rawSecret, maskedKey: generated.maskedKey }, 200);
});

keysApp.post("/reset-quota", async (c) => {
  const { enforceCsrfToken } = await import("./csrf");
  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;
  const body = await c.req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return c.json({ error: "id key wajib diisi." }, 400);
  const boost = Number(body?.boostTokens) || 100000;
  const { resetKeyQuota } = await import("../supabase/store");
  const updated = await resetKeyQuota(id, boost);
  if (!updated) return c.json({ error: "Key tidak ditemukan." }, 404);
  return c.json({ success: true, key: updated }, 200);
});

export default keysApp;
