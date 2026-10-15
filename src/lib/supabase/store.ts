import { isSupabaseConfigured, getSupabaseClient } from "./client";
import type { ApiKeyItem, QuotaRecord, RequestTraceLog } from "../types";


// Seed data for immediate out-of-the-box local interactivity
const now = Date.now();
const ONE_HOUR = 3600 * 1000;

let memoryApiKeys: ApiKeyItem[] = [
  {
    id: "key-cust-1",
    name: "Apex Scale — dev@acme.ai",
    prefix: "mvx_live_",
    maskedKey: "mvx_live_...92d1",
    hash: "sha256_mock_hash_apex",
    isActive: true,
    rateLimitRpm: 300,
    dailyTokenLimit: 1500000,
    createdAt: new Date(now - 86400000 * 2).toISOString(),
    lastUsedAt: "2 mins ago",
    customerEmail: "dev@acme.ai",
    tokensUsed: 420850,
    totalTokenCap: 1500000,
    planCode: "apex",
    healthStatus: "healthy",
  },
  {
    id: "key-cust-2",
    name: "Pro Workspace — founder@startup.id",
    prefix: "mvx_live_",
    maskedKey: "mvx_live_...4f89",
    hash: "sha256_mock_hash_pro",
    isActive: true,
    rateLimitRpm: 120,
    dailyTokenLimit: 300000,
    createdAt: new Date(now - 86400000 * 5).toISOString(),
    lastUsedAt: "Just now",
    customerEmail: "founder@startup.id",
    tokensUsed: 298400,
    totalTokenCap: 300000,
    planCode: "pro",
    healthStatus: "quota_exhausted",
    issueReason: "Daily token limit almost depleted (99.4% used). Upstream calls may reject.",
  },
  {
    id: "key-cust-3",
    name: "Developer Starter — engineer@fintech.co",
    prefix: "mvx_live_",
    maskedKey: "mvx_live_...bc21",
    hash: "sha256_mock_corrupted_hash",
    isActive: true,
    rateLimitRpm: 30,
    dailyTokenLimit: 50000,
    createdAt: new Date(now - 86400000 * 1).toISOString(),
    lastUsedAt: "35 mins ago",
    customerEmail: "engineer@fintech.co",
    tokensUsed: 12500,
    totalTokenCap: 50000,
    planCode: "developer",
    healthStatus: "invalid_hash",
    issueReason: "Cryptographic hash check mismatch. Client requests return 401 Unauthorized.",
  },
  {
    id: "key-cust-4",
    name: "Evaluation Benchmark — qa@agency.org",
    prefix: "mvx_test_",
    maskedKey: "mvx_test_...88a1",
    hash: "sha256_mock_hash_3",
    isActive: false,
    rateLimitRpm: 30,
    dailyTokenLimit: 100000,
    createdAt: new Date(now - 86400000 * 10).toISOString(),
    lastUsedAt: "3 days ago",
    customerEmail: "qa@agency.org",
    tokensUsed: 89000,
    totalTokenCap: 100000,
    planCode: "developer",
    healthStatus: "revoked",
    issueReason: "Key revoked by platform administrator.",
  },
];

let memoryQuotaRecords: QuotaRecord[] = [
  // 32 requests in the last 5 hours to demonstrate the rolling window
  ...Array.from({ length: 32 }, (_, i) => ({
    id: `qr-${i}`,
    modelType: (i % 3 === 0 ? "latest_token" : "standard_request") as QuotaRecord["modelType"],
    tokens: (i % 3 === 0 ? 12400 : 850),
    createdAt: now - (i * 8 * 60 * 1000), // spread out across last 4 hours
  })),
];

let memoryRequestLogs: RequestTraceLog[] = [
  {
    id: "tr-901",
    timestamp: now - 15000,
    endpoint: "/v1/messages",
    modelRequested: "claude-3-7-sonnet",
    modelRouted: "claude-3-7-sonnet",
    provider: "anthropic",
    statusCode: 200,
    ttftMs: 142,
    totalDurationMs: 840,
    promptTokens: 520,
    completionTokens: 210,
    cached: false,
    failoverOccurred: false,
  },
  {
    id: "tr-902",
    timestamp: now - 45000,
    endpoint: "/v1/messages",
    modelRequested: "claude-3-5-sonnet",
    modelRouted: "deepseek-chat",
    provider: "deepseek",
    statusCode: 200,
    ttftMs: 98,
    totalDurationMs: 610,
    promptTokens: 410,
    completionTokens: 180,
    cached: false,
    failoverOccurred: true,
    failoverReason: "Anthropic rate-limit 429 -> Auto-failover to DeepSeek V3",
  },
  {
    id: "tr-903",
    timestamp: now - 95000,
    endpoint: "/v1/chat/completions",
    modelRequested: "gpt-4o",
    modelRouted: "gpt-4o",
    provider: "openai",
    statusCode: 200,
    ttftMs: 184,
    totalDurationMs: 1120,
    promptTokens: 1200,
    completionTokens: 450,
    cached: true,
    failoverOccurred: false,
  },
  {
    id: "tr-904",
    timestamp: now - 180000,
    endpoint: "/v1/messages",
    modelRequested: "claude-3-5-haiku",
    modelRouted: "gemini-2.0-flash",
    provider: "gemini",
    statusCode: 200,
    ttftMs: 45,
    totalDurationMs: 380,
    promptTokens: 320,
    completionTokens: 140,
    cached: false,
    failoverOccurred: true,
    failoverReason: "Latency spike on primary -> routed to Gemini 2.0 Flash",
  },
  {
    id: "tr-905",
    timestamp: now - 320000,
    endpoint: "/v1/messages",
    modelRequested: "claude-3-7-sonnet",
    modelRouted: "claude-3-7-sonnet",
    provider: "anthropic",
    statusCode: 200,
    ttftMs: 135,
    totalDurationMs: 920,
    promptTokens: 890,
    completionTokens: 310,
    cached: false,
    failoverOccurred: false,
  },
];

export async function getApiKeys(): Promise<ApiKeyItem[]> {
  if (isSupabaseConfigured) {
    const client = await getSupabaseClient();
    const { data } = await client
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        prefix: d.key_prefix,
        maskedKey: d.masked_key,
        hash: d.key_hash,
        isActive: d.is_active,
        rateLimitRpm: d.rate_limit_rpm,
        dailyTokenLimit: d.daily_token_limit,
        createdAt: d.created_at,
        lastUsedAt: d.last_used_at,
      }));
    }
  }
  return [...memoryApiKeys];
}

export async function createApiKey(name: string, rateLimitRpm: number, dailyTokenLimit: number): Promise<{ key: ApiKeyItem; rawSecret: string }> {
  const { generateSecureApiKey } = await import("../auth/keys");
  const generated = await generateSecureApiKey("live");

  const newKey: ApiKeyItem = {
    id: `key-${Date.now()}`,
    name,
    prefix: generated.keyPrefix,
    maskedKey: generated.maskedKey,
    hash: generated.keyHash,
    isActive: true,
    rateLimitRpm,
    dailyTokenLimit,
    createdAt: new Date().toISOString(),
    lastUsedAt: "Never",
  };

  memoryApiKeys.unshift(newKey);

  // Automatically record security audit trail for key generation
  try {
    const { recordAuditLog } = await import("../audit/logger");
    recordAuditLog({
      actorType: "user",
      actorId: "usr_active_admin",
      action: "API_KEY_CREATED",
      resourceType: "api_key",
      resourceId: newKey.id,
      status: "success",
      details: {
        name,
        maskedKey: newKey.maskedKey,
        rateLimitRpm,
        dailyTokenLimit,
      },
    });
  } catch {
    // Fail-open for logging to prevent blocking key creation
  }

  return { key: newKey, rawSecret: generated.rawSecret };
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const item = memoryApiKeys.find((k) => k.id === id);
  if (item) {
    item.isActive = false;
    item.healthStatus = "revoked";
    item.issueReason = "Key revoked by platform administrator.";

    // Automatically record security audit trail for key revocation
    try {
      const { recordAuditLog } = await import("../audit/logger");
      recordAuditLog({
        actorType: "user",
        actorId: "usr_active_admin",
        action: "API_KEY_REVOKED",
        resourceType: "api_key",
        resourceId: id,
        status: "success",
        details: {
          name: item.name,
          maskedKey: item.maskedKey,
        },
      });
    } catch {
      // Fail-open for logging
    }

    return true;
  }
  return false;
}

/**
 * Owner Autonomous Remediation: Regenerates key secret for customer with invalid / corrupted token.
 */
export async function regenerateKeySecret(id: string): Promise<{ key: ApiKeyItem; rawSecret: string } | null> {
  const item = memoryApiKeys.find((k) => k.id === id);
  if (!item) return null;

  const { generateSecureApiKey } = await import("../auth/keys");
  const generated = await generateSecureApiKey(item.prefix.includes("test") ? "test" : "live");
  item.hash = generated.keyHash;
  item.prefix = generated.keyPrefix;
  item.maskedKey = generated.maskedKey;
  item.isActive = true;
  item.healthStatus = "healthy";
  item.issueReason = undefined;

  try {
    const { recordAuditLog } = await import("../audit/logger");
    recordAuditLog({
      actorType: "user",
      actorId: "usr_active_admin",
      action: "API_KEY_REMEDIATED",
      resourceType: "api_key",
      resourceId: id,
      status: "success",
      details: {
        type: "REGENERATE_SECRET",
        name: item.name,
        newMaskedKey: generated.maskedKey,
        customerEmail: item.customerEmail,
      },
    });
  } catch {
    // Fail-open
  }

  return { key: item, rawSecret: generated.rawSecret };
}

/**
 * Owner Autonomous Remediation: Resets token usage or boosts quota for customer who exhausted daily limit.
 */
export async function resetKeyQuota(id: string, boostTokens = 0): Promise<ApiKeyItem | null> {
  const item = memoryApiKeys.find((k) => k.id === id);
  if (!item) return null;

  item.tokensUsed = 0;
  if (boostTokens > 0) {
    item.dailyTokenLimit += boostTokens;
    if (item.totalTokenCap) item.totalTokenCap += boostTokens;
  }
  item.isActive = true;
  item.healthStatus = "healthy";
  item.issueReason = undefined;

  try {
    const { recordAuditLog } = await import("../audit/logger");
    recordAuditLog({
      actorType: "user",
      actorId: "usr_active_admin",
      action: "API_KEY_REMEDIATED",
      resourceType: "api_key",
      resourceId: id,
      status: "success",
      details: {
        type: "RESET_QUOTA_BOOST",
        name: item.name,
        boostTokens,
        customerEmail: item.customerEmail,
      },
    });
  } catch {
    // Fail-open
  }

  return item;
}

export async function getRequestLogs(): Promise<RequestTraceLog[]> {
  return [...memoryRequestLogs];
}

export async function getRollingQuotaRecords(): Promise<QuotaRecord[]> {
  return [...memoryQuotaRecords];
}

/**
 * Looks up an API key by its raw secret using SHA-256 hash comparison.
 */
export async function findApiKeyBySecret(rawSecret: string): Promise<ApiKeyItem | null> {
  if (!rawSecret) return null;

  const { hashApiKeySecret } = await import("../auth/keys");

  // Support backward-compatible test fixtures strictly in test environments
  if (process.env.NODE_ENV === "test" && rawSecret === "mvx_live_test_key_123456") {
    return {
      id: "key-test-default",
      name: "Default Test Key",
      prefix: "mvx_live_",
      maskedKey: "mvx_live_...3456",
      hash: await hashApiKeySecret("mvx_live_test_key_123456"),
      isActive: true,
      rateLimitRpm: 120,
      dailyTokenLimit: 1000000,
      createdAt: new Date().toISOString(),
      lastUsedAt: "Just now",
    };
  }

  // Interactive sandbox key for local playground UI
  if (rawSecret === "mvx_live_playground_key") {
    return {
      id: "key-playground-default",
      name: "Interactive Playground Demo Key",
      prefix: "mvx_live_",
      maskedKey: "mvx_live_...play",
      hash: await hashApiKeySecret("mvx_live_playground_key"),
      isActive: true,
      rateLimitRpm: 300,
      dailyTokenLimit: 5000000,
      createdAt: new Date().toISOString(),
      lastUsedAt: "Just now",
    };
  }

  const hash = await hashApiKeySecret(rawSecret);

  if (isSupabaseConfigured) {
    const client = await getSupabaseClient();
    const { data } = await client.from("api_keys").select("*").eq("key_hash", hash).single();
    if (data) {
      return {
        id: data.id,
        name: data.name,
        prefix: data.key_prefix,
        maskedKey: data.masked_key,
        hash: data.key_hash,
        isActive: data.is_active,
        rateLimitRpm: data.rate_limit_rpm,
        dailyTokenLimit: data.daily_token_limit,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at,
      };
    }
  }

  const found = memoryApiKeys.find((k) => k.hash === hash);
  return found || null;
}

/**
 * Registers an API key for testing in memory.
 */
export async function registerTestApiKey(
  rawSecret: string,
  keyItem: Partial<ApiKeyItem>
): Promise<ApiKeyItem> {
  const { hashApiKeySecret } = await import("../auth/keys");
  const hash = await hashApiKeySecret(rawSecret);
  const prefix = rawSecret.startsWith("mvx_test_") ? "mvx_test_" : "mvx_live_";
  const item: ApiKeyItem = {
    id: keyItem.id || `test-key-${Date.now()}`,
    name: keyItem.name || "Test API Key",
    prefix,
    maskedKey: `${prefix}...${rawSecret.slice(-4)}`,
    hash,
    isActive: keyItem.isActive ?? true,
    rateLimitRpm: keyItem.rateLimitRpm ?? 60,
    dailyTokenLimit: keyItem.dailyTokenLimit ?? 500000,
    createdAt: new Date().toISOString(),
    lastUsedAt: keyItem.lastUsedAt || "Never",
  };

  memoryApiKeys.unshift(item);
  return item;
}

/**
 * Resets any dynamically registered test keys in memory.
 */
export function resetStoreForTest(): void {
  memoryApiKeys = memoryApiKeys.filter(
    (k) => k.id === "key-1" || k.id === "key-2" || k.id === "key-3"
  );
}

/**
 * Helper to seed API keys for testing.
 */
export async function seedApiKeyForTest(item: {
  id?: string;
  name?: string;
  prefix?: string;
  secret: string;
  rateLimitRpm?: number;
  dailyTokenLimit?: number;
  isActive?: boolean;
}): Promise<ApiKeyItem> {
  return registerTestApiKey(item.secret, item);
}

