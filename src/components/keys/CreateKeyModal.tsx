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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#121215] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-zinc-100">
              {generatedSecret ? "Save Your Secret API Key" : "Create Gateway API Key"}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {generatedSecret ? (
          <div className="p-5 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 leading-relaxed">
              <strong>Important:</strong> Please copy this API key now. For your security, you will not be able to view this full secret key again.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Secret Gateway Key</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedSecret}
                  className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-zinc-200 select-all"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Key Name / Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Production Agent Proxy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Rate Limit (RPM)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={rpm}
                  onChange={(e) => setRpm(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-zinc-500">Requests per minute</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Daily Token Cap</label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={dailyTokens}
                  onChange={(e) => setDailyTokens(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-zinc-500">Max tokens / 24h</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {isSubmitting ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
