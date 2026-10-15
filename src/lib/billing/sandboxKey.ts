/**
 * Resolves the key used to sign and verify Midtrans payloads.
 *
 * There is deliberately no hardcoded fallback. A constant such as
 * "dummy_sandbox_key" is public knowledge, so anyone who could reach the
 * sandbox-settlement endpoint could forge a valid signature and mark an
 * invoice paid.
 *
 * Instead:
 *   - a configured MIDTRANS_SERVER_KEY always wins;
 *   - outside production, a random per-process key is generated so local
 *     development and the test suite keep working, but it is unguessable and
 *     dies with the process;
 *   - in production with no key configured, this returns undefined and every
 *     caller must fail closed.
 */

import { randomBytes } from "crypto";

let ephemeralSandboxKey: string | null = null;

export function resolveMidtransServerKey(): string | undefined {
  const configured = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") return undefined;

  ephemeralSandboxKey ??= `ephemeral-sandbox-${randomBytes(32).toString("hex")}`;
  return ephemeralSandboxKey;
}

/** Test helper: forces a new random key so tests cannot depend on a fixed value. */
export function resetEphemeralSandboxKey(): void {
  ephemeralSandboxKey = null;
}
