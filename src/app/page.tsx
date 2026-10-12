"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, type NavTabId } from "@/components/layout/Sidebar";
import { LandingPage } from "@/components/landing/LandingPage";
import { CustomerBentoPortal } from "@/components/customer/CustomerBentoPortal";
import { CustomerCheckoutModal } from "@/components/customer/CustomerCheckoutModal";
import { OwnerLoginModal } from "@/components/customer/OwnerLoginModal";
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
import { CheckCircle2, Mail, ShieldAlert, Sparkles } from "lucide-react";

const defaultQuotaConfig: QuotaConfig = {
  standardRequest5hLimit: 100,
  standardRequest7dLimit: 1000,
  latestTokenDailyLimit: 157100,
  latestTokenWeeklyLimit: 1100000,
};

export type ViewMode = "landing" | "customer_portal" | "owner_portal";

export default function AppRoot() {
  const [viewMode, setViewMode] = useState<ViewMode>("landing");
  const [activeTab, setActiveTab] = useState<NavTabId>("overview");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [traces, setTraces] = useState<RequestTraceLog[]>([]);
  const [quota, setQuota] = useState<QuotaStatus>(() =>
    calculateRollingQuotaStatus([], defaultQuotaConfig)
  );

  // Modal Controls
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<string | null>(null);
  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState(false);
  const [dispatchedNotification, setDispatchedNotification] = useState<{
    email: string;
    keySecret: string;
    planName: string;
  } | null>(null);

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

  const handlePaymentSettled = (res: any) => {
    if (res.autoProvision) {
      setDispatchedNotification({
        email: res.autoProvision.emailSentTo,
        keySecret: res.autoProvision.rawSecret,
        planName: res.autoProvision.apiKey.name,
      });
      // Append newly minted key to memory list
      setKeys((prev) => [res.autoProvision.apiKey, ...prev]);
    }
  };

  // 1. PUBLIC EXPERIENCE (Cinematic 3D Landing Page)
  if (viewMode === "landing") {
    return (
      <>
        <LandingPage
          onEnterDashboard={(tab) => {
            if (tab === "billing" || tab === "playground") {
              setViewMode("customer_portal");
            } else {
              setViewMode("customer_portal");
            }
          }}
        />
        {/* Subtle direct gateway to Owner Portal for Administrator */}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsOwnerLoginOpen(true)}
            className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-[#0a0f0d]/90 text-[#889e93] hover:text-[#1CE172] border border-[#F0FEF8]/10 hover:border-[#1CE172]/40 backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Owner Portal</span>
          </button>
        </div>

        <OwnerLoginModal
          isOpen={isOwnerLoginOpen}
          onClose={() => setIsOwnerLoginOpen(false)}
          onAuthenticated={() => setViewMode("owner_portal")}
        />
      </>
    );
  }

  // 2. CUSTOMER PORTAL (Bento Grid 3D Animation Style)
  if (viewMode === "customer_portal") {
    return (
      <div className="min-h-screen bg-[#010302] text-[#F0FEF8] flex flex-col font-sans selection:bg-[#1CE172]/20 selection:text-[#1CE172]">
        {/* Customer Top Bar */}
        <header className="border-b border-[#F0FEF8]/10 bg-[#0a0f0d]/95 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("landing")}
              className="text-xs font-mono text-[#889e93] hover:text-[#1CE172] transition-colors cursor-pointer"
            >
              ← Kembali ke Beranda
            </button>
            <span className="text-[#889e93] font-mono">/</span>
            <span className="font-semibold text-sm text-[#F0FEF8]">Customer Space</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOwnerLoginOpen(true)}
              className="text-xs font-mono text-[#889e93] hover:text-[#1CE172] px-3 py-1.5 rounded-lg border border-[#F0FEF8]/10 hover:border-[#1CE172]/30 transition-colors cursor-pointer"
            >
              Masuk Sistem Owner
            </button>
          </div>
        </header>

        {/* Customer Content */}
        <main className="max-w-7xl mx-auto w-full p-4 sm:p-8 flex-1">
          {/* Dispatched Key Success Banner */}
          {dispatchedNotification && (
            <div className="mb-8 p-6 rounded-3xl bg-[#0a0f0d] border border-[#1CE172]/40 shadow-[0_0_35px_rgba(28,225,114,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#1CE172] text-xs font-mono font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>PEMBAYARAN SETTLED — KUNCI BERHASIL DITERBITKAN!</span>
                </div>
                <h4 className="font-bold text-base text-[#F0FEF8]">
                  API Key Siap Pakai Telah Dikirim ke:{" "}
                  <span className="text-[#1CE172]">{dispatchedNotification.email}</span>
                </h4>
                <p className="text-xs text-[#889e93]">
                  Kunci Anda:{" "}
                  <code className="text-[#1CE172] bg-[#010302] px-2 py-0.5 rounded border border-[#1CE172]/20 font-mono">
                    {dispatchedNotification.keySecret}
                  </code>
                </p>
              </div>

              <button
                onClick={() => setDispatchedNotification(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#889e93] self-start md:self-auto cursor-pointer"
              >
                Tutup Notifikasi
              </button>
            </div>
          )}

          <CustomerBentoPortal
            onOpenCheckoutModal={(plan) => setSelectedCheckoutPlan(plan)}
            onSwitchToOwnerDashboard={() => setIsOwnerLoginOpen(true)}
          />
        </main>

        <CustomerCheckoutModal
          planCode={selectedCheckoutPlan || "pro"}
          isOpen={Boolean(selectedCheckoutPlan)}
          onClose={() => setSelectedCheckoutPlan(null)}
          onPaymentSettled={handlePaymentSettled}
        />

        <OwnerLoginModal
          isOpen={isOwnerLoginOpen}
          onClose={() => setIsOwnerLoginOpen(false)}
          onAuthenticated={() => setViewMode("owner_portal")}
        />
      </div>
    );
  }

  // 3. OWNER CONTROL PLANE (Khusus Pemilik Platform & Admin Master)
  return (
    <div className="min-h-screen bg-[#010302] text-[#F0FEF8] flex flex-col font-sans selection:bg-[#1CE172]/20 selection:text-[#1CE172]">
      {/* Top Navbar */}
      <div className="relative">
        <Navbar currentTab={activeTab} onTabChange={setActiveTab} />
        {/* Switch back to Customer Portal */}
        <div className="absolute right-40 top-3 hidden md:flex items-center gap-2 z-50">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            OWNER PRIVILEGED MODE
          </span>
          <button
            onClick={() => setViewMode("customer_portal")}
            className="text-[11px] font-mono px-3 py-1 rounded-full border border-[#1CE172]/30 bg-[#010302]/80 text-[#1CE172] hover:bg-[#1CE172]/10 transition-colors cursor-pointer"
          >
            <span>Buka Sistem Customer →</span>
          </button>
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
