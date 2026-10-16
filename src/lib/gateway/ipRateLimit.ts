/**
 * Per-IP throttling for the unauthenticated auth endpoints.
 *
 * The existing per-account throttle in auth/password.ts cannot see a credential
 * -stuffing run that spreads attempts across many accounts from one address,
 * nor a script that hammers register. This adds the missing dimension.
 *
 * Two windows guard each endpoint:
 *   - a burst window, to stop a tight loop;
 *   - a sustained window, to stop a slow, patient sweep that would slip under
 *     the burst limit.
 *
 * Both windows must pass. Each is a sliding window over request timestamps,
 * which is memory-hungry per key, so the tracked-key map is capped and pruned.
 *
 * In-process state only: a multi-instance deployment gets per-instance limits.
 * To close that gap the caller can pass a shared window read from
 * gateway/rateLimitStore.ts, which both instances can see; when it is absent the
 * local Map is the only source, as before.
 */

export interface IpLimitPolicy {
  /** Requests allowed inside the burst window. */
  burst: number;
  burstWindowMs: number;
  /** Requests allowed inside the sustained window. */
  sustained: number;
  sustainedWindowMs: number;
}

export interface IpLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

const policies: Record<string, IpLimitPolicy> = {
  login: { burst: 10, burstWindowMs: 60_000, sustained: 40, sustainedWindowMs: 15 * 60_000 },
  register: { burst: 5, burstWindowMs: 60_000, sustained: 20, sustainedWindowMs: 60 * 60_000 },
  "forgot-password": {
    burst: 5,
    burstWindowMs: 60_000,
    sustained: 15,
    sustainedWindowMs: 60 * 60_000,
  },
  "reset-password": { burst: 10, burstWindowMs: 60_000, sustained: 30, sustainedWindowMs: 60 * 60_000 },
  "verify-email": { burst: 20, burstWindowMs: 60_000, sustained: 60, sustainedWindowMs: 60 * 60_000 },
  "resend-verification": {
    burst: 3,
    burstWindowMs: 60_000,
    sustained: 10,
    sustainedWindowMs: 60 * 60_000,
  },
};

const MAX_TRACKED_KEYS = 10_000;

/** Exposes a policy so callers can size the shared-window read. */
export function ipLimitPolicy(endpoint: string): IpLimitPolicy | undefined {
  return policies[endpoint];
}

const windows = new Map<string, number[]>();

/** Drops a key once every timestamp in it has aged out of the longest window. */
function pruneExpired(now: number): void {
  for (const [key, timestamps] of windows) {
    const last = timestamps[timestamps.length - 1];
    if (last === undefined || now - last > 60 * 60_000) {
      windows.delete(key);
    }
  }
}

/**
 * Decides whether `ip` may proceed, merging the local window with a shared one
 * when the caller supplies it.
 *
 * `sharedTimestamps` are the timestamps other instances have recorded for the
 * same key. They are unioned with the local ones so the decision reflects total
 * traffic, not this instance's share of it. Passing nothing keeps the previous
 * behaviour exactly.
 */
export function checkIpRateLimit(
  endpoint: keyof typeof policies | string,
  ip: string,
  now = Date.now(),
  sharedTimestamps?: number[]
): IpLimitDecision {
  const policy = policies[endpoint];
  if (!policy) return { allowed: true, retryAfterSeconds: 0 };

  if (windows.size >= MAX_TRACKED_KEYS) pruneExpired(now);

  const key = `${endpoint}:${ip}`;
  const local = windows.get(key) ?? [];

  // The shared window is the authoritative count when it is available: it holds
  // the events every instance recorded, including this one's. Fall back to the
  // local window when the shared store answered with fewer events than we know
  // we recorded, which is what a lagging or failed write looks like.
  //
  // The two lists are not unioned: deduplicating by timestamp value would treat
  // two requests that share a millisecond as one, and the limit counts requests,
  // not milliseconds. Distinct requests legitimately collide at this resolution.
  const oldestRelevant = now - policy.sustainedWindowMs;
  const merged =
    sharedTimestamps && sharedTimestamps.length >= local.length ? sharedTimestamps : local;
  const active = merged.filter((t) => t > oldestRelevant).sort((a, b) => a - b);

  const inBurst = active.filter((t) => t > now - policy.burstWindowMs).length;
  const inSustained = active.length;

  const blocked =
    inBurst >= policy.burst || inSustained >= policy.sustained;

  if (blocked) {
    // Report when the binding window frees up.
    const binding =
      inBurst >= policy.burst
        ? active.filter((t) => t > now - policy.burstWindowMs)[0]
        : active[0];
    const windowMs =
      inBurst >= policy.burst ? policy.burstWindowMs : policy.sustainedWindowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil(((binding ?? now) + windowMs - now) / 1000));

    windows.set(key, active);
    return { allowed: false, retryAfterSeconds };
  }

  active.push(now);
  windows.set(key, active);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Extracts the caller's address.
 *
 * Vercel sets `x-forwarded-for` as `<client>, <proxy>...`, so the first entry is
 * the client. `x-real-ip` is the fallback. When neither header is present the
 * request is not from a trusted proxy and we cannot attribute it; callers treat
 * an empty string as "do not limit" rather than lumping every such request into
 * one bucket, which would let one client lock out everyone else.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() ?? "";
}

/** Test helper: clears all per-IP windows. */
export function resetIpRateLimits(): void {
  windows.clear();
}
