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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">API Key Management & Policy</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Authenticate applications and control per-key rate limits, daily quotas, and model restrictions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>generate_key</span>
        </button>
      </div>

      <ApiKeyList keys={keys} onRevoke={onRevokeKey} />

      {/* Security info card */}
      <div className="rounded-lg border border-white/10 bg-[#0e0e11] p-3.5 sm:p-4 flex items-start gap-3">
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
