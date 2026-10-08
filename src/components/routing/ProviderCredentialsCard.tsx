"use client";

import React, { useState } from "react";
import type { UpstreamProviderConfig } from "@/lib/types";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-200">
            Upstream Provider Credentials & Nodes
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            BYOK (Bring Your Own Key) vault and local daemon node connection parameters.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 border border-white/5 bg-black/40 px-2 py-0.5 rounded self-start sm:self-auto">
          aes-256-gcm encrypted
        </span>
      </div>

      <div className="space-y-2.5">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border border-white/5 bg-black/40 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-zinc-200">{p.name}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    pri: #{p.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 mt-0.5">
                  <span>latency: <span className="text-zinc-300">{p.latencyMs}ms</span></span>
                  <span>·</span>
                  <span className="text-emerald-400">status: {p.health}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md w-full">
              <div className="relative flex-1">
                <input
                  type={showKeys[p.id] ? "text" : "password"}
                  placeholder={p.id === "custom" ? "http://localhost:5002" : `Enter ${p.name} Key`}
                  defaultValue={p.apiKey}
                  onChange={(e) => onUpdateKey(p.id, e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 pr-8"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility(p.id)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showKeys[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleActive(p.id)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer shrink-0 ${
                  p.isActive
                    ? "bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10"
                    : "bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {p.isActive ? "active" : "disabled"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
