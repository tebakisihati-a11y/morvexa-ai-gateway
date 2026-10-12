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
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getRequestLogs,
  getRollingQuotaRecords,
} from "@/lib/supabase/store";
import { calculateRollingQuotaStatus } from "@/lib/quota";
import { DEFAULT_SYSTEM_METRICS } from "@/lib/constants";
import type { ApiKeyItem, QuotaConfig, QuotaStatus, RequestTraceLog } from "@/lib/types";
import { Lock, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [traces, setTraces] = useState<RequestTraceLog[]>([]);
  const [quota, setQuota] = useState<QuotaStatus>(() =>
    calculateRollingQuotaStatus([], defaultQuotaConfig)
  );

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
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "morvexa-owner" || passcode === "admin" || passcode.length >= 4) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  // If not authenticated, display Dedicated Owner Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#010302] text-[#F0FEF8] flex flex-col justify-center items-center p-4 font-sans selection:bg-[#1CE172]/20 selection:text-[#1CE172]">
        <div className="w-full max-w-md rounded-3xl bg-[#0a0f0d] border border-[#1CE172]/30 p-8 shadow-2xl relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-[#1CE172]/10 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-[#1CE172] uppercase tracking-wider">
                SISTEM KHUSUS OWNER
              </div>
              <h2 className="text-xl font-bold text-[#F0FEF8]">Morvexa Server Master</h2>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-xs text-[#889e93] leading-relaxed font-mono">
              Portal ini ditujukan eksklusif bagi Pemilik Server (Owner) untuk memantau infrastruktur edge, MRR, log rekonsiliasi finansial, dan seluruh tenant.
            </p>

            <div>
              <label className="block text-xs font-mono text-[#889e93] mb-1.5">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#010302] border border-[#F0FEF8]/15 text-[#F0FEF8] font-mono text-xs focus:border-[#1CE172] focus:outline-none"
              />
              {error && (
                <p className="text-[11px] text-red-400 mt-1 font-mono">
                  Passcode tidak valid. Minimal 4 karakter.
                </p>
              )}
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#1CE172] text-[#010302] font-mono font-bold text-xs hover:bg-[#1CE172]/90 shadow-[0_0_20px_rgba(28,225,114,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buka Control Plane Owner</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <Link
                href="/"
                className="block text-center text-xs font-mono text-[#889e93] hover:text-[#F0FEF8] py-1 transition-colors"
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
    <div className="min-h-screen bg-[#010302] text-[#F0FEF8] flex flex-col font-sans selection:bg-[#1CE172]/20 selection:text-[#1CE172]">
      {/* Top Navbar */}
      <div className="relative">
        <Navbar currentTab={activeTab} onTabChange={setActiveTab} />
        {/* Owner Privileged Badge */}
        <div className="absolute right-40 top-3 hidden md:flex items-center gap-2 z-50">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            OWNER PRIVILEGED MODE
          </span>
          <Link
            href="/customer"
            className="text-[11px] font-mono px-3 py-1 rounded-full border border-[#1CE172]/30 bg-[#010302]/80 text-[#1CE172] hover:bg-[#1CE172]/10 transition-colors"
          >
            Buka Sistem Customer →
          </Link>
        </div>
      </div>

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

          {activeTab === "keys" && (
            <KeysTab
              keys={keys}
              onCreateKey={handleCreateKey}
              onRevokeKey={handleRevokeKey}
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
