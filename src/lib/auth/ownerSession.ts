/**
 * Owner console authentication.
 *
 * The console previously gated itself entirely in the browser: any passcode of
 * four or more characters was accepted, and the privileged API endpoints then
 * admitted the request because they treated every non-production request as
 * trusted. That meant the owner surface - every tenant's email, orders, revenue
 * and infrastructure controls - was reachable by anyone who could load /owner.
 *
 * The passcode is now verified on the server against OWNER_PASSCODE, compared in
 * constant time, and exchanged for a short-lived signed session cookie. The
 * privileged routes accept that cookie as proof, so the browser can no longer
 * assert its own authority.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getSessionSecret } from "./session";

export const OWNER_COOKIE = "mvx_owner";
export const OWNER_TTL_SECONDS = 60 * 60 * 12;

export interface OwnerClaims {
  role: "owner";
  iat: number;
  exp: number;
}

function sign(segment: string): string {
  return createHmac("sha256", getSessionSecret()).update(segment).digest("base64url");
}

/** True when an owner passcode is configured at all. */
export function isOwnerAuthConfigured(): boolean {
  return Boolean(process.env.OWNER_PASSCODE && process.env.OWNER_PASSCODE.length > 0);
}

/**
 * Constant-time passcode check.
 *
 * Compared as fixed-length digests so the comparison time does not reveal how
 * many leading characters were correct.
 */
export function verifyOwnerPasscode(candidate: unknown): boolean {
  const expected = process.env.OWNER_PASSCODE;
  if (!expected) return false;
  if (typeof candidate !== "string" || candidate.length === 0) return false;

  const a = createHmac("sha256", "owner-passcode-compare").update(candidate).digest();
  const b = createHmac("sha256", "owner-passcode-compare").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function issueOwnerToken(ttlSeconds: number = OWNER_TTL_SECONDS): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const claims: OwnerClaims = { role: "owner", iat: issuedAt, exp: issuedAt + ttlSeconds };
  const segment = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${segment}.${sign(segment)}`;
}

export function verifyOwnerToken(token: string | undefined | null): OwnerClaims | null {
  if (!token || typeof token !== "string") return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const segment = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1), "utf8");
  const expected = Buffer.from(sign(segment), "utf8");
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as OwnerClaims;
    if (claims.role !== "owner") return null;
    if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | undefined | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

/** Reads and verifies the owner session from a request's Cookie header. */
export function hasOwnerSession(cookieHeader: string | undefined | null): boolean {
  return verifyOwnerToken(readCookie(cookieHeader, OWNER_COOKIE)) !== null;
}
