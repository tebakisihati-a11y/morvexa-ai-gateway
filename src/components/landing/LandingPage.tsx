"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  Fingerprint,
  GitBranch,
  KeyRound,
  Layers,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { AgentCore } from "@/components/visual/AgentCore";
import { AmbientField } from "@/components/visual/AmbientField";
import { Button, Eyebrow, Panel, Pill } from "@/components/ui/primitives";
import { useScrollReveal } from "@/lib/hooks/useScrollReveal";
import {
  COST_TIER_LABELS,
  MODEL_CARDS,
  PLAN_CARDS,
  PROVIDERS,
  formatIdr,
  formatTokens,
} from "@/lib/landing/content";

/* ---------------------------------------------------------------------------
   Static copy that is not derived from runtime registries.
   ------------------------------------------------------------------------- */

const CAPABILITIES = [
  {
    icon: GitBranch,
    title: "Failover mesh",
    body: "Jika satu provider mengembalikan 429 atau timeout, permintaan yang sama otomatis dicoba ke provider berikutnya dalam rantai prioritas.",
  },
  {
    icon: Zap,
    title: "Streaming tanpa buffer",
    body: "Respons diteruskan sebagai Server-Sent Events apa adanya, sehingga token pertama sampai tanpa menunggu jawaban selesai.",
  },
  {
    icon: KeyRound,
    title: "API key berbasis hash",
    body: "Key dibuat dengan CSPRNG dan disimpan sebagai digest SHA-256. Plaintext hanya muncul sekali, saat pembuatan.",
  },
  {
    icon: Boxes,
    title: "Kuota rolling dua lapis",
    body: "Batas permintaan 5 jam dan 7 hari untuk model standar, ditambah kuota token harian dan mingguan untuk model frontier.",
  },
  {
    icon: Fingerprint,
    title: "Isolasi per tenant",
    body: "Baris data dikunci oleh organisasi dengan Row Level Security, sehingga kueri lintas tenant ditolak di level database.",
  },
  {
    icon: ScrollText,
    title: "Jejak audit",
    body: "Pembuatan key, perubahan konfigurasi, dan rekonsiliasi pembayaran dicatat sebagai entri audit yang bisa ditelusuri.",
  },
];

const SECURITY_FACTS = [
  { label: "Penyimpanan API key", value: "Digest SHA-256, dibandingkan dalam waktu konstan" },
  { label: "Kredensial provider", value: "Envelope encryption AES-256-GCM di sisi server" },
  { label: "Session kustomer", value: "Cookie HttpOnly bertanda tangan HMAC-SHA256" },
  { label: "Password akun", value: "scrypt dengan salt unik per akun" },
  { label: "Isolasi data", value: "Row Level Security per organisasi" },
  { label: "Webhook pembayaran", value: "Verifikasi signature sebelum provisioning" },
];

const STEPS = [
  {
    step: "01",
    title: "Buat akun",
    body: "Daftar dengan email dan password. Akun langsung aktif dengan kuota sandbox.",
  },
  {
    step: "02",
    title: "Terbitkan API key",
    body: "Buat key dari portal kustomer. Plaintext ditampilkan sekali, lalu hanya digest yang disimpan.",
  },
  {
    step: "03",
    title: "Arahkan SDK Anda",
    body: "Ganti base URL ke gateway Morvexa. Format request tetap sesuai SDK provider asal.",
  },
  {
    step: "04",
    title: "Pantau pemakaian",
    body: "Lihat token, latency, dan riwayat failover per key dari dasbor.",
  },
];

const CURL_SNIPPET = `curl https://morvexa-sistem.vercel.app/api/v1/messages \\
  -H "Authorization: Bearer $MORVEXA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-3-7-sonnet",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      { "role": "user", "content": "Ringkas laporan kuartal ini." }
    ]
  }'`;

const NAV_LINKS = [
  { href: "#capabilities", label: "Kemampuan" },
  { href: "#models", label: "Model" },
  { href: "#security", label: "Keamanan" },
  { href: "#pricing", label: "Harga" },
];

/* ---------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------- */

export function LandingPage() {
  useScrollReveal();
  const [copied, setCopied] = useState(false);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(CURL_SNIPPET);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is unavailable over insecure origins; the code stays selectable.
    }
  };

  return (
    <div className="grain relative min-h-screen overflow-hidden bg-[#06070f]">
      <AmbientField variant="hero" />

      <div className="relative z-10">
        <SiteHeader />
        <Hero />
        <ProviderStrip />
        <CapabilitiesSection />
        <QuickstartSection copied={copied} onCopy={copySnippet} />
        <ModelsSection />
        <SecuritySection />
        <PricingSection />
        <ClosingSection />
        <SiteFooter />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Header
   ------------------------------------------------------------------------- */

function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e9edfb]/8 bg-[#06070f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#5b8def]/35 bg-[#5b8def]/12 font-mono text-[13px] font-bold text-[#9db9f5]">
            M
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[#e9edfb]">Morvexa</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13.5px] text-[#8e97bc] transition-colors hover:text-[#e9edfb]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden text-[13.5px] text-[#8e97bc] transition-colors hover:text-[#e9edfb] sm:block"
          >
            Masuk
          </Link>
          <Link href="/signup">
            <Button size="sm">Mulai gratis</Button>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-label="Buka menu navigasi"
            aria-expanded={open}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[#e9edfb]/12 text-[#8e97bc] transition-colors hover:text-[#e9edfb] md:hidden"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[#e9edfb]/8 bg-[#06070f]/95 px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[#8e97bc] transition-colors hover:bg-[#e9edfb]/5 hover:text-[#e9edfb]"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm text-[#8e97bc] transition-colors hover:bg-[#e9edfb]/5 hover:text-[#e9edfb]"
            >
              Masuk
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        <div className="stagger">
          <Pill tone="accent" className="mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5b8def]" />
            UNIVERSAL AI GATEWAY
          </Pill>

          <h1 className="text-[38px] font-semibold leading-[1.06] tracking-tight text-[#e9edfb] sm:text-[54px] lg:text-[60px]">
            Satu endpoint.
            <br />
            <span className="text-gradient">Semua model frontier.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-[#8e97bc] sm:text-base">
            Arahkan SDK Anda ke satu base URL dan dapatkan akses ke Claude, GPT-4o, DeepSeek dan
            Gemini dengan autentikasi tunggal, failover otomatis, serta kuota yang tercatat rapi.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <Button size="lg">
                Buat akun gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#quickstart">
              <Button variant="secondary" size="lg">
                <Terminal className="h-4 w-4 text-[#5b8def]" />
                Lihat contoh request
              </Button>
            </a>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[#5a6390]">
            <span className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[#5b8def]" />
              Tanpa kartu kredit untuk paket gratis
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[#5b8def]" />
              Format kompatibel Anthropic &amp; OpenAI
            </span>
          </div>
        </div>

        {/* The overlay chips name only what is actually drawn, so the
            composition stays honest rather than implying live telemetry. */}
        <div className="relative">
          <div className="relative mx-auto h-[20rem] w-full max-w-[26rem] sm:h-[26rem] lg:h-[30rem] lg:max-w-none">
            <AgentCore className="h-full w-full" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2">
            <Pill>
              <Sparkles className="h-3 w-3 text-[#5b8def]" />
              Mesh geodesik interaktif
            </Pill>
            <Pill>Streaming SSE</Pill>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Provider strip
   ------------------------------------------------------------------------- */

function ProviderStrip() {
  return (
    <section className="border-y border-[#e9edfb]/8 bg-[#06070f]/50">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#5a6390]">
          Provider yang saat ini dirutekan gateway
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {PROVIDERS.map((provider) => (
            <div key={provider.name} className="text-center sm:text-left">
              <div className="text-[14.5px] font-semibold text-[#e9edfb]">{provider.name}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-[#5a6390]">
                {provider.models}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Capabilities
   ------------------------------------------------------------------------- */

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="reveal max-w-2xl">
        <Eyebrow>Kemampuan gateway</Eyebrow>
        <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[38px]">
          Yang dikerjakan gateway di antara aplikasi Anda dan provider
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#8e97bc]">
          Morvexa bukan sekadar penerus permintaan. Setiap panggilan melewati rantai kebijakan:
          autentikasi key, pengecekan kuota, pemilihan provider, dan pencatatan jejak.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#e9edfb]/8 bg-[#e9edfb]/8 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((item) => (
          <div
            key={item.title}
            className="reveal group bg-[#080a14] p-7 transition-colors duration-300 hover:bg-[#0b0d1a]"
          >
            <item.icon
              className="h-5 w-5 text-[#5b8def] transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
            <h3 className="mt-5 text-[15.5px] font-semibold text-[#e9edfb]">{item.title}</h3>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#8e97bc]">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Quickstart
   ------------------------------------------------------------------------- */

function QuickstartSection({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <section
      id="quickstart"
      className="border-y border-[#e9edfb]/8 bg-[linear-gradient(180deg,rgba(11,13,26,0.6),rgba(6,7,15,0.2))]"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="reveal">
          <Eyebrow>Mulai dalam empat langkah</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[38px]">
            Kompatibel dengan SDK yang sudah Anda pakai
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#8e97bc]">
            Endpoint <code className="font-mono text-[13px] text-[#9db9f5]">/api/v1/messages</code>{" "}
            mengikuti skema Anthropic, dan{" "}
            <code className="font-mono text-[13px] text-[#9db9f5]">
              /api/v1/chat/completions
            </code>{" "}
            mengikuti skema OpenAI.
          </p>

          <ol className="mt-10 space-y-7">
            {STEPS.map((step) => (
              <li key={step.step} className="flex gap-5">
                <span className="mt-0.5 font-mono text-[12px] text-[#5b8def]">{step.step}</span>
                <div>
                  <h3 className="text-[14.5px] font-semibold text-[#e9edfb]">{step.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[#8e97bc]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="reveal lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#e9edfb]/10 bg-[#04050c]">
            <div className="flex items-center justify-between border-b border-[#e9edfb]/8 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Terminal className="h-3.5 w-3.5 text-[#5b8def]" aria-hidden="true" />
                <span className="font-mono text-[12px] text-[#8e97bc]">POST /api/v1/messages</span>
              </div>
              <button
                type="button"
                onClick={onCopy}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11.5px] text-[#8e97bc] transition-colors hover:bg-[#e9edfb]/5 hover:text-[#e9edfb]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Salin
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-[#b9c4e6]">
              <code>{CURL_SNIPPET}</code>
            </pre>
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-[#5a6390]">
            Simpan key sebagai environment variable. Jangan pernah menaruhnya di kode yang dikirim
            ke browser.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Models
   ------------------------------------------------------------------------- */

function ModelsSection() {
  return (
    <section id="models" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="reveal flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>Model terdaftar</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[38px]">
            Registry yang dipakai router
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#8e97bc]">
            Daftar ini dibaca langsung dari registry runtime gateway, jadi apa yang Anda lihat di
            sini adalah yang benar-benar bisa dipanggil.
          </p>
        </div>
        <Link
          href="/catalog"
          className="shrink-0 text-[13.5px] font-medium text-[#9db9f5] underline-offset-4 transition-colors hover:text-[#e9edfb] hover:underline"
        >
          Buka katalog API →
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODEL_CARDS.map((model) => (
          <Panel
            key={model.id}
            className="reveal group flex flex-col p-6 transition-colors duration-300 hover:border-[#5b8def]/35"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#5a6390]">
                {model.provider}
              </span>
              <Pill tone={model.costTier === "high" ? "neutral" : "accent"}>
                {COST_TIER_LABELS[model.costTier]}
              </Pill>
            </div>

            <h3 className="mt-4 text-[16px] font-semibold text-[#e9edfb]">{model.name}</h3>

            <div className="mt-5 space-y-2.5 border-t border-[#e9edfb]/8 pt-4 font-mono text-[12px]">
              <Row label="Konteks" value={model.context} />
              <Row label="Streaming" value={model.streaming ? "Didukung" : "Tidak"} />
              <Row label="Tool calling" value={model.tools ? "Didukung" : "Tidak"} />
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#5a6390]">{label}</span>
      <span className="text-[#e9edfb]">{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Security
   ------------------------------------------------------------------------- */

function SecuritySection() {
  return (
    <section
      id="security"
      className="border-y border-[#e9edfb]/8 bg-[linear-gradient(180deg,rgba(11,13,26,0.5),rgba(6,7,15,0.1))]"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-16">
        <div className="reveal">
          <Eyebrow>Model keamanan</Eyebrow>
          <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[38px]">
            Rahasia tidak pernah disimpan dalam bentuk terbaca
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#8e97bc]">
            Morvexa memisahkan tiga jenis rahasia dan menangani masing-masing secara berbeda: API
            key kustomer, kredensial provider, dan session login.
          </p>

          <div className="mt-9 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8def]" aria-hidden="true" />
              <p className="text-[13.5px] leading-relaxed text-[#8e97bc]">
                <span className="text-[#e9edfb]">Ditampilkan sekali.</span> Plaintext API key hanya
                ada pada respons pembuatan, lalu tidak dapat diambil kembali.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8def]" aria-hidden="true" />
              <p className="text-[13.5px] leading-relaxed text-[#8e97bc]">
                <span className="text-[#e9edfb]">Session di cookie HttpOnly.</span> JavaScript di
                browser tidak dapat membaca token sesi Anda.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8def]" aria-hidden="true" />
              <p className="text-[13.5px] leading-relaxed text-[#8e97bc]">
                <span className="text-[#e9edfb]">Rate limit berlapis.</span> Token bucket per key
                plus pembatasan percobaan login untuk menahan credential stuffing.
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="mt-9 inline-flex items-center gap-2 text-[13.5px] font-medium text-[#9db9f5] underline-offset-4 transition-colors hover:text-[#e9edfb] hover:underline"
          >
            <ShieldCheck className="h-4 w-4" />
            Lihat sendiri dari dalam portal
          </Link>
        </div>

        <Panel className="reveal overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e9edfb]/8 px-6 py-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8e97bc]">
              Ringkasan implementasi
            </span>
            <Pill tone="positive">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Aktif
            </Pill>
          </div>

          <dl className="divide-y divide-[#e9edfb]/8">
            {SECURITY_FACTS.map((fact) => (
              <div key={fact.label} className="px-6 py-4">
                <dt className="font-mono text-[11.5px] uppercase tracking-[0.12em] text-[#5a6390]">
                  {fact.label}
                </dt>
                <dd className="mt-1.5 text-[13.5px] leading-relaxed text-[#e9edfb]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Pricing
   ------------------------------------------------------------------------- */

function PricingSection() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="reveal mx-auto max-w-2xl text-center">
        <Eyebrow className="justify-center">Harga</Eyebrow>
        <h2 className="mt-4 text-[30px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[38px]">
          Batas yang jelas, tanpa biaya tersembunyi
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#8e97bc]">
          Setiap paket menetapkan rate limit per menit dan kuota token harian. Angka di bawah sama
          dengan yang ditegakkan gateway.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLAN_CARDS.map((plan) => (
          <div
            key={plan.code}
            className={`reveal relative flex flex-col rounded-2xl p-7 transition-colors duration-300 ${
              plan.featured
                ? "border border-[#5b8def]/45 bg-[linear-gradient(165deg,rgba(17,20,42,0.95),rgba(11,13,26,0.98))]"
                : "border border-[#e9edfb]/10 bg-[#080a14] hover:border-[#e9edfb]/20"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-7 rounded-full border border-[#5b8def]/40 bg-[#0b0d1a] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9db9f5]">
                Paling populer
              </span>
            )}

            <h3 className="text-[17px] font-semibold text-[#e9edfb]">{plan.name}</h3>
            <p className="mt-2 min-h-[2.5rem] text-[13px] leading-relaxed text-[#8e97bc]">
              {plan.blurb}
            </p>

            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-[32px] font-semibold tracking-tight text-[#e9edfb]">
                {formatIdr(plan.priceIdr)}
              </span>
              {plan.priceIdr > 0 && (
                <span className="font-mono text-[12px] text-[#5a6390]">/ bulan</span>
              )}
            </div>

            <ul className="mt-7 flex-1 space-y-3 border-t border-[#e9edfb]/8 pt-6 text-[13.5px]">
              <Feature>{plan.rpm} permintaan / menit</Feature>
              <Feature>{formatTokens(plan.dailyTokens)} token per hari</Feature>
              <Feature>{plan.modelCount} model dalam registry</Feature>
              <Feature>Riwayat pemakaian &amp; jejak audit</Feature>
            </ul>

            <Link href="/signup" className="mt-8 block">
              <Button variant={plan.featured ? "primary" : "secondary"} className="w-full">
                {plan.priceIdr === 0 ? "Mulai gratis" : "Pilih paket ini"}
              </Button>
            </Link>
          </div>
        ))}
      </div>

      <p className="reveal mt-8 text-center text-[12.5px] text-[#5a6390]">
        Paket token per model (DeepSeek, Claude, GPT, Gemini) tersedia di dalam portal kustomer.
      </p>
    </section>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[#8e97bc]">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8def]" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

/* ---------------------------------------------------------------------------
   Closing + footer
   ------------------------------------------------------------------------- */

function ClosingSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <div className="reveal relative overflow-hidden rounded-3xl border border-[#e9edfb]/10 bg-[linear-gradient(150deg,rgba(42,53,118,0.55),rgba(11,13,26,0.9)_55%,rgba(192,84,159,0.18))] px-8 py-14 text-center sm:px-16">
        <div className="animate-drift pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#5b8def]/20 blur-[90px]" />

        <h2 className="relative text-[28px] font-semibold leading-tight tracking-tight text-[#e9edfb] sm:text-[36px]">
          Mulai dari kuota gratis, naikkan saat trafik Anda naik
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#c3cbe8]">
          Buat akun, terbitkan key, dan kirim request pertama Anda hari ini.
        </p>

        <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">
              Buat akun gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Masuk ke akun saya
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[#e9edfb]/8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg border border-[#5b8def]/30 bg-[#5b8def]/10 font-mono text-[11px] font-bold text-[#9db9f5]">
            M
          </span>
          <span className="text-[13.5px] text-[#8e97bc]">Morvexa — Universal AI Gateway</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-[#8e97bc]">
          <a href="#capabilities" className="transition-colors hover:text-[#e9edfb]">
            Kemampuan
          </a>
          <a href="#models" className="transition-colors hover:text-[#e9edfb]">
            Model
          </a>
          <Link href="/catalog" className="transition-colors hover:text-[#e9edfb]">
            Katalog API
          </Link>
          <a
            href="/api/v1/metrics"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[#e9edfb]"
          >
            Status endpoint
          </a>
        </nav>

        <p className="font-mono text-[11.5px] text-[#5a6390]">
          © {new Date().getFullYear()} Morvexa
        </p>
      </div>
    </footer>
  );
}
