/**
 * Morvexa — Email verification tokens.
 *
 * Same storage discipline as ../auth/resetTokens.ts: only the SHA-256 hash of
 * the emailed token is persisted, tokens are single-use and expire, and issuing
 * a new token invalidates the previous one.
 *
 * Verification matters because an unverified address must not be able to
 * receive a working gateway API key. Without this, anyone could sign up with
 * someone else's address and have credentials mailed to it.
 */

import { readCollection, writeCollection } from "../persistence/jsonStore";
import { sha256Hex, randomBase64Url } from "./hashing";

export interface EmailVerificationToken {
  /** SHA-256 hex of the raw token that was emailed. */
  tokenHash: string;
  customerId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
}

/** Long enough that a customer can verify at leisure, short enough to age out. */
export const VERIFICATION_TOKEN_TTL_MINUTES = 24 * 60;
const COLLECTION = "email_verification_tokens";

let memoryTokens: EmailVerificationToken[] | null = null;

function tokens(): EmailVerificationToken[] {
  if (memoryTokens === null) {
    memoryTokens = readCollection<EmailVerificationToken>(COLLECTION, []);
  }
  return memoryTokens;
}

export function hashVerificationToken(rawToken: string): Promise<string> {
  return sha256Hex(rawToken);
}

function isExpired(token: EmailVerificationToken, now: number): boolean {
  return new Date(token.expiresAt).getTime() <= now;
}

/**
 * Issues a fresh verification token, replacing any outstanding one for the
 * address. The raw token is returned once and never persisted.
 */
export async function issueEmailVerificationToken(params: {
  customerId: string;
  email: string;
  ttlMinutes?: number;
}): Promise<{ rawToken: string; expiresAt: string }> {
  const ttlMinutes = params.ttlMinutes ?? VERIFICATION_TOKEN_TTL_MINUTES;
  const now = Date.now();
  const email = params.email.trim().toLowerCase();

  const rawToken = randomBase64Url(32);
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();

  const kept = tokens().filter((token) => token.email !== email);
  kept.push({
    tokenHash: await hashVerificationToken(rawToken),
    customerId: params.customerId,
    email,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });

  memoryTokens = kept;
  await writeCollection(COLLECTION, kept);

  return { rawToken, expiresAt };
}

/** Looks up a token without consuming it. Returns null when dead or unknown. */
export async function findUsableVerificationToken(
  rawToken: string
): Promise<EmailVerificationToken | null> {
  if (!rawToken) return null;
  const hash = await hashVerificationToken(rawToken);
  const now = Date.now();
  const token = tokens().find((candidate) => candidate.tokenHash === hash);
  if (!token) return null;
  if (token.verifiedAt || isExpired(token, now)) return null;
  return token;
}

/**
 * Marks a token used. Called only after the account has been persisted as
 * verified, so a failed write cannot burn the only link.
 *
 * The row is marked rather than deleted so that a customer who refreshes the
 * page after verifying is told the address is already verified, instead of
 * being shown an alarming "invalid link". findUsableVerificationToken ignores
 * used rows, so single-use is preserved either way.
 */
export async function consumeVerificationToken(rawToken: string): Promise<void> {
  const hash = await hashVerificationToken(rawToken);
  const target = tokens().find((token) => token.tokenHash === hash);
  if (!target) return;

  target.verifiedAt = new Date().toISOString();
  await writeCollection(COLLECTION, tokens());
}

/**
 * Returns the address a token was issued for, whether or not it has been used
 * or has expired. Used to answer "already verified" on a repeated visit.
 */
export async function findVerificationTokenEmail(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;
  const hash = await hashVerificationToken(rawToken);
  return tokens().find((token) => token.tokenHash === hash)?.email ?? null;
}

/** Removes expired and already-used tokens. Safe to call opportunistically. */
export async function pruneVerificationTokens(): Promise<void> {
  const now = Date.now();
  const current = tokens();
  const kept = current.filter((token) => !token.verifiedAt && !isExpired(token, now));
  if (kept.length === current.length) return;
  memoryTokens = kept;
  await writeCollection(COLLECTION, kept);
}

/** Test helper: clears the in-memory cache so the next read hits disk. */
export function resetVerificationTokensForTest(): void {
  memoryTokens = null;
}
