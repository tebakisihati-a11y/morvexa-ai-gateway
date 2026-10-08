"use client";

import React, { useState } from "react";
import type { UpstreamProviderConfig } from "@/lib/types";
import { Key, Check, Eye, EyeOff, Activity, ShieldCheck } from "lucide-react";

interface ProviderCredentialsCardProps {
  providers: UpstreamProviderConfig[];
  onUpdateKey: (id: string, key: string) => void;
  onToggleActive: (id: string) => void;
}

export function ProviderCredentialsCard({
  providers,
  onUpdateKey,
  onToggleActive,
}: ProviderCredentialsCardProps) {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Upstream Provider Credentials (BYOK / Managed)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Store your upstream provider keys securely. Morvexa load-balances and routes requests automatically.
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          AES-256 GCM Encrypted
        </span>
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-white/5 bg-black/40 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-zinc-200">
                {p.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200">{p.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Pri: #{p.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                  <span>Latency: <span className="text-zinc-300">{p.latencyMs}ms</span></span>
                  <span>•</span>
                  <span className="text-emerald-400">Status: {p.health}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <input
                  type={showKeys[p.id] ? "text" : "password"}
                  placeholder={`Enter ${p.name} API Key`}
                  defaultValue={p.apiKey}
                  onChange={(e) => onUpdateKey(p.id, e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 pr-8"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(p.id)}
                  className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showKeys[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleActive(p.id)}
                className={`text-[11px] font-mono px-2.5 py-1.5 rounded-md border transition-colors cursor-pointer ${
                  p.isActive
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-white/5 border-white/10 text-zinc-500"
                }`}
              >
                {p.isActive ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
