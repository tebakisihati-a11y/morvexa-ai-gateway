"use client";

import React, { useState } from "react";
import { X, Copy, Check, ShieldCheck, KeyRound } from "lucide-react";

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, rpm: number, dailyTokens: number) => Promise<{ rawSecret: string }>;
}

export function CreateKeyModal({ isOpen, onClose, onCreate }: CreateKeyModalProps) {
  const [name, setName] = useState("");
  const [rpm, setRpm] = useState(60);
  const [dailyTokens, setDailyTokens] = useState(500000);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await onCreate(name.trim(), rpm, dailyTokens);
      setGeneratedSecret(res.rawSecret);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setName("");
    setRpm(60);
    setDailyTokens(500000);
    setGeneratedSecret(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0e0e11] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-100">
              {generatedSecret ? "Secret Key Generated" : "Provision Gateway API Key"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {generatedSecret ? (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs font-mono text-amber-300 leading-relaxed">
              [warning]: Copy this secret key now. It is hashed with SHA-256 and will not be displayed again.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400">Secret Token</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedSecret}
                  className="flex-1 rounded border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-mono text-zinc-200 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "copied" : "copy"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleClose}
                className="w-full py-2 rounded bg-white/10 hover:bg-white/15 text-zinc-100 text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                close_dialog
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300">Key Name / Client Tag</label>
              <input
                type="text"
                required
                placeholder="e.g. mobile_client_ios"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300">Rate Limit (RPM)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={rpm}
                  onChange={(e) => setRpm(Number(e.target.value))}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-400"
                />
                <span className="text-[10px] font-mono text-zinc-500">req / minute</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300">Daily Token Cap</label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={dailyTokens}
                  onChange={(e) => setDailyTokens(Number(e.target.value))}
                  className="w-full rounded border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-400"
                />
                <span className="text-[10px] font-mono text-zinc-500">max tokens / 24h</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-3.5 py-1.5 rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                {isSubmitting ? "provisioning..." : "provision_key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
