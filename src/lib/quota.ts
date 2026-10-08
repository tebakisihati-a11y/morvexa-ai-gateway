import type { QuotaConfig, QuotaRecord, QuotaStatus } from "./types";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculates the real-time dual rolling quota status.
 * - Standard models: 5-Hour rolling request window (each request has 5h TTL) + 7-Day window.
 * - Latest frontier models: Daily token cap (24h) + Weekly token cap (7d).
 */
export function calculateRollingQuotaStatus(
  records: QuotaRecord[],
  config: QuotaConfig,
  currentTimestamp: number = Date.now()
): QuotaStatus {
  // 1. Filter standard model records within 5 hours & 7 days
  const standardRecords = records.filter((r) => r.modelType === "standard_request");

  const active5hRecords = standardRecords.filter(
    (r) => currentTimestamp - r.createdAt < FIVE_HOURS_MS
  );

  const active7dRecords = standardRecords.filter(
    (r) => currentTimestamp - r.createdAt < SEVEN_DAYS_MS
  );

  const standard5hUsed = active5hRecords.length;
  const standard5hRemaining = Math.max(0, config.standardRequest5hLimit - standard5hUsed);
  const standard5hPercentage = Math.min(
    100,
    Math.round((standard5hUsed / config.standardRequest5hLimit) * 100)
  );

  const standard7dUsed = active7dRecords.length;

  // Next slot restoration calculation:
  // Find the oldest record still within the 5h window. It will expire at r.createdAt + 5h.
  let nextSlotRestoreMs: number | null = null;
  if (active5hRecords.length > 0) {
    const oldestIn5h = active5hRecords.reduce((min, r) =>
      r.createdAt < min.createdAt ? r : min
    );
    const expireTime = oldestIn5h.createdAt + FIVE_HOURS_MS;
    nextSlotRestoreMs = Math.max(0, expireTime - currentTimestamp);
  }

  // 2. Filter latest model records within 24 hours & 7 days
  const latestRecords = records.filter((r) => r.modelType === "latest_token");

  const dailyLatestRecords = latestRecords.filter(
    (r) => currentTimestamp - r.createdAt < ONE_DAY_MS
  );

  const weeklyLatestRecords = latestRecords.filter(
    (r) => currentTimestamp - r.createdAt < SEVEN_DAYS_MS
  );

  const latestDailyTokensUsed = dailyLatestRecords.reduce((sum, r) => sum + r.tokens, 0);
  const latestDailyTokensRemaining = Math.max(
    0,
    config.latestTokenDailyLimit - latestDailyTokensUsed
  );
  const latestDailyPercentage = Math.min(
    100,
    Math.round((latestDailyTokensUsed / config.latestTokenDailyLimit) * 100)
  );

  const latestWeeklyTokensUsed = weeklyLatestRecords.reduce((sum, r) => sum + r.tokens, 0);
  const latestWeeklyTokensRemaining = Math.max(
    0,
    config.latestTokenWeeklyLimit - latestWeeklyTokensUsed
  );
  const latestWeeklyPercentage = Math.min(
    100,
    Math.round((latestWeeklyTokensUsed / config.latestTokenWeeklyLimit) * 100)
  );

  return {
    standard5hUsed,
    standard5hLimit: config.standardRequest5hLimit,
    standard5hRemaining,
    standard5hPercentage,
    standard7dUsed,
    standard7dLimit: config.standardRequest7dLimit,
    nextSlotRestoreMs,

    latestDailyTokensUsed,
    latestDailyTokensLimit: config.latestTokenDailyLimit,
    latestDailyTokensRemaining,
    latestDailyPercentage,

    latestWeeklyTokensUsed,
    latestWeeklyTokensLimit: config.latestTokenWeeklyLimit,
    latestWeeklyTokensRemaining,
    latestWeeklyPercentage,
  };
}

/**
 * Formats milliseconds remaining into human readable format, e.g. "1h 42m" or "32m 10s".
 */
export function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) {
    return "Full Capacity";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}
