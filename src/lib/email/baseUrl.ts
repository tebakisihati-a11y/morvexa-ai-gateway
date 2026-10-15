/**
 * Resolves the absolute base URL for links that leave the server, such as the
 * password-reset link in an email.
 *
 * Order matters: an explicit override wins (useful on preview deployments where
 * the request host is not the address a customer should see), then the proxy's
 * forwarded host, then the request's own origin.
 */

export const DEFAULT_PUBLIC_BASE_URL = "http://localhost:3000";

export function resolvePublicBaseUrl(request: {
  url: string;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
}): string {
  const configured = process.env.MORVEXA_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (request.forwardedHost) {
    const proto = request.forwardedProto?.split(",")[0].trim() || "https";
    return `${proto}://${request.forwardedHost.split(",")[0].trim()}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return DEFAULT_PUBLIC_BASE_URL;
  }
}
