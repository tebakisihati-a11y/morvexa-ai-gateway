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
}

export function KeysTab({ keys, onCreateKey, onRevokeKey }: KeysTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">API Key Management & Policy</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Authenticate applications and control per-key rate limits, daily quotas, and model restrictions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-orange-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      <ApiKeyList keys={keys} onRevoke={onRevokeKey} />

      {/* Security info card */}
      <div className="rounded-xl border border-white/5 bg-[#121215] p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-semibold text-zinc-200">Zero-Plaintext Security Architecture</div>
          <p className="text-zinc-400 leading-relaxed">
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
