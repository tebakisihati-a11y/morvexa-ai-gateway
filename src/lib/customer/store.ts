/**
 * Morvexa Customer & User Store
 * Supports Customer Self-Service Registration, Login, Token Usage, and Orders.
 * Directly integrated into Owner Database & Activity Monitoring.
 */

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "yahoo" | "email";
  avatar?: string;
  registeredAt: string;
  lastLoginAt: string;
  status: "active" | "suspended";
  currentPlan: string;
  tokenBalance: number;
  tokensUsed: number;
  totalOrdersCount: number;
  totalSpentIdr: number;
}

export interface CustomerOrder {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderType: "plan_subscription" | "model_token_purchase";
  productCode: string;
  productName: string;
  amountIdr: number;
  tokensGranted: number;
  paymentMethod: string;
  status: "settled" | "pending" | "failed";
  createdAt: string;
  apiKeyDispatched?: string;
}

export interface CustomerActivityLog {
  id: string;
  timestamp: string;
  customerId: string;
  customerEmail: string;
  activityType:
    | "USER_REGISTER"
    | "USER_LOGIN"
    | "PACKAGE_PURCHASED"
    | "MODEL_TOKEN_PURCHASED"
    | "API_KEY_USED"
    | "INFERENCE_CALLED";
  description: string;
  details?: Record<string, any>;
}

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

// In-Memory Seeded Customers Data (Shared to Owner Plane)
let memoryCustomers: CustomerUser[] = [
  {
    id: "cust-001",
    email: "dev@acme.ai",
    name: "Acme Lead Developer",
    provider: "gmail",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    registeredAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "active",
    currentPlan: "Apex Scale",
    tokenBalance: 12500000,
    tokensUsed: 420850,
    totalOrdersCount: 2,
    totalSpentIdr: 5000000,
  },
  {
    id: "cust-002",
    email: "founder@startup.id",
    name: "Rian Prasetyo",
    provider: "gmail",
    registeredAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastLoginAt: new Date(Date.now() - 1800000).toISOString(),
    status: "active",
    currentPlan: "Pro Workspace",
    tokenBalance: 4500000,
    tokensUsed: 298400,
    totalOrdersCount: 1,
    totalSpentIdr: 750000,
  },
  {
    id: "cust-003",
    email: "engineer@fintech.co",
    name: "Siti Rahmawati",
    provider: "yahoo",
    registeredAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    status: "active",
    currentPlan: "DeepSeek V3 Token Pack",
    tokenBalance: 19800000,
    tokensUsed: 12500,
    totalOrdersCount: 1,
    totalSpentIdr: 100000,
  },
  {
    id: "cust-004",
    email: "budi.santoso@yahoo.com",
    name: "Budi Santoso",
    provider: "yahoo",
    registeredAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    lastLoginAt: new Date(Date.now() - 600000).toISOString(),
    status: "active",
    currentPlan: "Developer Starter",
    tokenBalance: 50000,
    tokensUsed: 3100,
    totalOrdersCount: 0,
    totalSpentIdr: 0,
  },
];

let memoryCustomerOrders: CustomerOrder[] = [
  {
    id: "ORD-9021",
    customerId: "cust-001",
    customerEmail: "dev@acme.ai",
    customerName: "Acme Lead Developer",
    orderType: "plan_subscription",
    productCode: "apex",
    productName: "Apex Scale Subscription",
    amountIdr: 2500000,
    tokensGranted: 1500000,
    paymentMethod: "bca_va",
    status: "settled",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    apiKeyDispatched: "mvx_live_...92d1",
  },
  {
    id: "ORD-8812",
    customerId: "cust-003",
    customerEmail: "engineer@fintech.co",
    customerName: "Siti Rahmawati",
    orderType: "model_token_purchase",
    productCode: "prod-deepseek-v3",
    productName: "DeepSeek V3 — 20M Token Pack",
    amountIdr: 100000,
    tokensGranted: 20000000,
    paymentMethod: "qris",
    status: "settled",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    apiKeyDispatched: "mvx_live_...bc21",
  },
];

let memoryCustomerActivities: CustomerActivityLog[] = [
  {
    id: "act-001",
    timestamp: new Date(Date.now() - 15000).toISOString(),
    customerId: "cust-002",
    customerEmail: "founder@startup.id",
    activityType: "INFERENCE_CALLED",
    description: "Memanggil gateway endpoint /v1/messages dengan model Claude 3.5 Sonnet",
    details: { model: "claude-3-5-sonnet", tokens: 590, status: 200 },
  },
  {
    id: "act-002",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    customerId: "cust-002",
    customerEmail: "founder@startup.id",
    activityType: "USER_LOGIN",
    description: "Customer login sukses via akun Gmail (founder@startup.id)",
  },
  {
    id: "act-003",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    customerId: "cust-003",
    customerEmail: "engineer@fintech.co",
    activityType: "MODEL_TOKEN_PURCHASED",
    description: "Pembelian produk DeepSeek V3 (IDR 100.000) settled via QRIS",
    details: { amount: 100000, tokens: 20000000, orderId: "ORD-8812" },
  },
  {
    id: "act-004",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    customerId: "cust-004",
    customerEmail: "budi.santoso@yahoo.com",
    activityType: "USER_REGISTER",
    description: "Pendaftaran akun baru customer menggunakan Yahoo Mail",
  },
];

// Active Customer Session In Memory (or LocalStorage on client)
let currentCustomerSession: CustomerUser | null = memoryCustomers[0];

// API Functions
export function getRegisteredCustomers(): CustomerUser[] {
  return [...memoryCustomers];
}

export function getCustomerOrders(): CustomerOrder[] {
  return [...memoryCustomerOrders];
}

export function getCustomerActivities(): CustomerActivityLog[] {
  return [...memoryCustomerActivities];
}

export function getCurrentCustomerSession(): CustomerUser | null {
  return currentCustomerSession;
}

export function setCurrentCustomerSession(user: CustomerUser | null): void {
  currentCustomerSession = user;
}

/**
 * Register or Login Customer via Gmail / Yahoo / Email
 */
export function registerOrLoginCustomer(params: {
  email: string;
  name?: string;
  provider?: "gmail" | "yahoo" | "email";
}): { user: CustomerUser; isNew: boolean } {
  const normalizedEmail = params.email.trim().toLowerCase();
  let provider = params.provider;
  if (!provider) {
    if (normalizedEmail.includes("@gmail.com")) provider = "gmail";
    else if (normalizedEmail.includes("@yahoo.")) provider = "yahoo";
    else provider = "email";
  }

  const existing = memoryCustomers.find((c) => c.email.toLowerCase() === normalizedEmail);

  if (existing) {
    existing.lastLoginAt = new Date().toISOString();
    if (params.name && (!existing.name || existing.name === "Customer")) {
      existing.name = params.name;
    }
    currentCustomerSession = existing;

    // Log Activity
    const log: CustomerActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      customerId: existing.id,
      customerEmail: existing.email,
      activityType: "USER_LOGIN",
      description: `Customer login kembali via ${provider.toUpperCase()} (${existing.email})`,
    };
    memoryCustomerActivities.unshift(log);

    return { user: existing, isNew: false };
  }

  // Create new customer user
  const newUser: CustomerUser = {
    id: `cust-${Date.now().toString().slice(-6)}`,
    email: normalizedEmail,
    name: params.name || normalizedEmail.split("@")[0],
    provider,
    registeredAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    status: "active",
    currentPlan: "Developer Starter (Free)",
    tokenBalance: 50000,
    tokensUsed: 0,
    totalOrdersCount: 0,
    totalSpentIdr: 0,
  };

  memoryCustomers.unshift(newUser);
  currentCustomerSession = newUser;

  // Log Activity directly to Owner monitoring
  const log: CustomerActivityLog = {
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    customerId: newUser.id,
    customerEmail: newUser.email,
    activityType: "USER_REGISTER",
    description: `Pendaftaran akun kustomer baru via ${provider.toUpperCase()}: ${newUser.name} (${newUser.email})`,
    details: { provider, registeredAt: newUser.registeredAt },
  };
  memoryCustomerActivities.unshift(log);

  return { user: newUser, isNew: true };
}

/**
 * Record a Customer Order (Package or Model Product) and notify Owner
 */
export function recordCustomerOrder(order: Omit<CustomerOrder, "id" | "createdAt">): CustomerOrder {
  const newOrder: CustomerOrder = {
    ...order,
    id: `ORD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
  };

  memoryCustomerOrders.unshift(newOrder);

  // Update customer balance & spent stats
  const customer = memoryCustomers.find(
    (c) => c.email.toLowerCase() === order.customerEmail.toLowerCase()
  );
  if (customer) {
    customer.totalOrdersCount += 1;
    customer.totalSpentIdr += order.amountIdr;
    customer.tokenBalance += order.tokensGranted;
    if (order.orderType === "plan_subscription") {
      customer.currentPlan = order.productName;
    }
  }

  // Record Activity for Owner
  const log: CustomerActivityLog = {
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    customerId: customer?.id || "guest",
    customerEmail: order.customerEmail,
    activityType:
      order.orderType === "plan_subscription"
        ? "PACKAGE_PURCHASED"
        : "MODEL_TOKEN_PURCHASED",
    description: `Pembelian Berhasil: ${order.productName} (IDR ${order.amountIdr.toLocaleString("id-ID")}) oleh ${order.customerName} (${order.customerEmail})`,
    details: {
      orderId: newOrder.id,
      amountIdr: order.amountIdr,
      tokensGranted: order.tokensGranted,
      paymentMethod: order.paymentMethod,
    },
  };
  memoryCustomerActivities.unshift(log);

  return newOrder;
}
