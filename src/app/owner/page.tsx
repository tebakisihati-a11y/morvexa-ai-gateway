"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type NavTabId } from "@/components/layout/Sidebar";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { KeysTab } from "@/components/keys/KeysTab";
import { RoutingTab } from "@/components/routing/RoutingTab";
import { PlaygroundTab } from "@/components/playground/PlaygroundTab";
import { TracesTab } from "@/components/traces/TracesTab";
import { GuardrailsTab } from "@/components/guardrails/GuardrailsTab";
import { BillingTab } from "@/components/billing/BillingTab";
import { InfrastructureTab } from "@/components/infrastructure/InfrastructureTab";
import { NexusTab } from "@/components/nexus/NexusTab";
import { CustomersManagementTab } from "@/components/owner/CustomersManagementTab";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  regenerateKeySecret,
  resetKeyQuota,
  getRequestLogs,
  getRollingQuotaRecords,
} from "@/lib/supabase/store";
import { calculateRollingQuotaStatus } from "@/lib/quota";
import { DEFAULT_SYSTEM_METRICS } from "@/lib/constants";
import type { ApiKeyItem, QuotaConfig, QuotaStatus, RequestTraceLog } from "@/lib/types";
import { Lock, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

const defaultQuotaConfig: QuotaConfig = {
  standardRequest5hLimit: 100,
  standardRequest7dLimit: 1000,
  latestTokenDailyLimit: 157100,
  latestTokenWeeklyLimit: 1100000,
};

export default function OwnerControlPlanePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [traces, setTraces] = useState<RequestTraceLog[]>([]);
  const [quota, setQuota] = useState<QuotaStatus>(() =>
    calculateRollingQuotaStatus([], defaultQuotaConfig)
  );

  // Ask the server whether this browser already holds a valid owner session.
  // The gate is no longer decided in the browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/owner/auth/session");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data?.authenticated) setIsAuthenticated(true);
      } catch {
        // Treated as "not signed in"; the passcode form is shown.
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      const [apiKeys, quotaRecords, logs] = await Promise.all([
        getApiKeys(),
        getRollingQuotaRecords(),
        getRequestLogs(),
      ]);

      setKeys(apiKeys);
      setTraces(logs);
      setQuota(calculateRollingQuotaStatus(quotaRecords, defaultQuotaConfig));
    }

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleCreateKey = async (name: string, rpm: number, dailyTokens: number) => {
    const res = await createApiKey(name, rpm, dailyTokens);
    setKeys((prev) => [res.key, ...prev]);
    return res;
  };

  const handleRevokeKey = async (id: string) => {
    await revokeApiKey(id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: false, healthStatus: "revoked" } : k)));
  };

  const handleRegenerateKey = async (id: string) => {
    const res = await regenerateKeySecret(id);
    if (res) {
      setKeys((prev) => prev.map((k) => (k.id === id ? res.key : k)));
      return { rawSecret: res.rawSecret };
    }
    return null;
  };

  const handleResetQuota = async (id: string, boostTokens = 100000) => {
    const updated = await resetKeyQuota(id, boostTokens);
    if (updated) {
      setKeys((prev) => prev.map((k) => (k.id === id ? updated : k)));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/owner/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setIsAuthenticated(true);
      setPasscode("");
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080a] text-[#a1a1aa]">
        <span className="font-mono text-xs uppercase tracking-[0.2em]">
          Memeriksa sesi owner…
        </span>
      </div>
    );
  }

  // If not authenticated, display Dedicated Owner Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08080a] text-[#f4f4f5] flex flex-col justify-center items-center p-4 font-sans selection:bg-[#f97316]/20 selection:text-[#f97316]">
        <div className="w-full max-w-md rounded-lg bg-[#0e0e11] border border-[#f97316]/30 p-8 shadow-2xl relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[#f97316]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#f97316] uppercase tracking-wider">
                SISTEM KHUSUS OWNER
              </div>
              <h2 className="text-xl font-bold text-[#f4f4f5]">Morvexa Server Master</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} method="post" className="space-y-4">
            <p className="text-xs text-[#a1a1aa] leading-relaxed font-mono">
              Portal ini ditujukan eksklusif bagi Pemilik Server (Owner) untuk memantau infrastruktur edge, MRR, log rekonsiliasi finansial, dan seluruh tenant.
            </p>

            <div>
              <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                Owner Access Passcode
              </label>
              <input
                type="password"
                autoFocus
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError(false);
                }}
                placeholder="Masukkan passcode (e.g. admin)"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] font-mono text-xs focus:border-[#f97316] focus:outline-none"
              />
              {error && (
                <p className="text-[11px] text-[#ef4444] mt-1 font-mono">
                  Passcode owner tidak valid.
                </p>
              )}
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting || passcode.length === 0}
                className="w-full py-3 rounded bg-[#f97316] text-[#08080a] font-mono font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{submitting ? "Memverifikasi…" : "Buka Control Plane Owner"}</span>
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>

              <Link
                href="/"
                className="block text-center text-xs font-mono text-[#a1a1aa] hover:text-[#f4f4f5] py-1 transition-colors"
              >
                ← Kembali ke Beranda Publik
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Once authenticated, render complete Owner Command Center
  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f5] flex flex-col font-sans selection:bg-[#f97316]/20 selection:text-[#f97316]">
      {/* Top Navbar with integrated Owner Badge & Customer Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        customBadge={
          <div className="flex items-center gap-2">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#eab308] animate-pulse" />
              <span>OWNER MASTER PLANE</span>
            </span>
            <Link
              href="/customer"
              className="text-[11px] font-mono px-3 py-1 rounded-lg border border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316] hover:bg-[#f97316]/20 transition-all flex items-center gap-1"
            >
              <span>Portal Kustomer</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        }
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === "overview" && (
            <OverviewTab
              quota={quota}
              metrics={DEFAULT_SYSTEM_METRICS}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === "customers" && <CustomersManagementTab />}

          {activeTab === "keys" && (
            <KeysTab
              keys={keys}
              onCreateKey={handleCreateKey}
              onRevokeKey={handleRevokeKey}
              onRegenerateKey={handleRegenerateKey}
              onResetQuota={handleResetQuota}
            />
          )}

          {activeTab === "billing" && <BillingTab />}

          {activeTab === "infrastructure" && <InfrastructureTab />}

          {activeTab === "nexus" && <NexusTab />}

          {activeTab === "routing" && <RoutingTab />}

          {activeTab === "playground" && <PlaygroundTab />}

          {activeTab === "traces" && <TracesTab traces={traces} />}

          {activeTab === "guardrails" && <GuardrailsTab />}
        </main>
      </div>
    </div>
  );
}
