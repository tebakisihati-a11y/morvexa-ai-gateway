"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  QrCode,
  Building,
  ArrowRight,
  Loader2,
  Mail,
  ShieldAlert,
  Coins,
  Sparkles,
} from "lucide-react";
import type { ModelProduct } from "@/lib/customer/catalog";

interface ModelCheckoutModalProps {
  product: ModelProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  defaultEmail?: string;
  defaultName?: string;
}

export function CustomerModelCheckoutModal({
  product,
  isOpen,
  onClose,
  onSuccess,
  defaultEmail = "",
  defaultName = "",
}: ModelCheckoutModalProps) {
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [customerName, setCustomerName] = useState(defaultName);
  const [paymentMethod, setPaymentMethod] = useState<"qris" | "bca_va" | "mandiri_va">("qris");
  const [loading, setLoading] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [step, setStep] = useState<"details" | "pay">("details");

  if (!isOpen || !product) return null;

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !customerEmail.includes("@")) {
      alert("Harap masukkan email pribadi (Gmail/Yahoo) untuk pengiriman API Key & Token.");
      return;
    }
    setStep("pay");
  };

  const handleSimulatePaymentSettlement = async () => {
    setIsSettling(true);
    try {
      const res = await fetch("/api/customer/purchase-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerEmail: customerEmail.trim(),
          customerName: customerName.trim() || undefined,
          modelId: product.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pembayaran");
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      alert(err.message || "Gagal menyelesaikan pembayaran.");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-lg bg-[#0e0e11] border border-[#f97316]/30 p-6 sm:p-8 relative text-[#f4f4f5]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[#f97316]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#f4f4f5]">Beli Token Model AI</h3>
            <p className="text-xs text-[#a1a1aa] font-mono">
              Produk: <span className="text-[#f97316] font-semibold">{product.name}</span>
            </p>
          </div>
        </div>

        {step === "details" ? (
          <form onSubmit={handleProceedToPayment} method="post" className="space-y-4">
            <div className="p-4 rounded-lg bg-[#08080a] border border-[#f4f4f5]/10 space-y-2 font-mono">
              <div className="flex justify-between text-xs">
                <span className="text-[#a1a1aa]">Harga Paket:</span>
                <span className="font-bold text-base text-[#f97316]">
                  Rp {product.bundlePriceIdr.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a1a1aa]">Alokasi Token:</span>
                <span className="text-[#f4f4f5] font-bold">
                  {product.bundleTokensGranted.toLocaleString("id-ID")} Tokens
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#a1a1aa]">Provider:</span>
                <span className="text-[#f4f4f5] uppercase">{product.provider}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                Nama Pemesan / Perusahaan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe / PT Acme"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] font-mono text-xs focus:border-[#f97316] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
                Email Pribadi (Kunci API & Notif akan dikirim ke sini)
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="nama@gmail.com atau @yahoo.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] font-mono text-xs focus:border-[#f97316] focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-[#f97316] text-[#08080a] font-mono font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Lanjut ke Metode Pembayaran</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 font-mono">
            <div className="p-4 rounded-lg bg-[#08080a] border border-[#f4f4f5]/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#a1a1aa]">Total Tagihan:</span>
                <span className="font-bold text-base text-[#f97316]">
                  Rp {product.bundlePriceIdr.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1a1aa]">Email Penerima:</span>
                <span className="text-[#f4f4f5]">{customerEmail}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-[#a1a1aa] uppercase">Pilih Metode Pembayaran:</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "qris", label: "QRIS Instan", icon: QrCode },
                  { id: "bca_va", label: "BCA VA", icon: Building },
                  { id: "mandiri_va", label: "Mandiri VA", icon: Building },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 text-xs transition-all cursor-pointer ${
 paymentMethod === item.id
 ? "border-[#f97316] bg-[#f97316]/10 text-[#f4f4f5]"
 : "border-[#f4f4f5]/10 bg-white/[0.02] text-[#a1a1aa] hover:border-white/20"
 }`}
                    >
                      <Icon className="h-4 w-4 text-[#f97316]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QRIS / VA Simulation Box */}
            <div className="p-4 rounded-lg bg-[#08080a] border border-[#f97316]/30 flex flex-col items-center justify-center gap-2 text-center">
              <div className="h-28 w-28 rounded-lg bg-white p-2 flex items-center justify-center">
                <QrCode className="h-full w-full text-black" />
              </div>
              <div className="text-[11px] text-[#a1a1aa]">
                Pindai QRIS dengan GoPay, OVO, Dana, BCA, atau Livin'
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="w-1/3 py-2.5 rounded-lg border border-[#f4f4f5]/10 text-[#a1a1aa] text-xs hover:bg-white/5 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isSettling}
                onClick={handleSimulatePaymentSettlement}
                className="w-2/3 py-2.5 rounded-lg bg-[#f97316] text-[#08080a] font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSettling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memverifikasi Webhook...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Simulasikan Pembayaran Berhasil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
