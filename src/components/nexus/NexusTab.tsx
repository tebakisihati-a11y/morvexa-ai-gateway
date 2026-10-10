"use client";

import React, { useState } from "react";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldAlert,
  Server,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface TenantOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  membersCount: number;
  status: "active" | "past_due" | "canceled";
  infraMode: "shared" | "dedicated";
  monthlyVolumeReqs: number;
}

const MOCK_ORGS: TenantOrg[] = [
  {
    id: "org-01",
    name: "Nusantara Fintech Labs",
    slug: "nusantara-fintech",
    plan: "Apex Scale",
    membersCount: 24,
    status: "active",
    infraMode: "dedicated",
    monthlyVolumeReqs: 840210,
  },
  {
    id: "org-02",
    name: "Bandung Generative Studio",
    slug: "bandung-gen-ai",
    plan: "Pro Workspace",
    membersCount: 8,
    status: "active",
    infraMode: "shared",
    monthlyVolumeReqs: 142090,
  },
  {
    id: "org-03",
    name: "Surabaya Health Analytics",
    slug: "surabaya-health",
    plan: "Zenith Enterprise",
    membersCount: 42,
    status: "active",
    infraMode: "dedicated",
    monthlyVolumeReqs: 1820490,
  },
  {
    id: "org-04",
    name: "Jakarta Indie Devs",
    slug: "jakarta-indie",
    plan: "Developer Starter",
    membersCount: 2,
    status: "active",
    infraMode: "shared",
    monthlyVolumeReqs: 1420,
  },
];

interface LedgerEntry {
  id: string;
  timestamp: string;
  orgName: string;
  category: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  status: string;
}

const MOCK_LEDGER: LedgerEntry[] = [
  {
    id: "LEDGER-904",
    timestamp: "2026-10-10 12:30:15",
    orgName: "Nusantara Fintech Labs",
    category: "subscription_fee (Apex)",
    type: "credit",
    amount: 2500000,
    balanceAfter: 2500000,
    status: "settled",
  },
  {
    id: "LEDGER-903",
    timestamp: "2026-10-10 11:14:02",
    orgName: "Bandung Generative Studio",
    category: "subscription_fee (Pro)",
    type: "credit",
    amount: 750000,
    balanceAfter: 750000,
    status: "settled",
  },
  {
    id: "LEDGER-902",
    timestamp: "2026-10-09 18:42:19",
    orgName: "Surabaya Health Analytics",
    category: "subscription_fee (Zenith)",
    type: "credit",
    amount: 10000000,
    balanceAfter: 10000000,
    status: "settled",
  },
];

export function NexusTab() {
  const [filterPlan, setFilterPlan] = useState<string>("all");

  const filteredOrgs = MOCK_ORGS.filter((org) => {
    if (filterPlan === "all") return true;
    if (filterPlan === "dedicated") return org.infraMode === "dedicated";
    if (filterPlan === "shared") return org.infraMode === "shared";
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Nexus Master SaaS Control Plane
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manajemen terpusat seluruh organisasi pelanggan, transaksi gateway, rekonsiliasi keuangan, dan node dedicated.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PLATFORM OWNER ACCESS
          </span>
        </div>
      </div>

      {/* Executive Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-between">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">Rp 23.250.000</div>
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            <span>+18.4% bulan ini</span>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-between">
            <span>Total Organisasi Aktif</span>
            <Layers className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">14 Tenants</div>
          <div className="text-[11px] font-mono text-zinc-400">92 pengguna terdaftar</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-between">
            <span>24h Gateway Requests</span>
            <Activity className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">128.940</div>
          <div className="text-[11px] font-mono text-zinc-400">Avg TTFT: 142ms</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 space-y-1">
          <div className="text-[10px] font-mono uppercase text-zinc-500 flex items-center justify-between">
            <span>Dedicated Clusters</span>
            <Server className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100">2 Active Nodes</div>
          <div className="text-[11px] font-mono text-purple-300">100% Probes Healthy</div>
        </div>
      </div>

      {/* Tenant Directory */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Daftar Organisasi Pelanggan (Tenants)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">Filter:</span>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded bg-black/40 border border-white/10 px-2 py-1 text-zinc-300 cursor-pointer text-xs"
            >
              <option value="all">Semua Organisasi</option>
              <option value="dedicated">Hanya Dedicated Node</option>
              <option value="shared">Hanya Shared Edge</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Organisasi</th>
                <th className="py-2.5 px-4 font-semibold">Paket</th>
                <th className="py-2.5 px-4 font-semibold">Mode Infra</th>
                <th className="py-2.5 px-4 font-semibold">Anggota</th>
                <th className="py-2.5 px-4 font-semibold">Volume Req (Bln)</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {filteredOrgs.map((org) => (
                <tr key={org.id} className="hover:bg-white/[0.01]">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-200">{org.name}</div>
                    <div className="text-[10px] text-zinc-500">{org.slug}</div>
                  </td>
                  <td className="py-3 px-4 text-orange-400">{org.plan}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                        org.infraMode === "dedicated"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-white/5 text-zinc-400 border border-white/10"
                      }`}
                    >
                      {org.infraMode === "dedicated" ? "Dedicated Node" : "Shared Edge"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{org.membersCount} users</td>
                  <td className="py-3 px-4 text-zinc-200">{org.monthlyVolumeReqs.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                      {org.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Ledger & Audit Trail */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Buku Besar Keuangan (Double-Entry Ledger)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">Append-Only Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Ledger ID</th>
                <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                <th className="py-2.5 px-4 font-semibold">Tenant</th>
                <th className="py-2.5 px-4 font-semibold">Kategori</th>
                <th className="py-2.5 px-4 font-semibold">Tipe</th>
                <th className="py-2.5 px-4 font-semibold">Jumlah (IDR)</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {MOCK_LEDGER.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.01]">
                  <td className="py-3 px-4 font-semibold text-zinc-400">{entry.id}</td>
                  <td className="py-3 px-4 text-zinc-500">{entry.timestamp}</td>
                  <td className="py-3 px-4 text-zinc-200">{entry.orgName}</td>
                  <td className="py-3 px-4 text-zinc-400">{entry.category}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-semibold">
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-400">
                    +Rp {entry.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold">
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
