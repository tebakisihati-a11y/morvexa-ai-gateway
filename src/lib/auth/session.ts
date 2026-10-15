/**
 * Morvexa — Session Token Primitives
 *
 * Stateless, HMAC-SHA256 signed session tokens carried in an HttpOnly cookie.
 * No server-side session store is required, so sessions survive cold starts on
 * serverless platforms. Password storage and verification live in ./password.ts.
 */

import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "mvx_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionClaims {
  /** Customer record id, e.g. `cust-482913`. */
  sub: string;
  /** Normalised email address. */
  email: string;
  /** Display name captured at registration. */
  name: string;
  /** Sign-in mechanism used to establish the session. */
  provider: "gmail" | "yahoo" | "email";
  /**
   * The account's password epoch at the moment this session was issued, in
   * epoch seconds. A reset bumps the account's epoch, which makes every older
   * session stale — that is what lets a password reset evict a stolen cookie.
   */
  pwdAt: number;
  /** Issued-at, epoch seconds. */
  iat: number;
  /** Expiry, epoch seconds. */
  exp: number;
}

/**
 * Resolves the signing secret.
 *
 * A dedicated AUTH_SESSION_SECRET is preferred. Falling back to the Supabase
 * service-role key keeps existing deployments working, and the documented
 * development fallback keeps `npm run dev` usable with no .env.local. The
 * fallback is refused in production so a deployment can never sign sessions
 * with a publicly known constant.
 */
export function getSessionSecret(): string {
  const explicit = process.env.AUTH_SESSION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fallback && fallback.length >= 16) return fallback;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing AUTH_SESSION_SECRET. Set it in the deployment environment before enabling customer authentication."
    );
  }

  return "morvexa-development-only-session-secret";
}

/** True when sessions are being signed with a key that must not be used in production. */
export function isSessionSecretEphemeral(): boolean {
  return !process.env.AUTH_SESSION_SECRET && !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadSegment: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

/** Issues a signed token for the given claims, applying the default TTL. */
export function issueSessionToken(
  claims: Omit<SessionClaims, "iat" | "exp" | "pwdAt"> & { pwdAt?: number },
  ttlSeconds: number = SESSION_TTL_SECONDS
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = {
    ...claims,
    pwdAt: claims.pwdAt ?? 0,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  return `${payloadSegment}.${sign(payloadSegment, getSessionSecret())}`;
}

/**
 * Verifies a token's signature and expiry.
 *
 * Returns null for any malformed, tampered, or expired token rather than
 * throwing, so callers can treat "no session" and "bad session" identically.
 */
export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token || typeof token !== "string") return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const payloadSegment = token.slice(0, separatorIndex);
  const providedSignature = token.slice(separatorIndex + 1);

  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadSegment, getSessionSecret());
  } catch {
    return null;
  }

  const provided = Buffer.from(providedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let claims: SessionClaims;
  try {
    claims = JSON.parse(base64UrlDecode(payloadSegment));
  } catch {
    return null;
  }

  if (!claims || typeof claims.sub !== "string" || typeof claims.exp !== "number") {
    return null;
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

  return claims;
}

/**
 * Whether a verified token still reflects the account's current password epoch.
 *
 * Tokens issued before this field existed carry pwdAt = 0, so they are accepted
 * until the account's first reset. That keeps existing sessions working across
 * the deploy instead of signing everyone out.
 */
export function isSessionCurrent(
  claims: Pick<SessionClaims, "pwdAt">,
  currentEpochSeconds: number
): boolean {
  return (claims.pwdAt ?? 0) >= currentEpochSeconds;
}

/** Serialises the session cookie. `secure` is derived from the request protocol. */
export function buildSessionCookie(token: string, secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function buildClearedSessionCookie(secure: boolean): string {
  const attributes = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

/**
 * Extracts the session cookie from a raw Cookie header.
 * Avoids importing a cookie parser for a single well-known key.
 */
export function readSessionCookie(cookieHeader: string | undefined | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) continue;
    if (part.slice(0, separatorIndex).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return null;
}

/** Whether the request arrived over HTTPS, used to decide the Secure cookie flag. */
export function isSecureRequest(url: string, forwardedProto?: string | null): boolean {
  if (forwardedProto) return forwardedProto.split(",")[0].trim() === "https";
  return url.startsWith("https://");
}
