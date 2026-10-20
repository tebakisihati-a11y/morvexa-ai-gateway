"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  Copy,
  Check,
  Mail,
  Zap,
} from "lucide-react";
import type { KeyProvisionRequest, ProvisioningPolicy } from "@/lib/owner/provisioning";

export function KeyProvisioningTab() {
  const [queue, setQueue] = useState<KeyProvisionRequest[]>([]);
  const [policy, setPolicy] = useState<ProvisioningPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mintedKeyResult, setMintedKeyResult] = useState<{
    customerEmail: string;
    keyName: string;
    rawSecret: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/provisioning/queue");
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        setPolicy(data.policy || null);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (requestId: string) => {
    setActionLoadingId(requestId);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/owner/provisioning/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMintedKeyResult({
          customerEmail: data.request.customerEmail,
          keyName: data.request.keyName,
          rawSecret: data.rawSecret,
        });
        setStatusMessage(data.message);
        fetchData();
      } else {
        alert(data.error || "Gagal menyetujui request.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("Masukkan alasan penolakan request key:", "Tidak memenuhi persyaratan risiko");
    if (!reason) return;

    setActionLoadingId(requestId);
    try {
      const res = await fetch("/api/owner/provisioning/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, reason }),
      });
      if (res.ok) {
        fetchData();
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBatchApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/provisioning/batch-approve", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Batch approval selesai: ${data.approvedCount} key otomatis diterbitkan.`);
        fetchData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoApprove = async () => {
    if (!policy) return;
    const newPolicy = { ...policy, autoApprovalEnabled: !policy.autoApprovalEnabled };
    setPolicy(newPolicy);
    try {
      await fetch("/api/owner/provisioning/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPolicy),
      });
    } catch {
      fetchData();
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === "pending") return item.status === "pending";
    if (filter === "approved")
      return item.status === "auto_approved" || item.status === "manual_approved" || item.status === "dispatched";
    if (filter === "rejected") return item.status === "rejected";
    return true;
  });

  const pendingCount = queue.filter((q) => q.status === "pending").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-white/[0.08] bg-[#090c10] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-[#f4f4f5]">
              Automated API Key Provisioning Engine
            </h1>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PIPELINE ACTIVE</span>
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl font-mono">
            Sistem otomatisasi penuh untuk memverifikasi, menilai skor risiko, dan menerbitkan API Key kriptografi (SHA-256) bagi kustomer baru maupun pembelian paket token.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {pendingCount > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070908] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Batch Approve Safe ({pendingCount})</span>
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#a1a1aa] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Minted Key Success Banner */}
      {mintedKeyResult && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                  <span>KEY AUTOMATICALLY PROVISIONED</span>
                  <span className="text-[10px] text-zinc-400 font-normal">→ Dispatched to {mintedKeyResult.customerEmail}</span>
                </div>
                <div className="text-xs text-zinc-300 font-mono">
                  {mintedKeyResult.keyName}
                </div>
                <div className="font-mono text-xs text-emerald-300 bg-black/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg select-all inline-block mt-1">
                  {mintedKeyResult.rawSecret}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mintedKeyResult.rawSecret);
                  setCopiedKey(mintedKeyResult.rawSecret);
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-mono text-xs font-bold hover:bg-emerald-400 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedKey === mintedKeyResult.rawSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === mintedKeyResult.rawSecret ? "Tersalin!" : "Salin Kunci"}</span>
              </button>
              <button
                onClick={() => setMintedKeyResult(null)}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-white/[0.08] bg-[#090c10] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>AUTO-APPROVAL RATE</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-[#f4f4f5]">98.2%</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-2">
            Zero-human intervention rate
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#090c10] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>PENDING QUEUE</span>
            <span className="text-xs font-mono text-emerald-400">●</span>
          </div>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-[#f4f4f5]">{pendingCount}</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-2">
            Permintaan menunggu verifikasi
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#090c10] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>AVERAGE MINT LATENCY</span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl font-mono font-bold text-emerald-400">38ms</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-2">
            HMAC-SHA256 generation speed
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#090c10] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>SECURITY FILTER</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-sm font-mono font-bold text-[#f4f4f5]">DNS & Fraud Gate</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 border-t border-white/5 pt-2">
            Blokir disposable email otomatis
          </div>
        </div>
      </div>

      {/* Visual Pipeline Representation */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#090c10] space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center justify-between">
          <span>Automated Provisioning State Machine</span>
          <span className="text-[10px] text-zinc-500">Autonomous Edge Ingestion</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-lg border border-white/5 bg-black/40 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span>01</span>
              <span>•</span>
              <span className="font-semibold text-zinc-200">Customer Trigger</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Kustomer melakukan registrasi, verifikasi email, atau transaksi token pack.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span>02</span>
              <span>•</span>
              <span className="font-semibold text-zinc-200">Risk & Fraud Audit</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Cek domain disposable, verifikasi email, dan evaluasi riwayat abuse.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span>03</span>
              <span>•</span>
              <span className="font-semibold text-zinc-200">Cryptographic Mint</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Generate 32-byte high entropy secret, simpan hash SHA-256 tersensitif.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span>04</span>
              <span>•</span>
              <span className="font-semibold text-zinc-200">Instant Edge Sync</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Kunci aktif di seluruh region (SIN, FRA, IAD, NRT) dengan quota policy.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Controls Toggle */}
      {policy && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#090c10] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-mono font-semibold text-[#f4f4f5] flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <span>Kebijakan Auto-Approval Otonom</span>
            </div>
            <p className="text-xs text-[#a1a1aa] font-mono">
              Ketika diaktifkan, permintaan API Key dari akun ber-email terverifikasi dengan skor risiko &lt; 35 akan langsung diterbitkan secara instan.
            </p>
          </div>

          <button
            onClick={handleToggleAutoApprove}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
              policy.autoApprovalEnabled
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-zinc-400 border border-white/10"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${policy.autoApprovalEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{policy.autoApprovalEnabled ? "AUTO-APPROVAL AKTIF" : "MANUAL REVIEW ONLY"}</span>
          </button>
        </div>
      )}

      {/* Queue & Request Ledger */}
      <div className="rounded-xl border border-white/[0.08] bg-[#090c10] overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#f4f4f5]">
              Antrean Permintaan Key Kustomer ({filteredQueue.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                filter === "all" ? "bg-white/10 text-white font-semibold" : "text-zinc-500 hover:text-white"
              }`}
            >
              Semua ({queue.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                filter === "pending" ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30" : "text-zinc-500 hover:text-white"
              }`}
            >
              Menunggu ({pendingCount})
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                filter === "approved" ? "bg-emerald-500/20 text-emerald-400 font-semibold" : "text-zinc-500 hover:text-white"
              }`}
            >
              Disetujui
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                filter === "rejected" ? "bg-red-500/20 text-red-400 font-semibold" : "text-zinc-500 hover:text-white"
              }`}
            >
              Ditolak
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-500 text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Kustomer & Akun</th>
                <th className="py-3 px-4 font-semibold">Nama Key & Paket</th>
                <th className="py-3 px-4 font-semibold">Audit Risiko</th>
                <th className="py-3 px-4 font-semibold">Status Pipeline</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Tidak ada permintaan key pada status ini.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const isPending = item.status === "pending";
                  const isLowRisk = item.riskScore <= 20;
                  const isHighRisk = item.riskScore >= 70;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-100">{item.customerName}</div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span>{item.customerEmail}</span>
                          {item.emailVerified ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              UNVERIFIED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-zinc-200 font-medium">{item.keyName}</div>
                        <div className="text-[10px] text-zinc-500 uppercase mt-0.5">
                          {item.requestedTier} • {item.rateLimitRpm} RPM • {(item.dailyTokenLimit / 1000).toFixed(0)}k Tok/hari
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isLowRisk
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : isHighRisk
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            }`}
                          >
                            Risk: {item.riskScore}/100
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-1 max-w-xs truncate">
                          {item.riskReasons.join(" • ")}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.status === "pending" && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            MENUNGGU APPROVAL
                          </span>
                        )}
                        {(item.status === "auto_approved" || item.status === "manual_approved") && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            DISETUJUI & AKTIF
                          </span>
                        )}
                        {item.status === "dispatched" && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                            DISPATCHED
                          </span>
                        )}
                        {item.status === "rejected" && (
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                              DITOLAK
                            </span>
                            {item.rejectionReason && (
                              <div className="text-[10px] text-red-400/80 mt-1">{item.rejectionReason}</div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {actionLoadingId === item.id ? "Minting..." : "Approve & Mint"}
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              disabled={actionLoadingId === item.id}
                              className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono transition-colors cursor-pointer"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500">
                            {item.processedAt ? new Date(item.processedAt).toLocaleTimeString("id-ID") : "Selesai"}
                          </span>
                        )}
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
