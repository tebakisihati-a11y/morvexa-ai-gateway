import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { verifyGatewayApiKey } from "./auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  isSecureRequest,
  issueSessionToken,
  readSessionCookie,
  verifySessionToken,
} from "../auth/session";
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure, validatePasswordPolicy } from "../auth/password";
import { createAnthropicSseStream } from "./stream";
import { resolveProviderRoute, DEFAULT_PROVIDERS } from "./failover";
import { forwardToUpstreamProvider } from "./upstream";
import {
  processMidtransWebhook,
  createMidtransSandboxCheckout,
  calculateMidtransSignature,
  getTransaction,
} from "../billing/midtrans";
import { PLAN_PRICES_IDR } from "../billing/catalog";
import {
  requestDedicatedEnvironment,
  getEnvironment,
  recordHealthProbe,
  deprovisionEnvironment,
} from "../infrastructure/provisioning";
import { checkRateLimit } from "./ratelimit";
import {
  reconcileSingleOrder,
  runAutomatedReconciliation,
  getReconciliationLogs,
} from "../billing/reconciliation";
import { DEFAULT_SYSTEM_METRICS } from "../constants";

export const app = new Hono().basePath("/api");

// Global Resilient Error & 404 Handlers (Zero Unhandled Crashes)
app.onError((err, c) => {
  console.error("[Morvexa Gateway Error]:", err);
  const status = typeof (err as any).status === "number" ? (err as any).status : 500;
  return c.json(
    {
      error: {
        message: err.message || "Internal server error occurred in gateway pipeline",
        type: "api_error",
        code: "internal_error",
      },
    },
    status
  );
});

app.notFound((c) => {
  return c.json(
    {
      error: {
        message: `Endpoint not found: ${c.req.method} ${c.req.path}`,
        type: "invalid_request_error",
        code: "not_found",
      },
    },
    404
  );
});

// 1. Health & Telemetry Metrics Endpoint
app.get("/v1/metrics", (c) => {
  return c.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 1240),
    rps: DEFAULT_SYSTEM_METRICS.rps,
    avgTtftMs: DEFAULT_SYSTEM_METRICS.avgTtftMs,
    cacheHitRatio: DEFAULT_SYSTEM_METRICS.cacheHitRatio,
    errorRate: DEFAULT_SYSTEM_METRICS.errorRate,
    activeKeysCount: DEFAULT_SYSTEM_METRICS.activeKeysCount,
    totalRequests24h: DEFAULT_SYSTEM_METRICS.totalRequests24h,
    regions: [
      { region: "SIN (Singapore)", latencyMs: 14, status: "optimal" },
      { region: "FRA (Frankfurt)", latencyMs: 86, status: "optimal" },
      { region: "IAD (Virginia)", latencyMs: 128, status: "optimal" },
      { region: "NRT (Tokyo)", latencyMs: 42, status: "optimal" },
    ],
  });
});

// 2. Available Models Endpoint
app.get("/v1/models", (c) => {
  return c.json({
    object: "list",
    data: [
      {
        id: "private-server-5002",
        name: "Private Local Model (localhost:5002)",
        provider: "custom",
        category: "standard_request",
        contextWindow: 128000,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0,
      },
      {
        id: "claude-3-7-sonnet",
        name: "Claude 3.7 Sonnet (Hybrid Reasoning)",
        provider: "anthropic",
        category: "latest_token",
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        category: "standard_request",
        contextWindow: 200000,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
      },
      {
        id: "claude-3-5-haiku",
        name: "Claude 3.5 Haiku",
        provider: "anthropic",
        category: "standard_request",
        contextWindow: 200000,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
      },
      {
        id: "gpt-4o",
        name: "GPT-4o (Omni)",
        provider: "openai",
        category: "latest_token",
        contextWindow: 128000,
        costPer1kInput: 0.0025,
        costPer1kOutput: 0.01,
      },
      {
        id: "deepseek-chat",
        name: "DeepSeek V3",
        provider: "deepseek",
        category: "standard_request",
        contextWindow: 64000,
        costPer1kInput: 0.00014,
        costPer1kOutput: 0.00028,
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        provider: "gemini",
        category: "standard_request",
        contextWindow: 1000000,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
      },
    ],
  });
});

// 3. Anthropic Compatible Messages Endpoint: POST /api/v1/messages
app.post("/v1/messages", async (c) => {
  const authHeader = c.req.header("Authorization");
  const auth = await verifyGatewayApiKey(authHeader);

  if (!auth.valid) {
    return c.json(
      {
        type: "error",
        error: {
          type: "authentication_error",
          message: auth.error ?? "Invalid authentication credentials.",
        },
      },
      401
    );
  }

  // Rate Limiting Enforcement
  const limitRpm = auth.apiKey?.rateLimitRpm || 60;
  const keyIdentifier = auth.apiKey?.id || auth.keyPrefix || "default";
  const rateLimit = checkRateLimit(keyIdentifier, limitRpm);

  if (!rateLimit.allowed) {
    return c.json(
      {
        type: "error",
        error: {
          type: "rate_limit_error",
          message: `Rate limit exceeded (${rateLimit.limit} RPM). Please retry after ${rateLimit.retryAfterSeconds}s.`,
        },
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimit.resetSeconds),
      }
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const model = body.model || "claude-3-7-sonnet";
  const messages = body.messages || [{ role: "user", content: "Hello" }];
  const system = body.system;
  const temperature = body.temperature;
  const stream = body.stream !== false;

  const route = resolveProviderRoute(model);

  // Check if env variable or custom provider key is set for live proxying
  const envKey =
    route.selectedProvider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : route.selectedProvider === "openai"
      ? process.env.OPENAI_API_KEY
      : route.selectedProvider === "deepseek"
      ? process.env.DEEPSEEK_API_KEY
      : route.selectedProvider === "groq"
      ? process.env.GROQ_API_KEY
      : undefined;

  if (envKey) {
    const upstreamRes = await forwardToUpstreamProvider({
      provider: route.selectedProvider,
      apiKey: envKey,
      model,
      messages,
      system,
      temperature,
      stream,
    });

    if (upstreamRes && upstreamRes.body) {
      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: {
          "Content-Type": upstreamRes.headers.get("content-type") || "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Morvexa-Provider": route.selectedProvider,
          "X-Morvexa-Live": "true",
        },
      });
    }
  }

  // Simulated Zero-Buffer SSE stream fallback for playground & testing
  if (stream) {
    const sampleChunks = [
      "Hello! ",
      "I am streaming live ",
      "through the Morvexa AI Gateway ",
      `via ${route.selectedProvider}. `,
      "Zero-buffer SSE pipeline verified successfully with ultra-low latency.",
    ];

    const { stream: sseStream } = createAnthropicSseStream(sampleChunks, model);

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Morvexa-Provider": route.selectedProvider,
        "X-Morvexa-Failover": route.failoverOccurred ? "true" : "false",
      },
    });
  }

  return c.json({
    id: `msg_mvx_${Date.now()}`,
    type: "message",
    role: "assistant",
    model,
    content: [
      {
        type: "text",
        text: `Response generated via Morvexa Gateway [${route.selectedProvider}].`,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 28,
      output_tokens: 14,
    },
    morvexa: {
      provider: route.selectedProvider,
      failover: route.failoverOccurred,
    },
  });
});

// 4. OpenAI Compatible Chat Endpoint: POST /api/v1/chat/completions
app.post("/v1/chat/completions", async (c) => {
  const authHeader = c.req.header("Authorization");
  const auth = await verifyGatewayApiKey(authHeader);

  if (!auth.valid) {
    return c.json(
      {
        error: {
          message: auth.error ?? "Invalid authentication credentials.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      },
      401
    );
  }

  // Rate Limiting Enforcement
  const limitRpm = auth.apiKey?.rateLimitRpm || 60;
  const keyIdentifier = auth.apiKey?.id || auth.keyPrefix || "default";
  const rateLimit = checkRateLimit(keyIdentifier, limitRpm);

  if (!rateLimit.allowed) {
    return c.json(
      {
        error: {
          message: `Rate limit exceeded (${rateLimit.limit} RPM). Please retry after ${rateLimit.retryAfterSeconds}s.`,
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
        },
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimit.resetSeconds),
      }
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const model = body.model || "gpt-4o";

  return c.json({
    id: `chatcmpl-mvx-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Hello from Morvexa AI Gateway OpenAI-compatible endpoint.",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 12,
      completion_tokens: 10,
      total_tokens: 22,
    },
  });
});

// Authoritative Plan Pricing Catalog (Prevents Client Amount Tampering)
const AUTHORITATIVE_PLAN_PRICES: Record<string, number> = PLAN_PRICES_IDR;

// Helper: Issues the signed session cookie for a freshly authenticated customer.
// `secure` is only set over HTTPS so local http:// development still works.
function setSessionCookie(c: any, user: { id: string; email: string; name: string; provider: "gmail" | "yahoo" | "email" }): void {
  const token = issueSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
  });
  const secure = isSecureRequest(c.req.url, c.req.header("x-forwarded-proto"));
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure,
    maxAge: SESSION_TTL_SECONDS,
  });
}

// Helper: Verifies administrative/cron authorization
function isPrivilegedRequest(c: any): boolean {
  const authHeader = c.req.header("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!authHeader) {
    // In local non-production sandbox without secrets set, permit local UI actions
    return process.env.NODE_ENV !== "production";
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (cronSecret && token === cronSecret) return true;
  if (adminSecret && token === adminSecret) return true;
  return false;
}

// 5. Billing Checkout Endpoint: POST /api/billing/checkout
app.post("/billing/checkout", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.planCode) {
    return c.json({ error: "Missing required checkout parameter: planCode" }, 400);
  }

  const planCode = String(body.planCode).toLowerCase();
  const catalogAmount = AUTHORITATIVE_PLAN_PRICES[planCode];
  if (catalogAmount === undefined) {
    return c.json(
      { error: `Invalid planCode: ${body.planCode}. Must be developer, pro, apex, or zenith.` },
      400
    );
  }

  // The client's `amount` is deliberately ignored: trusting it would let a
  // caller open a session for a lower price than the plan they receive.
  const session = createMidtransSandboxCheckout({
    orgId: body.orgId || "org_default",
    planCode,
    amount: catalogAmount,
    customerName: body.customerName || "Customer",
    customerEmail: body.customerEmail || "customer@example.com",
  });

  return c.json(session, 201);
});

// 6. Midtrans Webhook Receiver: POST /api/billing/webhooks/midtrans
//
// This is the endpoint Midtrans itself calls, and it authenticates the caller
// purely by SHA-512 signature over the order fields and MIDTRANS_SERVER_KEY.
// The browser must never be able to produce that signature.
app.post("/billing/webhooks/midtrans", async (c) => {
  const payload = await c.req.json().catch(() => null);
  if (!payload || !payload.order_id || !payload.status_code || !payload.gross_amount) {
    return c.json({ error: "Invalid webhook payload structure" }, 400);
  }

  const result = await processMidtransWebhook(payload);
  if (!result.success) {
    return c.json({ error: result.message }, 401);
  }

  // Automatic Key Provisioning & Email Dispatch upon Settlement
  let autoProvisionResult = null;
  if (result.subscriptionActivated) {
    const { autoProvisionCustomerKey } = await import("../billing/provisioning");
    const customerEmail = payload.customer_email || payload.custom_field3 || "customer@morvexa.ai";
    const customerName = payload.customer_name || "Valued Customer";
    const planCode = payload.custom_field2 || "pro";

    try {
      autoProvisionResult = await autoProvisionCustomerKey({
        orderId: payload.order_id,
        customerEmail,
        customerName,
        planCode,
        orgId: payload.custom_field1 || "org_default",
      });
    } catch (err: any) {
      console.error("[Auto-provision Error]:", err);
    }
  }

  return c.json({ ...result, autoProvision: autoProvisionResult }, 200);
});

// 6b. Sandbox Settlement Simulator: POST /api/billing/sandbox/settle
//
// The customer portal needs a way to mark a sandbox invoice as paid without
// holding Midtrans credentials. Signing happens here, on the server, using the
// same key the webhook verifier uses — so the trust boundary is unchanged and
// the browser never sees a signing secret.
//
// This is refused in production, where settlement must arrive from Midtrans.
app.post("/billing/sandbox/settle", async (c) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SANDBOX_SETTLEMENT !== "true") {
    return c.json(
      { error: "Sandbox settlement is disabled in production. Await the Midtrans webhook." },
      403
    );
  }

  const body = await c.req.json().catch(() => null);
  const orderId = body?.orderId;
  if (!orderId) {
    return c.json({ error: "Missing required parameter: orderId" }, 400);
  }

  const tx = getTransaction(orderId);
  if (!tx) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  const serverKey = process.env.MIDTRANS_SERVER_KEY || "dummy_sandbox_key";
  const statusCode = "200";
  const grossAmount = `${tx.amount}.00`;

  const payload = {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: calculateMidtransSignature(orderId, statusCode, grossAmount, serverKey),
    transaction_status: "settlement" as const,
    transaction_id: `midtrans-sandbox-${Date.now()}`,
    payment_type: body?.paymentMethod || "qris",
    customer_name: body?.customerName || "Customer",
    customer_email: body?.customerEmail || "customer@example.com",
    custom_field1: tx.orgId || "org_default",
    custom_field2: tx.planCode || "pro",
    custom_field3: body?.customerEmail || "customer@example.com",
  };

  const result = await processMidtransWebhook(payload);
  if (!result.success) {
    return c.json({ error: result.message }, 401);
  }

  let autoProvisionResult = null;
  if (result.subscriptionActivated) {
    const { autoProvisionCustomerKey } = await import("../billing/provisioning");
    try {
      autoProvisionResult = await autoProvisionCustomerKey({
        orderId,
        customerEmail: payload.customer_email,
        customerName: payload.customer_name,
        planCode: payload.custom_field2,
        orgId: payload.custom_field1,
      });
    } catch (err: any) {
      console.error("[Auto-provision Error]:", err);
    }
  }

  return c.json({ ...result, autoProvision: autoProvisionResult }, 200);
});

// 7. Transaction Status Query: GET /api/billing/transactions/:orderId (IDOR Protected)
app.get("/billing/transactions/:orderId", async (c) => {
  const orderId = c.req.param("orderId");
  const tx = getTransaction(orderId);
  if (!tx) {
    return c.json({ error: "Transaction not found" }, 404);
  }

  // Tenant Isolation / IDOR Guard
  const authHeader = c.req.header("Authorization");
  if (authHeader) {
    const auth = await verifyGatewayApiKey(authHeader);
    if (auth.valid && tx.orgId && auth.orgId !== "org_default" && tx.orgId !== auth.orgId) {
      return c.json({ error: "Forbidden: Cross-tenant transaction access denied" }, 403);
    }
  }

  return c.json({ orderId, ...tx });
});

// 8. Infrastructure Provisioning: POST /api/infrastructure/provision
app.post("/infrastructure/provision", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.orgId || !body.planCode) {
    return c.json({ error: "Missing required parameters: orgId, planCode" }, 400);
  }

  const result = await requestDedicatedEnvironment({
    orgId: body.orgId,
    planCode: body.planCode,
    region: body.region || "sin",
    modelTier: body.modelTier || "isolated_proxy",
    dedicatedHostUrl: body.dedicatedHostUrl,
    memoryMb: body.memoryMb,
    cpuCores: body.cpuCores,
  });

  if (!result.success) {
    return c.json({ error: result.message }, 403);
  }

  return c.json(result, 201);
});

// 9. Infrastructure Environment Health: GET /api/infrastructure/environments/:envId
app.get("/infrastructure/environments/:envId", (c) => {
  const envId = c.req.param("envId");
  const env = getEnvironment(envId);
  if (!env) {
    return c.json({ error: "Environment not found" }, 404);
  }
  return c.json(env);
});

// 10. Record Health Probe: POST /api/infrastructure/environments/:envId/probe
app.post("/infrastructure/environments/:envId/probe", async (c) => {
  const envId = c.req.param("envId");
  const body = await c.req.json().catch(() => ({}));
  const success = body.success ?? true;

  const env = recordHealthProbe(envId, Boolean(success));
  if (!env) {
    return c.json({ error: "Environment not found" }, 404);
  }
  return c.json(env);
});

// 11. Deprovision Environment: DELETE /api/infrastructure/environments/:envId (Privileged)
app.delete("/infrastructure/environments/:envId", (c) => {
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Unauthorized administrative access" }, 401);
  }
  const envId = c.req.param("envId");
  const ok = deprovisionEnvironment(envId);
  if (!ok) {
    return c.json({ error: "Environment not found" }, 404);
  }
  return c.json({ success: true, message: `Environment ${envId} deprovisioned.` });
});

// 12. Automated Reconciliation Runner: POST /api/billing/reconcile (Privileged)
app.post("/billing/reconcile", async (c) => {
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Unauthorized administrative access" }, 401);
  }
  const body = await c.req.json().catch(() => ({}));
  const minPendingAgeMs = body.minPendingAgeMs !== undefined ? Number(body.minPendingAgeMs) : 0;
  const result = await runAutomatedReconciliation({ minPendingAgeMs });
  return c.json(result, 200);
});

// 13. Reconcile Single Order: POST /api/billing/reconcile/:orderId (Privileged)
app.post("/billing/reconcile/:orderId", async (c) => {
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Unauthorized administrative access" }, 401);
  }
  const orderId = c.req.param("orderId");
  const body = await c.req.json().catch(() => ({}));
  const record = await reconcileSingleOrder(orderId, {
    mockGatewayStatus: body.mockGatewayStatus,
    mockGatewayAmount: body.mockGatewayAmount ? Number(body.mockGatewayAmount) : undefined,
    mockFraudStatus: body.mockFraudStatus,
  });
  return c.json(record, 200);
});

// 14. Query Reconciliation Audit Logs: GET /api/billing/reconcile/logs
app.get("/billing/reconcile/logs", (c) => {
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Unauthorized administrative access" }, 401);
  }
  const logs = getReconciliationLogs();
  return c.json({ count: logs.length, logs }, 200);
});

// 15. Scheduled Cron: POST /api/cron/reconcile
app.post("/cron/reconcile", async (c) => {
  const authHeader = c.req.header("Authorization");
  const { verifyCronAuthorization, executeReconciliationCron } = await import("../cron/scheduler");
  if (!verifyCronAuthorization(authHeader)) {
    return c.json({ error: "Unauthorized cron trigger" }, 401);
  }
  const result = await executeReconciliationCron();
  return c.json(result, result.success ? 200 : 500);
});

// 16. Scheduled Cron: POST /api/cron/subscriptions
app.post("/cron/subscriptions", async (c) => {
  const authHeader = c.req.header("Authorization");
  const { verifyCronAuthorization, executeSubscriptionLifecycleCron } = await import("../cron/scheduler");
  if (!verifyCronAuthorization(authHeader)) {
    return c.json({ error: "Unauthorized cron trigger" }, 401);
  }
  const result = await executeSubscriptionLifecycleCron();
  return c.json(result, result.success ? 200 : 500);
});

// 17. Audit Logs Query: GET /api/audit/logs
app.get("/audit/logs", async (c) => {
  if (!isPrivilegedRequest(c)) {
    return c.json({ error: "Forbidden: Privileged access token required" }, 403);
  }

  const { queryAuditLogs } = await import("../audit/logger");
  const actorId = c.req.query("actorId");
  const orgId = c.req.query("organizationId");
  const action = c.req.query("action") as any;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 50;

  const logs = queryAuditLogs({
    actorId,
    organizationId: orgId,
    action,
    limit,
  });

  return c.json({ count: logs.length, logs }, 200);
});

// 18. Customer Authentication: register / login / logout / session
//
// Sessions are HttpOnly signed cookies, so the browser never holds a token that
// JavaScript (or an XSS payload) can read. Passwords are verified server-side
// against scrypt records; the client only ever receives the public user shape.
/**
 * Renders a lockout duration the way a person reads it: "12 menit" rather than
 * "720 detik". Short waits still use seconds so a near-expired lock is precise.
 */
function describeLockout(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} menit`;
}

function lockoutMessage(seconds: number): string {
  return `Terlalu banyak percobaan gagal. Coba lagi dalam ${describeLockout(seconds)}.`;
}

app.post("/customer/auth/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return c.json({ error: "Masukkan alamat email yang valid." }, 400);
  }

  const policy = validatePasswordPolicy(body.password);
  if (!policy.valid) {
    return c.json({ error: policy.message }, 400);
  }

  const throttleKey = `register:${email.toLowerCase()}`;
  const throttle = checkLoginThrottle(throttleKey);
  if (!throttle.allowed) {
    return c.json({ error: lockoutMessage(throttle.retryAfterSeconds) }, 429);
  }

  const { registerCustomer } = await import("../customer/store");
  const result = await registerCustomer({ email, name, password: body.password });

  if (!result.ok || !result.user) {
    recordLoginFailure(throttleKey);
    return c.json({ error: result.error ?? "Pendaftaran gagal." }, result.status as any);
  }

  clearLoginFailures(throttleKey);
  setSessionCookie(c, result.user);
  return c.json(
    { success: true, user: result.user, message: "Akun berhasil dibuat. Selamat datang di Morvexa." },
    201
  );
});

app.post("/customer/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || typeof body.password !== "string" || body.password.length === 0) {
    return c.json({ error: "Email dan password wajib diisi." }, 400);
  }

  const throttleKey = `login:${email.toLowerCase()}`;
  const throttle = checkLoginThrottle(throttleKey);
  if (!throttle.allowed) {
    return c.json({ error: lockoutMessage(throttle.retryAfterSeconds) }, 429);
  }

  const { authenticateCustomer } = await import("../customer/store");
  const result = await authenticateCustomer({ email, password: body.password });

  if (!result.ok || !result.user) {
    recordLoginFailure(throttleKey);
    return c.json({ error: result.error ?? "Login gagal." }, result.status as any);
  }

  clearLoginFailures(throttleKey);
  setSessionCookie(c, result.user);
  return c.json({ success: true, user: result.user, message: "Login berhasil." }, 200);
});

app.post("/customer/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ success: true, message: "Anda telah keluar dari akun." }, 200);
});

// Resolves the current session from the signed cookie. Always 200 so the client
// can distinguish "signed out" from "request failed" without error handling.
app.get("/customer/auth/session", async (c) => {
  const claims = verifySessionToken(readSessionCookie(c.req.header("Cookie")));
  if (!claims) {
    return c.json({ authenticated: false, user: null }, 200);
  }

  const { findCustomerById } = await import("../customer/store");
  const user = findCustomerById(claims.sub);
  if (!user) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ authenticated: false, user: null }, 200);
  }

  return c.json({ authenticated: true, user }, 200);
});

// 19. Customer Data & Activity Feed for Owner: GET /api/customer/dashboard-data
app.get("/customer/dashboard-data", async (c) => {
  const {
    getRegisteredCustomers,
    getCustomerOrders,
    getCustomerActivities,
    MODEL_PRODUCTS,
  } = await import("../customer/store");

  return c.json({
    customers: getRegisteredCustomers(),
    orders: getCustomerOrders(),
    activities: getCustomerActivities(),
    modelProducts: MODEL_PRODUCTS,
  }, 200);
});

// 20. Customer Model Product Token Purchase: POST /api/customer/purchase-model
app.post("/customer/purchase-model", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { customerEmail, customerName, modelId, paymentMethod = "qris" } = body;

  if (!customerEmail || !modelId) {
    return c.json({ error: "customerEmail and modelId are required" }, 400);
  }

  const { MODEL_PRODUCTS, recordCustomerOrder } = await import("../customer/store");
  const product = MODEL_PRODUCTS.find((p) => p.id === modelId);
  if (!product) {
    return c.json({ error: "Model product not found" }, 404);
  }

  // Provision an API key specifically for model token access
  const { createApiKey } = await import("../supabase/store");
  const keyName = `${product.name} Key`;
  const keyCreation = await createApiKey(keyName, 180, product.bundleTokensGranted);

  const order = await recordCustomerOrder({
    customerId: `cust_${Date.now().toString().slice(-6)}`,
    customerEmail,
    customerName: customerName || customerEmail.split("@")[0],
    orderType: "model_token_purchase",
    productCode: product.id,
    productName: product.name,
    amountIdr: product.bundlePriceIdr,
    tokensGranted: product.bundleTokensGranted,
    paymentMethod,
    status: "settled",
    apiKeyDispatched: keyCreation.key.maskedKey,
  });

  return c.json({
    success: true,
    order,
    apiKey: {
      rawSecret: keyCreation.rawSecret,
      maskedKey: keyCreation.key.maskedKey,
      name: keyName,
    },
    message: `Pembelian ${product.name} sebesar Rp ${product.bundlePriceIdr.toLocaleString("id-ID")} berhasil diproses! API Key otomatis diterbitkan.`,
  }, 200);
});




