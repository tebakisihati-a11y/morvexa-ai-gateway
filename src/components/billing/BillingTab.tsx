"use client";

import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Download,
  Sparkles,
  Server,
  Zap,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Building,
} from "lucide-react";
import { calculateMidtransSignature } from "@/lib/billing/midtrans";

interface PlanItem {
  code: "developer" | "pro" | "apex" | "zenith";
  name: string;
  tagline: string;
  priceMonthly: number;
  formattedPrice: string;
  features: string[];
  dedicatedEligible: boolean;
  rateLimitRpm: number;
  maxProjects: number;
}

const CATALOG_PLANS: PlanItem[] = [
  {
    code: "developer",
    name: "Developer Starter",
    tagline: "Free tier for indie hackers and local prototyping",
    priceMonthly: 0,
    formattedPrice: "Rp 0 / bln",
    features: [
      "50 requests per 5-hour rolling slot",
      "50,000 daily frontier tokens",
      "Shared Edge proxy routing",
      "1 Project workspace",
      "Community support",
    ],
    dedicatedEligible: false,
    rateLimitRpm: 30,
    maxProjects: 1,
  },
  {
    code: "pro",
    name: "Pro Workspace",
    tagline: "High-performance production for growing startups",
    priceMonthly: 750000,
    formattedPrice: "Rp 750.000 / bln",
    features: [
      "250 requests per 5-hour rolling slot",
      "300,000 daily frontier tokens",
      "Auto-failover mesh (Anthropic / DeepSeek)",
      "5 Project workspaces & 10 team members",
      "Priority Discord & Email support",
    ],
    dedicatedEligible: false,
    rateLimitRpm: 120,
    maxProjects: 5,
  },
  {
    code: "apex",
    name: "Apex Scale",
    tagline: "Dedicated throughput & prompt caching for high-load platforms",
    priceMonthly: 2500000,
    formattedPrice: "Rp 2.500.000 / bln",
    features: [
      "1,000 requests per 5-hour rolling slot",
      "1,500,000 daily frontier tokens",
      "Eligible for Dedicated Isolated Infrastructure",
      "20 Project workspaces & 50 team members",
      "Custom model endpoints & 99.9% uptime SLA",
    ],
    dedicatedEligible: true,
    rateLimitRpm: 300,
    maxProjects: 20,
  },
  {
    code: "zenith",
    name: "Zenith Enterprise",
    tagline: "Custom multi-region hybrid nodes & sovereign data isolation",
    priceMonthly: 10000000,
    formattedPrice: "Rp 10.000.000 / bln",
    features: [
      "Custom unlimited request quotas",
      "Dedicated GPU clusters (private models)",
      "Dedicated VPC peering & isolated egress IP",
      "Unlimited projects & members",
      "24/7 dedicated solutions engineer",
    ],
    dedicatedEligible: true,
    rateLimitRpm: 1000,
    maxProjects: 100,
  },
];

interface TransactionRecord {
  orderId: string;
  date: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  status: "settled" | "pending" | "failed" | "expired";
  invoiceNumber: string;
}

export function BillingTab() {
  const [activePlan, setActivePlan] = useState<"developer" | "pro" | "apex" | "zenith">("pro");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanItem | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<{
    orderId: string;
    snapToken: string;
    amount: number;
  } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"qris" | "bca_va" | "mandiri_va" | "gopay">("qris");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([
    {
      orderId: "MVX-202610-0984",
      date: "2026-10-08 14:22:10",
      planName: "Pro Workspace",
      amount: 750000,
      paymentMethod: "QRIS (GoPay/ShopeePay)",
      status: "settled",
      invoiceNumber: "INV-20261008-0984",
    },
    {
      orderId: "MVX-202609-0412",
      date: "2026-09-08 10:15:34",
      planName: "Pro Workspace",
      amount: 750000,
      paymentMethod: "BCA Virtual Account",
      status: "settled",
      invoiceNumber: "INV-20260908-0412",
    },
  ]);

  const handleOpenCheckout = (plan: PlanItem) => {
    setSelectedPlanForCheckout(plan);
    setPaymentSuccessMessage(null);
    setCheckoutSession(null);
    setIsCheckoutOpen(true);
  };

  const handleStartCheckout = async () => {
    if (!selectedPlanForCheckout) return;
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "org_default",
          planCode: selectedPlanForCheckout.code,
          amount: selectedPlanForCheckout.priceMonthly,
          customerName: "Morvexa Developer",
          customerEmail: "developer@morvexa.ai",
        }),
      });

      const data = await res.json();
      setCheckoutSession(data);
    } catch {
      alert("Failed to initiate checkout session");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSimulatePaymentSettlement = async () => {
    if (!checkoutSession || !selectedPlanForCheckout) return;
    setIsProcessingPayment(true);

    try {
      const grossAmount = `${checkoutSession.amount}.00`;
      const statusCode = "200";
      // Signature calculation matching server-side verifier
      const signature = calculateMidtransSignature(
        checkoutSession.orderId,
        statusCode,
        grossAmount,
        "dummy_sandbox_key"
      );

      const webhookRes = await fetch("/api/billing/webhooks/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: checkoutSession.orderId,
          status_code: statusCode,
          gross_amount: grossAmount,
          signature_key: signature,
          transaction_status: "settlement",
          transaction_id: `sb-tx-${Date.now()}`,
          payment_type: selectedPaymentMethod,
          custom_field1: "org_default",
          custom_field2: selectedPlanForCheckout.code,
        }),
      });

      const result = await webhookRes.json();

      if (result.success) {
        setActivePlan(selectedPlanForCheckout.code);
        setPaymentSuccessMessage(`Payment settled! Plan upgraded to ${selectedPlanForCheckout.name}.`);

        // Append to transactions history
        setTransactions((prev) => [
          {
            orderId: checkoutSession.orderId,
            date: new Date().toISOString().replace("T", " ").slice(0, 19),
            planName: selectedPlanForCheckout.name,
            amount: checkoutSession.amount,
            paymentMethod: selectedPaymentMethod.toUpperCase(),
            status: "settled",
            invoiceNumber: result.invoiceId || `INV-${Date.now().toString().slice(-8)}`,
          },
          ...prev,
        ]);
      } else {
        alert(`Payment error: ${result.error || result.message}`);
      }
    } catch {
      alert("Error sending simulated webhook confirmation");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Subscriptions & Billing Control</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your workspace subscription tier, Indonesian payment gateway (QRIS/VA), and billing invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            MIDTRANS SANDBOX ACTIVE
          </span>
        </div>
      </div>

      {/* Active Subscription Banner */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-zinc-100">
                {CATALOG_PLANS.find((p) => p.code === activePlan)?.name}
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                STATUS: ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Billing renewal: <strong>30 hari berikutnya</strong> via Midtrans Sandbox. Transaksi dicatat secara double-entry pada buku besar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300">
          <div className="text-right">
            <div className="text-zinc-500 text-[10px] uppercase">Harga Aktif</div>
            <div className="font-semibold text-zinc-200">
              {CATALOG_PLANS.find((p) => p.code === activePlan)?.formattedPrice}
            </div>
          </div>
        </div>
      </div>

      {/* Plans Catalog Grid */}
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3 font-semibold">
          Katalog Paket Langganan Tersedia
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATALOG_PLANS.map((plan) => {
            const isCurrent = plan.code === activePlan;
            return (
              <div
                key={plan.code}
                className={`rounded-lg border p-4 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-orange-500/40 bg-orange-950/[0.08] shadow-lg shadow-orange-950/20 ring-1 ring-orange-500/20"
                    : "border-white/10 bg-[#0e0e11] hover:border-white/20"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{plan.tagline}</p>
                  <div className="pt-1">
                    <div className="text-base font-semibold font-mono text-zinc-100">{plan.formattedPrice}</div>
                    <div className="text-[10px] font-mono text-zinc-500">Rate limit: {plan.rateLimitRpm} RPM</div>
                  </div>

                  <hr className="border-white/5 my-2" />

                  <ul className="space-y-1.5 text-[11px] text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span className="leading-tight text-zinc-400">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-3 border-t border-white/5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-1.5 rounded bg-white/5 text-zinc-500 text-xs font-mono cursor-not-allowed"
                    >
                      Paket Aktif
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCheckout(plan)}
                      className="w-full py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Pilih {plan.name}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction & Invoices Table */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200">
              Riwayat Pembayaran & Faktur (Invoices)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {transactions.length} transaksi tercatat
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-400 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4 font-semibold">No. Faktur</th>
                <th className="py-2.5 px-4 font-semibold">Order ID</th>
                <th className="py-2.5 px-4 font-semibold">Paket</th>
                <th className="py-2.5 px-4 font-semibold">Metode</th>
                <th className="py-2.5 px-4 font-semibold">Total (IDR)</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {transactions.map((tx) => (
                <tr key={tx.orderId} className="hover:bg-white/[0.01]">
                  <td className="py-3 px-4 font-medium text-orange-400">{tx.invoiceNumber}</td>
                  <td className="py-3 px-4 text-zinc-400">{tx.orderId}</td>
                  <td className="py-3 px-4 text-zinc-200">{tx.planName}</td>
                  <td className="py-3 px-4 text-zinc-400">{tx.paymentMethod}</td>
                  <td className="py-3 px-4 font-semibold text-zinc-100">
                    Rp {tx.amount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => alert(`Mengunduh faktur PDF untuk ${tx.invoiceNumber}`)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Faktur</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Midtrans Snap Simulation Modal */}
      {isCheckoutOpen && selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#0e0e11] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-400" />
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-100">
                  Midtrans Sandbox Checkout
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {paymentSuccessMessage ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                  <div className="font-semibold text-emerald-300 text-xs">{paymentSuccessMessage}</div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Tanda tangan webhook SHA-512 terverifikasi. Transaksi disimpan di ledger.
                  </p>
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="mt-3 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono cursor-pointer"
                  >
                    Tutup Dialog
                  </button>
                </div>
              ) : !checkoutSession ? (
                <div className="space-y-4">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded space-y-1">
                    <div className="text-xs text-zinc-400">Ringkasan Pesanan:</div>
                    <div className="text-sm font-semibold text-zinc-100">{selectedPlanForCheckout.name}</div>
                    <div className="text-xs font-mono text-orange-400">
                      Total: {selectedPlanForCheckout.formattedPrice}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sistem akan membuat checkout session di server dan memproses simulasi pembayaran Midtrans Sandbox (Snap).
                  </p>

                  <button
                    onClick={handleStartCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? "Membuat Checkout..." : "Lanjutkan ke Pembayaran Sandbox"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-900 border border-white/10 rounded font-mono text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Order ID:</span>
                      <span className="text-zinc-200">{checkoutSession.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Gross Amount:</span>
                      <span className="text-emerald-400">Rp {checkoutSession.amount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-zinc-400 block mb-2">
                      Pilih Metode Pembayaran Sandbox:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        { id: "qris", label: "QRIS (GoPay/Shopee)", icon: QrCode },
                        { id: "bca_va", label: "BCA Virtual Account", icon: Building },
                        { id: "mandiri_va", label: "Mandiri VA", icon: Building },
                        { id: "gopay", label: "GoPay E-Wallet", icon: CreditCard },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSel = selectedPaymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedPaymentMethod(m.id as any)}
                            className={`p-2.5 rounded border text-left flex items-center gap-2 cursor-pointer transition-colors ${
                              isSel
                                ? "border-orange-500/50 bg-orange-500/10 text-orange-300 font-semibold"
                                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-300 font-mono">
                    ℹ️ Mengklik "Simulasikan Pembayaran Berhasil" akan mengirimkan notifikasi HTTP POST webhook nyata ke <code>/api/billing/webhooks/midtrans</code> dengan tanda tangan SHA-512 resmi.
                  </div>

                  <button
                    onClick={handleSimulatePaymentSettlement}
                    disabled={isProcessingPayment}
                    className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessingPayment ? "Memverifikasi Webhook SHA-512..." : "Simulasikan Pembayaran Berhasil (Settlement)"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
