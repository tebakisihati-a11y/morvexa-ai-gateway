import { describe, it, expect } from "vitest";
import { calculateRollingQuotaStatus, formatTimeRemaining } from "../src/lib/quota";
import type { QuotaConfig, QuotaRecord } from "../src/lib/types";

describe("Dual Rolling Quota Engine", () => {
  const config: QuotaConfig = {
    standardRequest5hLimit: 100,
    standardRequest7dLimit: 1000,
    latestTokenDailyLimit: 157100,
    latestTokenWeeklyLimit: 1100000,
  };

  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;

  it("calculates 5-hour rolling request usage and remaining quota accurately", () => {
    // 3 requests within the last 5 hours, 1 request 6 hours ago (should be expired)
    const records: QuotaRecord[] = [
      { id: "1", modelType: "standard_request", tokens: 100, createdAt: now - ONE_HOUR * 1 },
      { id: "2", modelType: "standard_request", tokens: 100, createdAt: now - ONE_HOUR * 2 },
      { id: "3", modelType: "standard_request", tokens: 100, createdAt: now - ONE_HOUR * 4 },
      { id: "4", modelType: "standard_request", tokens: 100, createdAt: now - ONE_HOUR * 6 }, // expired
    ];

    const status = calculateRollingQuotaStatus(records, config, now);

    // Active requests in 5-hour window: 3
    expect(status.standard5hUsed).toBe(3);
    expect(status.standard5hRemaining).toBe(97);
    expect(status.standard5hPercentage).toBe(3);

    // Oldest active request is id 3 (4 hours ago). Next slot should restore in 1 hour (5h - 4h = 1h).
    expect(status.nextSlotRestoreMs).toBeCloseTo(ONE_HOUR, -3);
    expect(formatTimeRemaining(status.nextSlotRestoreMs)).toBe("1h 00m");
  });

  it("calculates latest model daily and weekly token consumption", () => {
    const records: QuotaRecord[] = [
      // 50,000 tokens 2 hours ago (within daily and weekly)
      { id: "10", modelType: "latest_token", tokens: 50000, createdAt: now - ONE_HOUR * 2 },
      // 30,000 tokens 26 hours ago (outside daily, within weekly)
      { id: "11", modelType: "latest_token", tokens: 30000, createdAt: now - ONE_HOUR * 26 },
      // 10,000 tokens 8 days ago (outside weekly)
      { id: "12", modelType: "latest_token", tokens: 10000, createdAt: now - ONE_HOUR * 24 * 8 },
    ];

    const status = calculateRollingQuotaStatus(records, config, now);

    expect(status.latestDailyTokensUsed).toBe(50000);
    expect(status.latestDailyTokensRemaining).toBe(config.latestTokenDailyLimit - 50000);
    expect(status.latestWeeklyTokensUsed).toBe(80000); // 50k + 30k
  });

  it("handles 0 usage correctly with null next restore time", () => {
    const status = calculateRollingQuotaStatus([], config, now);

    expect(status.standard5hUsed).toBe(0);
    expect(status.standard5hRemaining).toBe(100);
    expect(status.nextSlotRestoreMs).toBeNull();
    expect(formatTimeRemaining(status.nextSlotRestoreMs)).toBe("Full Capacity");
  });
});
