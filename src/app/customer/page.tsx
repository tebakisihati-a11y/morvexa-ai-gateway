"use client";

import React, { useState } from "react";
import { CustomerBentoPortal } from "@/components/customer/CustomerBentoPortal";
import { CustomerCheckoutModal } from "@/components/customer/CustomerCheckoutModal";
import { CheckCircle2, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CustomerPortalPage() {
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<string | null>(null);
  const [dispatchedNotification, setDispatchedNotification] = useState<{
    email: string;
    keySecret: string;
    planName: string;
  } | null>(null);

  const handlePaymentSettled = (res: any) => {
    if (res.autoProvision) {
      setDispatchedNotification({
        email: res.autoProvision.emailSentTo,
        keySecret: res.autoProvision.rawSecret,
        planName: res.autoProvision.apiKey.name,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#010302] text-[#F0FEF8] flex flex-col font-sans selection:bg-[#1CE172]/20 selection:text-[#1CE172]">
      {/* Customer Header */}
      <header className="border-b border-[#F0FEF8]/10 bg-[#0a0f0d]/95 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono text-[#889e93] hover:text-[#1CE172] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="text-[#889e93] font-mono">/</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1CE172] animate-pulse" />
            <span className="font-semibold text-sm text-[#F0FEF8]">Customer Space</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#889e93] hidden sm:inline">
            Akses Otomatis API Key Langganan
          </span>
          <button
            onClick={() => setSelectedCheckoutPlan("pro")}
            className="px-3.5 py-1.5 rounded-lg bg-[#1CE172] text-[#010302] text-xs font-mono font-bold hover:bg-[#1CE172]/90 transition-all cursor-pointer"
          >
            Beli Paket
          </button>
        </div>
      </header>

      {/* Main Customer Content */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-8 flex-1">
        {/* Dispatched Notification Card */}
        {dispatchedNotification && (
          <div className="mb-8 p-6 rounded-3xl bg-[#0a0f0d] border border-[#1CE172]/40 shadow-[0_0_35px_rgba(28,225,114,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#1CE172] text-xs font-mono font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>PEMBAYARAN SETTLED — KUNCI BERHASIL DITERBITKAN!</span>
              </div>
              <h4 className="font-bold text-base text-[#F0FEF8]">
                API Key Siap Pakai Telah Dikirim ke:{" "}
                <span className="text-[#1CE172]">{dispatchedNotification.email}</span>
              </h4>
              <p className="text-xs text-[#889e93]">
                Kunci Anda:{" "}
                <code className="text-[#1CE172] bg-[#010302] px-2 py-0.5 rounded border border-[#1CE172]/20 font-mono">
                  {dispatchedNotification.keySecret}
                </code>
              </p>
            </div>

            <button
              onClick={() => setDispatchedNotification(null)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-[#889e93] self-start md:self-auto cursor-pointer"
            >
              Tutup Notifikasi
            </button>
          </div>
        )}

        <CustomerBentoPortal
          onOpenCheckoutModal={(plan) => setSelectedCheckoutPlan(plan)}
          onSwitchToOwnerDashboard={() => {
            window.location.href = "/owner";
          }}
        />
      </main>

      <CustomerCheckoutModal
        planCode={selectedCheckoutPlan || "pro"}
        isOpen={Boolean(selectedCheckoutPlan)}
        onClose={() => setSelectedCheckoutPlan(null)}
        onPaymentSettled={handlePaymentSettled}
      />
    </div>
  );
}
