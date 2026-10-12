# Morvexa AI Server Master — Cost & Hosting Strategy

**Principle**: Free-Tier First, Fair-Use Compliant, Scalable Unit Economics  

---

## 1. Analisis Batasan Hosting & Ketentuan Layanan

### 1.1 Vercel Hobby Limitations & Fair Use
- **Ketentuan Fair Use**: Vercel Hobby ditujukan khusus untuk keperluan personal/nonkomersial. Ketentuan eksplisit Vercel mengecualikan fungsi "Proxy and VPN services" dari fair-use:
  > *Exclusions: Proxy and VPN services.* ([Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines))
- **Execution Timeout**: Vercel Serverless Functions di Hobby dibatasi hingga 10-15 detik. Ini menimbulkan risiko timeout pada streaming respons AI yang membutuhkan penalaran panjang (*extended thinking / high-token generation*).
- **Strategi Morvexa**:
  1. **Public Frontend & Marketing / Dashboard**: Dapat di-host di Vercel untuk preview, dokumentasi, dan antarmuka web.
  2. **Production Commercial Gateway**: Arsitektur Hono yang dibuat portabel dipersiapkan agar dapat dideploy ke **Cloudflare Workers (Free Tier: 100k req/day)**, **Fly.io**, atau **VPS kustom** (Hetzner / Oracle Cloud Always Free) tanpa vendor lock-in.

---

## 2. Peta Free-Tier Layanan Terintegrasi

| Layanan | Peran | Paket | Batasan Free-Tier | Mitigasi / Fallback |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase** | Database Postgres & SSR Auth | Free Tier | 500 MB database, 50k monthly active users | Automated data pruning pada request log lama (>30 hari). |
| **Upstash Redis** | Global Rate Limiting & Ephemeral Cache | Free Tier | 10,000 commands/hari | In-memory token bucket fallback lokal jika Upstash tidak terkonfigurasi. |
| **Midtrans** | Payment Processing | Sandbox Mode | Unlimited test transactions (Rp 0 biaya) | Sandbox mode aktif secara default (`PAYMENT_SANDBOX_MODE=true`). |
| **Cloudflare** | DNS, CDN, DDoS Shield, Ingress Tunnel | Free Tier | Unlimited bandwidth CDN, 100k worker req/day | Mengamankan IP asal dan SSL gratis. |

---

## 3. Aturan Pengendalian Biaya AI Upstream

1. **Anti-Shock Billing**:
   - Gateway menolak request jika saldo atau kuota rolling-window pengguna habis sebelum meneruskan panggilan ke upstream provider berbayar.
2. **Usage Ledger Reconciliation**:
   - Token dihitung berdasarkan output riil yang dilaporkan provider (`provider-reported`), bukan tebakan sepihak.
   - Jika provider tidak mengembalikan data token, status penggunaan dicatat sebagai `estimated`.
3. **Pemberitahuan Transparan**:
   - Tidak ada biaya komersial yang dipotong tanpa transaksi pembayaran yang statusnya tervalidasi via webhook resmi (`status: 'settlement' | 'capture'`).
