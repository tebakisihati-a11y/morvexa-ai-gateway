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
 * That is a deliberate trade-off; move this to Redis/Upstash if a shared limit
 * becomes a requirement.
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

export function checkIpRateLimit(
  endpoint: keyof typeof policies | string,
  ip: string,
  now = Date.now()
): IpLimitDecision {
  const policy = policies[endpoint];
  if (!policy) return { allowed: true, retryAfterSeconds: 0 };

  if (windows.size >= MAX_TRACKED_KEYS) pruneExpired(now);

  const key = `${endpoint}:${ip}`;
  const timestamps = windows.get(key) ?? [];

  // The sustained window is the longer of the two, so pruning against it keeps
  // both windows correct.
  const oldestRelevant = now - policy.sustainedWindowMs;
  const active = timestamps.filter((t) => t > oldestRelevant);

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
