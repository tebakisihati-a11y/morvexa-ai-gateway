"use client";

import React, { useState } from "react";
import type { ApiKeyItem } from "@/lib/types";
import { Key, Copy, Check, Ban, CheckCircle2, Shield } from "lucide-react";

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
    <div className="rounded-xl border border-white/10 bg-[#121215] overflow-hidden shadow-lg">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Active API Keys</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Keys authenticated via Bearer token with per-key rate limiting policies
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
          {keys.filter((k) => k.isActive).length} active keys
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-[11px] font-mono uppercase text-zinc-500">
              <th className="py-2.5 px-4 font-semibold">Name & Description</th>
              <th className="py-2.5 px-4 font-semibold">Key Token</th>
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
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 bg-black/40 border border-white/5 px-2 py-1 rounded">
                      {item.maskedKey}
                    </span>
                    <button
                      onClick={() => handleCopy(item.id, item.maskedKey)}
                      className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                      title="Copy key prefix"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
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
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      Revoked
                    </span>
                  )}
                </td>

                <td className="py-3 px-4 text-right">
                  {item.isActive ? (
                    <button
                      onClick={() => onRevoke(item.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-sans hover:bg-red-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      Revoke
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-600">Inactive</span>
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
