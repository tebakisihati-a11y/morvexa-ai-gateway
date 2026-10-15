"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerUser } from "@/lib/customer/store";

export interface SessionState {
  /** True until the first session probe resolves. */
  loading: boolean;
  user: CustomerUser | null;
  authenticated: boolean;
}

/**
 * Reads the signed HttpOnly session cookie via the API.
 *
 * The cookie itself is not readable from JavaScript by design, so the server
 * remains the single source of truth for who is signed in.
 */
export function useSession() {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    authenticated: false,
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/customer/auth/session", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("session probe failed");

      const data = await response.json();
      setState({
        loading: false,
        authenticated: Boolean(data.authenticated),
        user: data.user ?? null,
      });
    } catch {
      setState({ loading: false, authenticated: false, user: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/customer/auth/logout", { method: "POST" }).catch(() => undefined);
    setState({ loading: false, authenticated: false, user: null });
  }, []);

  return { ...state, refresh, signOut };
}
