/**
 * Supabase access, loaded on demand.
 *
 * This module deliberately does NOT import @supabase/supabase-js at the top
 * level. A static import pulls the whole SDK - GoTrue auth, Realtime websockets
 * and Storage - into every bundle that touches the data layer, including the
 * client-rendered owner console. That cost about 90 kB gzipped of code the
 * browser never runs, because all call sites are already behind
 * isSupabaseConfigured and only execute on the server.
 *
 * getSupabaseClient() is async so the bundler can split the SDK into its own
 * chunk and fetch it only when a configured deployment actually needs it.
 */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

export const isSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) &&
  !supabaseUrl.includes("placeholder")
);

/** Cached across calls so repeated reads reuse one client instance. */
let clientPromise: Promise<any> | null = null;

/**
 * Returns a configured Supabase client, or null when Supabase is not
 * configured. Callers must already have checked isSupabaseConfigured; this
 * returns null rather than throwing, so a misconfigured deployment degrades to
 * the JSON store instead of crashing.
 *
 * This client is NOT authenticated: it carries the anon key, so RLS decides what
 * it can see. That is correct for the public schema, but it cannot read or write
 * the customer tables - those enable RLS with only `auth.uid() = id` policies,
 * and this app authenticates with its own HMAC cookie rather than Supabase Auth,
 * so `auth.uid()` is always null. Use getSupabaseAdminClient() for those.
 */
export async function getSupabaseClient(): Promise<any> {
  if (!isSupabaseConfigured) return null;

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl, supabaseAnonKey)
  );

  return clientPromise;
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * True when a service-role key is present, i.e. when the app can reach tables
 * that RLS protects. Customer profiles, credentials, orders and activities all
 * need this; the anon key can only read rows whose `auth.uid()` matches, and
 * this app never populates `auth.uid()`.
 */
export const isSupabaseAdminConfigured = Boolean(
  isSupabaseConfigured && serviceRoleKey.length > 0
);

let adminClientPromise: Promise<any> | null = null;

/**
 * Returns a service-role Supabase client, or null when the key is absent.
 *
 * The service role bypasses RLS, so this client can read and write every
 * customer row. It must never be reachable from the browser: the key is read
 * from a non-public environment variable (no NEXT_PUBLIC_ prefix, so it is not
 * inlined into the bundle) and this function refuses to run in a browser
 * context. Every caller is a server route or a server-side module.
 */
export async function getSupabaseAdminClient(): Promise<any> {
  if (!isSupabaseAdminConfigured) return null;

  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseAdminClient() must not be called in the browser: the service role key bypasses RLS."
    );
  }

  adminClientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  );

  return adminClientPromise;
}
