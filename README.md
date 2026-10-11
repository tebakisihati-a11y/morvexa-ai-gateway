# Morvexa Master Sistem ⚡ (Morvexa Nexus Control Plane & AI Gateway)
 
> **Enterprise SaaS Control Plane, AI Gateway & Hybrid Multi-Tenant Management**  
> Built with Next.js 15, Hono.js Edge Router, Supabase PostgreSQL with RLS, Midtrans Payment Adapter, Tailwind CSS v4, and Zero AI-Slop Design.

---

## 🌟 Fitur Utama

1. **Nexus Centralized Control Plane**:
   * Dashboard eksekutif memantau MRR, total tenant, volume traffic gateway, dan margin laba.
   * Manajemen multi-organisasi & sub-tenansi proyek dengan 9-tier RBAC (`PLATFORM_OWNER` hingga `PUBLIC_USER`).
   * Visualisasi buku besar keuangan (*Double-Entry Ledger*) dan riwayat penagihan per tenant.

2. **Dual Rolling Quota Engine**:
   * **Skema Model Standar**: 5-Jam rolling request cap dengan countdown pemulihan live per detik + 7-Hari rolling window.
   * **Skema Model Frontier**: Token cap harian (24 jam) dan mingguan (7 hari).

3. **Multi-Provider Intelligent Failover**:
   * Kompatibilitas penuh Anthropic Messages API (`/api/v1/messages`) dan OpenAI API (`/v1/chat/completions`).
   * Failover otomatis saat upstream rate-limit (Anthropic -> DeepSeek V3 -> Groq -> Gemini -> Private Local Host).
   * Verifikasi kunci API berbasis SHA-256 dan sliding-window rate limiter per tenant.

4. **Automated Financial Reconciliation & Indonesian Payments**:
   * Integrasi Midtrans Snap sandbox adapter dengan verifikasi tanda tangan SHA-512 dan pencegahan replay.
   * Mesin rekonsiliasi otomatis (`runAutomatedReconciliation`) mendeteksi `UNSETTLED_CAPTURE`, `AMOUNT_MISMATCH`, dan `EXPIRED_CLEANUP`.
   * Background cron job terjadwal di Vercel (`/api/cron/reconcile` dan `/api/cron/subscriptions`).

5. **Hybrid Shared & Dedicated Infrastructure**:
   * Mendukung alur routing Shared Edge dan Dedicated Node lokal (`localhost:5002`).
   * Automated health probe tracking untuk mendeteksi latency dan uptime node terdedikasi.

6. **Append-Only Security Audit Trail**:
   * Pencatatan log terstruktur untuk seluruh mutasi sensitif (pembuatan/pencabutan kunci, mutasi role, transaksi, dan eksekusi cron).
   * Live audit log viewer interaktif di UI tab Nexus.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 15 (App Router, React 19)
* **Styling:** Tailwind CSS v4 (@theme token system)
* **Edge Proxy:** Hono.js Edge Engine (`src/app/api/[[...route]]/route.ts`)
* **Database & Auth:** Supabase (PostgreSQL, 9-tier RBAC, Declarative RLS)
* **Payments:** Midtrans Gateway SDK (Sandbox & Production ready)
* **Automated Testing:** Vitest (64 passing test cases)

---

## 🚀 Menjalankan Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan unit & integration tests
npm test

# 3. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk mengakses konsol gateway dan Nexus Control Plane.

---

## 📖 Dokumentasi Teknis

* **[Arsitektur Sistem (docs/architecture/SYSTEM_ARCHITECTURE.md)](docs/architecture/SYSTEM_ARCHITECTURE.md)**
* **[Skema Basis Data (docs/database/SCHEMA.md)](docs/database/SCHEMA.md)**
* **[Kontrak API (docs/api/API_CONTRACTS.md)](docs/api/API_CONTRACTS.md)**
* **[Panduan Siklus Pembayaran (docs/billing/PAYMENT_LIFECYCLE.md)](docs/billing/PAYMENT_LIFECYCLE.md)**
* **[Arsitektur Infrastruktur Hybrid (docs/infrastructure/HYBRID_MODEL.md)](docs/infrastructure/HYBRID_MODEL.md)**
* **[Standar Operasional Prosedur Insiden (docs/operations/RUNBOOKS.md)](docs/operations/RUNBOOKS.md)**
* **[Roadmap Pelaksanaan (docs/implementation/ROADMAP.md)](docs/implementation/ROADMAP.md)**

