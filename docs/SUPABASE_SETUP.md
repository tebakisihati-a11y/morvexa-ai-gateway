# Mengaktifkan penyimpanan akun persisten (Supabase)

Tanpa langkah ini akun kustomer hidup di memori/berkas instance dan **hilang saat
instance didaur ulang** — di Vercel, setiap deploy atau cold start. Login tetap
bekerja, tetapi akun tidak bertahan. Halaman `/status` menandai komponen
"Penyimpanan akun kustomer" sebagai **Terbatas** selama ini belum dikerjakan.

## 1. Buat project Supabase

1. Buka https://supabase.com/dashboard dan buat project baru (paket gratis cukup).
2. Catat **Project URL** dan **service_role key** dari
   *Project Settings → API*. Kunci `service_role` hanya untuk server; jangan
   pernah dipakai di kode klien.

> Kenapa `service_role`, bukan `anon`? Tabel pelanggan mengaktifkan RLS dengan
> policy `auth.uid() = id`. Aplikasi ini memakai cookie HMAC sendiri, bukan
> Supabase Auth, sehingga `auth.uid()` selalu null dan kunci `anon` tidak dapat
> melihat atau menulis satu baris pun. Fungsi persistensi memakai klien
> service-role yang hanya berjalan di server.

## 2. Terapkan migrasi

Jalankan berurutan lewat SQL Editor Supabase (atau `psql`) pada project baru:

```
supabase/migrations/20261008_init.sql
supabase/migrations/20261011_iam_and_rls.sql
supabase/migrations/20261012_billing_and_subscriptions.sql
supabase/migrations/20261015_customer_identity.sql
supabase/migrations/20261016_durable_ownership_throttle_audit.sql
supabase/migrations/20261021_provider_credentials.sql
```

`20261016` menambah kolom `email_verified`, epoch password, kepemilikan API key,
jendela rate-limit bersama, dan jejak akses PII. Kolom yang hilang tidak
menggagalkan request — fungsi persistensi jatuh kembali ke penyimpanan JSON dan
mencatat satu peringatan — jadi urutan penerapan penting agar kegagalan ini tidak
tersembunyi.

`20261021` membuat vault kredensial provider. Aplikasi mengenkripsi key dengan
AES-256-GCM sebelum menyimpan ciphertext ke tabel ini; tabel tidak memiliki
policy akses client dan hanya diakses lewat service role pada server. Jangan
menjalankan migrasi hanya untuk tabel pelanggan: seluruh urutan di atas harus
diterapkan.

## 3. Set variabel lingkungan di Vercel

Di *Project → Settings → Environment Variables*, untuk target **Production** dan
**Preview**:

| Variabel | Nilai |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_URL` | sama dengan `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | kunci `service_role` dari langkah 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | kunci `anon` (dipakai pembacaan publik) |
| `AUTH_SESSION_SECRET` | secret acak minimal 16 karakter untuk tanda tangan cookie login |
| `OWNER_PASSCODE` | passcode acak panjang khusus login `/owner` |
| `ENCRYPTION_MASTER_KEY` | output `openssl rand -base64 48`; simpan sebagai secret server-side |

Lewat CLI:

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

Tambahkan variabel tersebut untuk **Production** dan **Preview** secara terpisah.
Jangan memakai nilai contoh atau menempelkan secret di chat, source control,
`NEXT_PUBLIC_*`, atau browser. `ENCRYPTION_MASTER_KEY` harus tetap sama untuk
membuka kredensial yang sudah tersimpan; buat backup aman sebelum rotasi.

## 4. Hubungkan provider AI dari panel owner

Setelah migrasi dan environment variables tersedia, deploy aplikasi lalu:

1. Buka `https://<domain-anda>/owner` dan masuk dengan `OWNER_PASSCODE`.
2. Pilih **Routing & Failover Mesh**.
3. Masukkan API key provider yang Anda buat di akun resmi Anthropic, OpenAI,
   DeepSeek, Groq, atau Google Gemini, lalu pilih **Simpan key**.
4. Pastikan provider berubah menjadi **configured**. Key disimpan dalam
   bentuk ciphertext di Supabase dan UI hanya mengembalikan fingerprint mask.

Jika provider ditandai dikelola lewat environment variables, gunakan
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, atau
`GEMINI_API_KEY` di Vercel. Environment variable selalu mengalahkan nilai vault
dan harus dihapus/diubah dari Vercel untuk mencabutnya. Jangan memasukkan key
produksi di deployment Preview yang dapat diakses pihak lain.

Tanpa kredensial upstream yang aktif, gateway production mengembalikan `503`;
stream simulasi hanya tersedia untuk development/test agar respons sintetis
tidak pernah dianggap sebagai jawaban AI sungguhan.

## 5. Mengaktifkan email transaksi gratis

Untuk menggunakan paket gratis tanpa domain pengirim sendiri, siapkan akun
Brevo dan verifikasi alamat Gmail Anda sebagai sender melalui kode konfirmasi
yang dikirim ke Gmail tersebut. Buat API key di **SMTP & API → API Keys**,
lalu tambahkan variabel berikut ke Vercel Production:

| Variabel | Nilai |
|---|---|
| `BREVO_API_KEY` | API key Brevo (server-side secret) |
| `MORVEXA_EMAIL_FROM` | `Morvexa <alamat-gmail-anda>` |

Tambahkan sender yang sama di pengaturan Brevo. Jangan gunakan App Password
Gmail: aplikasi mengirim melalui API HTTPS Brevo, bukan koneksi SMTP langsung.
Setelah deploy, uji alur verifikasi akun atau reset password dengan alamat email
yang Anda kuasai. Status email hanya menunjukkan bahwa provider tersedia; uji
inbox/spam untuk memastikan deliverability. Sender Gmail melalui layanan pihak
ketiga dapat difilter atau ditolak, dan bukan pengganti autentikasi domain.

## 6. Deploy ulang dan verifikasi

```bash
vercel --prod
```

Lalu periksa bahwa store persisten benar-benar aktif:

```bash
curl -s https://<domain-anda>/api/v1/status | python3 -m json.tool
```

Komponen `customer-store` harus berubah dari **Terbatas** menjadi
**Operasional**, dan `routing` harus operasional setelah setidaknya satu provider
terhubung. Uji juga jalur nyata: daftar akun, login, lalu deploy ulang dan
pastikan akun yang sama masih bisa login — inilah yang membuktikan persistensi,
bukan sekadar status hijau.

## Catatan: mengapa store lama tidak dipakai

Project ini pernah terhubung ke store Supabase Marketplace di Vercel yang
berstatus *suspended*, sehingga setiap deploy gagal dengan `Resource provisioning
failed` sebelum build dimulai (lihat `DEPLOYMENT_GUIDE.md` bagian 9). Store itu
sudah dilepas. Sambungkan Supabase yang baru lewat variabel lingkungan di atas —
bukan lewat integrasi Marketplace — agar tidak ada resource yang perlu
di-provision saat deploy.
