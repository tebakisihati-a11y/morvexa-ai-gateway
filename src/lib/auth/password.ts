/**
 * Morvexa — Password Hashing & Sign-in Rate Limiting
 *
 * Uses Node's built-in scrypt (memory-hard) with a per-record random salt.
 * Records are stored as `scrypt$N$r$p$<salt-b64url>$<hash-b64url>` so the cost
 * parameters travel with the record and can be raised later without breaking
 * existing accounts.
 */

import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

// N=16384 keeps verification near ~60ms on serverless CPUs while staying well
// above the memory cost of a plain SHA-family digest.
const COST = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordPolicyResult {
  valid: boolean;
  message?: string;
}

/** Enforces a baseline policy that blocks trivially guessable passwords. */
export function validatePasswordPolicy(password: unknown): PasswordPolicyResult {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `Password minimal ${MIN_PASSWORD_LENGTH} karakter.` };
  }
  if (password.length > 200) {
    return { valid: false, message: "Password maksimal 200 karakter." };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: "Password harus memuat huruf dan angka." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, COST);
  return [
    "scrypt",
    COST.N,
    COST.r,
    COST.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

/**
 * Verifies a password against a stored record in constant time.
 *
 * Returns false for malformed records instead of throwing, so a corrupted or
 * legacy row can never crash the sign-in endpoint.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (typeof stored !== "string") return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltSegment, hashSegment] = parts;
  const cost = { N: Number(n), r: Number(r), p: Number(p), maxmem: COST.maxmem };
  if (!Number.isFinite(cost.N) || !Number.isFinite(cost.r) || !Number.isFinite(cost.p)) {
    return false;
  }

  let expected: Buffer;
  let salt: Buffer;
  try {
    expected = Buffer.from(hashSegment, "base64url");
    salt = Buffer.from(saltSegment, "base64url");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, cost);
  } catch {
    return false;
  }

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Burns comparable CPU time when no account matches, so response timing does
 * not reveal whether an email address is registered.
 */
export async function simulatePasswordVerification(): Promise<void> {
  await scryptAsync("morvexa-timing-equaliser", "fixed-salt-value", KEY_LENGTH, COST);
}

/* ---------------------------------------------------------------------------
   Sign-in attempt throttling
   ------------------------------------------------------------------------- */

interface AttemptWindow {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const attempts = new Map<string, AttemptWindow>();

export interface ThrottleDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
}

/** Checks whether an identifier may attempt a sign-in right now. */
export function checkLoginThrottle(identifier: string): ThrottleDecision {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  if (record.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  if (now - record.windowStartedAt > WINDOW_MS) {
    attempts.delete(identifier);
    return { allowed: true, retryAfterSeconds: 0, remainingAttempts: MAX_FAILURES };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILURES - record.failures),
  };
}

/** Records a failed attempt, escalating to a lockout at the failure ceiling. */
export function recordLoginFailure(identifier: string): void {
  const now = Date.now();
  const record = attempts.get(identifier);

  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    attempts.set(identifier, { failures: 1, windowStartedAt: now, lockedUntil: 0 });
    return;
  }

  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + LOCKOUT_MS;
    record.failures = 0;
    record.windowStartedAt = now;
  }
}

export function clearLoginFailures(identifier: string): void {
  attempts.delete(identifier);
}

/** Test helper: drops all throttling state. */
export function resetLoginThrottle(): void {
  attempts.clear();
}
