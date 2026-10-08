"use client";

import React, { useState } from "react";
import type { UpstreamProviderConfig } from "@/lib/types";
import { DEFAULT_PROVIDERS } from "@/lib/gateway/failover";
import { ProviderCredentialsCard } from "./ProviderCredentialsCard";
import { FailoverFlowMap } from "./FailoverFlowMap";
import { GitBranch, ShieldCheck, Zap } from "lucide-react";

export function RoutingTab() {
  const [providers, setProviders] = useState<UpstreamProviderConfig[]>(DEFAULT_PROVIDERS);

  const handleUpdateKey = (id: string, key: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, apiKey: key } : p))
    );
  };

  const handleToggleActive = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
          Universal Model Routing & Failover Architecture
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure upstream API credentials and visualize how Morvexa automatically reroutes traffic when rate limits or provider outages occur.
        </p>
      </div>

      <FailoverFlowMap />

      <ProviderCredentialsCard
        providers={providers}
        onUpdateKey={handleUpdateKey}
        onToggleActive={handleToggleActive}
      />
    </div>
  );
}
