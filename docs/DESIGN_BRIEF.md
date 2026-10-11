# Full UI & UX Design Brief
## Morvexa Nexus — Enterprise AI Gateway & B2B Control Plane

**Role:** Lead Product Designer  
**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Date:** 2026-10-11  

---

## 1. Design Principles (3 Aturan Wajib)

1. **High-Density Data Without Clutter (Precision Over Fluff)**
   - *Aturan*: Setiap piksel harus menyampaikan status sistem yang terukur. Tidak boleh ada ilustrasi dekoratif kartun, 3D floating balloon, atau animasi lambat yang membuang ruang layar.
   - *Alasan*: Pengguna kita adalah CTO, DevOps Engineer, dan Finance Lead yang membutuhkan informasi cepat (RPS, TTFT, Token Balance, Failed Webhooks) dalam satu pandangan mata tanpa perlu scrolling berlebihan.

2. **Zero AI-Slop & Industrial Honesty**
   - *Aturan*: Hindari gradasi ungu neon generik ("ChatGPT-style purple/blue gradient") dan card melengkung raksasa tanpa fungsi. Gunakan estetika konsol telemetri bergaya *Linear*, *Cloudflare Radar*, dan *Bloomberg Terminal modern*.
   - *Alasan*: Produk ini adalah infrastruktur *mission-critical* perusahaan. Kepercayaan teknis (*trust & reliability*) dibangun melalui presisi monokromatik, aksen fungsional kontras, dan ketepatan status real-time.

3. **Sub-Second Feedback & State Transparency**
   - *Aturan*: Semua aksi sensitif (mutasi key, trigger cron, switch failover, pembayaran) wajib memberikan feedback instan (< 100ms) dengan status state transparan (Loading, Success, Fallback, Denied).
   - *Alasan*: Dalam manajemen gateway dan transaksi keuangan, ambiguitas state (seperti tombol berputar tanpa label jelas) menciptakan ketakutan akan kegagalan bayar atau pemutusan traffic produksi.

---

## 2. Visual Direction

- **Mood & Atmosphere**: *Tactical, Deep Matte Obsidian, Mission-Control, Ultra-Crisp, Uncompromising Utility.*
- **Referensi Visual**:
  - **Cloudflare Radar & Workers Dashboard**: Hirarki telemetri jaringan, peta ping regional, radar latensi per milidetik.
  - **Linear App**: Ketelitian spacing 4px, keyboard navigation first, border mikro `white/5` - `white/10`, kontras teks hierarkis.
  - **Vercel Geist System**: Tipografi monospace tajam untuk data numerik, badge status heksagonal/dot berdenyut (*pulsing indicators*).
- **Apa yang Wajib Dihindari**:
  - ❌ *AI Cliché Visuals*: Robot maskot, ilustrasi abstrak otak/jaringan saraf bersinar, efek shimmer berlebihan.
  - ❌ *Gimmick Glassmorphism Blur Berat*: `backdrop-blur-2xl` yang memperlambat rendering FPS dan menurunkan keterbacaan teks angka kecil.
  - ❌ *Warna Pastel Lembut Tanpa Kontras*: Warna abu-abu pudar yang melanggar standar WCAG AA.

---

## 3. Design Tokens (Spesifikasi Eksplisit)

### A. Palet Warna (Tailored Obsidian & Tactical Accents)
Warna dasar dipilih hitam obsidian matte untuk mengurangi kelelahan mata operator yang memantau konsol sepanjang hari:

| Token Name | Hex Code | Deskripsi & Alasan Pemilihan |
|---|---|---|
| `--bg-canvas` | `#08080a` | Background kanvas paling dasar. Lebih dalam dari abu-abu umum, memberikan kontras mutlak. |
| `--bg-surface` | `#0e0e11` | Surface container card dan tabel data. Memberikan layer elevasi tanpa bayangan tebal. |
| `--bg-surface-elevated` | `#16161b` | Surface modal, dropdown menu, dan drawer inspektur. |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Border pembatas kontainer berpresisi 1px, membagi modul data secara rapi. |
| `--border-strong` | `rgba(255,255,255,0.15)` | Border status interaktif, input focus, dan tombol aktif. |
| `--text-primary` | `#f4f4f5` | Zinc-100: Kontras maksimal untuk angka, heading, dan nilai penting. |
| `--text-secondary` | `#a1a1aa` | Zinc-400: Label metrik, timestamp, dan deskripsi field. |
| `--text-muted` | `#71717a` | Zinc-500: Placeholder, metadata minor, hash prefix. |
| `--accent-orange` | `#f97316` | Orange-500 (Brand Morvexa): Aksen primer kontrol, action button, dan routing failover. |
| `--status-healthy` | `#10b981` | Emerald-500: Uptime 100%, transaksi settled, probe latency optimal. |
| `--status-warning` | `#eab308` | Amber-500: Kuota tersisa < 15%, degradasi latency, webhook retry pending. |
| `--status-danger` | `#ef4444` | Red-500: Rate limit 429, API key revoked, transaksi expired/failed. |
| `--status-info` | `#38bdf8` | Sky-400: SSE streaming event, model provider info, token trace. |

### B. Skala Tipografi
- **Primary Body Font**: `Inter` / System Sans-Serif (`font-sans`) — Keterbacaan teks antarmuka yang bersih pada skala kecil.
- **Data & Telemetry Font**: `JetBrains Mono` / `SF Mono` (`font-mono`) — **Wajib** untuk semua angka, kode model, log, API keys, dan token counter agar lebar karakter konsisten (*tabular figures*).

| Level | Size | Weight | Line Height | Tracking | Penggunaan |
|---|---|---|---|---|---|
| `Display` | 24px (1.5rem) | 700 Bold | 32px | -0.025em | Nilai utama ringkasan eksekutif (MRR, Total Tokens) |
| `Heading-1` | 18px (1.125rem) | 600 SemiBold | 24px | -0.02em | Judul Screen / Tab Level 1 |
| `Heading-2` | 14px (0.875rem) | 600 SemiBold | 20px | -0.01em | Judul Card / Modul Container |
| `Body` | 13px (0.8125rem) | 400 Regular | 18px | 0 | Deskripsi, teks form, dan instruksi |
| `Data-Mono` | 12px (0.75rem) | 500 Medium | 16px | 0 | Baris tabel, latency ms, order ID, token count |
| `Micro-Badge` | 10px (0.625rem) | 700 Bold | 12px | +0.05em | Status badge, uppercase tags (`SETTLED`, `FAILOVER`) |

### C. Skala Spacing & Layout Grid
- Base unit: `4px`.
- Skala: `4px (1)`, `8px (2)`, `12px (3)`, `16px (4)`, `24px (6)`, `32px (8)`, `48px (12)`.
- Container layout: Maksimum `1440px` dengan padding horizontal `16px` (mobile) hingga `32px` (desktop).

### D. Corner Radius & Shadow
- Corner Radius: `rounded-sm` (2px - badge), `rounded` (4px - button, input), `rounded-lg` (8px - card container). *Tidak menggunakan rounded-2xl/full kecuali avatar/dot indicator.*
- Shadows: Tidak memakai blur shadow hitam tebal. Hanya memakai inner border ring halus: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08)`.

---

## 4. Screen Inventory & Tujuannya

| Screen ID | Nama Layar | URL Path | Tujuan Utama Layar |
|---|---|---|---|
| **SCR-01** | **Nexus Master Control Plane** | `/` (Tab: Nexus) | Tinjauan tingkat eksekutif: metrik MRR, volume multi-tenant, double-entry financial ledger, dan live audit trail logger. |
| **SCR-02** | **Edge Radar & Observability** | `/` (Tab: Telemetry) | Monitoring kesehatan gateway secara global: RPS, latensi TTFT, error rate, dan status region (SIN, FRA, IAD, NRT). |
| **SCR-03** | **Dual Quota & Rate Limiter** | `/` (Tab: Quota) | Visualisasi 5-Hour rolling request window (dengan countdown pemulihan per-detik) dan 24h frontier token consumption. |
| **SCR-04** | **API Key Lifecycle & Auth** | `/` (Tab: Keys) | Membuat, merotasi, menetapkan batas RPM, serta mencabut kredensial `mvx_live_...` dengan modal rahasia sekali-tampil. |
| **SCR-05** | **Provider Mesh & Failover Map** | `/` (Tab: Routing) | Mengonfigurasi urutan prioritas upstream AI (Anthropic, DeepSeek, Gemini, Local 5002) dan aturan auto-failover. |
| **SCR-06** | **Streaming Trace Inspector** | `/` (Tab: Traces) | Audit mendalam setiap request gateway: latency per chunk SSE, token in/out, cache hit, dan riwayat failover tersimpan. |
| **SCR-07** | **Interactive Playground** | `/` (Tab: Playground) | Simulator pengujian prompt live dengan inspektur zero-buffer SSE stream langsung di browser. |
| **SCR-08** | **Billing & Self-Service Portal** | `/` (Tab: Billing) | Katalog paket langganan (Developer s/d Apex), simulasi Midtrans Snap checkout, riwayat invoice `INV-...`, dan status pembayaran. |
| **SCR-09** | **Hybrid Infrastructure Manager** | `/` (Tab: Infra) | Monitor ketersediaan Dedicated Node lokal (`localhost:5002`), eksekusi health probe manual, dan provisioning state machine. |

---

## 5. User Flows Utama (Step-by-Step Journeys)

### User Flow 1: Registrasi & Pembuatan Kunci API Baru (Developer Flow)
```
[Buka Tab Keys] ──> [Klik "+ Buat Kunci Baru"] ──> [Input Nama & Batas RPM] 
       │
       ▼
[Generate Kunci Aman (NIST SP 800-63B)] ──> [Modal: Tampilkan Rahasia Sekali Saja (mvx_live_...)]
       │
       ▼
[Salin Kunci & Tutup] ──> [Audit Trail Otomatis Catat "API_KEY_CREATED"] ──> [Kunci Aktif di Tabel (Masked)]
```

### User Flow 2: Checkout Langganan & Aktivasi Otomatis (Customer Billing Flow)
```
[Buka Tab Billing] ──> [Pilih Plan: Pro Workspace] ──> [Klik "Checkout via Midtrans"]
       │
       ▼
[Buat Checkout Session Server-Side] ──> [Muncul Midtrans Snap Modal / Redirect URL]
       │
       ▼
[Pelanggan Bayar via QRIS / VA] ──> [Midtrans Kirim Webhook SHA-512 ke /api/billing/webhook]
       │
       ▼
[Verifikasi Signature & Replay Defense] ──> [Update Transaksi: SETTLED] ──> [Terbitkan INV-YYYYMMDD-XXXXXX]
       │
       ▼
[Entitlement Akun Otomatis Upgrade] ──> [Audit Log & Ledger Mencatat Mutasi Kredit Finansial]
```

### User Flow 3: Pemulihan Insiden & Rekonsiliasi Otomatis (Ops / Admin Flow)
```
[Buka Tab Nexus] ──> [Review Tabel: Transaksi Pending > 5 Menit] 
       │
       ▼
[Klik "Trigger Cron Sekarang"] ──> [POST /api/cron/reconcile dengan Bearer Token]
       │
       ▼
[Cron Memindai Gateway Midtrans] ──> [Auto-Settle Pesanan yang Tertahan]
       │
       ▼
[Banner UI Update: "X dipindai, Y diselesaikan"] ──> [Tabel Live Audit Trail Menampilkan Event Baru]
```

---

## 6. Layout per Screen (Hierarki & Komponen)

### A. Layout Screen Nexus Master Control Plane (SCR-01)
1. **Header Banner**:
   - *Kiri*: Ikon `Building2`, judul "Nexus Master SaaS Control Plane", teks sub-judul monospace.
   - *Kanan*: Badge status hijau berdenyut: `● PLATFORM OWNER ACCESS`.
2. **Executive Metric Cards (Grid 4 Kolom)**:
   - Card 1: Monthly Recurring Revenue (Nilai Rp, indikator tren `+18.4%`).
   - Card 2: Total Organisasi Aktif (Count tenants, total registered members).
   - Card 3: 24h Gateway Traffic (Request count, rata-rata TTFT ms).
   - Card 4: Operating Gross Margin (Persentase margin, total biaya upstream).
3. **Tenant Organizations Directory**:
   - Filter Tab: `All Plans`, `Dedicated Nodes`, `Shared Edge`.
   - Tabel Data: Tenant Name, Slug, Plan Tier, Infrastructure Mode badge, Volume Reqs, Status.
4. **Buku Besar Keuangan (Double-Entry Ledger)**:
   - Tabel: Ledger ID, Timestamp, Tenant, Kategori, Debit/Credit badge, Nilai IDR, Status Settled.
5. **Live Audit Logs & Scheduled Automation Module**:
   - Header bar dengan tombol primer: `Segarkan Log` dan `Trigger Cron Sekarang`.
   - Banner notifikasi hasil eksekusi cron.
   - Tabel audit: Log ID, Timestamp, Actor, Action (oranye tebal), Resource Target, dan Status pill.

---

## 7. Component Library (Reusable Components & States)

### 1. `MetricCard`
- **Variants**: `default`, `highlight-positive`, `warning`, `danger`.
- **States**: `loading` (skeleton pulse), `empty` (tanda strip `-`), `active` (menampilkan angka).
- **Props**: `label`, `value`, `subtext`, `icon`, `trendDirection`.

### 2. `StatusBadge`
- **Variants**: 
  - `healthy`: bg-emerald-500/10, border-emerald-500/20, text-emerald-400.
  - `warning`: bg-amber-500/10, border-amber-500/20, text-amber-400.
  - `danger`: bg-red-500/10, border-red-500/20, text-red-400.
  - `neutral`: bg-white/5, border-white/10, text-zinc-400.
- **Props**: `label`, `pulsing: boolean`.

### 3. `TacticalButton`
- **Variants**:
  - `primary`: bg-orange-500/20, border-orange-500/40, text-orange-300, hover:bg-orange-500/30.
  - `secondary`: bg-white/5, border-white/10, text-zinc-300, hover:bg-white/10.
  - `danger`: bg-red-500/20, border-red-500/40, text-red-300, hover:bg-red-500/30.
- **States**: `default`, `hover`, `active`, `focused`, `disabled` (opacity 40%), `loading` (icon rotateCw spinning).

### 4. `DataTable`
- **Fitur**: Baris hover mikro `hover:bg-white/[0.01]`, header uppercase teks 10px, zebra borders halus `divide-y divide-white/5`.
- **States**: `empty` (baris khusus teks italic center), `loading` (skeleton loader), `error` (pesan kegagalan fetch).

### 5. `SecretKeyModal`
- **Fungsi**: Memperlihatkan secret raw key hanya 1 kali saat pembuatan.
- **Komponen**: Box monospace dengan tombol copy 1-klik, peringatan keamanan tebal, tombol konfirmasi "Saya sudah menyimpan kunci ini".

---

## 8. Screen States (Edge Cases & Failure Handling)

| Screen | Empty State | Loading State | Error State | Offline / Degraded State |
|---|---|---|---|---|
| **Audit Logs** | *"Belum ada event audit log tercatat dalam sesi ini."* | Baris skeleton 3 baris dengan efek opacity pulse | *"Gagal mengambil log dari gateway: [error message]. Coba lagi."* | Menampilkan cache log terakhir dengan badge kuning `CACHED OFFLINE`. |
| **API Keys** | Tombol call-to-action *"Belum ada kunci dibuat. Buat kunci pertama Anda."* | Shimmering card placeholder | *"Gagal memuat daftar kunci. Periksa koneksi Supabase."* | Kunci berstatus `isActive: false` ditandai coret merah tebal. |
| **Billing / Invoice** | *"Belum ada transaksi pembayaran untuk akun ini."* | Indikator spinner minimal pada tombol checkout | *"Pembayaran ditolak gateway / Signature invalid."* | Menampilkan tombol darurat *"Hubungi Support Finansial"*. |
| **Playground SSE** | Menampilkan editor instruksi dan tombol *"Kirim Request Stream"*. | Streaming cursor berkedip hijau dengan penghitung TTFT live | Box merah dengan detail JSON error HTTP (e.g. 401 / 429). | Indikator failover kuning *"Upstream rate-limit: dialihkan ke DeepSeek"*. |

---

## 9. Responsive Behavior & Breakpoints

- **Mobile Viewport (`< 640px`)**:
  - Tab navigasi atas dapat di-scroll secara horizontal (*snap-scrolling overflow-x*).
  - Metric Card grid otomatis ditumpuk 1 kolom penuh.
  - Tabel data mengaktifkan container `overflow-x-auto` dengan scrollbar minimalis agar tidak merusak layout viewport.
  - Modal dan drawer memenuhi 100% lebar layar mobile (*bottom-sheet style*).
- **Tablet Viewport (`640px - 1024px`)**:
  - Metric Card menjadi 2 kolom.
  - Sidebar/tab tetap terintegrasi di header horizontal.
- **Desktop Viewport (`> 1024px`)**:
  - Layout 4 kolom metrik penuh.
  - Tabel menyajikan seluruh metadata (ID, Timestamp, Tenant, Actions) tanpa pemotongan teks penting.

---

## 10. Accessibility (A11y & WCAG 2.2 Level AA)

1. **Rasio Kontras Warna**:
   - Teks utama (`#f4f4f5`) di atas background (`#08080a`) memiliki rasio kontras **17.2:1** (jauh melampaui standar WCAG AAA 7:1).
   - Teks sekunder (`#a1a1aa`) di atas background memiliki rasio kontras **8.4:1** (lulus WCAG AAA).
   - Tombol oranye dan emerald memenuhi syarat kontras 4.5:1 untuk teks berukuran 12px semi-bold.

2. **Keyboard Navigation & Focus Order**:
   - Urutan fokus DOM logis dari kiri-ke-kanan, atas-ke-bawah (`Header` -> `Tabs` -> `Filter` -> `Action Buttons` -> `Table Rows`).
   - Setiap elemen interaktif (`button`, `a`, `input`) memiliki focus outline eksplisit: `focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:outline-none`.

3. **Kebutuhan ARIA & Screen Reader Support**:
   - Tab navigasi menggunakan atribut `role="tablist"` dan `role="tab"` dengan `aria-selected="true/false"`.
   - Dot status berdenyut dilengkapi `aria-hidden="true"` dengan teks pendamping eksplisit bagi screen reader (e.g. `<span className="sr-only">Status: Aktif</span>`).
   - Modal pembuatan kunci dilengkapi `role="dialog"`, `aria-modal="true"`, dan `aria-labelledby`.
