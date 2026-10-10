/**
 * Morvexa AI Gateway — Sliding-Window Rate Limiter
 * Implements high-precision per-key and per-IP rate limiting
 * with standard RFC 6585 and draft-ietf headers.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

const memoryRateLimitWindows = new Map<string, number[]>();

/**
 * Resets the in-memory rate limit store (used in unit tests).
 */
export function resetRateLimitStore(): void {
  memoryRateLimitWindows.clear();
}

/**
 * Evaluates whether a given identifier (API key or IP) is within its allowed rate limit.
 * Uses a true sliding window of 60,000 milliseconds (1 minute).
 *
 * @param identifier Unique key identifier (e.g. key id, key prefix, or IP)
 * @param limitRpm Allowed requests per minute
 * @param windowMs Window duration in milliseconds (default: 60,000 ms)
 * @param now Current timestamp in milliseconds (default: Date.now())
 */
export function checkRateLimit(
  identifier: string,
  limitRpm: number,
  windowMs = 60000,
  now = Date.now()
): RateLimitResult {
  const windowStart = now - windowMs;
  let timestamps = memoryRateLimitWindows.get(identifier);

  if (!timestamps) {
    timestamps = [];
    memoryRateLimitWindows.set(identifier, timestamps);
  }

  // Prune timestamps outside current window
  const activeTimestamps = timestamps.filter((t) => t > windowStart);
  memoryRateLimitWindows.set(identifier, activeTimestamps);

  const currentCount = activeTimestamps.length;

  if (currentCount >= limitRpm) {
    const oldestTimestamp = activeTimestamps[0] || now;
    const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
    const retryAfterSeconds = Math.ceil(resetMs / 1000) || 1;

    return {
      allowed: false,
      limit: limitRpm,
      remaining: 0,
      resetSeconds: Math.ceil((now + resetMs) / 1000),
      retryAfterSeconds,
    };
  }

  // Record current request
  activeTimestamps.push(now);
  const remaining = Math.max(0, limitRpm - activeTimestamps.length);
  const resetSeconds = Math.ceil((now + windowMs) / 1000);

  return {
    allowed: true,
    limit: limitRpm,
    remaining,
    resetSeconds,
  };
}
