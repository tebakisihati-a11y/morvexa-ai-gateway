"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { CustomerUser } from "@/lib/customer/store";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomerUser) => void;
  initialMode?: "login" | "register";
  canClose?: boolean;
}

export function CustomerAuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
  canClose = true,
}: CustomerAuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickOAuth = async (provider: "gmail" | "yahoo") => {
    setLoading(true);
    setError(null);
    const domain = provider === "gmail" ? "@gmail.com" : "@yahoo.com";
    const samplePrefix = name ? name.toLowerCase().replace(/[^a-z0-9]/g, ".") : (provider === "gmail" ? "user.google" : "user.yahoo");
    const autoEmail = email && email.includes(domain) ? email : `${samplePrefix}${domain}`;

    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: autoEmail.trim(),
          name: name.trim() || (provider === "gmail" ? "Google User" : "Yahoo User"),
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal autentikasi");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menghubungkan akun.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Masukkan alamat email pribadi yang valid (Gmail atau Yahoo).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan autentikasi");
      }

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses akun.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-[#0a0f0d] border border-[#1CE172]/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(28,225,114,0.15)] relative text-[#F0FEF8]">
        {/* Close Button (Hidden if login is mandatory) */}
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#889e93] hover:text-[#F0FEF8] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-[#1CE172]/10 border border-[#1CE172]/30 flex items-center justify-center text-[#1CE172]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F0FEF8]">
              {mode === "login" ? "Masuk Akun Kustomer" : "Daftar Akun Baru Kustomer"}
            </h3>
            <p className="text-xs text-[#889e93] font-mono">
              Terintegrasi langsung ke Server Morvexa & Owner
            </p>
          </div>
        </div>

        {/* Provider Shortcuts: Gmail & Yahoo */}
        <div className="space-y-3 mb-6">
          <div className="text-[11px] font-mono text-[#889e93] uppercase tracking-wider">
            Login Cepat via Email Pribadi:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickOAuth("gmail")}
              className="py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-xs font-mono text-red-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <span>Gmail / Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickOAuth("yahoo")}
              className="py-2.5 px-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-xs font-mono text-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              <span>Yahoo Mail</span>
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-mono text-[#889e93] mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-[#889e93]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#010302] border border-[#F0FEF8]/15 text-[#F0FEF8] font-mono text-xs focus:border-[#1CE172] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-[#889e93] mb-1.5">
              Alamat Email (Gmail / Yahoo / Pribadi)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-[#889e93]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@gmail.com atau @yahoo.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#010302] border border-[#F0FEF8]/15 text-[#F0FEF8] font-mono text-xs focus:border-[#1CE172] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#1CE172] text-[#010302] font-mono font-bold text-xs hover:bg-[#1CE172]/90 shadow-[0_0_20px_rgba(28,225,114,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Memproses..." : mode === "login" ? "Masuk ke Akun" : "Daftar Akun Baru"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Toggle Login / Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="text-xs font-mono text-[#889e93] hover:text-[#1CE172] transition-colors cursor-pointer"
            >
              {mode === "login"
                ? "Belum punya akun? Klik di sini untuk Mendaftar"
                : "Sudah punya akun? Masuk menggunakan Email"}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] font-mono text-[#889e93] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#1CE172] shrink-0" />
            <span>Data registrasi & aktifitas langsung terenkripsi dan tercatat di Owner Control Plane.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
