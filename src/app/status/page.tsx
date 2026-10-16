import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import { buildSystemStatus, type ComponentState } from "@/lib/status/systemStatus";

export const metadata: Metadata = {
  title: "Status Sistem — Morvexa",
  description:
    "Status operasional gateway Morvexa: edge, routing provider, penyimpanan akun, dan email transaksional.",
};

// Status must reflect the running instance, never a cached render.
export const dynamic = "force-dynamic";

const STATE_COPY: Record<
  ComponentState,
  { label: string; dot: string; text: string; ring: string }
> = {
  operational: {
    label: "Operasional",
    dot: "bg-[#10b981]",
    text: "text-[#10b981]",
    ring: "border-[#10b981]/30 bg-[#10b981]/10",
  },
  degraded: {
    label: "Terbatas",
    dot: "bg-[#f59e0b]",
    text: "text-[#f59e0b]",
    ring: "border-[#f59e0b]/30 bg-[#f59e0b]/10",
  },
  not_configured: {
    label: "Belum dikonfigurasi",
    dot: "bg-[#71717a]",
    text: "text-[#a1a1aa]",
    ring: "border-[#f4f4f5]/15 bg-[#f4f4f5]/5",
  },
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default function StatusPage() {
  const status = buildSystemStatus();
  const overall = STATE_COPY[status.state];

  return (
    <div className="min-h-screen bg-[#08080a] text-[#f4f4f5]">
      <header className="border-b border-[#f4f4f5]/8">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-[#a1a1aa] transition-colors hover:text-[#f4f4f5]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Beranda
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
            status.morvexa
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#f97316]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
            Status Sistem
          </span>
        </div>

        <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Kesehatan layanan Morvexa
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[#a1a1aa]">
          Angka di halaman ini diambil langsung dari konfigurasi dan proses yang sedang berjalan,
          bukan dari data contoh. Kami menampilkan keadaan sebenarnya pada hari terburuknya juga.
        </p>

        <div
          className={`mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4 ${overall.ring}`}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${overall.dot} opacity-60 ${
                  status.state === "operational" ? "animate-ping" : ""
                }`}
              />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${overall.dot}`} />
            </span>
            <span className={`text-[15px] font-semibold ${overall.text}`}>{overall.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11.5px] text-[#a1a1aa]">
            <span>region {status.region}</span>
            <span>uptime {formatUptime(status.uptimeSeconds)}</span>
            <span>diperiksa {new Date(status.generatedAt).toLocaleTimeString("id-ID")}</span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {status.components.map((component) => {
            const copy = STATE_COPY[component.state];
            return (
              <div
                key={component.id}
                className="flex flex-col gap-2 rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-[#f4f4f5]">{component.name}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#a1a1aa]">
                    {component.detail}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-2 self-start rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide sm:self-center ${copy.ring} ${copy.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${copy.dot}`} />
                  {copy.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[12.5px] leading-relaxed text-[#71717a]">
          Endpoint publik untuk pemantauan otomatis:{" "}
          <code className="rounded bg-[#16161b] px-1.5 py-0.5 font-mono text-[11.5px] text-[#a1a1aa]">
            GET /api/v1/status
          </code>
          . Halaman ini menampilkan status komponen, tidak menampilkan latensi upstream maupun nama
          provider yang memegang kredensial.
        </p>
      </main>
    </div>
  );
}
