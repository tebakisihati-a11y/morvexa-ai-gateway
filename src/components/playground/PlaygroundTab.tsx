"use client";

import React, { useState } from "react";
import { StreamInspector } from "./StreamInspector";
import { Play, Sparkles, Sliders, RotateCcw, AlertCircle } from "lucide-react";

export function PlaygroundTab() {
  const [model, setModel] = useState("claude-3-7-sonnet");
  const [systemPrompt, setSystemPrompt] = useState("You are Morvexa AI, an ultra-fast edge intelligence assistant.");
  const [prompt, setPrompt] = useState("Explain how Morvexa AI Gateway achieves zero-buffer streaming with dual rolling quota recovery.");
  const [temperature, setTemperature] = useState(0.7);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [rawChunks, setRawChunks] = useState<string[]>([]);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const [tokensPerSec, setTokensPerSec] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  const handleSendPrompt = async () => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamingText("");
    setRawChunks([]);
    setTtftMs(null);
    setTokensPerSec(0);
    setTotalTokens(0);

    const startTime = performance.now();
    let firstTokenRecorded = false;
    let accumulatedText = "";
    let chunkCount = 0;

    try {
      const response = await fetch("/api/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mvx_live_playground_key",
        },
        body: JSON.stringify({
          model,
          stream: true,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
          temperature,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Gateway returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                if (!firstTokenRecorded) {
                  const now = performance.now();
                  setTtftMs(Math.round(now - startTime));
                  firstTokenRecorded = true;
                }

                accumulatedText += parsed.delta.text;
                chunkCount++;
                setStreamingText(accumulatedText);
                setRawChunks((prev) => [...prev, parsed.delta.text]);

                const elapsedSec = (performance.now() - startTime) / 1000;
                const estimatedTokens = Math.max(1, Math.round(accumulatedText.length / 4));
                setTotalTokens(estimatedTokens);
                setTokensPerSec(Math.round(estimatedTokens / Math.max(0.1, elapsedSec)));
              }
            } catch {
              // Ignore non-json SSE frames
            }
          }
        }
      }
    } catch (err: any) {
      setStreamingText(`[Gateway Stream Error: ${err.message}]`);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setPrompt("Explain how Morvexa AI Gateway achieves zero-buffer streaming with dual rolling quota recovery.");
    setStreamingText("");
    setRawChunks([]);
    setTtftMs(null);
    setTokensPerSec(0);
    setTotalTokens(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span>Interactive SSE Streaming Playground</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Test real-time model inferences through the Morvexa Edge Proxy with live Time-To-First-Token and chunk telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#121215] p-5 shadow-lg space-y-4">
            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Model Selection</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Anthropic - Hybrid)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Anthropic - Standard)</option>
                <option value="claude-3-5-haiku">Claude 3.5 Haiku (Anthropic - Fast)</option>
                <option value="deepseek-chat">DeepSeek V3 (DeepSeek - Standard)</option>
                <option value="gpt-4o">GPT-4o (OpenAI - Frontier)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google - Ultra-fast)</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-zinc-300">Temperature</span>
                <span className="font-mono text-zinc-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">System Directive</label>
              <textarea
                rows={2}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 resize-none font-sans"
              />
            </div>

            {/* User Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">User Prompt</label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 resize-none font-sans"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSendPrompt}
                disabled={isStreaming || !prompt.trim()}
                className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isStreaming ? "Streaming..." : "Send Prompt"}</span>
              </button>

              <button
                onClick={handleReset}
                disabled={isStreaming}
                className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Reset Prompt"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Stream Inspector */}
        <div className="lg:col-span-7">
          <StreamInspector
            ttftMs={ttftMs}
            tokensPerSec={tokensPerSec}
            totalTokens={totalTokens}
            rawChunks={rawChunks}
            streamingText={streamingText}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
}
