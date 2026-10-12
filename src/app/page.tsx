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
import { CinematicLanding } from "@/components/landing/CinematicLanding";
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

const defaultQuotaConfig: QuotaConfig = {
  standardRequest5hLimit: 100,
  standardRequest7dLimit: 1000,
  latestTokenDailyLimit: 157100,
  latestTokenWeeklyLimit: 1100000,
};

export default function AppRoot() {
  const [viewMode, setViewMode] = useState<"landing" | "console">("landing");
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

  const handleOpenConsole = (targetTab?: NavTabId) => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
    setViewMode("console");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#020205] text-[#f7f8fd] flex flex-col font-sans selection:bg-[#c03fb5]/30 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setViewMode("console");
        }}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Conditionally Render Experience */}
      {viewMode === "landing" ? (
        <CinematicLanding onOpenConsole={handleOpenConsole} />
      ) : (
        <>
          {/* Mobile Horizontal Quick Navigation Bar (<md screens) */}
          <div className="md:hidden border-b border-white/10 bg-[#06040d] px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
            {[
              { id: "overview", label: "Overview" },
              { id: "keys", label: "API Keys" },
              { id: "billing", label: "Billing" },
              { id: "infrastructure", label: "Infrastructure" },
              { id: "nexus", label: "Nexus" },
              { id: "routing", label: "Routing" },
              { id: "playground", label: "Playground" },
              { id: "traces", label: "Traces" },
              { id: "guardrails", label: "Guardrails" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTabId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#1a0b2e] text-white font-semibold border border-[#c03fb5]/40"
                    : "text-zinc-400 hover:text-zinc-200 bg-black/40 border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Console App Container */}
          <div className="flex-1 flex flex-col md:flex-row radial-grid-bg">
            {/* Left Sidebar (Desktop only) */}
            <Sidebar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenExperience={() => setViewMode("landing")}
            />

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
        </>
      )}
    </div>
  );
}
