# Morvexa AI Server Master ⚡

> **Universal AI Gateway, BYOK Secret Vault & Cinematic 3D Control Plane**  
> Built with Next.js 15, Hono.js Edge Router, Supabase PostgreSQL with RLS, AES-256-GCM BYOK Vault, Midtrans Payment Adapter, Tailwind CSS v4, and Zero-Buffer SSE Streaming.

---

## 🌟 Fitur Utama & Arsitektur Dual-Layer

### A. Public Experience (Layer A)
1. **Cinematic 3D Hero Experience**:
   - Geodesic Neural Core interaktif dengan pencahayaan neon mint dan tracking kursor pengguna.
   - Mode fallback otomatis *prefers-reduced-motion* yang ramah baterai dan mobile.
   - Mengusung palet Obsidian (`#010302`), Forest Green (`#355C49`), Soft Mint White (`#F0FEF8`), dan Neon Mint (`#1CE172`).
2. **Developer Ingress Quickstart**:
   - Contoh cURL langsung untuk endpoint kompatibel Anthropic & OpenAI.
   - Model Registry terverifikasi (Claude 3.7 Sonnet, GPT-4o, DeepSeek V3, Gemini 2.0 Flash).
3. **Peta Keamanan Zero-Leak**:
   - Dokumentasi transparan batas rahasia master dan mitigasi OWASP Top 10 API Security.

### B. Morvexa Control Plane (Layer B)
1. **Universal Model Gateway Runtime (Hono Edge Engine)**:
   - Endpoint `/api/v1/messages` (Anthropic format) & `/api/v1/chat/completions` (OpenAI format).
   - Zero-buffer Server-Sent Events (SSE) streaming dengan latensi ultra-rendah.
   - Intelligent multi-provider automatic failover: `Anthropic -> DeepSeek V3 -> Groq -> Gemini -> Private Server`.
2. **Cryptographic API Key Management**:
   - Pembuatan kunci menggunakan CSPRNG (`crypto.randomBytes(24)`).
   - Format: `mvx_live_<hex>` dan `mvx_test_<hex>`.
   - Penyimpanan berbasis hash **SHA-256**, plaintext hanya ditampilkan satu kali saat pembuatan.
3. **BYOK (Bring Your Own Key) Secret Vault**:
   - Kredensial provider milik pelanggan dienkripsi dengan standar **AES-256-GCM** (Envelope Encryption).
   - Rahasia provider tidak pernah disimpan dalam bentuk plaintext di database atau terekspos ke browser.
4. **Dual Rolling Quota Engine**:
   - **Model Standar**: 5-Jam rolling request cap dengan countdown pemulihan per detik + 7-Hari rolling window.
   - **Model Frontier**: Token cap harian (24 jam) dan mingguan (7 hari).
5. **Billing Ledger & Automated Reconciliation**:
   - Integrasi Midtrans Snap sandbox checkout dengan verifikasi signature SHA-512.
   - Mesin rekonsiliasi otomatis (`runAutomatedReconciliation`) mencegah drifting status order dan tampered amounts.
   - Endpoint cron terjadwal (`/api/cron/reconcile` dan `/api/cron/subscriptions`).

---

## 🛠️ Tech Stack & Dependensi

* **Frontend:** Next.js 15 (App Router, React 19)
* **Styling:** Tailwind CSS v4 (@theme token system)
* **Edge Proxy:** Hono.js Engine (`src/app/api/[[...route]]/route.ts`)
* **Encryption Vault:** Node.js Crypto (AES-256-GCM Envelope Encryption)
* **Database & Auth:** Supabase (PostgreSQL, 9-tier RBAC, Declarative RLS)
* **Payments:** Midtrans Gateway SDK (Sandbox & Production ready)
* **Automated Testing:** Vitest (**67 passing test cases**)

---

## 🚀 Menjalankan Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan unit & integration tests (67 passing tests)
npm test

# 3. Jalankan development server
npm run dev

# 4. Build untuk produksi
npm run build
```

---

## 📚 Dokumentasi Arsitektur & Audit

Seluruh laporan audit dan arsitektur tersedia di direktori `docs/`:
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md): Laporan inventarisasi stack, keputusan KEEP/EXTEND, dan pemetaan endpoint.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Diagram topologi multi-layer (Experience, Gateway, Data, Operations).
- [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md): Matriks status riil fitur (Verified Working, Partially Working, Mock, Blocked).
- [docs/SECURITY_BASELINE.md](docs/SECURITY_BASELINE.md): Threat model OWASP Top 10 dan batas secret boundaries.
- [docs/COST_AND_HOSTING.md](docs/COST_AND_HOSTING.md): Analisis batasan Vercel Hobby & panduan free-tier infrastructure.
