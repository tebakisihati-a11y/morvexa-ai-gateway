import { describe, it, expect } from "vitest";
import {
  enforceSameOrigin,
  csrfTokenMatches,
  generateCsrfToken,
  enforceCsrfToken,
} from "../src/lib/gateway/csrf";

/**
 * Minimal stand-in for a Hono context, exposing only what the CSRF helpers
 * touch: request headers and a json() response builder.
 */
function makeContext(headers: Record<string, string>, url = "https://app.example.com/api/x") {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    req: {
      url,
      header: (name: string) => lower[name.toLowerCase()],
    },
    json: (body: unknown, status: number) => ({ body, status }),
  } as any;
}

describe("CSRF same-origin enforcement", () => {
  it("allows a request whose Origin matches the request host", () => {
    const c = makeContext({ Origin: "https://app.example.com", Host: "app.example.com" });
    expect(enforceSameOrigin(c)).toBeNull();
  });

  it("rejects a request from a foreign Origin", () => {
    const c = makeContext({ Origin: "https://evil.example.net", Host: "app.example.com" });
    const result = enforceSameOrigin(c) as any;
    expect(result).not.toBeNull();
    expect(result.status).toBe(403);
  });

  it("allows server-to-server callers that send no Origin or Referer", () => {
    // Midtrans webhooks and cron jobs cannot send Origin; they authenticate by
    // signature or secret instead, so they must not be blocked here.
    const c = makeContext({ Host: "app.example.com" });
    expect(enforceSameOrigin(c)).toBeNull();
  });

  it("falls back to Referer when Origin is absent", () => {
    const c = makeContext({
      Referer: "https://evil.example.net/page",
      Host: "app.example.com",
    });
    expect(enforceSameOrigin(c)).not.toBeNull();
  });

  it("rejects a protocol-relative Origin that parses off-site", () => {
    const c = makeContext({ Origin: "//evil.example.net", Host: "app.example.com" });
    expect(enforceSameOrigin(c)).not.toBeNull();
  });
});

describe("CSRF double-submit token", () => {
  it("issues a high-entropy token", () => {
    const token = generateCsrfToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(generateCsrfToken()).not.toBe(token);
  });

  it("matches only identical cookie and header values", () => {
    const token = generateCsrfToken();
    expect(csrfTokenMatches(token, token)).toBe(true);
    expect(csrfTokenMatches(token, generateCsrfToken())).toBe(false);
    expect(csrfTokenMatches(undefined, token)).toBe(false);
    expect(csrfTokenMatches(token, undefined)).toBe(false);
  });

  it("accepts a request carrying the matching token in cookie and header", () => {
    const token = generateCsrfToken();
    const c = makeContext({
      Cookie: `mvx_session=abc; mvx_csrf=${token}`,
      "X-CSRF-Token": token,
    });
    expect(enforceCsrfToken(c)).toBeNull();
  });

  it("rejects a request whose header token does not match the cookie", () => {
    const c = makeContext({
      Cookie: `mvx_csrf=${generateCsrfToken()}`,
      "X-CSRF-Token": generateCsrfToken(),
    });
    const result = enforceCsrfToken(c) as any;
    expect(result.status).toBe(403);
  });

  it("rejects a request with a session cookie but no CSRF token at all", () => {
    // This is the shape of a forged cross-site POST: the browser attaches the
    // session cookie but the attacker cannot read the CSRF cookie to echo it.
    const c = makeContext({ Cookie: "mvx_session=abc" });
    expect(enforceCsrfToken(c)).not.toBeNull();
  });
});
