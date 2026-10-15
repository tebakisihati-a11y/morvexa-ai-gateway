/**
 * Morvexa — Minimal Durable JSON Store
 *
 * Backing store for state that must survive a server restart when Supabase is
 * not configured (local development, preview deployments, single-container
 * self-hosting). Serverless filesystems are ephemeral, so production must run
 * on Supabase; `isEphemeralStorage()` exists so callers can warn about that.
 *
 * Writes are serialised per file and atomic (temp file + rename), so a crash
 * mid-write cannot leave a truncated file behind.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DATA_DIR =
  process.env.MORVEXA_DATA_DIR || join(process.cwd(), ".morvexa-data");

const writeChains = new Map<string, Promise<void>>();

export function isEphemeralStorage(): boolean {
  return !process.env.MORVEXA_DATA_DIR;
}

let warnedAboutEphemeralStorage = false;

/**
 * Warns once when customer data is being written to a location that may not
 * persist. Serverless platforms ship a read-only filesystem and recycle
 * containers, so a production deployment without Supabase and without an
 * explicit MORVEXA_DATA_DIR would silently lose every account it creates.
 */
export function assertDurableStorageConfigured(): void {
  if (warnedAboutEphemeralStorage) return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.MORVEXA_DATA_DIR) return;

  const supabaseConfigured = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  );
  if (supabaseConfigured) return;

  warnedAboutEphemeralStorage = true;
  console.warn(
    "[Morvexa Store] Customer data is persisted to the local filesystem, which is " +
      "ephemeral on serverless hosts. Configure Supabase (NEXT_PUBLIC_SUPABASE_URL + " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY) and apply supabase/migrations/20261015_customer_identity.sql, " +
      "or set MORVEXA_DATA_DIR to a mounted volume."
  );
}

function filePathFor(name: string): string {
  return join(DATA_DIR, `${name}.json`);
}

/**
 * Reads and parses a collection, returning `fallback` when the file is absent
 * or unreadable. A corrupt file is reported and treated as empty rather than
 * crashing the request that touched it.
 */
export function readCollection<T>(name: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(readFileSync(filePathFor(name), "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    console.error(`[Morvexa Store] Could not read "${name}", starting empty:`, error);
    return fallback;
  }
}

/**
 * Writes a collection atomically, preserving call order per file.
 *
 * Returns a promise so callers that need the data on disk before responding
 * (registration, payment settlement) can await it; callers that do not can
 * ignore it.
 */
export function writeCollection<T>(name: string, value: T[]): Promise<void> {
  assertDurableStorageConfigured();

  const previous = writeChains.get(name) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(() => {
      const target = filePathFor(name);
      mkdirSync(dirname(target), { recursive: true });
      const temporary = `${target}.${process.pid}.tmp`;
      writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8");
      renameSync(temporary, target);
    })
    .catch((error) => {
      console.error(`[Morvexa Store] Could not persist "${name}":`, error);
    });

  writeChains.set(name, next);
  return next;
}
