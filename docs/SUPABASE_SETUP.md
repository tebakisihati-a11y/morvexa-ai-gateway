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
```

`20261016` menambah kolom `email_verified`, epoch password, kepemilikan API key,
jendela rate-limit bersama, dan jejak akses PII. Kolom yang hilang tidak
menggagalkan request — fungsi persistensi jatuh kembali ke penyimpanan JSON dan
mencatat satu peringatan — jadi urutan penerapan penting agar kegagalan ini tidak
tersembunyi.

## 3. Set variabel lingkungan di Vercel

Di *Project → Settings → Environment Variables*, untuk target **Production** dan
**Preview**:

| Variabel | Nilai |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_URL` | sama dengan `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | kunci `service_role` dari langkah 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | kunci `anon` (dipakai pembacaan publik) |

Lewat CLI:

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

## 4. Deploy ulang dan verifikasi

```bash
vercel --prod
```

Lalu periksa bahwa store persisten benar-benar aktif:

```bash
curl -s https://<domain-anda>/api/v1/status | python3 -m json.tool
```

Komponen `customer-store` harus berubah dari **Terbatas** menjadi
**Operasional**. Uji juga jalur nyata: daftar akun, login, lalu deploy ulang dan
pastikan akun yang sama masih bisa login — inilah yang membuktikan persistensi,
bukan sekadar status hijau.

## Catatan: mengapa store lama tidak dipakai

Project ini pernah terhubung ke store Supabase Marketplace di Vercel yang
berstatus *suspended*, sehingga setiap deploy gagal dengan `Resource provisioning
failed` sebelum build dimulai (lihat `DEPLOYMENT_GUIDE.md` bagian 9). Store itu
sudah dilepas. Sambungkan Supabase yang baru lewat variabel lingkungan di atas —
bukan lewat integrasi Marketplace — agar tidak ada resource yang perlu
di-provision saat deploy.
