/**
 * Client-safe model catalog.
 *
 * Model metadata is rendered by client components (portal cards, checkout dialogs).
 * It lives here, free of any node:crypto or Supabase dependency, so importing it never
 * pulls server-only code into the browser bundle.
 */

export interface ModelProduct {
  id: string;
  name: string;
  provider: "deepseek" | "anthropic" | "openai" | "gemini" | "groq";
  tagline: string;
  contextWindow: string;
  pricePer1kInputTokensIdr: number; // in IDR
  pricePer1kOutputTokensIdr: number; // in IDR
  bundlePriceIdr: number; // Paket siap pakai token bundle e.g. Rp 100.000
  bundleTokensGranted: number; // misal 10.000.000 token untuk DeepSeek
  description: string;
  badge?: string;
  compliancePolicy: string;
}

// Model Catalog for Customers
export const MODEL_PRODUCTS: ModelProduct[] = [
  {
    id: "prod-deepseek-v3",
    name: "DeepSeek V3 (Chat & Code)",
    provider: "deepseek",
    tagline: "Ultra-Cost-Efficient Frontier Reasoning",
    contextWindow: "64k Context",
    pricePer1kInputTokensIdr: 2.2,
    pricePer1kOutputTokensIdr: 4.4,
    bundlePriceIdr: 100000,
    bundleTokensGranted: 20000000, // 20 Juta token untuk Rp 100rb sesuai pasaran DeepSeek
    description: "Performa sekelas frontier dengan efisiensi token ekstrem. Kebijakan API: Bebas rate limit terdistribusi dengan auto-retry.",
    badge: "TERMURAH & TERPOPULER",
    compliancePolicy: "Standar API DeepSeek AI. Rate limit dynamic tier. Zero data retention policy.",
  },
  {
    id: "prod-deepseek-r1",
    name: "DeepSeek R1 (Full Reasoning)",
    provider: "deepseek",
    tagline: "Open-weights Reasoning Model on Par with o1",
    contextWindow: "64k Context",
    pricePer1kInputTokensIdr: 8.5,
    pricePer1kOutputTokensIdr: 33.0,
    bundlePriceIdr: 100000,
    bundleTokensGranted: 5000000, // 5 Juta token
    description: "Model reasoning mendalam untuk matematika kompleks, sains, dan arsitektur kode berskala besar.",
    badge: "ADVANCED REASONING",
    compliancePolicy: "Standar OpenAI API compatible format, chain-of-thought preservation.",
  },
  {
    id: "prod-claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet (Hybrid)",
    provider: "anthropic",
    tagline: "Anthropic's Flagship Coding & Reasoning Engine",
    contextWindow: "200k Context",
    pricePer1kInputTokensIdr: 48.0,
    pricePer1kOutputTokensIdr: 240.0,
    bundlePriceIdr: 250000,
    bundleTokensGranted: 1500000,
    description: "Model unggulan untuk coding kompleks, sistem multi-langkah, dan reasoning adaptif tanpa halusinasi.",
    badge: "BEST CODING",
    compliancePolicy: "Anthropic Commercial API Terms, PII filtering & zero model training on customer payloads.",
  },
  {
    id: "prod-gpt-4o",
    name: "OpenAI GPT-4o (Omni)",
    provider: "openai",
    tagline: "High-speed Multimodal Vision & Intelligence",
    contextWindow: "128k Context",
    pricePer1kInputTokensIdr: 40.0,
    pricePer1kOutputTokensIdr: 160.0,
    bundlePriceIdr: 200000,
    bundleTokensGranted: 2000000,
    description: "Model multimodal cerdas untuk pemrosesan teks, kode, dan inspeksi gambar berkecepatan tinggi.",
    badge: "OMNI MULTIMODAL",
    compliancePolicy: "OpenAI Enterprise Compliance, SSE streaming protocol natively supported.",
  },
  {
    id: "prod-gemini-2-flash",
    name: "Google Gemini 2.0 Flash",
    provider: "gemini",
    tagline: "Next-gen Fast 1M Context Window",
    contextWindow: "1,000,000 Context",
    pricePer1kInputTokensIdr: 1.6,
    pricePer1kOutputTokensIdr: 6.4,
    bundlePriceIdr: 100000,
    bundleTokensGranted: 15000000,
    description: "Jendela konteks hingga 1 juta token dengan latency Time-To-First-Token terendah (~45ms).",
    badge: "1M CONTEXT",
    compliancePolicy: "Google Cloud Platform API guidelines, enterprise-grade availability.",
  },
];
