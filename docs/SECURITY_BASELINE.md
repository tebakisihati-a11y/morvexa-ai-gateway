# Morvexa AI Server Master — Security Baseline & Threat Model

**Standard**: OWASP Top 10 API Security Compliance & NIST Guidelines  
**Status**: Certified Active  

---

## 1. Identifikasi Aset & Secret Boundaries

1. **Morvexa API Key (`mvx_live_...` / `mvx_test_...`)**:
   - Dibuat melalui secure CSPRNG (`crypto.randomBytes(24)`).
   - Server **hanya menyimpan SHA-256 hash** (`hashApiKeySecret()`).
   - Plaintext rahasia hanya di-render sekali di UI pengguna saat pembuatan dan tidak pernah tersimpan di LocalStorage atau database.
2. **Third-Party Upstream Provider Keys (Anthropic, OpenAI, DeepSeek, etc.)**:
   - Disimpan di environment variables server (`ANTHROPIC_API_KEY`, dsb).
   - **TIDAK PERNAH** dikirimkan ke browser client atau terekspos di API payload.
3. **Bring Your Own Key (BYOK)**:
   - Jika pengguna memasukkan kredensial provider milik sendiri, wajib dienkripsi di level data layer menggunakan AES-256-GCM dengan envelope key server.
4. **Administrative & Cron Endpoints**:
   - Endpoints `/api/cron/*` dan `/api/billing/reconcile*` dijaga oleh verifikasi Bearer token terhadap `CRON_SECRET` atau `ADMIN_SECRET_KEY`.

---

## 2. Mitigasi OWASP Top 10 API Security

| OWASP Threat | Risiko di Gateway AI | Mitigasi Morvexa Master |
| :--- | :--- | :--- |
| **API1:2023 Broken Object Level Auth (BOLA / IDOR)** | User A membaca transaksi/kunci User B | Verifikasi tenant scoping (`orgId !== auth.orgId -> 403 Forbidden`) di endpoint transaksi dan kunci. |
| **API2:2023 Broken Authentication** | Pemalsuan token / brute force | SHA-256 constant-time hash comparison, prefix enforcement, key revocation check. |
| **API4:2023 Unrestricted Resource Consumption** | DoS attack menghabiskan kuota & biaya AI | Token Bucket Rate Limiting per RPM + 5-hour/7-day rolling window quota guard. |
| **API5:2023 Broken Function Level Auth** | User biasa memicu rekonsiliasi atau deprovisioning | `isPrivilegedRequest()` memeriksa `CRON_SECRET` / `ADMIN_SECRET_KEY`. |
| **API7:2023 Server-Side Request Forgery (SSRF)** | Eksploitasi target base URL pada provider kustom | Validasi URL provider, reject IP internal/metadata (misal `169.254.169.254` atau link cloud instance). |
| **API8:2023 Security Misconfiguration** | Informasi internal bocor pada error | Global Hono error handler menormalkan output menjadi `{ error: { message, type, code } }` tanpa stack trace di response publik. |

---

## 3. Audit Log Trail
Setiap tindakan administratif (create key, revoke key, update route, execute reconciliation) dicatat dalam structured audit event log dengan aktor, timestamp, IP, dan target resource tanpa mencatat plaintext credentials.
