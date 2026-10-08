# Panduan Deployment 100% Gratis: Morvexa AI Gateway

Dokumen ini menjelaskan langkah demi langkah cara men-deploy **Morvexa AI Gateway** ke infrastruktur cloud publik tanpa biaya sepeser pun ($0 / bulan selamanya).

---

## 1. Persiapan Database & Auth Gratis (Supabase)

1. Buat akun gratis di [supabase.com](https://supabase.com).
2. Buat proyek baru (*New Project*):
   * Pilih region terdekat (misalnya: `Southeast Asia - Singapore`).
   * Salin database password yang Anda buat.
3. Buka menu **SQL Editor** di dashboard Supabase Anda.
4. Buka file [supabase/migrations/20261008_init.sql](../supabase/migrations/20261008_init.sql) di repository ini, salin seluruh kodenya, dan tekan **Run**.
5. Buka **Project Settings** > **API**, lalu salin:
   * `Project URL` (misal: `https://xyzcompany.supabase.co`)
   * `anon public key` (kunci publik)

---

## 2. Deploy Webapp Gratis (Vercel)

1. Buat repository baru di GitHub (misal: `morvexa-ai-gateway`) dan push seluruh kode proyek ini:
   ```bash
   git remote add origin https://github.com/username/morvexa-ai-gateway.git
   git branch -M main
   git push -u origin main
   ```
2. Buka [vercel.com](https://vercel.com) dan masuk menggunakan akun GitHub Anda.
3. Klik **Add New...** > **Project**, lalu pilih repository `morvexa-ai-gateway`.
4. Pada bagian **Environment Variables**, tambahkan:
   * `NEXT_PUBLIC_SUPABASE_URL` = (Project URL dari Supabase)
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Anon Public Key dari Supabase)
5. Klik tombol **Deploy**.
6. Dalam waktu ~60 detik, webapp dan Hono Edge API Anda telah live di URL:  
   `https://[nama-proyek].vercel.app` (Lengkap dengan sertifikat SSL gratis otomatis).

---

## 3. Menghubungkan Domain Gratis (*Custom Subdomain*)

Jika Anda menginginkan domain kustom gratis selain `*.vercel.app`:

### Opsi A: Subdomain Developer Gratis via `is-a.dev` (Rekomendasi)
1. Kunjungi repository open-source [is-a.dev di GitHub](https://github.com/is-a-dev/register).
2. Fork repository tersebut dan buat file baru di folder `domains/`:
   Misal: `domains/morvexa.json`
   ```json
   {
     "owner": {
       "username": "your-github-username",
       "email": "your-email@example.com"
     },
     "record": {
       "CNAME": "cname.vercel-dns.com"
     }
   }
   ```
3. Ajukan Pull Request. Setelah bot me-merge PR Anda (~1-12 jam), subdomain `morvexa.is-a.dev` akan aktif.
4. Di dashboard Vercel, buka **Settings** > **Domains**, tambahkan `morvexa.is-a.dev`.

### Opsi B: Subdomain `js.org`
Jika proyek Anda open-source JavaScript/TypeScript, Anda dapat mendaftarkan `[nama].js.org` secara gratis via GitHub PR ke repository `js-org/js.org`.

---

## 4. Menguji API Proxy Gateway Live

Setelah ter-deploy, aplikasi Anda siap menerima request AI format Anthropic maupun OpenAI:

```bash
# Uji format Anthropic Claude dengan streaming SSE:
curl -N -X POST https://your-domain.vercel.app/api/v1/messages \
  -H "Authorization: Bearer mvx_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-7-sonnet",
    "stream": true,
    "messages": [{"role": "user", "content": "Halo Morvexa!"}]
  }'
```
