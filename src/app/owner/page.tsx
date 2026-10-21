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
import { InfrastructureTab } from "@/components/infrastructure/InfrastructureTab";
import { NexusTab } from "@/components/nexus/NexusTab";
import { CustomersManagementTab } from "@/components/owner/CustomersManagementTab";
import { KeyProvisioningTab } from "@/components/owner/KeyProvisioningTab";
import { CustomerIssueResolverTab } from "@/components/owner/CustomerIssueResolverTab";
import { AgenticCoreMesh } from "@/components/visual/AgenticCoreMesh";
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
import type { ApiKeyItem, QuotaConfig, QuotaStatus, RequestTraceLog, SystemMetrics } from "@/lib/types";
import { Lock, ArrowRight, ShieldCheck, ArrowLeft, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";

const EMPTY_SYSTEM_METRICS: SystemMetrics = {
  rps: 0,
  avgLatencyMs: 0,
  cacheHitRatio: null,
  errorRate: 0,
  totalRequests24h: 0,
  hourlyRequestCounts: Array.from({ length: 24 }, () => 0),
  sampleCount: 0,
  successfulRequestCount: 0,
  providerRequestCounts: {},
  providerTokenUsage: {},
  scope: "instance",
};

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
  const [metrics, setMetrics] = useState<SystemMetrics>(EMPTY_SYSTEM_METRICS);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Ask the server whether this browser already holds a valid owner session.
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

  const reloadData = async () => {
    const [apiKeys, quotaRecords, logs] = await Promise.all([
      getApiKeys(),
      getRollingQuotaRecords(),
      getRequestLogs(),
    ]);

    setKeys(apiKeys);
    setTraces(logs);
    setQuota(calculateRollingQuotaStatus(quotaRecords, defaultQuotaConfig));
  };

  useEffect(() => {
    if (isAuthenticated) {
      reloadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const refreshMetrics = async () => {
      try {
        const response = await apiFetch("/api/v1/metrics");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Permintaan metrik gagal.");
        if (!cancelled) {
          setMetrics(data);
          setMetricsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMetricsError(error instanceof Error ? error.message : "Tidak dapat membaca metrik.");
        }
      }
    };
    void refreshMetrics();
    const interval = window.setInterval(() => void refreshMetrics(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
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
      <div className="flex min-h-screen items-center justify-center bg-[#07090b] text-[#a1a1aa]">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Memeriksa sesi owner…</span>
        </div>
      </div>
    );
  }

  // If not authenticated, display Dedicated Owner Gate with subtle 3D aesthetic
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07090b] text-[#f4f4f5] flex flex-col justify-center items-center p-4 font-sans selection:bg-emerald-500/20 selection:text-emerald-400 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <AgenticCoreMesh height={600} interactive={false} />
        </div>

        <div className="w-full max-w-md rounded-2xl bg-[#090c10]/90 backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                SISTEM KHUSUS OWNER
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#f4f4f5]">Morvexa Server Master</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} method="post" className="space-y-4">
            <p className="text-xs text-[#a1a1aa] leading-relaxed font-mono">
              Portal ini ditujukan eksklusif bagi Pemilik Server (Owner) untuk mengontrol edge routing, auto-provisioning API key, customer doctor, dan infrastruktur global.
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
                placeholder="Masukkan passcode rahasia owner"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080a] border border-white/10 text-[#f4f4f5] font-mono text-xs focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {error && (
                <p className="text-[11px] text-[#ef4444] mt-1 font-mono">
                  Passcode owner tidak valid. Verifikasi server gagal.
                </p>
              )}
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting || passcode.length === 0}
                className="w-full py-3 rounded-xl bg-emerald-500 text-black font-mono font-bold text-xs hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{submitting ? "Memverifikasi Kriptografi…" : "Buka Control Plane Owner"}</span>
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>

              <Link
                href="/"
                className="block text-center text-xs font-mono text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
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
    <div className="min-h-screen bg-[#07090b] text-[#f4f4f5] flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Navbar with integrated Owner Badge & Customer Navigation */}
      <Navbar
        currentTab={activeTab}
        onTabChange={setActiveTab}
        customBadge={
          <div className="flex items-center gap-2">
            <span className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>OWNER MASTER PLANE</span>
            </span>
            <Link
              href="/customer"
              className="text-[11px] font-mono px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
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
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* 3D Agentic Constellation Mesh Hero */}
              <AgenticCoreMesh height={220} />

              <OverviewTab
                quota={quota}
                metrics={metrics}
                metricsError={metricsError}
                onNavigateToTab={setActiveTab}
              />
            </div>
          )}

          {activeTab === "provisioning" && <KeyProvisioningTab />}

          {activeTab === "resolver" && (
            <CustomerIssueResolverTab keys={keys} onRefreshKeys={reloadData} />
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
