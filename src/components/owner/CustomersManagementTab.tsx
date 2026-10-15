"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Activity,
  CreditCard,
  ShoppingBag,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Coins,
  KeyRound,
  Filter,
} from "lucide-react";
import type { CustomerUser, CustomerOrder, CustomerActivityLog } from "@/lib/customer/store";

export function CustomersManagementTab() {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activities, setActivities] = useState<CustomerActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"database" | "orders" | "activities">("database");
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/dashboard-data");
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
      if (data.orders) setOrders(data.orders);
      if (data.activities) setActivities(data.activities);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // Polling real-time setiap 10 detik
    return () => clearInterval(interval);
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.currentPlan.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = orders
    .filter((o) => o.status === "settled")
    .reduce((acc, curr) => acc + curr.amountIdr, 0);

  const latestSettledOrder = orders.find((o) => o.status === "settled");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Real-time Header & Live Notification Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-[#f97316]/30 bg-surface from-[#0e0e11] via-[#0e0e11] to-[#08080a]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-[#f4f4f5]">
              Database Kustomer & Monitoring Aktivitas Real-Time
            </h1>
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#f97316] border border-[#f97316]/30 bg-[#f97316]/10 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
              <span>SYNCED TO OWNER</span>
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl font-mono">
            Memantau pendaftaran kustomer (Gmail / Yahoo), riwayat pembelian paket/token DeepSeek, dan notifikasi pembayaran live ke akun Owner.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#f4f4f5] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* 2. Live Notification Banner for Owner on Recent Purchases */}
      {latestSettledOrder && (
        <div className="p-4 rounded-lg bg-[#0e0e11] border border-[#f97316]/40 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[#f97316] shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold text-[#f97316] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>NOTIFIKASI TRANSAKSI KUSTOMER BARU SETTLED</span>
              </div>
              <p className="text-xs text-[#f4f4f5] font-mono mt-0.5">
                <strong>{latestSettledOrder.customerName}</strong> ({latestSettledOrder.customerEmail}) membeli{" "}
                <span className="text-[#f97316] font-semibold">{latestSettledOrder.productName}</span> seharga{" "}
                <strong>Rp {latestSettledOrder.amountIdr.toLocaleString("id-ID")}</strong> via {latestSettledOrder.paymentMethod.toUpperCase()}.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#a1a1aa] shrink-0">
            {new Date(latestSettledOrder.createdAt).toLocaleTimeString("id-ID")} WIB
          </div>
        </div>
      )}

      {/* 3. Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
            <span>Total Kustomer Terdaftar</span>
            <Users className="h-4 w-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f4f4f5]">{customers.length}</div>
          <div className="text-[11px] font-mono text-[#a1a1aa]">Akun terverifikasi Gmail & Yahoo</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
            <span>Total Pembayaran Kustomer</span>
            <CreditCard className="h-4 w-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f97316]">
            Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] font-mono text-[#a1a1aa]">Dari {orders.length} order transaksi</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
            <span>Order Produk DeepSeek & AI</span>
            <Coins className="h-4 w-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f4f4f5]">
            {orders.filter((o) => o.orderType === "model_token_purchase").length}
          </div>
          <div className="text-[11px] font-mono text-[#a1a1aa]">Paket Token Model AI Berbayar</div>
        </div>

        <div className="p-4 rounded-lg bg-[#0e0e11] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#a1a1aa]">
            <span>Log Aktivitas Tercatat</span>
            <Activity className="h-4 w-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#f4f4f5]">{activities.length}</div>
          <div className="text-[11px] font-mono text-[#a1a1aa]">Audit trail autentikasi & inference</div>
        </div>
      </div>

      {/* 4. Sub-Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab("database")}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
 activeSubTab === "database"
 ? "bg-[#f97316] text-[#08080a] font-bold shadow-md shadow-[#f97316]/20"
 : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5"
 }`}
        >
          <Users className="h-4 w-4" />
          <span>Daftar Akun Kustomer ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("orders")}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
 activeSubTab === "orders"
 ? "bg-[#f97316] text-[#08080a] font-bold shadow-md shadow-[#f97316]/20"
 : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5"
 }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Transaksi & Pembelian Paket/Token ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("activities")}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
 activeSubTab === "activities"
 ? "bg-[#f97316] text-[#08080a] font-bold shadow-md shadow-[#f97316]/20"
 : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5"
 }`}
        >
          <Activity className="h-4 w-4" />
          <span>Log Aktivitas Real-Time ({activities.length})</span>
        </button>
      </div>

      {/* 5A. SUBTAB 1: DAFTAR KUSTOMER DATABASE */}
      {activeSubTab === "database" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#a1a1aa]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kustomer berdasarkan nama, email, atau paket..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0e0e11] border border-white/10 text-xs font-mono text-[#f4f4f5] focus:border-[#f97316] focus:outline-none"
              />
            </div>
            <div className="text-xs font-mono text-[#a1a1aa]">
              Menampilkan {filteredCustomers.length} dari {customers.length} pengguna
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#08080a] text-[#a1a1aa] border-b border-white/10 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kustomer</th>
                    <th className="p-4">Provider Email</th>
                    <th className="p-4">Paket / Layanan Aktif</th>
                    <th className="p-4">Sisa Token</th>
                    <th className="p-4">Total Belanja</th>
                    <th className="p-4">Waktu Terdaftar</th>
                    <th className="p-4">Aktivitas Terakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#f97316]/15 border border-[#f97316]/30 flex items-center justify-center font-bold text-[#f97316]">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#f4f4f5]">{cust.name}</div>
                            <div className="text-[11px] text-[#a1a1aa]">{cust.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
 cust.provider === "gmail"
 ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
 : cust.provider === "yahoo"
 ? "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30"
 : "bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30"
 }`}
                        >
                          {cust.provider.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-[#f97316] font-semibold">{cust.currentPlan}</span>
                      </td>
                      <td className="p-4 text-[#f4f4f5]">
                        {cust.tokenBalance.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 font-bold text-[#10b981]">
                        Rp {cust.totalSpentIdr.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-[#a1a1aa]">
                        {new Date(cust.registeredAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="p-4 text-[#a1a1aa]">
                        {new Date(cust.lastLoginAt).toLocaleTimeString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5B. SUBTAB 2: TRANSAKSI & PEMBELIAN PAKET/TOKEN */}
      {activeSubTab === "orders" && (
        <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#08080a] text-[#a1a1aa] border-b border-white/10 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Nama & Email Kustomer</th>
                  <th className="p-4">Jenis Transaksi</th>
                  <th className="p-4">Produk Dibeli</th>
                  <th className="p-4">Nominal</th>
                  <th className="p-4">Metode Bayar</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Waktu Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-[#f97316]">{ord.id}</td>
                    <td className="p-4">
                      <div className="text-[#f4f4f5] font-bold">{ord.customerName}</div>
                      <div className="text-[11px] text-[#a1a1aa]">{ord.customerEmail}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">
                        {ord.orderType === "plan_subscription" ? "LANGGANAN PAKET" : "TOKEN MODEL AI"}
                      </span>
                    </td>
                    <td className="p-4 text-[#f4f4f5] font-semibold">{ord.productName}</td>
                    <td className="p-4 font-bold text-[#10b981]">
                      Rp {ord.amountIdr.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 uppercase text-[#a1a1aa]">{ord.paymentMethod}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1 w-fit font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>SETTLED</span>
                      </span>
                    </td>
                    <td className="p-4 text-[#a1a1aa]">
                      {new Date(ord.createdAt).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5C. SUBTAB 3: LOG AKTIVITAS REAL-TIME */}
      {activeSubTab === "activities" && (
        <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 divide-y divide-white/5 space-y-3 font-mono">
          {activities.map((act) => (
            <div key={act.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[#f97316] shrink-0 mt-0.5">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-[#f97316]">
                      {act.activityType}
                    </span>
                    <span className="text-xs text-[#f4f4f5] font-bold">{act.customerEmail}</span>
                  </div>
                  <p className="text-xs text-[#f4f4f5] mt-1">{act.description}</p>
                </div>
              </div>
              <div className="text-[11px] text-[#a1a1aa] shrink-0">
                {new Date(act.timestamp).toLocaleTimeString("id-ID")} WIB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
