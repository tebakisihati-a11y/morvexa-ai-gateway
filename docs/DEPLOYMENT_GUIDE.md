# Panduan Deployment: Morvexa AI Gateway

Dokumen ini menjelaskan deployment Morvexa AI Gateway ke Vercel dan Supabase.
Biaya serta batas layanan mengikuti paket dan penggunaan provider; deployment
produksi tidak dijamin selalu gratis.

---

## 1. Persiapan Database & Auth Gratis (Supabase)

1. Buat akun gratis di [supabase.com](https://supabase.com).
2. Buat proyek baru (*New Project*):
   * Pilih region terdekat (misalnya: `Southeast Asia - Singapore`).
   * Salin database password yang Anda buat.
3. Buka menu **SQL Editor** di dashboard Supabase Anda.
4. Terapkan seluruh migration secara berurutan seperti daftar dalam [SUPABASE_SETUP.md](./SUPABASE_SETUP.md), bukan hanya migration awal.
5. Buka **Project Settings** > **API**, lalu salin:
   * `Project URL` (misal: `https://xyzcompany.supabase.co`)
   * `anon public key` (kunci publik)

---

## 2. Deploy Webapp (Vercel)

1. Buat repository baru di GitHub (misal: `morvexa-ai-gateway`) dan push seluruh kode proyek ini:
   ```bash
   git remote add origin https://github.com/username/morvexa-ai-gateway.git
   git branch -M main
   git push -u origin main
   ```
2. Buka [vercel.com](https://vercel.com) dan masuk menggunakan akun GitHub Anda.
3. Klik **Add New...** > **Project**, lalu pilih repository `morvexa-ai-gateway`.
4. Tambahkan semua environment variables server-side yang tercantum dalam [SUPABASE_SETUP.md](./SUPABASE_SETUP.md), termasuk service-role key, `AUTH_SESSION_SECRET`, `OWNER_PASSCODE`, dan `ENCRYPTION_MASTER_KEY`. Jangan masukkan secret ke variabel `NEXT_PUBLIC_*`.
5. Klik tombol **Deploy**.
6. Setelah deployment berhasil, webapp dan Hono API tersedia di URL:
   `https://[nama-proyek].vercel.app` (Lengkap dengan sertifikat SSL gratis otomatis).

### Email transaksi gratis

Vercel lebih cocok memakai provider email melalui HTTPS daripada koneksi Gmail
SMTP. Untuk opsi gratis, buat akun Brevo, verifikasi alamat Gmail Anda sebagai
sender, lalu buat API key pada menu **SMTP & API → API Keys**. Tambahkan
`BREVO_API_KEY` sebagai environment variable server-side di Vercel dan
`MORVEXA_EMAIL_FROM` dengan format `Morvexa <alamat-gmail-anda>`. Jangan
menambahkan tanda kutip pada nilai sender di dashboard Vercel.

Brevo harus mengonfirmasi sender sebelum API menerima email. Tes pengiriman ke
alamat yang Anda kuasai; email yang diterima provider belum tentu masuk inbox
karena sender Gmail pihak ketiga dapat difilter sebagai spam. Tanpa autentikasi
domain sendiri, gunakan solusi ini dengan mempertimbangkan batas deliverability.
Jika `BREVO_API_KEY` dan `RESEND_API_KEY` sama-sama tersedia, aplikasi memilih
Brevo. Jangan pernah memasukkan API key ke kode, `NEXT_PUBLIC_*`, atau chat.

### Batas paket gratis dan penggunaan AI

Hosting Vercel, Supabase Free, dan Brevo Free dapat menjalankan konfigurasi
awal tanpa biaya langganan, tetapi masing-masing memiliki kuota, batas sumber
daya, dan kebijakan yang dapat berubah. Pantau dashboard penyedia dan jangan
menganggap paket gratis sebagai layanan tanpa batas. Pemeriksaan provider dari
panel Owner hanya meminta daftar model dan tidak membuat permintaan inferensi.
Sebaliknya, request chat sungguhan memakai kuota provider AI; beberapa provider
menagih per token atau memerlukan metode pembayaran. Pastikan model dan akun
provider benar-benar memiliki kuota gratis sebelum mengirim request.

Metrik panel Owner berasal dari sampel memori instance yang melayani request,
dibatasi 24 jam dan dapat terhapus saat instance serverless dimulai ulang.
Metrik ini bukan agregat global dan bukan penyimpanan audit atau laporan biaya.

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

Setelah seluruh migration dan konfigurasi production selesai serta minimal satu
provider AI terhubung, uji API dengan gateway key valid. Tanpa provider aktif,
production mengembalikan `503` dan tidak menggunakan balasan simulasi:

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

---

## 9. Troubleshooting: deploy gagal "Resource provisioning failed"

Gejala: deployment berhenti sebelum build dimulai (0 ms, tanpa log) dengan
`errorMessage "Resource provisioning failed"`, `errorCode BUILD_FAILED`. Hanya
terjadi pada satu project; project lain di akun yang sama tetap bisa deploy.
Redeploy build lama yang dulu sukses pun ikut gagal.

Penyebab: project terhubung ke Marketplace storage store (mis. Supabase) yang
statusnya `suspended`, dan store itu punya `deployments.required: true` sehingga
setiap deploy wajib provisioning resource tersebut.

Perbaikan (salah satu):

1. Resume store dari dashboard: **Vercel > Project > Integrations**, atau
   dashboard penyedia (Supabase > Restore project untuk project yang di-pause).
   Setelah pulih, deploy berikutnya jalan tanpa perubahan kode.
2. Atau lepaskan store dari project bila tidak dipakai lagi:

   ```bash
   # Cari store id yang terhubung ke project:
   curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v1/storage/stores?projectId=<PROJECT_ID>&teamId=<TEAM_ID>"
   # Lepaskan koneksi (id dari field spc_...):
   curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
     "https://api.vercel.com/v1/storage/stores/<STORE_ID>/connections/<CONNECTION_ID>?teamId=<TEAM_ID>"
   ```

   Pelepasan store juga menghapus variabel `SUPABASE_*` / `POSTGRES_*` dari
   project, jadi pastikan penyedia database pengganti sudah siap sebelum
   melakukan ini pada deployment produksi.
