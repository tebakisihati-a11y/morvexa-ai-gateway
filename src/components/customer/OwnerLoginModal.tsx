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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-[#0e0e11] border border-[#f97316]/30 p-6 sm:p-8 shadow-2xl relative text-[#f4f4f5]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 flex items-center justify-center text-[#f97316]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Owner Access Control</h3>
            <p className="text-xs text-[#a1a1aa]">Sistem Khusus Pemilik & Administrator Platform</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} method="post" className="space-y-4">
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Halaman Control Plane ini dikhususkan bagi Owner untuk memantau infrastruktur server, ledger rekonsiliasi, dan seluruh transaksi tenant.
          </p>

          <div>
            <label className="block text-xs font-mono text-[#a1a1aa] mb-1.5">
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
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#08080a] border border-[#f4f4f5]/15 text-[#f4f4f5] font-mono text-xs focus:border-[#f97316] focus:outline-none"
            />
            {error && (
              <p className="text-[11px] text-[#ef4444] mt-1 font-mono">
                Passcode tidak valid. Minimal 4 karakter.
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-[#f4f4f5]/10 text-[#a1a1aa] font-mono text-xs hover:bg-white/5 cursor-pointer"
            >
              Kembali ke Kustomer
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-lg bg-[#f97316] text-[#08080a] font-mono font-bold text-xs hover:bg-[#f97316]/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
