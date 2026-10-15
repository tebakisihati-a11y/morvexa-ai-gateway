"use client";

import React, { useState } from "react";
import { X, CheckCircle2, QrCode, Building, ArrowRight, Loader2, Mail, ShieldAlert } from "lucide-react";
import { resolvePlanSpec, PLAN_PRICES_IDR } from "@/lib/billing/catalog";

interface CheckoutModalProps {
  planCode: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSettled: (result: any) => void;
}

export function CustomerCheckoutModal({
  planCode,
  isOpen,
  onClose,
  onPaymentSettled,
}: CheckoutModalProps) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bca_va" | "mandiri_va">("qris");
  const [isSettling, setIsSettling] = useState(false);

  if (!isOpen) return null;

  const spec = resolvePlanSpec(planCode);
  const amount = PLAN_PRICES_IDR[planCode.toLowerCase()] ?? PLAN_PRICES_IDR.pro;

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerName) {
      alert("Harap masukkan Nama dan Email Anda untuk pengiriman API Key.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: `org_cust_${Date.now().toString().slice(-6)}`,
          planCode,
          amount,
          customerName,
          customerEmail,
        }),
      });

      const session = await res.json();
      setCheckoutSession(session);
    } catch {
      alert("Gagal membuat sesi pembayaran.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePaymentSettlement = async () => {
    if (!checkoutSession) return;
    setIsSettling(true);

    try {
      // Settlement is signed server-side. The browser only names the order and
      // the payment method it displayed.
      const webhookRes = await fetch("/api/billing/sandbox/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: checkoutSession.orderId,
          paymentMethod,
          customerName,
          customerEmail,
        }),
      });

      const webhookResult = await webhookRes.json();

      if (webhookResult.success) {
        onPaymentSettled(webhookResult);
        onClose();
      } else {
        alert(`Error: ${webhookResult.message || webhookResult.error}`);
      }
    } catch {
      alert("Gagal memproses konfirmasi pembayaran.");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-lg bg-[#0e0e11] border border-[#f4f4f5]/15 p-6 sm:p-8 shadow-2xl relative text-[#f4f4f5]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-white/10 text-[#a1a1aa] hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {!checkoutSession ? (
          <form onSubmit={handleCreateCheckout} method="post" className="space-y-6">
            <div>
              <div className="text-[10px] font-mono text-[#f97316] uppercase tracking-wider">
                CHECKOUT LANGGANAN
              </div>
              <h3 className="text-xl font-bold mt-1">{spec.name}</h3>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Total Biaya: <strong className="text-[#f97316]">Rp {amount.toLocaleString()}</strong>
              </p>
            </div>

            <div className="p-4 rounded-lg bg-[#08080a] border border-[#f4f4f5]/10 text-xs font-mono space-y-2">
              <div className="text-[#a1a1aa]">Akses Model yang Diberikan:</div>
              <div className="flex flex-wrap gap-1.5">
                {spec.models.map((m, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-[#f97316]/10 text-[#f97316] text-[10px] border border-[#f97316]/20"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#a1a1aa] mb-1.5">Nama Lengkap Kustomer</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] focus:border-[#f97316] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1.5">
                  Email Kustomer (Tujuan Pengiriman API Key)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#a1a1aa]" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. john@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] focus:border-[#f97316] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#a1a1aa] mt-1">
                  *Sistem akan otomatis menerbitkan kunci dan mengirimkan struk ke alamat email ini.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#f97316] text-[#08080a] font-mono font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Membuat Sesi Midtrans...</span>
                </>
              ) : (
                <>
                  <span>Lanjutkan ke Pembayaran (Rp {amount.toLocaleString()})</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] font-mono text-[#f97316] uppercase tracking-wider">
                MIDTRANS SNAP GATEWAY SIMULATION
              </div>
              <h3 className="text-xl font-bold mt-1">Selesaikan Pembayaran</h3>
              <p className="text-xs text-[#a1a1aa] mt-1">
                Order ID: <span className="font-mono text-[#f4f4f5]">{checkoutSession.orderId}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-[#a1a1aa]">Pilih Metode Pembayaran:</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {[
                  { id: "qris", label: "QRIS", icon: QrCode },
                  { id: "bca_va", label: "BCA VA", icon: Building },
                  { id: "mandiri_va", label: "Mandiri", icon: Building },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
 paymentMethod === m.id
 ? "border-[#f97316] bg-[#f97316]/10 text-[#f97316]"
 : "border-[#f4f4f5]/10 bg-[#08080a] text-[#a1a1aa]"
 }`}
                  >
                    <m.icon className="h-4 w-4" />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#08080a] border border-[#f97316]/20 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#a1a1aa]">
                <span>Penerima API Key:</span>
                <span className="text-[#f4f4f5] font-bold">{customerEmail}</span>
              </div>
              <div className="flex justify-between text-[#a1a1aa]">
                <span>Status Saat Ini:</span>
                <span className="text-[#eab308]">PENDING SETTLEMENT</span>
              </div>
            </div>

            <button
              onClick={handleSimulatePaymentSettlement}
              disabled={isSettling}
              className="w-full py-3.5 rounded-lg bg-[#f97316] text-[#08080a] font-mono font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memvalidasi Signature & Menerbitkan Kunci...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Konfirmasi Pembayaran Berhasil (Simulasi Midtrans)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
