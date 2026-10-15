/**
 * Morvexa Customer & User Store
 * Supports Customer Self-Service Registration, Login, Token Usage, and Orders.
 * Directly integrated into Owner Database & Activity Monitoring.
 *
 * Credential records are held separately from the public CustomerUser shape so
 * password hashes are never serialised into an API response or the session
 * cookie. The credential store mirrors the persistence strategy used elsewhere
 * in this module: Supabase when configured, in-memory otherwise.
 */

import { isSupabaseConfigured, getSupabaseClient } from "../supabase/client";
import { hashPassword, verifyPassword } from "../auth/password";
import { readCollection, writeCollection } from "../persistence/jsonStore";

export interface CustomerCredential {
  customerId: string;
  email: string;
  /** scrypt record produced by hashPassword(). Never leaves the server. */
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: number;
  createdAt: string;
  lastVerifiedAt?: string;
  /**
   * Epoch seconds when the password last changed. Sessions carry the value that
   * was current when they were issued; a mismatch means the session predates a
   * reset and must be rejected.
   */
  passwordChangedAt?: number;
}

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "yahoo" | "email";
  avatar?: string;
  registeredAt: string;
  lastLoginAt: string;
  status: "active" | "suspended";
  /**
   * False until the customer opens the link emailed at registration. Accounts
   * created before this field existed are treated as verified by the read
   * path in readEmailVerified().
   */
  emailVerified?: boolean;
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
    | "USER_PASSWORD_RESET"
    | "USER_EMAIL_VERIFIED"
    | "USER_EMAIL_VERIFICATION_SENT"
    | "PACKAGE_PURCHASED"
    | "MODEL_TOKEN_PURCHASED"
    | "API_KEY_USED"
    | "INFERENCE_CALLED";
  description: string;
  details?: Record<string, any>;
}

/**
 * Model catalog lives in ./catalog so client components can render it without
 * importing the credential hashing code below (which needs node:crypto).
 */
export { MODEL_PRODUCTS, type ModelProduct } from "./catalog";

// In-Memory Seeded Customers Data (Shared to Owner Plane)
// Seeds act as the fallback when the persisted collection is absent.
const SEED_CUSTOMERS: CustomerUser[] = [
  {
    id: "cust-001",
    email: "dev@acme.ai",
    name: "Acme Lead Developer",
    provider: "gmail",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    registeredAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "active",
    emailVerified: true,
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
    emailVerified: true,
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
    emailVerified: true,
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
    emailVerified: true,
    currentPlan: "Developer Starter",
    tokenBalance: 50000,
    tokensUsed: 3100,
    totalOrdersCount: 0,
    totalSpentIdr: 0,
  },
];
let memoryCustomers: CustomerUser[] = readCollection("customers", SEED_CUSTOMERS);

// Seeds act as the fallback when the persisted collection is absent.
const SEED_ORDERS: CustomerOrder[] = [
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
let memoryCustomerOrders: CustomerOrder[] = readCollection("orders", SEED_ORDERS);

// Seeds act as the fallback when the persisted collection is absent.
const SEED_ACTIVITIES: CustomerActivityLog[] = [
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
let memoryCustomerActivities: CustomerActivityLog[] = readCollection("activities", SEED_ACTIVITIES);

// Active Customer Session In Memory (or LocalStorage on client)
let currentCustomerSession: CustomerUser | null = memoryCustomers[0];

// Credential records (password hashes) kept apart from the public user shape.
// Rehydrated lazily so importing this module never performs blocking disk I/O.
let memoryCredentials: CustomerCredential[] | null = null;

function credentials(): CustomerCredential[] {
  if (memoryCredentials === null) {
    memoryCredentials = readCollection<CustomerCredential>("credentials", []);
  }
  return memoryCredentials;
}

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

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveEmailProvider(email: string): "gmail" | "yahoo" | "email" {
  const normalized = normaliseEmail(email);
  if (normalized.endsWith("@gmail.com") || normalized.endsWith("@googlemail.com")) return "gmail";
  if (normalized.endsWith("@yahoo.com") || normalized.endsWith("@yahoo.co.id") || normalized.includes("@yahoo.")) return "yahoo";
  return "email";
}

export function findCustomerByEmail(email: string): CustomerUser | undefined {
  const normalized = normaliseEmail(email);
  return memoryCustomers.find((c) => c.email.toLowerCase() === normalized);
}

export function findCustomerById(id: string): CustomerUser | undefined {
  return memoryCustomers.find((c) => c.id === id);
}

/**
 * Reads the verification state.
 *
 * Records written before email verification existed have no `emailVerified`
 * field. Treating those as verified avoids locking out the seeded and
 * pre-existing accounts; only an explicit `false` counts as unverified.
 */
export function isEmailVerified(user: CustomerUser): boolean {
  return user.emailVerified !== false;
}

/**
 * Marks an account verified and records the activity.
 * Idempotent, so a double-click on the emailed link is harmless.
 */
export async function markEmailVerified(email: string): Promise<CustomerUser | undefined> {
  const user = findCustomerByEmail(email);
  if (!user) return undefined;

  if (user.emailVerified === true) return user;

  user.emailVerified = true;
  await writeCollection("customers", memoryCustomers);
  logCustomerActivity(user, "USER_EMAIL_VERIFIED", `Email terverifikasi: ${user.email}`);

  return user;
}

function logCustomerActivity(
  customer: CustomerUser,
  activityType: CustomerActivityLog["activityType"],
  description: string,
  details?: Record<string, any>
): void {
  memoryCustomerActivities.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    customerId: customer.id,
    customerEmail: customer.email,
    activityType,
    description,
    details,
  });
  void writeCollection("activities", memoryCustomerActivities);
}

/* ---------------------------------------------------------------------------
   Credential persistence
   ------------------------------------------------------------------------- */

async function loadCredential(email: string): Promise<CustomerCredential | undefined> {
  const normalized = normaliseEmail(email);

  if (isSupabaseConfigured) {
    const client = await getSupabaseClient();
    if (!client) return undefined;

    const { data, error } = await client
      .from("customer_credentials")
      .select("customer_id, email, password_hash, failed_attempts, locked_until, created_at, last_verified_at")
      .eq("email", normalized)
      .maybeSingle();

    if (!error && data) {
      return {
        customerId: data.customer_id,
        email: data.email,
        passwordHash: data.password_hash,
        failedAttempts: data.failed_attempts ?? 0,
        lockedUntil: data.locked_until ?? 0,
        createdAt: data.created_at,
        lastVerifiedAt: data.last_verified_at ?? undefined,
      };
    }
  }

  return credentials().find((c) => c.email === normalized);
}

async function persistCredential(credential: CustomerCredential): Promise<void> {
  if (isSupabaseConfigured) {
    const client = await getSupabaseClient();
    await client.from("customer_credentials").upsert(
      {
        customer_id: credential.customerId,
        email: credential.email,
        password_hash: credential.passwordHash,
        failed_attempts: credential.failedAttempts,
        locked_until: credential.lockedUntil,
        created_at: credential.createdAt,
        last_verified_at: credential.lastVerifiedAt ?? null,
      },
      { onConflict: "email" }
    );
  }

  const list = credentials();
  const existingIndex = list.findIndex((c) => c.email === credential.email);
  if (existingIndex === -1) list.push(credential);
  else list[existingIndex] = credential;

  await writeCollection("credentials", list);
}

/* ---------------------------------------------------------------------------
   Registration & sign-in
   ------------------------------------------------------------------------- */

export interface AuthOutcome {
  ok: boolean;
  user?: CustomerUser;
  error?: string;
  status: number;
}

/**
 * Creates a new customer account with a hashed password.
 * Rejects duplicates so an existing email cannot be silently taken over.
 */
export async function registerCustomer(params: {
  email: string;
  name?: string;
  password: string;
}): Promise<AuthOutcome> {
  const email = normaliseEmail(params.email);
  const displayName = (params.name || "").trim() || email.split("@")[0];

  if (findCustomerByEmail(email) || (await loadCredential(email))) {
    return {
      ok: false,
      status: 409,
      error: "Email ini sudah terdaftar. Silakan masuk menggunakan password Anda.",
    };
  }

  const user: CustomerUser = {
    id: `cust-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 5)}`,
    email,
    name: displayName,
    provider: resolveEmailProvider(email),
    registeredAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    status: "active",
    emailVerified: false,
    currentPlan: "Developer Starter (Free)",
    tokenBalance: 50000,
    tokensUsed: 0,
    totalOrdersCount: 0,
    totalSpentIdr: 0,
  };

  await persistCredential({
    customerId: user.id,
    email,
    passwordHash: await hashPassword(params.password),
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: new Date().toISOString(),
  });

  memoryCustomers.unshift(user);
  await writeCollection("customers", memoryCustomers);
  currentCustomerSession = user;
  logCustomerActivity(
    user,
    "USER_REGISTER",
    `Pendaftaran akun kustomer baru: ${user.name} (${user.email})`,
    { provider: user.provider }
  );

  return { ok: true, user, status: 201 };
}

/**
 * Verifies credentials and returns the customer record.
 * The same generic error is returned for unknown emails and wrong passwords so
 * the response cannot be used to enumerate registered accounts.
 */
export async function authenticateCustomer(params: {
  email: string;
  password: string;
}): Promise<AuthOutcome> {
  const email = normaliseEmail(params.email);
  const credential = await loadCredential(email);

  const genericFailure: AuthOutcome = {
    ok: false,
    status: 401,
    error: "Email atau password tidak cocok.",
  };

  if (!credential) return genericFailure;

  const now = Date.now();
  if (credential.lockedUntil > now) {
    const seconds = Math.ceil((credential.lockedUntil - now) / 1000);
    const minutes = Math.ceil(seconds / 60);
    return {
      ok: false,
      status: 429,
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`,
    };
  }

  const valid = await verifyPassword(params.password, credential.passwordHash);

  if (!valid) {
    credential.failedAttempts += 1;
    // Escalate to a short lockout so credential stuffing stalls quickly.
    if (credential.failedAttempts >= 5) {
      credential.lockedUntil = now + 15 * 60 * 1000;
      credential.failedAttempts = 0;
    }
    await persistCredential(credential);
    return genericFailure;
  }

  const user = findCustomerByEmail(email);
  if (!user) {
    return {
      ok: false,
      status: 409,
      error: "Akun ini tidak lagi aktif. Silakan hubungi dukungan Morvexa.",
    };
  }

  credential.failedAttempts = 0;
  credential.lockedUntil = 0;
  credential.lastVerifiedAt = new Date().toISOString();
  await persistCredential(credential);

  user.lastLoginAt = new Date().toISOString();
  await writeCollection("customers", memoryCustomers);
  currentCustomerSession = user;
  logCustomerActivity(user, "USER_LOGIN", `Login berhasil: ${user.name} (${user.email})`);

  return { ok: true, user, status: 200 };
}

/**
 * Replaces a customer's password after a verified reset.
 *
 * Clears the lockout counters as well: a user who forgot their password has
 * almost certainly tripped the throttle trying to guess it, and leaving them
 * locked out after a successful reset would make the reset useless.
 */
export async function updateCustomerPassword(params: {
  email: string;
  newPassword: string;
}): Promise<AuthOutcome> {
  const email = normaliseEmail(params.email);
  const credential = await loadCredential(email);

  if (!credential) {
    return { ok: false, status: 404, error: "Akun tidak ditemukan." };
  }

  const user = findCustomerByEmail(email);
  if (!user) {
    return {
      ok: false,
      status: 409,
      error: "Akun ini tidak lagi aktif. Silakan hubungi dukungan Morvexa.",
    };
  }

  credential.passwordHash = await hashPassword(params.newPassword);
  credential.failedAttempts = 0;
  credential.lockedUntil = 0;
  credential.lastVerifiedAt = new Date().toISOString();
  // Bumping the epoch invalidates every session issued before this reset, which
  // is what evicts an attacker who already holds a stolen cookie.
  credential.passwordChangedAt = Math.floor(Date.now() / 1000);
  await persistCredential(credential);

  logCustomerActivity(user, "USER_PASSWORD_RESET", `Password diatur ulang: ${user.email}`);

  return { ok: true, user, status: 200 };
}

/**
 * Returns the account's current password epoch in seconds, or 0 when unknown.
 *
 * 0 means "no reset on record", and every token issued without a pwdAt claim
 * also reads as 0, so a missing epoch never invalidates an existing session.
 */
export async function getPasswordEpoch(email: string): Promise<number> {
  const credential = await loadCredential(email);
  return credential?.passwordChangedAt ?? 0;
}

export async function recordCustomerOrder(
  order: Omit<CustomerOrder, "id" | "createdAt">
): Promise<CustomerOrder> {
  const newOrder: CustomerOrder = {
    ...order,
    id: `ORD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
  };

  memoryCustomerOrders.unshift(newOrder);
  await writeCollection("orders", memoryCustomerOrders);

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

  await Promise.all([
    writeCollection("customers", memoryCustomers),
    writeCollection("orders", memoryCustomerOrders),
    writeCollection("activities", memoryCustomerActivities),
  ]);

  return newOrder;
}
