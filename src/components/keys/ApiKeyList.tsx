"use client";

import React, { useState } from "react";
import type { ApiKeyItem } from "@/lib/types";
import { Copy, Check } from "lucide-react";

interface ApiKeyListProps {
  keys: ApiKeyItem[];
  onRevoke: (id: string) => void;
}

export function ApiKeyList({ keys, onRevoke }: ApiKeyListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
      <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-200">
            Active Gateway API Keys
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographic SHA-256 validated keys with per-key rate limits and daily ceilings.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-400 border border-white/5 bg-black/40 px-2 py-0.5 rounded self-start sm:self-auto">
          {keys.filter((k) => k.isActive).length} active keys
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] font-mono uppercase text-zinc-500">
              <th className="py-2.5 px-4 font-semibold">Key Identifier</th>
              <th className="py-2.5 px-4 font-semibold">Token Prefix</th>
              <th className="py-2.5 px-4 font-semibold">Rate Limit</th>
              <th className="py-2.5 px-4 font-semibold">Daily Token Cap</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
              <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs font-mono">
            {keys.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4">
                  <div className="font-sans font-medium text-zinc-200">{item.name}</div>
                  <div className="text-[10px] text-zinc-500">Created {new Date(item.createdAt).toLocaleDateString()}</div>
                </td>

                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-300 bg-black/40 border border-white/5 px-2 py-0.5 rounded font-mono text-[11px]">
                      {item.maskedKey}
                    </span>
                    <button
                      onClick={() => handleCopy(item.id, item.maskedKey)}
                      className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                      title="Copy key"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>

                <td className="py-3 px-4 text-zinc-300">
                  <span>{item.rateLimitRpm} RPM</span>
                </td>

                <td className="py-3 px-4 text-zinc-300">
                  <span>{(item.dailyTokenLimit / 1000).toFixed(0)}k / day</span>
                </td>

                <td className="py-3 px-4">
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                      revoked
                    </span>
                  )}
                </td>

                <td className="py-3 px-4 text-right">
                  {item.isActive ? (
                    <button
                      onClick={() => onRevoke(item.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-mono hover:bg-red-500/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      revoke
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600">inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
