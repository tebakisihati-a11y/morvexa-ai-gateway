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
      <Navbar currentTab={activeTab} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full">
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
