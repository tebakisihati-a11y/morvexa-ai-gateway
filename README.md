# Morvexa AI Gateway ⚡

> **Universal Edge AI Proxy & Observability Console**  
> Built with Next.js 15, Hono.js Edge Router, Supabase, Tailwind CSS v4, and Zero AI-Slop Design.

---

## 🌟 Fitur Utama

1. **Dual Rolling Quota Engine (Ditingkatkan dari Olagon AI Gateway)**:
   * **Skema Model Standar & Cepat**: 5-Jam Rolling Window Request Cap dengan countdown pemulihan live per detik + 7-Hari rolling window.
   * **Skema Model Frontier**: Token Cap harian (24 jam) dan mingguan (7 hari).
2. **Zero-Buffer SSE Streaming**:
   * Pipeline streaming latensi ultra-rendah dengan perhitungan Time-To-First-Token (TTFT) dan kecepatan token (*tokens/second*).
3. **Multi-Provider Intelligent Failover**:
   * Kompatibilitas format Anthropic (`/v1/messages`) dan OpenAI (`/v1/chat/completions`).
   * Failover cerdas ke provider cadangan (Anthropic -> DeepSeek V3 -> Groq LPU -> Google Gemini) jika upstream mengalami rate-limit (429) atau downtime.
4. **Desain Anti "AI Slop"**:
   * Antarmuka telemetri konsol berdensitas tinggi terinspirasi oleh *Linear, Cloudflare Radar, dan Vercel Geist*.
   * Monospace typography presisi, live regional edge ping radar, dan audit log inspector.
5. **100% Free Hosting & Domain**:
   * Siap di-deploy ke Vercel Free Tier + Supabase Free Tier + Subdomain gratis (`is-a.dev` / `*.vercel.app`).

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 15 (App Router, React 19)
* **Styling:** Tailwind CSS v4 (@theme token system)
* **Edge Proxy:** Hono.js (`app/api/[[...route]]/route.ts`)
* **Database & Auth:** Supabase (PostgreSQL, RLS)
* **Testing:** Vitest

---

## 🚀 Menjalankan Secara Lokal

```bash
# 1. Install dependencies
npm install

# 2. Jalankan unit tests
npm test

# 3. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📖 Dokumentasi Lengkap

* [Arsitektur & Spesifikasi Desain](docs/superpowers/specs/2026-10-08-morvexa-ai-gateway-design.md)
* [Panduan Deployment 100% Gratis](docs/DEPLOYMENT_GUIDE.md)
* [Skema Database Supabase](supabase/migrations/20261008_init.sql)
