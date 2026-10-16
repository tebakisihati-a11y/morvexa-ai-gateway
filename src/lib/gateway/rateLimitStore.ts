/**
 * Shared rate-limit window.
 *
 * The in-process limiter in gateway/ipRateLimit.ts keeps its timestamps in a
 * module-level Map, so two instances of the app never see each other's counts: a
 * burst spread across N instances gets N times the intended allowance, which is
 * exactly the situation on a serverless host that scales out under attack.
 *
 * This module backs the same decision with a store both instances can read:
 * `rate_limit_events` in Supabase when a service-role key is configured, and the
 * JSON store otherwise. Reads and writes are best-effort: if the store is
 * unreachable, the caller falls back to its in-memory window rather than
 * refusing traffic, because locking out real users during a database blip is a
 * worse failure than a temporarily looser limit.
 */

import { randomUUID } from "node:crypto";
import { isSupabaseAdminConfigured, getSupabaseAdminClient } from "../supabase/client";
import { readCollection, writeCollection } from "../persistence/jsonStore";

export interface RateLimitWindowResult {
  /** Timestamps in the window, oldest first, epoch milliseconds. */
  timestamps: number[];
  /** True when the store answered and the result may be trusted as shared. */
  shared: boolean;
}

interface PersistedEvent {
  key: string;
  at: number;
}

const COLLECTION = "rate-limit-events";
const MAX_ROWS = 20_000;

/**
 * Reads the timestamps recorded for `key` at or after `since`.
 *
 * Returns `shared: false` when the store is unavailable, so the caller knows to
 * fall back to its own window instead of treating an empty result as "no
 * traffic".
 */
export async function readSharedWindow(
  key: string,
  since: number
): Promise<RateLimitWindowResult> {
  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      const { data, error } = await client
        .from("rate_limit_events")
        .select("occurred_at")
        .eq("key", key)
        .gte("occurred_at", new Date(since).toISOString())
        .order("occurred_at", { ascending: true });

      if (error || !data) return { timestamps: [], shared: false };

      return {
        timestamps: data.map((row: any) => new Date(row.occurred_at).getTime()),
        shared: true,
      };
    } catch {
      return { timestamps: [], shared: false };
    }
  }

  try {
    const events = readCollection<PersistedEvent>(COLLECTION, []);
    return {
      timestamps: events
        .filter((e) => e.key === key && e.at >= since)
        .map((e) => e.at)
        .sort((a, b) => a - b),
      shared: true,
    };
  } catch {
    return { timestamps: [], shared: false };
  }
}

/** Records one request against `key`. Best-effort: failures are swallowed. */
export async function recordSharedEvent(key: string, at: number): Promise<void> {
  if (isSupabaseAdminConfigured) {
    try {
      const client = await getSupabaseAdminClient();
      await client.from("rate_limit_events").insert({
        key,
        occurred_at: new Date(at).toISOString(),
      });
      return;
    } catch {
      return;
    }
  }

  try {
    const events = readCollection<PersistedEvent>(COLLECTION, []);
    events.push({ key, at });
    // Bound the file: drop the oldest entries once it grows past the cap. The
    // limiter only ever looks back one sustained window, so old rows are dead
    // weight.
    const trimmed =
      events.length > MAX_ROWS
        ? events.sort((a, b) => a.at - b.at).slice(events.length - MAX_ROWS)
        : events;
    await writeCollection(COLLECTION, trimmed);
  } catch {
    // Ignored on purpose; see the module header.
  }
}

/** Test helper: empties the JSON-backed window. */
export function resetSharedRateLimitStore(): void {
  void writeCollection(COLLECTION, []);
}

export { randomUUID };
