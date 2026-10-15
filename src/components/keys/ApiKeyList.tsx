"use client";

import React, { useState } from "react";
import type { ApiKeyItem } from "@/lib/types";
import {
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  AlertTriangle,
  Mail,
  SlidersHorizontal,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface ApiKeyListProps {
  keys: ApiKeyItem[];
  onRevoke: (id: string) => void;
  onRegenerateSecret?: (id: string) => Promise<{ rawSecret: string } | null>;
  onResetQuota?: (id: string, boostTokens?: number) => Promise<void>;
}

export function ApiKeyList({
  keys,
  onRevoke,
  onRegenerateSecret,
  onResetQuota,
}: ApiKeyListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remediatedKey, setRemediatedKey] = useState<{ id: string; rawSecret: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "healthy" | "issues" | "revoked">("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerate = async (id: string) => {
    if (!onRegenerateSecret) return;
    setProcessingId(id);
    try {
      const res = await onRegenerateSecret(id);
      if (res) {
        setRemediatedKey({ id, rawSecret: res.rawSecret });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReset = async (id: string, boost = 100000) => {
    if (!onResetQuota) return;
    setProcessingId(id);
    try {
      await onResetQuota(id, boost);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredKeys = keys.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.maskedKey.toLowerCase().includes(search.toLowerCase()) ||
      (k.customerEmail && k.customerEmail.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === "healthy") return k.isActive && (!k.healthStatus || k.healthStatus === "healthy");
    if (filter === "issues")
      return k.healthStatus === "invalid_hash" || k.healthStatus === "quota_exhausted";
    if (filter === "revoked") return !k.isActive || k.healthStatus === "revoked";
    return true;
  });

  const issueCount = keys.filter(
    (k) => k.healthStatus === "invalid_hash" || k.healthStatus === "quota_exhausted"
  ).length;

  return (
    <div className="space-y-4">
      {/* Remediation Success Banner */}
      {remediatedKey && (
        <div className="rounded-lg border border-[#f97316]/40 bg-[#f97316]/10 p-4 sm:p-5 text-[#f4f4f5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#f97316]">
                TOKEN REMEDIATION SUCCESSFUL
              </div>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Kunci kustomer telah diperbaiki secara instan. Kunci mentah baru siap disalin:
              </p>
              <div className="font-mono text-xs text-[#f4f4f5] bg-[#08080a] border border-[#f97316]/30 px-3 py-1.5 rounded-lg mt-2 inline-block select-all">
                {remediatedKey.rawSecret}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleCopy("remediated", remediatedKey.rawSecret)}
              className="px-3 py-1.5 rounded-lg bg-[#f97316] text-[#08080a] font-mono text-xs font-bold hover:bg-[#f97316]/90 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === "remediated" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedId === "remediated" ? "Disalin!" : "Salin Kunci"}</span>
            </button>
            <button
              onClick={() => setRemediatedKey(null)}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-[#a1a1aa] hover:text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Control & Filter Strip */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari token, email kustomer (e.g. dev@acme.ai), atau plan..."
            className="w-full bg-[#08080a] border border-white/10 rounded-lg px-3.5 py-2 text-xs font-mono text-[#f4f4f5] placeholder:text-[#71717a] focus:outline-none focus:border-[#f97316]/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
 filter === "all"
 ? "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/40"
 : "text-[#a1a1aa] hover:text-white bg-white/5 border border-transparent"
 }`}
          >
            Semua ({keys.length})
          </button>
          <button
            onClick={() => setFilter("healthy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
 filter === "healthy"
 ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
 : "text-[#a1a1aa] hover:text-white bg-white/5 border border-transparent"
 }`}
          >
            Sehat
          </button>
          <button
            onClick={() => setFilter("issues")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
 filter === "issues"
 ? "bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/40 font-bold"
 : "text-[#eab308]/80 hover:text-[#eab308] bg-[#eab308]/10 border border-[#eab308]/20"
 }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Kendala ({issueCount})</span>
          </button>
          <button
            onClick={() => setFilter("revoked")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
 filter === "revoked"
 ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40"
 : "text-[#a1a1aa] hover:text-white bg-white/5 border border-transparent"
 }`}
          >
            Revoked
          </button>
        </div>
      </div>

      {/* Main Keys & Token Telemetry Table */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11]/80 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-[#f4f4f5] flex items-center gap-2">
              <span>Token Telemetry & Customer Health Inspector</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20">
                Autonomous Doctor Active
              </span>
            </h3>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              Pantau konsumsi token real-time per kustomer dan atasi kegagalan token (Invalid Hash / Kuota Habis) secara instan.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#a1a1aa]">
            <span>{filteredKeys.length} ditampilkan</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#08080a]/60 text-[10px] font-mono uppercase text-[#71717a]">
                <th className="py-3 px-4 font-semibold">Kustomer & Token</th>
                <th className="py-3 px-4 font-semibold">Prefix Key</th>
                <th className="py-3 px-4 font-semibold">Konsumsi Token Hari Ini</th>
                <th className="py-3 px-4 font-semibold">Status Diagnosa</th>
                <th className="py-3 px-4 font-semibold text-right">Autonomous Doctor Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-mono">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#71717a] font-mono text-xs">
                    Tidak ada kunci yang cocok dengan kriteria pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredKeys.map((item) => {
                  const usedTokens = item.tokensUsed ?? Math.floor(item.dailyTokenLimit * 0.45);
                  const capTokens = item.dailyTokenLimit || 1;
                  const usagePercent = Math.min(100, Math.round((usedTokens / capTokens) * 100));

                  const isInvalid = item.healthStatus === "invalid_hash";
                  const isDepleted = item.healthStatus === "quota_exhausted" || usagePercent >= 95;
                  const isHealthy = item.isActive && !isInvalid && !isDepleted;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
 isInvalid
 ? "bg-[#ef4444]/[0.03]"
 : isDepleted
 ? "bg-[#eab308]/[0.03]"
 : ""
 }`}
                    >
                      {/* Customer & Token Ident */}
                      <td className="py-3.5 px-4">
                        <div className="font-sans font-semibold text-[#f4f4f5] flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.planCode && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#a1a1aa]">
                              {item.planCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#a1a1aa]">
                          {item.customerEmail && (
                            <span className="flex items-center gap-1 text-[#a1a1aa]">
                              <Mail className="h-3 w-3 text-[#f97316]" />
                              <span>{item.customerEmail}</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>Aktif: {item.lastUsedAt || "Baru"}</span>
                        </div>
                      </td>

                      {/* Token Masked */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#f4f4f5] bg-[#08080a] border border-white/10 px-2.5 py-1 rounded-lg font-mono text-[11px]">
                            {item.maskedKey}
                          </span>
                          <button
                            onClick={() => handleCopy(item.id, item.maskedKey)}
                            className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                            title="Salin identifier"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-[#10b981]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Token Consumption Telemetry */}
                      <td className="py-3.5 px-4">
                        <div className="w-48 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#a1a1aa]">
                              {(usedTokens / 1000).toFixed(1)}k / {(capTokens / 1000).toFixed(0)}k
                            </span>
                            <span
                              className={`font-bold ${
 usagePercent > 90
 ? "text-[#ef4444]"
 : usagePercent > 70
 ? "text-[#eab308]"
 : "text-[#f97316]"
 }`}
                            >
                              {usagePercent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
 usagePercent > 90
 ? "bg-[#ef4444] "
 : usagePercent > 70
 ? "bg-[#eab308] "
 : "bg-[#f97316] "
 }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-[#71717a]">
                            Limit: {item.rateLimitRpm} RPM
                          </div>
                        </div>
                      </td>

                      {/* Health Status & Issue Diagnosis */}
                      <td className="py-3.5 px-4">
                        {isInvalid ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 text-[11px] font-semibold">
                              <XCircle className="h-3 w-3" />
                              <span>TOKEN CORRUPTED / 401</span>
                            </span>
                            <p className="text-[10px] text-[#ef4444]/80 leading-tight max-w-[200px]">
                              {item.issueReason || "Hash SHA-256 tidak valid. Request kustomer ditolak."}
                            </p>
                          </div>
                        ) : isDepleted ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30 text-[11px] font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              <span>KUOTA EXHAUSTED</span>
                            </span>
                            <p className="text-[10px] text-[#eab308]/80 leading-tight max-w-[200px]">
                              {item.issueReason || "Token cap harian habis. Memerlukan reset / top-up."}
                            </p>
                          </div>
                        ) : item.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#f97316]">
                            <span className="h-2 w-2 rounded-full bg-[#f97316] animate-pulse" />
                            <span>Normal & Serving</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#71717a]">
                            <span className="h-2 w-2 rounded-full bg-[#71717a]" />
                            <span>Revoked</span>
                          </span>
                        )}
                      </td>

                      {/* Smart Autonomous Remediation Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isInvalid ? (
                            <button
                              onClick={() => handleRegenerate(item.id)}
                              disabled={processingId === item.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#ef4444] text-white font-mono text-[11px] font-bold hover:bg-[#ef4444] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Terbitkan token kriptografi baru yang valid"
                            >
                              <RefreshCw className={`h-3 w-3 ${processingId === item.id ? "animate-spin" : ""}`} />
                              <span>Auto-Fix Secret (401)</span>
                            </button>
                          ) : isDepleted ? (
                            <button
                              onClick={() => handleReset(item.id, 250000)}
                              disabled={processingId === item.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#eab308] text-black font-mono text-[11px] font-bold hover:bg-[#eab308] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              title="Reset pemakaian token dan berikan kuota tambahan"
                            >
                              <Zap className="h-3 w-3" />
                              <span>Reset & Boost Quota</span>
                            </button>
                          ) : item.isActive ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleRegenerate(item.id)}
                                disabled={processingId === item.id}
                                className="px-2 py-1 rounded border border-white/10 hover:border-[#f97316]/40 text-[#a1a1aa] hover:text-[#f97316] text-[10px] font-mono transition-colors cursor-pointer"
                                title="Regenerate kunci"
                              >
                                Roll Key
                              </button>
                              <button
                                onClick={() => onRevoke(item.id)}
                                className="px-2 py-1 rounded border border-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/10 text-[10px] font-mono transition-colors cursor-pointer"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#71717a]">No Action</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
