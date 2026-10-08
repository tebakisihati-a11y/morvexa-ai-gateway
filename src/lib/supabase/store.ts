import { isSupabaseConfigured, supabase } from "./client";
import type { ApiKeyItem, QuotaRecord, RequestTraceLog } from "../types";

// Seed data for immediate out-of-the-box local interactivity
const now = Date.now();
const ONE_HOUR = 3600 * 1000;

let memoryApiKeys: ApiKeyItem[] = [
  {
    id: "key-1",
    name: "Production Gateway Agent",
    prefix: "mvx_live_",
    maskedKey: "mvx_live_...4f89",
    hash: "sha256_mock_hash_1",
    isActive: true,
    rateLimitRpm: 120,
    dailyTokenLimit: 1000000,
    createdAt: new Date(now - 86400000 * 5).toISOString(),
    lastUsedAt: "Just now",
  },
  {
    id: "key-2",
    name: "Staging Test Proxy",
    prefix: "mvx_live_",
    maskedKey: "mvx_live_...bc21",
    hash: "sha256_mock_hash_2",
    isActive: true,
    rateLimitRpm: 60,
    dailyTokenLimit: 250000,
    createdAt: new Date(now - 86400000 * 2).toISOString(),
    lastUsedAt: "12 mins ago",
  },
  {
    id: "key-3",
    name: "Evaluation Benchmark Suite",
    prefix: "mvx_test_",
    maskedKey: "mvx_test_...88a1",
    hash: "sha256_mock_hash_3",
    isActive: false,
    rateLimitRpm: 30,
    dailyTokenLimit: 100000,
    createdAt: new Date(now - 86400000 * 10).toISOString(),
    lastUsedAt: "3 days ago",
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
    const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      return data.map((d) => ({
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
  const randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const rawSecret = `mvx_live_${randomSuffix}`;
  const maskedKey = `mvx_live_...${randomSuffix.slice(-4)}`;

  const newKey: ApiKeyItem = {
    id: `key-${Date.now()}`,
    name,
    prefix: "mvx_live_",
    maskedKey,
    hash: `sha256_${randomSuffix}`,
    isActive: true,
    rateLimitRpm,
    dailyTokenLimit,
    createdAt: new Date().toISOString(),
    lastUsedAt: "Never",
  };

  memoryApiKeys.unshift(newKey);
  return { key: newKey, rawSecret };
}

export async function revokeApiKey(id: string): Promise<boolean> {
  const item = memoryApiKeys.find((k) => k.id === id);
  if (item) {
    item.isActive = false;
    return true;
  }
  return false;
}

export async function getRequestLogs(): Promise<RequestTraceLog[]> {
  return [...memoryRequestLogs];
}

export async function getRollingQuotaRecords(): Promise<QuotaRecord[]> {
  return [...memoryQuotaRecords];
}
