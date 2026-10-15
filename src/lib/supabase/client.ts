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
 */
export async function getSupabaseClient(): Promise<any> {
  if (!isSupabaseConfigured) return null;

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl, supabaseAnonKey)
  );

  return clientPromise;
}
