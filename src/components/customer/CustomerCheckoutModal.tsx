"use client";

import React, { useState } from "react";
import { X, CheckCircle2, QrCode, Building, ArrowRight, Loader2, Mail, ShieldAlert } from "lucide-react";
import { PLAN_SPECS } from "@/lib/billing/provisioning";
import { calculateMidtransSignature } from "@/lib/billing/midtrans";

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

  const spec = PLAN_SPECS[planCode.toLowerCase()] || PLAN_SPECS.pro;
  const priceCatalog: Record<string, number> = {
    developer: 0,
    pro: 750000,
    apex: 2500000,
    zenith: 10000000,
  };
  const amount = priceCatalog[planCode.toLowerCase()] ?? 750000;

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
      const grossAmount = `${checkoutSession.amount}.00`;
      const statusCode = "200";
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
          transaction_id: `midtrans-tx-${Date.now()}`,
          payment_type: paymentMethod,
          customer_name: customerName,
          customer_email: customerEmail,
          custom_field1: checkoutSession.orgId || "org_customer",
          custom_field2: planCode,
          custom_field3: customerEmail,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-[#0a0f0d] border border-[#F0FEF8]/15 p-6 sm:p-8 shadow-2xl relative text-[#F0FEF8]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-white/10 text-[#889e93] hover:text-white cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {!checkoutSession ? (
          <form onSubmit={handleCreateCheckout} className="space-y-6">
            <div>
              <div className="text-[10px] font-mono text-[#1CE172] uppercase tracking-wider">
                CHECKOUT LANGGANAN
              </div>
              <h3 className="text-xl font-bold mt-1">{spec.name}</h3>
              <p className="text-xs text-[#889e93] mt-1">
                Total Biaya: <strong className="text-[#1CE172]">Rp {amount.toLocaleString()}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#010302] border border-[#F0FEF8]/10 text-xs font-mono space-y-2">
              <div className="text-[#889e93]">Akses Model yang Diberikan:</div>
              <div className="flex flex-wrap gap-1.5">
                {spec.models.map((m, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-[#1CE172]/10 text-[#1CE172] text-[10px] border border-[#1CE172]/20"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#889e93] mb-1.5">Nama Lengkap Kustomer</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#010302] border border-[#F0FEF8]/15 text-[#F0FEF8] focus:border-[#1CE172] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#889e93] mb-1.5">
                  Email Kustomer (Tujuan Pengiriman API Key)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-[#889e93]" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. john@company.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#010302] border border-[#F0FEF8]/15 text-[#F0FEF8] focus:border-[#1CE172] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#889e93] mt-1">
                  *Sistem akan otomatis menerbitkan kunci dan mengirimkan struk ke alamat email ini.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#1CE172] text-[#010302] font-mono font-bold text-xs hover:bg-[#1CE172]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
              <div className="text-[10px] font-mono text-[#1CE172] uppercase tracking-wider">
                MIDTRANS SNAP GATEWAY SIMULATION
              </div>
              <h3 className="text-xl font-bold mt-1">Selesaikan Pembayaran</h3>
              <p className="text-xs text-[#889e93] mt-1">
                Order ID: <span className="font-mono text-[#F0FEF8]">{checkoutSession.orderId}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-[#889e93]">Pilih Metode Pembayaran:</label>
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
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                      paymentMethod === m.id
                        ? "border-[#1CE172] bg-[#1CE172]/10 text-[#1CE172]"
                        : "border-[#F0FEF8]/10 bg-[#010302] text-[#889e93]"
                    }`}
                  >
                    <m.icon className="h-4 w-4" />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#010302] border border-[#1CE172]/20 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#889e93]">
                <span>Penerima API Key:</span>
                <span className="text-[#F0FEF8] font-bold">{customerEmail}</span>
              </div>
              <div className="flex justify-between text-[#889e93]">
                <span>Status Saat Ini:</span>
                <span className="text-yellow-400">PENDING SETTLEMENT</span>
              </div>
            </div>

            <button
              onClick={handleSimulatePaymentSettlement}
              disabled={isSettling}
              className="w-full py-3.5 rounded-xl bg-[#1CE172] text-[#010302] font-mono font-bold text-xs hover:bg-[#1CE172]/90 shadow-[0_0_20px_rgba(28,225,114,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
