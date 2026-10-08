"use client";

import React, { useState } from "react";
import { Terminal, Zap, Clock, Code, Play } from "lucide-react";

interface StreamInspectorProps {
  ttftMs: number | null;
  tokensPerSec: number;
  totalTokens: number;
  rawChunks: string[];
  streamingText: string;
  isStreaming: boolean;
}

export function StreamInspector({
  ttftMs,
  tokensPerSec,
  totalTokens,
  rawChunks,
  streamingText,
  isStreaming,
}: StreamInspectorProps) {
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  return (
    <div className="rounded-xl border border-white/10 bg-[#121215] flex flex-col h-full overflow-hidden shadow-lg">
      {/* Inspector Header with Telemetry Stats */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold text-zinc-100">Live SSE Stream Output</span>
          </div>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
              Streaming Zero-Buffer
            </span>
          )}
        </div>

        {/* Telemetry metrics bar */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>TTFT:</span>
            <strong className="text-emerald-400 font-bold">{ttftMs ? `${ttftMs}ms` : "—"}</strong>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Zap className="h-3.5 w-3.5 text-zinc-500" />
            <span>Velocity:</span>
            <strong className="text-orange-400 font-bold">{tokensPerSec} t/s</strong>
          </div>

          <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded p-0.5">
            <button
              onClick={() => setViewMode("rendered")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === "rendered" ? "bg-white/10 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Rendered
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                viewMode === "raw" ? "bg-white/10 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Raw SSE
            </button>
          </div>
        </div>
      </div>

      {/* Stream Display Body */}
      <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-zinc-200 min-h-[280px] bg-black/50 leading-relaxed">
        {viewMode === "rendered" ? (
          <div>
            {streamingText ? (
              <div className="whitespace-pre-wrap font-sans text-sm text-zinc-100">
                {streamingText}
                {isStreaming && <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs">
                Ready to stream. Click "Send Prompt" to test the zero-buffer SSE gateway.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {rawChunks.length > 0 ? (
              rawChunks.map((chunk, idx) => (
                <div key={idx} className="p-1.5 rounded bg-white/[0.03] border border-white/5 text-[11px] text-zinc-400">
                  <span className="text-zinc-600 mr-2">[{idx}]</span>
                  <span className="text-orange-300">event: content_block_delta</span>
                  <div className="text-zinc-200 mt-0.5">{chunk}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-600 text-center py-10">No raw SSE frames captured yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Output Footer stats */}
      <div className="p-2.5 border-t border-white/5 bg-black/30 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <div>
          Chunks Captured: <span className="text-zinc-300">{rawChunks.length}</span>
        </div>
        <div>
          Total Output Tokens: <span className="text-zinc-300 font-bold">{totalTokens}</span>
        </div>
      </div>
    </div>
  );
}
