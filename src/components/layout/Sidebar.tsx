"use client";

import React from "react";
import {
  LayoutDashboard,
  KeyRound,
  GitBranch,
  PlaySquare,
  Activity,
  Shield,
} from "lucide-react";

export type NavTabId = "overview" | "keys" | "routing" | "playground" | "traces" | "guardrails";

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems: { id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "Command Center", icon: LayoutDashboard },
    { id: "keys", label: "API Keys & Policies", icon: KeyRound },
    { id: "routing", label: "Routing & Failover", icon: GitBranch },
    { id: "playground", label: "Live SSE Playground", icon: PlaySquare },
    { id: "traces", label: "Audit Traces & Logs", icon: Activity },
    { id: "guardrails", label: "Guardrails & Config", icon: Shield },
  ];

  return (
    <aside className="hidden md:flex w-60 border-r border-white/10 bg-[#0c0c0e] flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Workspace Switcher header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center font-mono text-[10px] font-bold border border-white/10">
              M
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-200">Morvexa Gateway</div>
              <div className="text-[10px] font-mono text-zinc-500">core_prod</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10">
            PRO
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
          Platform Controls
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-mono transition-colors ${
                isActive
                  ? "bg-white/10 text-white font-semibold border border-white/5"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-orange-400" : "text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <span className="text-orange-400 text-xs">●</span>}
            </button>
          );
        })}
      </nav>

      {/* Upstream Status Footer */}
      <div className="p-3 border-t border-white/10 bg-black/30">
        <div className="rounded border border-white/5 bg-white/[0.01] p-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="text-zinc-400">Upstream Mesh</span>
            <span className="text-emerald-400 text-[10px]">6/6 healthy</span>
          </div>
          <div className="space-y-1 text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between items-center">
              <span>Private Local (5002)</span>
              <span className="text-zinc-300">8ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Anthropic Direct</span>
              <span className="text-zinc-400">142ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>DeepSeek V3</span>
              <span className="text-zinc-400">98ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Groq LPU</span>
              <span className="text-zinc-400">45ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
