# Product Requirement Document (PRD)
## Morvexa Nexus — Enterprise AI Gateway & B2B SaaS Management Platform

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Role:** Principal / Senior Product Manager  
**Date:** 2026-10-11  

---

## 1. Problem Statement — Siapa yang Dirugikan dan Kenapa

### Latar Belakang & Konteks Masalah
Dalam ekosistem adopsi Generative AI saat ini, organisasi teknologi (startup hingga enterprise) menghadapi ketergantungan kritis pada penyedia LLM tunggal (Anthropic, OpenAI, DeepSeek, Google Gemini). Ketika provider utama mengalami lonjakan latensi, *rate-limit* (HTTP 429), atau *outage*, seluruh aplikasi hilir pelanggan langsung lumpuh tanpa mekanisme failover otomatis.

### Siapa yang Dirugikan?
1. **CTO, VP of Engineering, & Tech Leads**:
   - *Problem*: Mengalami pembengkakan biaya tak terkontrol karena developer internal memakai model mahal tanpa kuota rolling (*rolling quota caps*).
   - *Dampak*: Rawan insiden produksi akibat downtime upstream AI tanpa ada mitigasi otomatis (SLA bisnis terlanggar).
2. **Software Engineers & AI Developers**:
   - *Problem*: Terpaksa menulis ulang kode adapter berkali-kali untuk format request/response SDK yang berbeda-beda serta mengelola API keys yang rentan bocor.
   - *Dampak*: Waktu engineering habis untuk boilerplate proxy alih-alih fokus pada fitur inti produk.
3. **Product Managers & Finance / Operations Teams**:
   - *Problem*: Buta terhadap telemetri konsumsi per-fitur atau per-klien dan proses rekonsiliasi tagihan pembayaran payment gateway yang manual dan lambat.
   - *Dampak*: Kegagalan penagihan berulang (*revenue leakage*) dan margin keuntungan AI yang terus tergerus.
4. **End-User / Konsumen Akhir**:
   - *Problem*: Mengalami response timeout atau error aplikasi tiba-tiba ketika upstream AI bermasalah.

---

## 2. Target User & Personas

### Primary Segments:
- **Teknis**: CTO, Platform Architect, Backend/AI Engineer.
- **Bisnis & Operasional**: Founder/CEO, Finance Lead, Customer Operations Lead.

---

### Persona 1: Rian (34 th) — VP of Engineering di Tech Startup B2B
- **Background**: Memimpin tim 25 engineers yang membangun aplikasi SaaS analitik berbasis AI.
- **Goals**:
  - Menjaga SLA ketersediaan AI tetap di atas 99.9% tanpa membebani tim on-call.
  - Membatasi konsumsi token harian per developer/proyek agar biaya bulanan terkendali.
  - Memiliki satu endpoint tunggal yang kompatibel dengan standar Anthropic dan OpenAI.
- **Pain Points**:
  - Sering mengalami *downtime* saat jam sibuk akibat rate-limit Anthropic Sonnet.
  - API keys perusahaan pernah bocor ke repository publik karena tidak ada rotasi otomatis dan enkripsi server-authoritative.
  - Tidak tahu model mana yang paling lambat (kurang metrik TTFT - *Time-To-First-Token*).

---

### Persona 2: Sarah (29 th) — Head of Operations & Finance di Agensi AI
- **Background**: Bertanggung jawab atas pengelolaan langganan 50+ klien korporat dan rekonsiliasi pembayaran.
- **Goals**:
  - Menagih biaya langganan klien secara otomatis melalui payment gateway lokal (Midtrans: QRIS, VA, Kartu Kredit).
  - Memantau metrik bisnis (MRR, churn, volume request 24 jam) di satu dashboard kontrol sentral.
  - Menghindari dispute transaksi berkat rekonsiliasi status gateway yang sinkron otomatis.
- **Pain Points**:
  - Banyak invoice tertahan status *pending* berminggu-minggu karena webhook gateway gagal terkirim (*dropped webhook*).
  - Tim finance harus mencocokkan mutasi rekening secara manual dengan log akses sistem.

---

## 3. Goals & Non-Goals

### Product Goals:
1. **Universal Zero-Downtime Proxy**: Menyediakan gateway edge dengan *intelligent auto-failover* ke model alternatif ketika provider utama down/rate-limited dalam waktu < 200ms.
2. **Dual Rolling Quota Guard**: Menerapkan mekanisme pembatasan konsumsi ganda (5-Hour Rolling Request Window & 24h/7d Rolling Token Cap).
3. **Automated Monetization & Billing**: Mengotomatiskan registrasi, checkout langganan Midtrans, verifikasi webhook signature SHA-512, dan rekonsiliasi audit trail secara terjadwal.
4. **Zero AI-Slop Executive Experience**: Menghadirkan dashboard operasional sentral (Nexus Control Plane) berdensitas tinggi dengan monospace typography presisi, live regional radar, dan double-entry ledger.

### Non-Goals:
1. **Bukan Model Hosting / Training Engine**: Platform ini bukan tempat melatih (*pre-training / fine-tuning*) bobot LLM dari nol, melainkan *routing gateway, management control plane, and policy enforcer*.
2. **Bukan Pengganti General Identity Provider**: Tidak membuat identity provider global (seperti Google Workspace / Okta), melainkan memanfaatkan standar Supabase Auth SSR / OAuth / Session Cookies yang aman.
3. **Bukan Platform Analitik BI Bebas (Ad-hoc BI Query)**: Fokus analitik khusus pada telemetri AI gateway (RPS, TTFT, Token Usage, Provider Health, Financial Ledger).

---

## 4. User Stories (Agile Standard Format)

| ID | As a... | I want to... | So that... | Acceptance Criteria (Gherkin format) |
|---|---|---|---|---|
| **US-01** | Developer | Mengirim prompt ke endpoint `/api/v1/messages` menggunakan API key Morvexa | Saya tidak perlu mengganti SDK Anthropic yang sudah terpasang | **Given** valid `mvx_live_...` key, **When** client POST ke endpoint, **Then** response streaming SSE diterima dengan header TTFT. |
| **US-02** | CTO | Menetapkan batasan kuota rolling per API Key | Budget perusahaan tidak jebol akibat infinite loop kode pengembang | **Given** kuota 5-jam habis, **When** request baru masuk, **Then** gateway memblokir dengan status `HTTP 429 Too Many Requests` sebelum menyentuh upstream. |
| **US-03** | Developer | Gateway melakukan failover otomatis saat upstream 429 | Aplikasi pengguna saya tidak pernah menerima error downtime | **Given** Anthropic return 429, **When** failover aktif, **Then** router otomatis meneruskan payload ke DeepSeek V3 tanpa interupsi stream. |
| **US-04** | Customer Owner | Berlangganan plan melalui pembayaran Midtrans QRIS/VA | Entitlement akun saya otomatis aktif seketika pembayaran lunas | **Given** pembayaran berhasil di Midtrans, **When** webhook SHA-512 diterima, **Then** status beralih ke `active` dan invoice `INV-...` terbit. |
| **US-05** | Finance Lead | Sistem menjalankan rekonsiliasi transaksi otomatis | Transaksi tertunda karena network timeout tetap terverifikasi | **Given** transaksi pending > 5 menit, **When** cron job berjalan, **Then** status diperbarui sesuai gateway authoritative status. |
| **US-06** | Platform Owner | Melihat live audit logs dan memicu cron secara manual di UI | Saya memiliki kendali dan visibilitas penuh atas integritas keamanan | **Given** admin menekan tombol "Trigger Cron", **When** API selesai dieksekusi, **Then** tabel audit menampilkan event `CRON_JOB_EXECUTED`. |

---

## 5. Roadmap & Prioritisasi Fitur (MVP / V2 / Nanti)

```
+---------------------------------------------------------------------------------------+
|  FASE 1: MVP (Must-Have - Selesai & Beroperasi)                                       |
|  - Universal Edge Proxy (/v1/messages & /v1/chat/completions)                         |
|  - Dual Rolling Quota Engine (5h Request & 24h Token)                                 |
|  - Cryptographic API Key Lifecycle (SHA-256 Hashing, Masking, Instant Revocation)     |
|  - Midtrans Sandbox/Prod Integration (SHA-512 Signature & Replay Defense)             |
|  - Nexus Control Plane UI & Customer Portal (High-density telemetry dashboard)        |
|  - Automated Reconciliation Engine & Vercel Cron Trigger                              |
|  - Append-Only Security Audit Logging Engine                                          |
|  - Hybrid Local Private Host Adapter (localhost:5002)                                 |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  FASE 2: V2 (Target Q4 / Next Release)                                                |
|  - Multi-Gateway Support (Xendit Invoice & Stripe USD Checkout)                       |
|  - Semantic Prompt Caching & Embeddings Cache (Mereduksi biaya token hingga 40%)      |
|  - Dynamic PII Masking & Data Loss Prevention (Regex/NER filter sebelum kirim prompt) |
|  - SSO Integration (SAML 2.0 / Okta / Azure AD untuk Enterprise Tier)                 |
|  - Team Member Invitation & Role Granularity via Email Magic Links                    |
+-------------------------------------------+-------------------------------------------+
                                            │
                                            ▼
+---------------------------------------------------------------------------------------+
|  FASE 3: Nanti / Future Horizon                                                       |
|  - Automated LLM Fine-Tuning & Distillation Pipeline                                  |
|  - On-Premises Air-Gapped Appliance Deployment (Podman/Kubernetes Helm Charts)        |
|  - Multi-Cloud Cost Arbitrage (Auto-routing ke provider termurah secara real-time)    |
|  - Autonomous AI Agent Sandboxing & Dynamic E2B Box Execution                         |
+---------------------------------------------------------------------------------------+
```

---

## 6. Functional Requirements Detail per Fitur MVP

### FR-1: Gateway Routing & Multi-Provider Failover
- **Input**: Permintaan HTTP POST format Anthropic (`/v1/messages`) atau OpenAI (`/v1/chat/completions`) membawa header `Authorization: Bearer mvx_live_...`.
- **Proses**:
  1. Hashing SHA-256 kredensial masuk dan pencocokan ke database/in-memory store (< 2ms).
  2. Evaluasi status `isActive`, sliding-window rate limit RPM, dan rolling quota.
  3. Pemilihan provider berdasarkan bobot prioritas routing: `Anthropic Sonnet` -> `DeepSeek V3` -> `Gemini Flash` -> `Private Server 5002`.
  4. Deteksi error HTTP upstream (429/500/503/Timeout). Jika gagal, otomatis switch ke target berikutnya.
- **Output**: Chunk SSE data stream berlatensi rendah ke klien dengan metrik TTFT, total durasi, dan token count.

### FR-2: Dual Rolling Quota Engine
- **Mekanisme**:
  - *Standard Tier*: Menghitung jendela geser (*sliding window*) 5 jam terakhir. Pemulihan slot kuota terjadi secara bertahap setiap detik saat request lama melewati batas 5 jam.
  - *Frontier Tier*: Menghitung akumulasi token 24 jam dan 7 hari.
- **Enforcement**: Menolak request dengan `429 Too Many Requests` disertai header `Retry-After: <seconds>` jika kuota terlampaui.

### FR-3: Midtrans Payment & Idempotent Webhook
- **Signature Auth**: Wajib memvalidasi tanda tangan `SHA512(order_id + status_code + gross_amount + ServerKey)` menggunakan `crypto.timingSafeEqual` untuk mencegah *timing attack*.
- **Idempotency & Replay Defense**:
  - Mencatat `eventId` transaksi ke tabel `payment_webhook_events`.
  - Jika webhook dengan ID yang sama masuk berulang kali, kembalikan `HTTP 200 OK` tanpa memproses ulang status akun (*idempotent acknowledgement*).
- **State Machine**: Mencegah regresi status (transaksi `settled` tidak boleh mundur menjadi `pending` atau `expired`).

### FR-4: Scheduled Background Reconciliation (Cron)
- **Otorisasi**: Memeriksa header `Authorization: Bearer ${CRON_SECRET}` pada rute `/api/cron/reconcile` dan `/api/cron/subscriptions`.
- **Logika**:
  - Menelusuri semua transaksi berstatus `pending` > 5 menit.
  - Menanyakan status otoritatif ke payment gateway.
  - Jika status di gateway sudah `settlement`, secara otomatis menyelesaikan transaksi internal, mengaktifkan langganan, dan menerbitkan nomor faktur `INV-YYYYMMDD-XXXXXX`.
  - Transaksi `pending` > 24 jam ditandai otomatis sebagai `expired`.

### FR-5: Append-Only Security Audit Logging
- **Karakteristik**: Bersifat *immutable* (tidak menyediakan aksi edit maupun delete).
- **Cakupan Aksi**: Merekam pembuatan kunci, pencabutan kunci, mutasi role, checkout pembayaran, webhook, dan eksekusi cron.
- **Akses**: Dapat difilter via `GET /api/audit/logs` dan disajikan live di konsol Nexus UI.

---

## 7. Sketsa Data Model (Entitas & Field Kunci)

```
+-------------------+       1:N       +-------------------------+
|   organizations   | <-------------- |   organization_members  |
+-------------------+                 +-------------------------+
| id (UUID, PK)     |                 | id (UUID, PK)           |
| name (VARCHAR)    |                 | org_id (UUID, FK)       |
| slug (VARCHAR, UQ)|                 | user_id (UUID, FK)      |
| plan_tier (TEXT)  |                 | role (9-Tier RBAC)      |
+-------------------+                 +-------------------------+
          │ 1:N                                    │
          │                                        │
          ▼ 1:N                                    ▼ 1:N
+-------------------+                 +-------------------------+
|     api_keys      |                 |       audit_logs        |
+-------------------+                 +-------------------------+
| id (UUID, PK)     |                 | id (UUID, PK)           |
| org_id (UUID, FK) |                 | actor_id (UUID, FK)     |
| key_prefix (TEXT) |                 | action (TEXT)           |
| key_hash (SHA256) |                 | entity_type (TEXT)      |
| masked_key (TEXT) |                 | entity_id (TEXT)        |
| rate_limit_rpm    |                 | metadata (JSONB)        |
| is_active (BOOL)  |                 | created_at (TIMESTAMPTZ)|
+-------------------+                 +-------------------------+
          │
          ▼ 1:N
+------------------------------------+
|       payment_transactions         |
+------------------------------------+
| id (UUID, PK)                      |
| org_id (UUID, FK)                  |
| order_id (TEXT, UQ)                |
| gross_amount (NUMERIC)             |
| status (pending/settled/expired)   |
| invoice_id (TEXT, UQ)              |
| idempotency_key (TEXT, UQ)         |
+------------------------------------+
```

---

## 8. Edge Cases & Failure States

1. **Midtrans Webhook Datang Sebelum Checkout Redirect Selesai**:
   - *Penanganan*: State engine dirancang *event-driven*. Jika webhook tiba lebih dahulu, database langsung berstatus `settled` dan subscription langsung aktif; redirect browser hanya bertugas membaca status mutakhir.
2. **Koneksi Internet Putus Saat SSE Streaming Sedang Berjalan**:
   - *Penanganan*: Gateway menangkap event `request.signal.aborted`, segera menutup koneksi upstream agar tidak terjadi pemborosan kuota token yang tidak terkirim ke klien.
3. **Penyusupan Request dengan API Key yang Baru Saja Dicabut**:
   - *Penanganan*: Karena pencarian hash SHA-256 dilakukan secara real-time pada setiap request tanpa caching lama (> 5 detik), key berstatus `isActive: false` langsung ditolak dengan `401 Unauthorized` seketika.
4. **Terjadi Split-Brain / Amount Mismatch pada Transaksi**:
   - *Penanganan*: Engine rekonsiliasi menandai discrepancy `AMOUNT_MISMATCH` dengan severity `critical`, tidak mengaktifkan subscription secara otomatis, dan memunculkannya di dashboard Nexus untuk review manual tim finance.

---

## 9. Success Metrics (KPI & OKR)

| Metrik | Target Keberhasilan | Cara Pengukuran |
|---|---|---|
| **Gateway Availability / SLA** | ≥ 99.95% Uptime | Persentase HTTP 200/2xx terhadap total request gateway |
| **Failover Switch Latency** | < 250ms | Waktu dari error upstream pertama hingga chunk pertama provider cadangan |
| **Average Time-To-First-Token (TTFT)** | < 180ms | Telemetri agregat di dashboard `/api/v1/metrics` |
| **Payment Reconciliation Zero-Drift** | 100% Unsettled Orders resolved < 15 menit | Jumlah transaksi tertunda yang sukses dituntaskan oleh Vercel cron |
| **Automated Test Coverage** | 100% Pass pada core test suites (64/64 tests) | Pipeline CI Vitest pada setiap commit |

---

## 10. Open Questions (Pertanyaan Terbuka untuk Diskusi Lanjutan)

1. **Kebijakan PPN 11% Indonesia**: Apakah nominal harga paket pada tabel `plan_versions` sudah termasuk PPN 11% (inclusive tax) atau perlu ditambahkan komponen pajak terpisah pada faktur `INV-...`?
2. **Batas Toleransi Grace Period**: Jika langganan gagal diperpanjang (*past due*), berapa hari masa tenggang (*grace period*) yang diberikan sebelum seluruh API key organisasi dinonaktifkan otomatis (rekomendasi: 3 hari)?
3. **Kebijakan Penyimpanan Log Audit**: Apakah entri `audit_logs` akan disimpan selamanya (*infinite retention*) atau dipindahkan (*cold storage archive*) ke Object Storage setelah 365 hari untuk menghemat kapasitas database?
