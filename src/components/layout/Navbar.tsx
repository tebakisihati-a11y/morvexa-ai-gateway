"use client";

import React from "react";
import { EdgeStatusRadar } from "./EdgeStatusRadar";
import { Cpu, Terminal, ExternalLink, ShieldCheck } from "lucide-react";

interface NavbarProps {
  currentTab: string;
}

export function Navbar({ currentTab }: NavbarProps) {
  return (
    <header className="h-14 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between">
      {/* Brand & Active Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm shadow-orange-500/20">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm text-zinc-100">
            Morvexa <span className="text-orange-500 font-mono text-xs">AI Gateway</span>
          </span>
        </div>

        <span className="text-zinc-600 text-xs hidden sm:inline">/</span>
        <span className="text-xs font-mono text-zinc-400 capitalize hidden sm:inline">
          {currentTab}
        </span>
      </div>

      {/* Global Telemetry & Status */}
      <div className="flex items-center gap-3">
        <EdgeStatusRadar />

        <div className="flex items-center gap-2">
          <a
            href="/api/v1/models"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 border border-white/10 px-2.5 py-1 rounded-md transition-colors bg-[#121215]"
          >
            <Terminal className="h-3 w-3 text-orange-400" />
            <span>API Docs</span>
            <ExternalLink className="h-2.5 w-2.5 text-zinc-500" />
          </a>

          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-zinc-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-mono">Free Tier (Pro Quota)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
