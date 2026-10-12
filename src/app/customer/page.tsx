"use client";

import React, { useState, useEffect } from "react";
import { CustomerBentoPortal } from "@/components/customer/CustomerBentoPortal";
import { CustomerCheckoutModal } from "@/components/customer/CustomerCheckoutModal";
import { CustomerModelCheckoutModal } from "@/components/customer/CustomerModelCheckoutModal";
import { CustomerAuthModal } from "@/components/customer/CustomerAuthModal";
import {
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Sparkles,
  User,
  LogOut,
  Coins,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ModelProduct, CustomerUser } from "@/lib/customer/store";

export default function CustomerPortalPage() {
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<string | null>(null);
  const [selectedModelProduct, setSelectedModelProduct] = useState<ModelProduct | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  const [activeCustomer, setActiveCustomer] = useState<CustomerUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [dispatchedNotification, setDispatchedNotification] = useState<{
    email: string;
    keySecret: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    // Check local session
    const saved = localStorage.getItem("morvexa_customer_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) {
          setActiveCustomer(parsed);
          setAuthModalOpen(false);
        } else {
          setAuthModalOpen(true);
        }
      } catch {
        setAuthModalOpen(true);
      }
    } else {
      setAuthModalOpen(true);
    }
    setIsCheckingSession(false);
  }, []);

  const handleAuthSuccess = (user: CustomerUser) => {
    setActiveCustomer(user);
    localStorage.setItem("morvexa_customer_session", JSON.stringify(user));
    setAuthModalOpen(false);
  };

  const handleLogout = () => {
    setActiveCustomer(null);
    localStorage.removeItem("morvexa_customer_session");
    setAuthModalOpen(true);
    setAuthModalMode("login");
  };

  const handlePlanPaymentSettled = (res: any) => {
    if (res.autoProvision) {
      setDispatchedNotification({
        email: res.autoProvision.emailSentTo,
        keySecret: res.autoProvision.rawSecret,
        title: `PAKET ${res.autoProvision.apiKey.name} BERHASIL DITERBITKAN!`,
      });
    }
  };

  const handleModelPaymentSuccess = (res: any) => {
    if (res.apiKey) {
      setDispatchedNotification({
        email: res.order.customerEmail,
        keySecret: res.apiKey.rawSecret,
        title: `TOKEN ${res.order.productName} BERHASIL DITERBITKAN!`,
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

        {/* Customer Auth Profile / Login / Register */}
        <div className="flex items-center gap-3">
          {activeCustomer ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-xs font-bold text-[#F0FEF8]">{activeCustomer.name}</span>
                <span className="text-[10px] font-mono text-[#1CE172]">{activeCustomer.email}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-[#1CE172]/20 border border-[#1CE172]/40 flex items-center justify-center text-[#1CE172] text-xs font-bold font-mono">
                {activeCustomer.name.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                title="Keluar Akun"
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode("login");
                  setAuthModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#F0FEF8]/20 text-[#F0FEF8] hover:bg-white/5 text-xs font-mono transition-all cursor-pointer"
              >
                Masuk Email
              </button>
              <button
                onClick={() => {
                  setAuthModalMode("register");
                  setAuthModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#1CE172] text-[#010302] text-xs font-mono font-bold hover:bg-[#1CE172]/90 shadow-[0_0_15px_rgba(28,225,114,0.3)] transition-all cursor-pointer"
              >
                Daftar Akun Baru
              </button>
            </div>
          )}
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
                <span>{dispatchedNotification.title}</span>
              </div>
              <h4 className="font-bold text-base text-[#F0FEF8]">
                API Key Siap Pakai Telah Dikirimkan ke Email:{" "}
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
          onOpenModelCheckoutModal={(model) => setSelectedModelProduct(model)}
          activeCustomer={activeCustomer}
          onOpenAuthModal={() => {
            setAuthModalMode("login");
            setAuthModalOpen(true);
          }}
        />
      </main>

      {/* Modal 1: Plan Subscription Checkout */}
      <CustomerCheckoutModal
        planCode={selectedCheckoutPlan || "pro"}
        isOpen={Boolean(selectedCheckoutPlan)}
        onClose={() => setSelectedCheckoutPlan(null)}
        onPaymentSettled={handlePlanPaymentSettled}
      />

      {/* Modal 2: Model Token Checkout (DeepSeek etc.) */}
      <CustomerModelCheckoutModal
        product={selectedModelProduct}
        isOpen={Boolean(selectedModelProduct)}
        onClose={() => setSelectedModelProduct(null)}
        onSuccess={handleModelPaymentSuccess}
        defaultEmail={activeCustomer?.email || ""}
        defaultName={activeCustomer?.name || ""}
      />

      {/* Modal 3: Customer Login / Register with Gmail or Yahoo */}
      <CustomerAuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        canClose={Boolean(activeCustomer)}
        onClose={() => {
          if (activeCustomer) {
            setAuthModalOpen(false);
          }
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
