/** Owner / admin privilege check reused by the main gateway and sub-routers. */
import { hasOwnerSession } from "../auth/ownerSession";

export function isPrivilegedRequest(c: any): boolean {
  if (hasOwnerSession(c.req.header("Cookie"))) return true;
  const authHeader = c.req.header("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!authHeader) {
    return process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED === "true" && process.env.NODE_ENV !== "production";
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (cronSecret && token === cronSecret) return true;
  if (adminSecret && token === adminSecret) return true;
  return false;
}
