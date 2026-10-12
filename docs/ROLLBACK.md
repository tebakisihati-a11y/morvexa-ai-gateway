# Morvexa AI Server Master — Rollback & Recovery Plan

**Target System**: Morvexa AI Server Master  
**Standard**: Zero Downtime & Backward Compatibility Guarantee  

---

## 1. Git & Code Rollback Strategy

Proyek ini dikembangkan di atas branch terisolasi:
- **Feature Branch**: `feature/morvexa-master-v2`
- **Stable Base Branch**: `main`

Jika terjadi anomali mendesak di production:
```bash
# 1. Kembali ke branch dasar yang stabil
git checkout main

# 2. Re-install dependensi jika ada perubahan package
npm install

# 3. Verifikasi ulang test suite
npm test

# 4. Rebuild container atau Vercel deployment
npm run build
```

---

## 2. Database Migration Rollback (Supabase / PostgreSQL)

Seluruh migrasi database Morvexa mengikuti prinsip **Additive & Non-Destructive**:
- Tidak ada penghapusan kolom (*DROP COLUMN*) atau tabel (*DROP TABLE*) pada migrasi `20261008_init.sql`, `20261011_iam_and_rls.sql`, dan `20261012_billing_and_subscriptions.sql`.
- Jika migrasi baru perlu dibatalkan, buat migrasi kompensasi terbalik tanpa menghapus data historis transaksi atau ledger pelanggan.

---

## 3. Secret Vault & Key Recovery

1. **Morvexa API Keys**:
   - Jika satu key pelanggan dicurigai bocor, gunakan fungsi pencabutan (*revocation*) melalui endpoint atau dashboard. Hash SHA-256 langsung ditandai `isActive: false` tanpa mempengaruhi key pengguna lain.
2. **BYOK Vault Credentials**:
   - Jika enkripsi master key dirotasi, decrypt payload v1 menggunakan kunci lama dan re-encrypt ke versi v2 menggunakan fungsi batch migration di server.

---

## 4. Disaster Recovery & Edge Portability

Jika Vercel mengalami kendala fair-use atau timeout:
- Runtime Hono di `src/app/api/[[...route]]` dapat langsung dipindahkan ke **Cloudflare Workers** atau **Docker container** (Node/Bun/Deno) dalam hitungan menit karena tidak terikat pada proprietary Vercel APIs.
