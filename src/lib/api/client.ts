/**
 * Browser fetch wrapper that attaches the CSRF double-submit token.
 *
 * The token lives in a script-readable cookie set at login. Every same-origin
 * state-changing call must echo it in X-CSRF-Token; a cross-origin attacker can
 * cause the cookie to be sent but cannot read it, so the header check fails.
 */

const CSRF_COOKIE = "mvx_csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      return decodeURIComponent(value.slice(prefix.length));
    }
  }
  return null;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (method !== "GET" && method !== "HEAD") {
    const token = readCookie(CSRF_COOKIE);
    if (token) headers.set(CSRF_HEADER, token);
  }

  return fetch(input, { ...init, headers });
}
