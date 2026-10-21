import { afterEach, describe, expect, it } from "vitest";
import {
  clearGatewayMetricsForTests,
  getGatewayMetrics,
  recordGatewayRequest,
  recordProviderTokenUsage,
} from "../src/lib/gateway/telemetry";

afterEach(() => clearGatewayMetricsForTests());

describe("runtime gateway telemetry", () => {
  it("calculates real request rate, latency, error rate, and hourly counts", () => {
    const now = Date.now();
    recordGatewayRequest({
      timestamp: now - 10_000,
      durationMs: 100,
      statusCode: 200,
      provider: "anthropic",
    });
    recordGatewayRequest({ timestamp: now - 5_000, durationMs: 300, statusCode: 429 });
    recordGatewayRequest({ timestamp: now - 1_000, durationMs: 50, statusCode: 503 });

    const metrics = getGatewayMetrics(now);
    expect(metrics.rps).toBe(0.05);
    expect(metrics.avgLatencyMs).toBe(100);
    expect(metrics.errorRate).toBeCloseTo(2 / 3);
    expect(metrics.totalRequests24h).toBe(3);
    expect(metrics.successfulRequestCount).toBe(1);
    expect(metrics.hourlyRequestCounts[23]).toBe(3);
    expect(metrics.cacheHitRatio).toBeNull();
    expect(metrics.scope).toBe("instance");
  });

  it("aggregates provider-reported tokens without mixing providers", () => {
    recordProviderTokenUsage("anthropic", 30, 12);
    recordProviderTokenUsage("anthropic", 8, 2);
    recordProviderTokenUsage("gemini", 16, 4);

    expect(getGatewayMetrics().providerTokenUsage).toEqual({
      anthropic: { inputTokens: 38, outputTokens: 14, requests: 2 },
      gemini: { inputTokens: 16, outputTokens: 4, requests: 1 },
    });
  });

  it("discards samples older than 24 hours", () => {
    const now = Date.now();
    recordGatewayRequest({ timestamp: now - 25 * 60 * 60 * 1000, durationMs: 10, statusCode: 200 });
    expect(getGatewayMetrics(now).totalRequests24h).toBe(0);
  });
});
