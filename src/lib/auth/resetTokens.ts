/**
 * Morvexa — Password reset tokens.
 *
 * Only the SHA-256 hash of a token is stored. A leaked database or JSON file
 * therefore does not hand an attacker a working reset link, the same reasoning
 * that applies to API keys in ../auth/keys.ts.
 *
 * Tokens are single-use (deleted on redemption) and expire. Requesting a new
 * link invalidates any outstanding one for that account, so an old email in an
 * inbox cannot be used after the user has asked again.
 */

import { createHash, randomBytes } from "node:crypto";
import { readCollection, writeCollection } from "../persistence/jsonStore";

export interface PasswordResetToken {
  /** SHA-256 hex of the raw token that was emailed. */
  tokenHash: string;
  customerId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  /** Set when the link is opened, before the new password is saved. */
  usedAt?: string;
}

export const RESET_TOKEN_TTL_MINUTES = 30;
const COLLECTION = "password_reset_tokens";

let memoryTokens: PasswordResetToken[] | null = null;

function tokens(): PasswordResetToken[] {
  if (memoryTokens === null) {
    memoryTokens = readCollection<PasswordResetToken>(COLLECTION, []);
  }
  return memoryTokens;
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function isExpired(token: PasswordResetToken, now: number): boolean {
  return new Date(token.expiresAt).getTime() <= now;
}

/**
 * Issues a fresh token, replacing any outstanding one for the same account.
 * The raw token is returned once and never persisted.
 */
export async function issuePasswordResetToken(params: {
  customerId: string;
  email: string;
  ttlMinutes?: number;
}): Promise<{ rawToken: string; expiresAt: string }> {
  const ttlMinutes = params.ttlMinutes ?? RESET_TOKEN_TTL_MINUTES;
  const now = Date.now();
  const email = params.email.trim().toLowerCase();

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + ttlMinutes * 60 * 1000).toISOString();

  // Drop this account's previous tokens so only the newest link works.
  const kept = tokens().filter((token) => token.email !== email);
  kept.push({
    tokenHash: hashResetToken(rawToken),
    customerId: params.customerId,
    email,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });

  memoryTokens = kept;
  await writeCollection(COLLECTION, kept);

  return { rawToken, expiresAt };
}

/**
 * Looks up a token without consuming it, so the reset page can reject a dead
 * link before the user types a new password.
 */
export function findUsableResetToken(rawToken: string): PasswordResetToken | null {
  if (!rawToken) return null;
  const hash = hashResetToken(rawToken);
  const now = Date.now();
  const token = tokens().find((candidate) => candidate.tokenHash === hash);
  if (!token) return null;
  if (token.usedAt || isExpired(token, now)) return null;
  return token;
}

/**
 * Marks a token used and removes it. Called only after the new password has
 * been persisted, so a failed write cannot burn the user's only link.
 */
export async function consumeResetToken(rawToken: string): Promise<void> {
  const hash = hashResetToken(rawToken);
  const kept = tokens().filter((token) => token.tokenHash !== hash);
  memoryTokens = kept;
  await writeCollection(COLLECTION, kept);
}

/** Removes expired and already-used tokens. Safe to call opportunistically. */
export async function pruneResetTokens(): Promise<void> {
  const now = Date.now();
  const kept = tokens().filter((token) => !token.usedAt && !isExpired(token, now));
  if (kept.length === tokens().length) return;
  memoryTokens = kept;
  await writeCollection(COLLECTION, kept);
}

/** Test helper: clears the in-memory cache so the next read hits disk. */
export function resetResetTokensForTest(): void {
  memoryTokens = null;
}
