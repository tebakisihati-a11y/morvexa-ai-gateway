export type ModelCategory = "latest_token" | "standard_request";

export type UpstreamProviderId = "anthropic" | "openai" | "gemini" | "groq" | "deepseek";

export interface QuotaConfig {
  standardRequest5hLimit: number; // e.g. 100 requests per 5 hours
  standardRequest7dLimit: number; // e.g. 1000 requests per 7 days
  latestTokenDailyLimit: number; // e.g. 157,100 tokens per day
  latestTokenWeeklyLimit: number; // e.g. 1,100,000 tokens per week
}

export interface QuotaRecord {
  id: string;
  modelType: ModelCategory;
  tokens: number;
  createdAt: number; // Unix timestamp in ms
}

export interface QuotaStatus {
  standard5hUsed: number;
  standard5hLimit: number;
  standard5hRemaining: number;
  standard5hPercentage: number;
  standard7dUsed: number;
  standard7dLimit: number;
  nextSlotRestoreMs: number | null; // ms until next slot becomes available

  latestDailyTokensUsed: number;
  latestDailyTokensLimit: number;
  latestDailyTokensRemaining: number;
  latestDailyPercentage: number;

  latestWeeklyTokensUsed: number;
  latestWeeklyTokensLimit: number;
  latestWeeklyTokensRemaining: number;
  latestWeeklyPercentage: number;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  maskedKey: string;
  hash: string;
  isActive: boolean;
  rateLimitRpm: number;
  dailyTokenLimit: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface UpstreamProviderConfig {
  id: UpstreamProviderId;
  name: string;
  apiKey: string;
  priority: number; // 1 = primary, 2 = fallback 1, etc.
  isActive: boolean;
  latencyMs: number;
  health: "healthy" | "degraded" | "down";
  baseUrl: string;
}

export interface RequestTraceLog {
  id: string;
  timestamp: number;
  endpoint: string;
  modelRequested: string;
  modelRouted: string;
  provider: UpstreamProviderId;
  statusCode: number;
  ttftMs: number;
  totalDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  cached: boolean;
  failoverOccurred: boolean;
  failoverReason?: string;
}

export interface SystemMetrics {
  rps: number;
  avgTtftMs: number;
  cacheHitRatio: number;
  errorRate: number;
  activeKeysCount: number;
  totalRequests24h: number;
}
