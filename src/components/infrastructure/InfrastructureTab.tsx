"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  Cpu,
  Activity,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Radio,
  Globe2,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";

interface EnvironmentData {
  envId: string;
  orgId: string;
  status: string;
  liveness: "ok" | "failing";
  readiness: "ok" | "warming_up" | "failing";
  lastProbeAt: string;
  consecutiveFailures: number;
  endpointUrl: string;
}

export function InfrastructureTab() {
  const [selectedTier, setSelectedTier] = useState<"shared" | "dedicated">("shared");
  const [activePlan, setActivePlan] = useState<string>("apex"); // default to eligible plan for demo
  const [region, setRegion] = useState<"sin" | "fra" | "iad" | "nrt" | "local">("sin");
  const [modelTier, setModelTier] = useState<"custom_cluster" | "private_gpu" | "isolated_proxy">("custom_cluster");
  const [dedicatedUrl, setDedicatedUrl] = useState("http://localhost:5002");
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [envData, setEnvData] = useState<EnvironmentData | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);

  // No initial hardcoded environment check to avoid 404s on unprovisioned instances.
  // Dedicated state is activated when the user provisions via handleProvision.

  const handleProvision = async () => {
    setIsProvisioning(true);
    try {
      const res = await apiFetch("/api/infrastructure/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "org_default",
          planCode: activePlan,
          region,
          modelTier,
          dedicatedHostUrl: dedicatedUrl,
          memoryMb: 8192,
          cpuCores: 4,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEnvData({
          envId: data.envId,
          orgId: "org_default",
          status: "active",
          liveness: "ok",
          readiness: "ok",
          lastProbeAt: new Date().toISOString(),
          consecutiveFailures: 0,
          endpointUrl: data.endpointUrl,
        });
        setSelectedTier("dedicated");
      } else {
        alert(data.error || "Gagal melakukan provisioning");
      }
    } catch {
      alert("Error saat memanggil API provisioning");
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleSendProbe = async (simulateSuccess: boolean) => {
    if (!envData) return;
    setProbeLoading(true);

    try {
      const res = await apiFetch(`/api/infrastructure/environments/${envData.envId}/probe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: simulateSuccess }),
      });

      if (res.ok) {
        const updated = await res.json();
        setEnvData(updated);
      }
    } catch {
      alert("Error mengirimkan health probe");
    } finally {
      setProbeLoading(false);
    }
  };

  const handleDeprovision = async () => {
    if (!envData) return;
    if (!confirm(`Apakah Anda yakin ingin mendeprovisi node ${envData.envId}?`)) return;

    try {
      const res = await apiFetch(`/api/infrastructure/environments/${envData.envId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEnvData(null);
        setSelectedTier("shared");
      }
    } catch {
      alert("Error mendeprovisi environment");
    }
  };

  const isEligible = activePlan === "apex" || activePlan === "zenith" || activePlan === "enterprise";

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-[#f4f4f5] tracking-tight">Hybrid Shared & Dedicated Infrastructure</h2>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Kelola node komputasi AI: Shared Edge Proxy untuk hemat biaya vs Dedicated Node untuk throughput terisolasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#a1a1aa]">Current Plan:</span>
          <select
            value={activePlan}
            onChange={(e) => setActivePlan(e.target.value)}
            className="rounded bg-black/40 border border-white/10 px-2 py-1 text-xs font-mono text-orange-400 cursor-pointer"
          >
            <option value="developer">Developer Starter (Ineligible)</option>
            <option value="pro">Pro Workspace (Ineligible)</option>
            <option value="apex">Apex Scale (Eligible)</option>
            <option value="zenith">Zenith Enterprise (Eligible)</option>
          </select>
        </div>
      </div>

      {/* Tier Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode A: Shared Edge Proxy */}
        <div
          onClick={() => setSelectedTier("shared")}
          className={`rounded-lg border p-4 cursor-pointer transition-all ${
 selectedTier === "shared"
 ? "border-orange-500/40 bg-orange-950/[0.08] ring-1 ring-orange-500/20"
 : "border-white/10 bg-[#0e0e11] hover:border-white/20"
 }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-[#f4f4f5]">Mode A: Shared Edge Proxy</h3>
            </div>
            {selectedTier === "shared" && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold">
                Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Multi-tenant serverless Edge network. Isolasi tenant via Row Level Security (RLS). $0 biaya server saat menganggur (idle).
          </p>
          <div className="mt-3 font-mono text-[11px] text-[#71717a] space-y-1">
            <div>• Egress: Global Edge Mesh (SIN, FRA, IAD, NRT)</div>
            <div>• Concurrency limit: 60 - 300 RPM (tergantung paket)</div>
            <div>• Model routing: Failover otomatis ke Anthropic & DeepSeek</div>
          </div>
        </div>

        {/* Mode B: Dedicated Isolated Node */}
        <div
          onClick={() => setSelectedTier("dedicated")}
          className={`rounded-lg border p-4 cursor-pointer transition-all ${
 selectedTier === "dedicated"
 ? "border-orange-500/40 bg-orange-950/[0.08] ring-1 ring-orange-500/20"
 : "border-white/10 bg-[#0e0e11] hover:border-white/20"
 }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-orange-400" />
              <h3 className="text-xs font-semibold text-[#f4f4f5]">Mode B: Dedicated Isolated Node</h3>
            </div>
            {selectedTier === "dedicated" && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold">
                Aktif
              </span>
            )}
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Node komputasi terisolasi dengan dedicated IP, memori khusus, serta kemampuan routing ke model lokal/GPU private (misal localhost:5002).
          </p>
          <div className="mt-3 font-mono text-[11px] text-[#71717a] space-y-1">
            <div>• Egress: IP Statis Khusus / VPC Peering</div>
            <div>• Throughput: 1.000+ RPM tanpa antrean multi-tenant</div>
            <div>• SLA: 99.9% Uptime dengan health probe otomatis</div>
          </div>
        </div>
      </div>

      {/* Plan Ineligibility Warning */}
      {!isEligible && (
        <div className="rounded-lg border border-[#eab308]/20 bg-[#eab308]/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-[#eab308] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-[#eab308]">
              Paket Anda ({activePlan.toUpperCase()}) Tidak Memiliki Akses Dedicated Node
            </div>
            <p className="text-[#eab308]/80 leading-relaxed">
              Penyediaan infrastruktur node terdedikasi memerlukan paket <strong>Apex Scale</strong> atau <strong>Zenith Enterprise</strong>. Silakan upgrade paket Anda di tab Billing untuk membuka akses ini.
            </p>
          </div>
        </div>
      )}

      {/* Active Dedicated Node or Provisioning Form */}
      {selectedTier === "dedicated" && isEligible && (
        <div className="space-y-6">
          {envData ? (
            /* Active Environment Monitor */
            <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#10b981] animate-pulse" />
                    <h3 className="text-xs font-mono font-semibold uppercase text-[#f4f4f5]">
                      Dedicated Cluster: {envData.envId}
                    </h3>
                  </div>
                  <div className="text-xs text-[#a1a1aa] mt-1 font-mono">
                    Target Endpoint: <code className="text-orange-400">{envData.endpointUrl}</code>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded border uppercase ${
 envData.status === "active"
 ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
 : "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20"
 }`}
                  >
                    STATUS: {envData.status}
                  </span>
                  <button
                    onClick={handleDeprovision}
                    className="p-1.5 rounded bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/20 text-xs font-mono cursor-pointer flex items-center gap-1"
                    title="Deprovision Node"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Deprovision</span>
                  </button>
                </div>
              </div>

              {/* Health status grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded space-y-1">
                  <div className="text-[#71717a] text-[10px] uppercase">Liveness Probe</div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#f4f4f5]">
                    <span
                      className={`h-2 w-2 rounded-full ${
 envData.liveness === "ok" ? "bg-[#10b981]" : "bg-[#ef4444]"
 }`}
                    />
                    <span>{envData.liveness.toUpperCase()}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded space-y-1">
                  <div className="text-[#71717a] text-[10px] uppercase">Readiness Probe</div>
                  <div className="flex items-center gap-1.5 font-semibold text-[#f4f4f5]">
                    <span
                      className={`h-2 w-2 rounded-full ${
 envData.readiness === "ok" ? "bg-[#10b981]" : "bg-[#eab308]"
 }`}
                    />
                    <span>{envData.readiness.toUpperCase()}</span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.02] border border-white/5 rounded space-y-1">
                  <div className="text-[#71717a] text-[10px] uppercase">Consecutive Failures</div>
                  <div className="font-semibold text-[#f4f4f5]">{envData.consecutiveFailures} / 3 Threshold</div>
                </div>
              </div>

              {/* Synthetic Probe Controller */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-lg space-y-3">
                <div className="text-xs font-medium text-[#f4f4f5] flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-orange-400" />
                  <span>Simulasi Health Probe (Automated Uptime Verification)</span>
                </div>
                <p className="text-[11px] text-[#a1a1aa]">
                  Uji coba deteksi kegagalan otomatis: Jika probe gagal 3 kali berturut-turut, sistem otomatis mendowngrade status ke <strong>DEGRADED</strong> dan mengirimkan alert.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => handleSendProbe(true)}
                    disabled={probeLoading}
                    className="px-3 py-1.5 rounded bg-[#10b981] hover:bg-[#10b981] text-white text-xs font-mono cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Kirim Probe Sukses (200 OK)</span>
                  </button>

                  <button
                    onClick={() => handleSendProbe(false)}
                    disabled={probeLoading}
                    className="px-3 py-1.5 rounded bg-[#ef4444]/80 hover:bg-[#ef4444] text-white text-xs font-mono cursor-pointer flex items-center gap-1.5"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Simulasikan Probe Gagal (503 Error)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Provisioning Form */
            <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-5 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-xs font-mono font-semibold uppercase text-[#f4f4f5]">
                  Formulir Provisioning Dedicated Node
                </h3>
                <p className="text-xs text-[#a1a1aa] mt-0.5">
                  Konfigurasikan spesifikasi cluster mandiri untuk workspace Anda.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-[#a1a1aa] block mb-1.5">Wilayah Penempatan (Region)</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as any)}
                    className="w-full rounded bg-black/60 border border-white/10 px-3 py-2 text-[#f4f4f5] cursor-pointer"
                  >
                    <option value="sin">Singapore (SIN) — Latency ~14ms</option>
                    <option value="fra">Frankfurt (FRA) — Latency ~86ms</option>
                    <option value="iad">Virginia (IAD) — Latency ~128ms</option>
                    <option value="nrt">Tokyo (NRT) — Latency ~42ms</option>
                    <option value="local">Local Private Host (localhost:5002)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#a1a1aa] block mb-1.5">Tipe Node & Compute</label>
                  <select
                    value={modelTier}
                    onChange={(e) => setModelTier(e.target.value as any)}
                    className="w-full rounded bg-black/60 border border-white/10 px-3 py-2 text-[#f4f4f5] cursor-pointer"
                  >
                    <option value="custom_cluster">Custom Cluster (4 vCPU, 8 GB RAM)</option>
                    <option value="private_gpu">Private GPU Worker (NVIDIA L4 24GB)</option>
                    <option value="isolated_proxy">Dedicated Isolated Proxy</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[#a1a1aa] block mb-1.5">Dedicated Endpoint URL</label>
                  <input
                    type="text"
                    value={dedicatedUrl}
                    onChange={(e) => setDedicatedUrl(e.target.value)}
                    placeholder="http://localhost:5002 atau https://private.cluster.morvexa.ai"
                    className="w-full rounded bg-black/60 border border-white/10 px-3 py-2 text-[#f4f4f5]"
                  />
                  <span className="text-[10px] text-[#71717a] mt-1 block">
                    Gunakan <code>http://localhost:5002</code> untuk menguji private server lokal yang terdaftar di sistem.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleProvision}
                  disabled={isProvisioning}
                  className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>{isProvisioning ? "Menyiapkan Node..." : "Provision Dedicated Node"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
