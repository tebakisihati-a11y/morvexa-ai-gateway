"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function OwnerLoginModal({
  isOpen,
  onClose,
  onAuthenticated,
}: OwnerLoginModalProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default owner access validation (or dev bypass)
    if (passcode === "morvexa-owner" || passcode === "admin" || passcode.length >= 4) {
      onAuthenticated();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-[#0B0D1A] border border-[#5B8DEF]/30 p-6 sm:p-8 shadow-2xl relative text-[#E9EDFB]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-[#5B8DEF]/10 border border-[#5B8DEF]/30 flex items-center justify-center text-[#5B8DEF]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Owner Access Control</h3>
            <p className="text-xs text-[#8E97BC]">Sistem Khusus Pemilik & Administrator Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-[#8E97BC] leading-relaxed">
            Halaman Control Plane ini dikhususkan bagi Owner untuk memantau infrastruktur server, ledger rekonsiliasi, dan seluruh transaksi tenant.
          </p>

          <div>
            <label className="block text-xs font-mono text-[#8E97BC] mb-1.5">
              Owner Access Passcode
            </label>
            <input
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="Masukkan passcode (e.g. admin)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06070F] border border-[#E9EDFB]/15 text-[#E9EDFB] font-mono text-xs focus:border-[#5B8DEF] focus:outline-none"
            />
            {error && (
              <p className="text-[11px] text-red-400 mt-1 font-mono">
                Passcode tidak valid. Minimal 4 karakter.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-[#E9EDFB]/10 text-[#8E97BC] font-mono text-xs hover:bg-white/5 cursor-pointer"
            >
              Kembali ke Kustomer
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-[#5B8DEF] text-[#06070F] font-mono font-bold text-xs hover:bg-[#5B8DEF]/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Buka Sistem</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
