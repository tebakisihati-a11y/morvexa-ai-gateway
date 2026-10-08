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
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getRequestLogs,
  getRollingQuotaRecords,
} from "@/lib/supabase/store";
import { calculateRollingQuotaStatus } from "@/lib/quota";
import type { ApiKeyItem, QuotaConfig, QuotaStatus, RequestTraceLog, SystemMetrics } from "@/lib/types";

const defaultQuotaConfig: QuotaConfig = {
  standardRequest5hLimit: 100,
  standardRequest7dLimit: 1000,
  latestTokenDailyLimit: 157100,
  latestTokenWeeklyLimit: 1100000,
};

const defaultSystemMetrics: SystemMetrics = {
  rps: 38.4,
  avgTtftMs: 142,
  cacheHitRatio: 0.28,
  errorRate: 0.0012,
  activeKeysCount: 14,
  totalRequests24h: 128940,
};

export default function AppRoot() {
  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [traces, setTraces] = useState<RequestTraceLog[]>([]);
  const [quota, setQuota] = useState<QuotaStatus>(() =>
    calculateRollingQuotaStatus([], defaultQuotaConfig)
  );

  // Initialize data
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

    loadData();
  }, []);

  const handleCreateKey = async (name: string, rpm: number, dailyTokens: number) => {
    const res = await createApiKey(name, rpm, dailyTokens);
    setKeys((prev) => [res.key, ...prev]);
    return res;
  };

  const handleRevokeKey = async (id: string) => {
    await revokeApiKey(id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: false } : k)));
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-orange-500/20 selection:text-orange-200">
      {/* Top Navbar */}
      <Navbar currentTab={activeTab} onTabChange={setActiveTab} />

      {/* Mobile Horizontal Quick Navigation Bar (<md screens) */}
      <div className="md:hidden border-b border-white/10 bg-[#0e0e11] px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
        {[
          { id: "overview", label: "Overview" },
          { id: "keys", label: "API Keys" },
          { id: "routing", label: "Routing" },
          { id: "playground", label: "Playground" },
          { id: "traces", label: "Traces" },
          { id: "guardrails", label: "Guardrails" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as NavTabId)}
            className={`px-3 py-1.5 rounded text-xs font-mono whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? "bg-white/10 text-white font-semibold border border-white/10"
                : "text-zinc-400 hover:text-zinc-200 bg-black/40 border border-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar (Desktop only) */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === "overview" && (
            <OverviewTab
              quota={quota}
              metrics={defaultSystemMetrics}
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

          {activeTab === "routing" && <RoutingTab />}

          {activeTab === "playground" && <PlaygroundTab />}

          {activeTab === "traces" && <TracesTab traces={traces} />}

          {activeTab === "guardrails" && <GuardrailsTab />}
        </main>
      </div>
    </div>
  );
}
