/**
 * Cross-site request forgery defences for browser-facing endpoints.
 *
 * The session cookie is SameSite=Lax, which already blocks most cross-site
 * POSTs, but Lax is not sufficient on its own: it does not isolate sibling
 * subdomains, and older browsers treat it inconsistently. Two independent
 * checks are applied on top:
 *
 * 1. Origin/Referer verification. Browsers always attach Origin to a
 *    cross-origin state-changing request, so a mismatched value is conclusive
 *    evidence of forgery. Requests with no Origin at all are server-to-server
 *    callers (Midtrans webhooks, cron, SDK clients) and are allowed through to
 *    their own authentication, because a browser cannot omit Origin.
 *
 * 2. Double-submit token. A random value is set in a readable cookie and must
 *    be echoed in the X-CSRF-Token header. An attacker on another origin can
 *    cause the cookie to be sent but cannot read it, so they cannot produce the
 *    matching header.
 */

import { randomBytes, timingSafeEqual } from "crypto";

export const CSRF_COOKIE = "mvx_csrf";
export const CSRF_HEADER = "x-csrf-token";

/** Hosts allowed to originate a state-changing browser request. */
function allowedHosts(c: any): string[] {
  const hosts = new Set<string>();

  const configured = process.env.MORVEXA_PUBLIC_BASE_URL;
  if (configured) {
    try {
      hosts.add(new URL(configured).host);
    } catch {
      // Ignore a malformed value rather than blocking every request.
    }
  }

  // The host the request was actually addressed to. Vercel and most proxies
  // report the public host here.
  const forwardedHost = c.req.header("x-forwarded-host");
  if (forwardedHost) hosts.add(forwardedHost.split(",")[0].trim());

  const host = c.req.header("host");
  if (host) hosts.add(host);

  // Development is commonly reached through a tunnel or proxy, so the Origin
  // (localhost:3000) legitimately differs from Host (the tunnel domain).
  if (process.env.NODE_ENV !== "production") {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }

  return [...hosts];
}

/**
 * Rejects a request whose Origin/Referer points somewhere other than this app.
 *
 * Returns a 403 Response to short-circuit the handler, or null to continue.
 */
export function enforceSameOrigin(c: any): Response | null {
  const origin = c.req.header("origin");
  const referer = c.req.header("referer");

  // No Origin and no Referer: not a browser form/fetch, so CSRF does not apply.
  if (!origin && !referer) return null;

  const source = origin ?? referer;
  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    return c.json({ error: "Origin permintaan tidak valid." }, 403);
  }

  const allowed = allowedHosts(c);
  // If nothing is known about our own host there is no basis for comparison, so
  // fall back to allowing the request rather than breaking every client.
  if (allowed.length === 0) return null;

  if (allowed.includes(sourceHost)) return null;
  // In development the Origin may carry a port that Host omits, or vice versa.
  if (process.env.NODE_ENV !== "production") {
    const sourceHostname = sourceHost.split(":")[0];
    if (allowed.some((h) => h.split(":")[0] === sourceHostname)) return null;
  }

  return c.json(
    { error: "Permintaan ditolak: origin tidak dikenal. Muat ulang halaman lalu coba lagi." },
    403
  );
}

/** Issues a fresh CSRF token for the double-submit check. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time comparison of the cookie token against the header token. */
export function csrfTokenMatches(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken, "utf8");
  const b = Buffer.from(headerToken, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Requires the double-submit token on an authenticated browser request.
 *
 * Only meaningful once the caller is known to be cookie-authenticated; API-key
 * and signature callers have no cookie to forge.
 */
export function enforceCsrfToken(c: any): Response | null {
  const cookieToken = readCookie(c.req.header("Cookie"), CSRF_COOKIE);
  const headerToken = c.req.header(CSRF_HEADER);
  if (csrfTokenMatches(cookieToken, headerToken)) return null;

  return c.json(
    { error: "Token keamanan tidak valid atau kedaluwarsa. Muat ulang halaman lalu coba lagi." },
    403
  );
}

function readCookie(cookieHeader: string | undefined | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}
