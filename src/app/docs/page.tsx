import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Dokumentasi API — Morvexa",
  description:
    "Referensi API gateway Morvexa: autentikasi, endpoint chat completions dan messages, streaming SSE, kuota, rate limit, dan penanganan error.",
};

// Server component: the reference is static, so nothing here ships a client bundle.

interface Endpoint {
  method: "GET" | "POST" | "DELETE";
  path: string;
  title: string;
  auth: string;
  summary: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "POST",
    path: "/api/v1/chat/completions",
    title: "Chat completions (kompatibel OpenAI)",
    auth: "Bearer API key",
    summary:
      "Format request dan respons identik dengan OpenAI Chat Completions. Cocok untuk SDK OpenAI hanya dengan mengganti base URL.",
  },
  {
    method: "POST",
    path: "/api/v1/messages",
    title: "Messages (kompatibel Anthropic)",
    auth: "Bearer API key",
    summary:
      "Format native Anthropic Messages API, termasuk blok system dan streaming SSE apa adanya tanpa buffer.",
  },
  {
    method: "GET",
    path: "/api/v1/models",
    title: "Daftar model",
    auth: "Publik",
    summary: "Katalog model beserta provider, context window, dan tarif per 1k token.",
  },
  {
    method: "GET",
    path: "/api/v1/status",
    title: "Status sistem",
    auth: "Publik",
    summary:
      "Status komponen gateway untuk pemantauan otomatis. Hanya berisi boolean dan hitungan, tanpa kredensial maupun latensi upstream.",
  },
  {
    method: "GET",
    path: "/api/v1/metrics",
    title: "Metrik runtime",
    auth: "Publik",
    summary:
      "Jumlah request, laju, latensi respons handler, dan error dari instance yang menjawab. Data bersifat sementara per instance Vercel, bukan agregat seluruh deployment.",
  },
];

const EMBEDDING_OPTIONS = [
  {
    label: "Python (OpenAI SDK)",
    code: `from openai import OpenAI

client = OpenAI(
    api_key="mvx_live_...",
    base_url="https://<domain-anda>/api/v1",
)

stream = client.chat.completions.create(
    model="claude-3-7-sonnet",
    messages=[{"role": "user", "content": "Halo Morvexa"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`,
  },
  {
    label: "Node.js (fetch)",
    code: `const res = await fetch("https://<domain-anda>/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer mvx_live_...",
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "Halo Morvexa" }],
  }),
});

const data = await res.json();
console.log(data.choices[0].message.content);`,
  },
  {
    label: "cURL",
    code: `curl https://<domain-anda>/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer mvx_live_..." \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Halo Morvexa"}]
  }'`,
  },
];

const ERRORS = [
  { code: "401", type: "authentication_error", meaning: "API key tidak ada, salah, atau sudah dicabut." },
  { code: "403", type: "permission_error", meaning: "Email belum diverifikasi, atau akses tidak diizinkan untuk key ini." },
  { code: "429", type: "rate_limit_error", meaning: "Melebihi batas RPM kunci. Header Retry-After memuat detik tunggu." },
  { code: "502", type: "upstream_error", meaning: "Seluruh provider dalam rantai failover gagal merespons." },
];

export default function DocsPage() {
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
            docs.morvexa
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#f97316]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#71717a]">
            Dokumentasi API
          </span>
        </div>

        <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          Referensi API Morvexa
        </h1>
        <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[#a1a1aa]">
          Satu endpoint untuk Anthropic, OpenAI, DeepSeek dan Gemini. Ganti base URL pada SDK Anda,
          sisanya tetap sama.
        </p>

        {/* Base URL + auth */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#f97316]">
              Base URL
            </div>
            <code className="mt-2 block select-all rounded bg-[#08080a] px-3 py-2 font-mono text-[12.5px] text-[#f4f4f5]">
              https://&lt;domain-anda&gt;/api/v1
            </code>
          </div>
          <div className="rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#f97316]">
              Autentikasi
            </div>
            <code className="mt-2 block select-all rounded bg-[#08080a] px-3 py-2 font-mono text-[12.5px] text-[#f4f4f5]">
              Authorization: Bearer mvx_live_...
            </code>
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-[#a1a1aa]">
          API key dibuat dari portal kustomer setelah email diverifikasi. Secret hanya ditampilkan
          sekali saat pembuatan; yang tersimpan di server hanya digest SHA-256-nya, sehingga key
          tidak dapat dipulihkan bila hilang.
        </p>
        <aside className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-[13px] leading-relaxed text-[#d4d4d8]">
          <strong className="text-amber-200">Catatan paket gratis:</strong> hosting Vercel, database Supabase, dan email Brevo memiliki batas free-tier yang dapat berubah. Morvexa tidak mengenakan biaya untuk pemeriksaan daftar model, tetapi panggilan inferensi menggunakan kuota/harga provider AI Anda. Kunci API gratis tidak menjamin semua model atau volume gratis; periksa batas dan billing provider sebelum mengirim prompt.
        </aside>

        {/* Endpoints */}
        <h2 className="mt-12 text-[20px] font-semibold tracking-tight">Endpoint</h2>
        <div className="mt-4 space-y-3">
          {ENDPOINTS.map((endpoint) => (
            <div
              key={endpoint.path}
              className="rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11] px-5 py-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[11px] font-bold ${
                    endpoint.method === "GET"
                      ? "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]"
                      : "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]"
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="font-mono text-[13px] text-[#f4f4f5]">{endpoint.path}</code>
                <span className="ml-auto rounded border border-[#f4f4f5]/12 bg-[#16161b] px-2 py-0.5 font-mono text-[10.5px] text-[#a1a1aa]">
                  {endpoint.auth}
                </span>
              </div>
              <h3 className="mt-2.5 text-[14.5px] font-semibold text-[#f4f4f5]">
                {endpoint.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#a1a1aa]">{endpoint.summary}</p>
            </div>
          ))}
        </div>

        {/* Quickstart */}
        <h2 className="mt-12 text-[20px] font-semibold tracking-tight">Mulai cepat</h2>
        <div className="mt-4 space-y-4">
          {EMBEDDING_OPTIONS.map((option) => (
            <div
              key={option.label}
              className="overflow-hidden rounded-lg border border-[#f4f4f5]/10 bg-[#0e0e11]"
            >
              <div className="border-b border-[#f4f4f5]/8 px-4 py-2.5 font-mono text-[11.5px] uppercase tracking-wide text-[#a1a1aa]">
                {option.label}
              </div>
              <pre className="overflow-x-auto bg-[#08080a] px-4 py-4 font-mono text-[12.5px] leading-relaxed text-[#f4f4f5]">
                <code>{option.code}</code>
              </pre>
            </div>
          ))}
        </div>

        {/* Quota + rate limit */}
        <h2 className="mt-12 text-[20px] font-semibold tracking-tight">
          Kuota dan rate limit
        </h2>
        <ul className="mt-4 space-y-2.5 text-[13.5px] leading-relaxed text-[#a1a1aa]">
          <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f97316]" />
            <span>
              Batas <strong className="font-semibold text-[#f4f4f5]">RPM per kunci</strong> ditegakkan
              di edge. Respons 429 menyertakan header <code className="font-mono text-[12px]">Retry-After</code>,{" "}
              <code className="font-mono text-[12px]">X-RateLimit-Limit</code>,{" "}
              <code className="font-mono text-[12px]">X-RateLimit-Remaining</code> dan{" "}
              <code className="font-mono text-[12px]">X-RateLimit-Reset</code>.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f97316]" />
            <span>
              Kuota <strong className="font-semibold text-[#f4f4f5]">permintaan rolling 5 jam dan 7 hari</strong>{" "}
              berlaku untuk model standar, ditambah kuota token harian dan mingguan untuk model frontier.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f97316]" />
            <span>
              Pemakaian token dicatat per akun dan tampil di portal kustomer, lengkap dengan riwayat order.
            </span>
          </li>
        </ul>

        {/* Errors */}
        <h2 className="mt-12 text-[20px] font-semibold tracking-tight">Format error</h2>
        <p className="mt-3 text-[13.5px] leading-relaxed text-[#a1a1aa]">
          Error mengikuti bentuk OpenAI/Anthropic:{" "}
          <code className="font-mono text-[12px]">
            {"{ \"error\": { \"type\": \"...\", \"message\": \"...\" } }"}
          </code>
          .
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-[#f4f4f5]/10">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#0e0e11] font-mono text-[11px] uppercase tracking-wide text-[#71717a]">
              <tr>
                <th className="px-4 py-2.5">HTTP</th>
                <th className="px-4 py-2.5">type</th>
                <th className="px-4 py-2.5">Arti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f5]/8">
              {ERRORS.map((error) => (
                <tr key={error.code}>
                  <td className="px-4 py-2.5 font-mono text-[#f4f4f5]">{error.code}</td>
                  <td className="px-4 py-2.5 font-mono text-[#a1a1aa]">{error.type}</td>
                  <td className="px-4 py-2.5 text-[#a1a1aa]">{error.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-[12.5px] leading-relaxed text-[#71717a]">
          Butuh status layanan? Lihat{" "}
          <Link href="/status" className="text-[#fdba74] underline-offset-4 hover:underline">
            halaman status
          </Link>{" "}
          atau baca{" "}
          <code className="rounded bg-[#16161b] px-1.5 py-0.5 font-mono text-[11.5px] text-[#a1a1aa]">
            GET /api/v1/status
          </code>
          .
        </p>
      </main>
    </div>
  );
}
