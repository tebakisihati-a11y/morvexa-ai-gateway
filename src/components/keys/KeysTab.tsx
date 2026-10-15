"use client";

import React, { useState } from "react";
import type { ApiKeyItem } from "@/lib/types";
import { ApiKeyList } from "./ApiKeyList";
import { CreateKeyModal } from "./CreateKeyModal";
import { Plus, Key, Shield, ShieldCheck, Lock } from "lucide-react";

interface KeysTabProps {
  keys: ApiKeyItem[];
  onCreateKey: (name: string, rpm: number, dailyTokens: number) => Promise<{ rawSecret: string }>;
  onRevokeKey: (id: string) => void;
  onRegenerateKey?: (id: string) => Promise<{ rawSecret: string } | null>;
  onResetQuota?: (id: string, boostTokens?: number) => Promise<void>;
}

export function KeysTab({ keys, onCreateKey, onRevokeKey, onRegenerateKey, onResetQuota }: KeysTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#E9EDFB] tracking-tight">API Key Management & Customer Doctor</h2>
          <p className="text-xs text-[#8E97BC] mt-0.5 font-mono">
            Pantau konsumsi token per kustomer dan pulihkan token yang invalid atau habis kuota secara real-time.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#5B8DEF] hover:bg-[#5B8DEF]/90 text-[#06070F] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(91, 141, 239,0.3)] cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Kunci Baru</span>
        </button>
      </div>

      <ApiKeyList
        keys={keys}
        onRevoke={onRevokeKey}
        onRegenerateSecret={onRegenerateKey}
        onResetQuota={onResetQuota}
      />

      {/* Security info card */}
      <div className="rounded-lg border border-white/10 bg-[#0E1019] p-3.5 sm:p-4 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <div className="font-mono text-xs font-semibold text-zinc-200">Zero-Plaintext Security Architecture</div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            All secret keys are generated with high-entropy cryptographic primitives. Morvexa stores only the salted SHA-256 hash. Once created, keys cannot be reverse-engineered or recovered from the database.
          </p>
        </div>
      </div>

      <CreateKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={onCreateKey}
      />
    </div>
  );
}
