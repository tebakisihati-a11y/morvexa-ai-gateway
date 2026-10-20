"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Lock,
  Unlock,
  Activity,
  Play,
  RotateCcw,
  ShieldCheck,
  Server,
  Search,
  Check,
  Copy,
  Sliders,
  Send,
} from "lucide-react";
import type { CustomerIncident } from "@/lib/owner/resolver";
import type { ApiKeyItem } from "@/lib/types";

interface CustomerIssueResolverTabProps {
  keys?: ApiKeyItem[];
  onRefreshKeys?: () => void;
}

export function CustomerIssueResolverTab({ keys = [], onRefreshKeys }: CustomerIssueResolverTabProps) {
  const [incidents, setIncidents] = useState<CustomerIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [resolutionResult, setResolutionResult] = useState<{ message: string; newSecret?: string } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Probe simulator state
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [probeModel, setProbeModel] = useState<string>("claude-3-7-sonnet");
  const [probeRunning, setProbeRunning] = useState(false);
  const [probeResult, setProbeResult] = useState<any | null>(null);

  // Quick Action Manual Form
  const [targetCustomer, setTargetCustomer] = useState("");
  const [manualActionStatus, setManualActionStatus] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/resolver/incidents");
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    if (keys.length > 0 && !selectedKeyId) {
      setSelectedKeyId(keys[0].id);
    }
  }, [keys, selectedKeyId]);

  const handleFixKey = async (
    keyId: string,
    action: "rehash" | "boost_quota" | "boost_rpm" | "failover_provider" | "reactivate",
    boostTokens?: number
  ) => {
    setActionLoadingId(keyId);
    setResolutionResult(null);
    try {
      const res = await fetch("/api/owner/resolver/fix-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, action, boostTokens }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResolutionResult({
          message: data.message,
          newSecret: data.newSecret,
        });
        fetchIncidents();
        onRefreshKeys?.();
      } else {
        alert(data.message || "Gagal menjalankan perbaikan key.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlockCustomer = async (customerIdOrEmail: string) => {
    setActionLoadingId(customerIdOrEmail);
    try {
      const res = await fetch("/api/owner/resolver/unlock-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerIdOrEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResolutionResult({ message: data.message });
        fetchIncidents();
      } else {
        alert(data.message || "Gagal membuka akun customer.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunProbe = async () => {
    if (!selectedKeyId) return;
    setProbeRunning(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/owner/resolver/probe-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: selectedKeyId, modelRequested: probeModel }),
      });
      const data = await res.json();
      setProbeResult(data);
    } finally {
      setProbeRunning(false);
    }
  };

  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-white/[0.08] bg-[#090c10] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-[#f4f4f5]">
              Customer Account & API Key Doctor
            </h1>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DIAGNOSTIC RADAR ACTIVE</span>
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl font-mono">
            Pusat resolusi insiden dan masalah kustomer: deteksi error 401 (invalid hash), 429 (kuota habis), akun terkunci, serta simulasi pengujian performa key live ke edge mesh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchIncidents();
              onRefreshKeys?.();
            }}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#a1a1aa] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Diagnosa Ulang</span>
          </button>
        </div>
      </div>

      {/* Resolution Toast / Alert */}
      {resolutionResult && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-400">
                  REMEDIATION EXECUTED SUCCESSFULLY
                </div>
                <p className="text-xs text-zinc-300 font-mono">
                  {resolutionResult.message}
                </p>
                {resolutionResult.newSecret && (
                  <div className="mt-1">
                    <span className="text-[10px] text-zinc-400 block font-mono">Secret baru diterbitkan (salin dan kirimkan ke customer):</span>
                    <div className="font-mono text-xs text-emerald-300 bg-black/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg select-all inline-block mt-0.5">
                      {resolutionResult.newSecret}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {resolutionResult.newSecret && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resolutionResult.newSecret!);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-mono text-xs font-bold hover:bg-emerald-400 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSecret ? "Tersalin!" : "Salin Kunci"}</span>
                </button>
              )}
              <button
                onClick={() => setResolutionResult(null)}
                className="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Incidents Radar */}
      <div className="rounded-xl border border-white/[0.08] bg-[#090c10] overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#f4f4f5]">
              Insiden Aktif & Masalah Kustomer Terdeteksi ({openIncidents.length})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Real-time telemetry scan
          </span>
        </div>

        <div className="p-4 space-y-3">
          {openIncidents.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs">
              Semua akun customer dan API Key dalam kondisi sehat (100% operational).
            </div>
          ) : (
            openIncidents.map((inc) => {
              const isInvalidHash = inc.issueType === "401_INVALID_HASH";
              const isQuotaExhausted = inc.issueType === "429_QUOTA_EXHAUSTED";
              const isLocked = inc.issueType === "ACCOUNT_LOCKED";

              return (
                <div
                  key={inc.id}
                  className="p-4 rounded-xl border border-white/5 bg-black/40 hover:border-white/10 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          inc.severity === "critical"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : inc.severity === "high"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                        }`}
                      >
                        {inc.issueType.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-zinc-100 font-mono">
                        {inc.customerName || inc.customerEmail}
                      </span>
                      {inc.keyPrefix && (
                        <span className="text-[11px] font-mono text-zinc-500">
                          ({inc.keyPrefix})
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="text-[11px] text-zinc-500 font-mono">
                      <span className="text-zinc-400">Diagnosis:</span> {inc.technicalDetails}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
                    {isInvalidHash && inc.keyId && (
                      <button
                        onClick={() => handleFixKey(inc.keyId!, "rehash")}
                        disabled={actionLoadingId === inc.keyId}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Auto-Fix Secret (Re-Hash)</span>
                      </button>
                    )}

                    {isQuotaExhausted && inc.keyId && (
                      <button
                        onClick={() => handleFixKey(inc.keyId!, "boost_quota", 500_000)}
                        disabled={actionLoadingId === inc.keyId}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-amber-500/20"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Inject +500k Kuota</span>
                      </button>
                    )}

                    {isLocked && (
                      <button
                        onClick={() => handleUnlockCustomer(inc.customerId || inc.customerEmail)}
                        disabled={actionLoadingId === (inc.customerId || inc.customerEmail)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Buka Kunci Akun</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Key Diagnostics & Edge Probe Simulator */}
      <div className="p-5 rounded-xl border border-white/[0.08] bg-[#090c10] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#f4f4f5] flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>Simulasi & Health Probe Key Kustomer</span>
            </h3>
            <p className="text-xs text-[#a1a1aa] font-mono mt-0.5">
              Uji coba konektivitas real-time key kustomer ke gateway edge proxy tanpa harus login ke akun kustomer.
            </p>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Zero-Leak Sandbox Probe
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400 block">Pilih Kunci Kustomer</label>
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs font-mono text-zinc-200 cursor-pointer focus:outline-none focus:border-emerald-500"
            >
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.maskedKey}) — {k.customerEmail || "No Email"}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400 block">Target Upstream Model</label>
            <select
              value={probeModel}
              onChange={(e) => setProbeModel(e.target.value)}
              className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs font-mono text-zinc-200 cursor-pointer focus:outline-none focus:border-emerald-500"
            >
              <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Anthropic)</option>
              <option value="deepseek-v3">DeepSeek V3 (DeepSeek)</option>
              <option value="gpt-4o">OpenAI GPT-4o (OpenAI)</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              onClick={handleRunProbe}
              disabled={probeRunning || !selectedKeyId}
              className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 fill-current ${probeRunning ? "animate-spin" : ""}`} />
              <span>{probeRunning ? "Probing Edge..." : "Jalankan Probe"}</span>
            </button>
          </div>
        </div>

        {/* Probe Telemetry Result Output */}
        {probeResult && (
          <div className="mt-3 p-4 rounded-xl border border-white/10 bg-black/50 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    probeResult.statusCode === 200 ? "bg-emerald-400" : "bg-red-400 animate-pulse"
                  }`}
                />
                <span className="font-bold text-zinc-100">
                  HTTP {probeResult.statusCode}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">TTFT: {probeResult.ttftMs}ms</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">Durasi: {probeResult.totalDurationMs}ms</span>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  probeResult.health === "optimal"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {probeResult.health}
              </span>
            </div>

            <p className="text-xs font-mono text-zinc-300">
              {probeResult.diagnosis}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono pt-1">
              <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-400">SHA-256 Hash</span>
                <span className={probeResult.checks.hashValid ? "text-emerald-400" : "text-red-400"}>
                  {probeResult.checks.hashValid ? "VALID" : "INVALID (401)"}
                </span>
              </div>

              <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-400">Quota Headroom</span>
                <span className={probeResult.checks.quotaHeadroom ? "text-emerald-400" : "text-red-400"}>
                  {probeResult.checks.quotaHeadroom ? "AVAILABLE" : "EXHAUSTED (429)"}
                </span>
              </div>

              <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-400">RPM Rate-Limit</span>
                <span className={probeResult.checks.rpmWithinLimit ? "text-emerald-400" : "text-red-400"}>
                  {probeResult.checks.rpmWithinLimit ? "NORMAL" : "THROTTLED"}
                </span>
              </div>

              <div className="p-2 rounded bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-400">Upstream Mesh</span>
                <span className={probeResult.checks.upstreamReachable ? "text-emerald-400" : "text-red-400"}>
                  {probeResult.checks.upstreamReachable ? "REACHABLE" : "UNREACHABLE"}
                </span>
              </div>
            </div>

            {probeResult.statusCode !== 200 && (
              <div className="pt-2 flex items-center gap-2">
                {probeResult.statusCode === 401 && (
                  <button
                    onClick={() => handleFixKey(selectedKeyId, "rehash")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Perbaiki Secret Key Ini Sekarang
                  </button>
                )}
                {probeResult.statusCode === 429 && (
                  <button
                    onClick={() => handleFixKey(selectedKeyId, "boost_quota", 500_000)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Inject Kuota +500k Tokens
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resolved Incidents Audit History */}
      {resolvedIncidents.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#090c10] p-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa] font-semibold flex items-center justify-between">
            <span>Riwayat Perbaikan Kustomer (Resolved)</span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {resolvedIncidents.length} insiden telah diselesaikan
            </span>
          </div>

          <div className="divide-y divide-white/5 space-y-2">
            {resolvedIncidents.map((item) => (
              <div key={item.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-zinc-200 font-semibold">{item.customerEmail}</span>
                    <span className="text-[10px] text-zinc-500">({item.issueType})</span>
                  </div>
                  {item.resolutionNote && (
                    <div className="text-[11px] text-zinc-400 mt-0.5 ml-5.5">
                      {item.resolutionNote}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 shrink-0">
                  {item.resolvedAt ? new Date(item.resolvedAt).toLocaleTimeString("id-ID") : "Resolved"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
