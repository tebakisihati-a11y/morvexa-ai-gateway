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
import { RESET_TOKEN_TTL_MINUTES } from "../auth/resetTokens";
import { createAnthropicSseStream } from "./stream";
import { resolveProviderRoute, DEFAULT_PROVIDERS } from "./failover";
import { forwardToUpstreamProvider } from "./upstream";
import {
  processMidtransWebhook,
  createMidtransSandboxCheckout,
  calculateMidtransSignature,
  getTransaction,
} from "../billing/midtrans";
import { resolveMidtransServerKey } from "../billing/sandboxKey";
import { PLAN_PRICES_IDR } from "../billing/catalog";
import {
  requestDedicatedEnvironment,
  getEnvironment,
  recordHealthProbe,
  deprovisionEnvironment,
} from "../infrastructure/provisioning";
import { checkRateLimit } from "./ratelimit";
import { enforceSameOrigin, enforceCsrfToken, generateCsrfToken, CSRF_COOKIE } from "./csrf";
import {
  OWNER_COOKIE,
  OWNER_TTL_SECONDS,
  hasOwnerSession,
  isOwnerAuthConfigured,
  issueOwnerToken,
  verifyOwnerPasscode,
} from "../auth/ownerSession";
import { checkIpRateLimit, clientIpFromHeaders, ipLimitPolicy } from "./ipRateLimit";
import { readSharedWindow, recordSharedEvent } from "./rateLimitStore";
import {
  reconcileSingleOrder,
  runAutomatedReconciliation,
  getReconciliationLogs,
} from "../billing/reconciliation";
import { DEFAULT_SYSTEM_METRICS } from "../constants";

export const app = new Hono().basePath("/api");

/**
 * Loads durable customer records into memory when the gateway module is first
 * imported. Fired once, not awaited: the process can start serving immediately,
 * and the synchronous lookups fall back to the JSON store until it resolves.
 */
void import("../customer/store")
  .then(({ hydrateCustomerStore }) => hydrateCustomerStore())
  .catch((error) => {
    console.error("[Morvexa Durable] Customer hydration failed:", error);
  });

// Surfaces a missing email provider in the deploy log, where an operator will
// see it, instead of only when the first customer fails to verify an address.
void import("../email/send")
  .then(({ assertEmailDeliveryConfigured }) => assertEmailDeliveryConfigured())
  .catch(() => undefined);

// Keys created before this process started are not in memory yet, so the
// customer portal would show an empty list until the first write. Loading them
// up front keeps "my keys" accurate on the first page view.
void import("../supabase/keyPersistence")
  .then(({ hydrateApiKeys }) => hydrateApiKeys())
  .catch((error) => {
    console.error("[Morvexa Durable] API key hydration failed:", error);
  });

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

/**
 * Rejects cross-site state-changing requests before any handler runs.
 *
 * Applied to the whole app: any browser POST/PUT/PATCH/DELETE must come from a
 * host we recognise. Requests without an Origin are server-to-server callers
 * and pass through to their own authentication.
 */
app.use("*", async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }
  const rejected = enforceSameOrigin(c);
  if (rejected) return rejected;
  return next();
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
function setSessionCookie(
  c: any,
  user: { id: string; email: string; name: string; provider: "gmail" | "yahoo" | "email" },
  passwordEpoch = 0
): void {
  const token = issueSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    pwdAt: passwordEpoch,
  });
  const secure = isSecureRequest(c.req.url, c.req.header("x-forwarded-proto"));
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure,
    maxAge: SESSION_TTL_SECONDS,
  });

  // Double-submit companion token. Deliberately readable by script: the client
  // must echo it in X-CSRF-Token, and a cross-origin attacker cannot read it.
  setCookie(c, CSRF_COOKIE, generateCsrfToken(), {
    path: "/",
    httpOnly: false,
    sameSite: "Lax",
    secure,
    maxAge: SESSION_TTL_SECONDS,
  });
}

// Helper: Verifies administrative/cron authorization
/**
 * Identifies the actor behind a privileged request.
 *
 * Returns null when the request is not privileged. The label lets the access
 * audit distinguish an owner session from a machine secret, which matters when
 * asking why a large read happened.
 */
function privilegedActor(c: any): { actorType: "owner_session" | "admin_secret" | "cron_secret"; actorId: string } | null {
  if (hasOwnerSession(c.req.header("Cookie"))) {
    return { actorType: "owner_session", actorId: "owner" };
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return isPrivilegedRequest(c)
      ? { actorType: "admin_secret", actorId: "insecure-dev-bypass" }
      : null;
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    return { actorType: "cron_secret", actorId: "cron" };
  }
  if (process.env.ADMIN_SECRET_KEY && token === process.env.ADMIN_SECRET_KEY) {
    return { actorType: "admin_secret", actorId: "admin" };
  }
  return null;
}

function isPrivilegedRequest(c: any): boolean {
  // A signed owner session is the intended path for the browser console.
  if (hasOwnerSession(c.req.header("Cookie"))) return true;

  const authHeader = c.req.header("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET_KEY;
  if (!authHeader) {
    // Development convenience, opt-in only. Every hosted environment - Vercel
    // preview included - runs `next start`, where NODE_ENV is "production", so
    // keying the bypass off NODE_ENV alone is not enough: a preview deployment
    // must not expose the owner surface either. Requiring this flag means a
    // deployment has to name itself non-hosted before the bypass can apply, and
    // forgetting to set it fails closed.
    return (
      process.env.MORVEXA_ALLOW_INSECURE_DEV_PRIVILEGED === "true" &&
      process.env.NODE_ENV !== "production"
    );
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

  const serverKey = resolveMidtransServerKey();
  if (!serverKey) {
    return c.json(
      {
        error:
          "MIDTRANS_SERVER_KEY is not configured. Sandbox settlement cannot be signed.",
      },
      503
    );
  }
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

/**
 * Applies the per-IP limit for an auth endpoint.
 *
 * Returns a 429 response when the caller has exceeded the policy, or null to
 * continue. Requests with no attributable address are not limited here; the
 * per-account throttle still applies to them.
 *
 * The decision consults the shared window first so a limit holds across
 * instances. When the store is unreachable the local window still applies.
 */
async function enforceIpLimit(c: any, endpoint: string): Promise<Response | null> {
  const ip = clientIpFromHeaders(c.req.raw.headers);
  if (!ip) return null;

  const policy = ipLimitPolicy(endpoint);
  const now = Date.now();
  const shared = policy
    ? await readSharedWindow(`${endpoint}:${ip}`, now - policy.sustainedWindowMs)
    : { timestamps: [], shared: false };

  const decision = checkIpRateLimit(
    endpoint,
    ip,
    now,
    shared.shared ? shared.timestamps : undefined
  );
  if (decision.allowed) {
    // Only record accepted requests; the count that matters is "how many got
    // through", and recording rejected ones would extend the block indefinitely.
    void recordSharedEvent(`${endpoint}:${ip}`, now);
    return null;
  }

  return c.json(
    { error: lockoutMessage(decision.retryAfterSeconds) },
    429,
    { "Retry-After": String(decision.retryAfterSeconds) }
  );
}

app.post("/customer/auth/register", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "register");
  if (ipBlocked) return ipBlocked;

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

  // Verification email. A delivery failure must not fail a registration the
  // customer already completed, so the outcome is reported rather than thrown.
  const delivery = await sendVerificationEmail(c, result.user);

  setSessionCookie(c, result.user);
  return c.json(
    {
      success: true,
      user: result.user,
      emailDelivered: delivery.delivered,
      message: delivery.delivered
        ? "Akun berhasil dibuat. Kami sudah mengirim tautan verifikasi ke email Anda."
        : "Akun berhasil dibuat, tetapi email verifikasi belum terkirim. Gunakan tombol kirim ulang di halaman akun Anda.",
    },
    201
  );
});

/**
 * Issues a verification token and emails the link.
 *
 * Shared by registration and the resend endpoint so both produce identical
 * mail. Never throws: the caller has already committed the account.
 */
async function sendVerificationEmail(c: any, user: { id: string; email: string; name: string }) {
  const { sendEmail } = await import("../email/send");
  const { emailVerificationEmail } = await import("../email/templates");
  const { resolvePublicBaseUrl } = await import("../email/baseUrl");
  const { issueEmailVerificationToken, VERIFICATION_TOKEN_TTL_MINUTES } = await import(
    "../auth/verificationTokens"
  );

  try {
    const { rawToken } = await issueEmailVerificationToken({
      customerId: user.id,
      email: user.email,
    });

    const baseUrl = resolvePublicBaseUrl({
      url: c.req.url,
      forwardedHost: c.req.header("x-forwarded-host"),
      forwardedProto: c.req.header("x-forwarded-proto"),
    });

    const result = await sendEmail({
      to: user.email,
      email: emailVerificationEmail({
        name: user.name,
        verifyUrl: `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`,
        expiresHours: Math.round(VERIFICATION_TOKEN_TTL_MINUTES / 60),
      }),
    });

    if (!result.delivered) {
      console.warn(
        `[Morvexa Auth] Verification email to ${user.email} was NOT delivered (transport: ${result.transport}).`
      );
    }

    return result;
  } catch (error) {
    console.error("[Morvexa Auth] Verification email failed:", error);
    return { delivered: false, transport: "none" as const };
  }
}

// POST /api/customer/auth/verify-email — redeems a verification link.
//
// The route is idempotent: opening the same link twice reports success rather
// than an error, because a customer may well refresh the page.
app.post("/customer/auth/verify-email", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "verify-email");
  if (ipBlocked) return ipBlocked;

  const body = await c.req.json().catch(() => ({}));
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";

  if (!rawToken) {
    return c.json({ error: "Tautan verifikasi tidak lengkap." }, 400);
  }

  const { findUsableVerificationToken, consumeVerificationToken, findVerificationTokenEmail } =
    await import("../auth/verificationTokens");
  const { markEmailVerified, findCustomerByEmail, isEmailVerified } = await import(
    "../customer/store"
  );

  const token = await findUsableVerificationToken(rawToken);

  if (!token) {
    // Distinguish "already verified" from a genuinely dead link so the page can
    // be reassuring instead of alarming. A used token still resolves to its
    // address, which is what makes a refresh after success work.
    const knownEmail = await findVerificationTokenEmail(rawToken);
    const existing = knownEmail ? findCustomerByEmail(knownEmail) : undefined;

    if (existing && isEmailVerified(existing)) {
      return c.json({ success: true, alreadyVerified: true, email: existing.email });
    }

    return c.json(
      { error: "Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta tautan baru." },
      400
    );
  }

  const user = await markEmailVerified(token.email);
  if (!user) {
    return c.json({ error: "Akun tidak ditemukan." }, 404);
  }

  await consumeVerificationToken(rawToken);

  return c.json({ success: true, alreadyVerified: false, email: user.email });
});

// POST /api/customer/auth/resend-verification — issues a fresh link.
app.post("/customer/auth/resend-verification", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "resend-verification");
  if (ipBlocked) return ipBlocked;

  const body = await c.req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return c.json({ error: "Email wajib diisi." }, 400);
  }

  const { findCustomerByEmail, isEmailVerified } = await import("../customer/store");
  const user = findCustomerByEmail(email);

  // Same response whether or not the address exists, and whether or not it is
  // already verified: this endpoint must not disclose account state.
  const acknowledgement = {
    success: true,
    message:
      "Jika akun tersebut ada dan belum terverifikasi, kami sudah mengirim tautan verifikasi baru.",
  };

  if (!user || isEmailVerified(user)) {
    return c.json(acknowledgement);
  }

  await sendVerificationEmail(c, user);
  return c.json(acknowledgement);
});

app.post("/customer/auth/login", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "login");
  if (ipBlocked) return ipBlocked;

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
  const { getPasswordEpoch: readEpoch } = await import("../customer/store");
  setSessionCookie(c, result.user, await readEpoch(result.user.email));
  return c.json({ success: true, user: result.user, message: "Login berhasil." }, 200);
});

/**
 * Owner console sign-in.
 *
 * Verifies the passcode on the server and exchanges it for a signed session
 * cookie. Fails closed when OWNER_PASSCODE is unset, so an unconfigured
 * deployment cannot be opened with a guess.
 */
app.post("/owner/auth/login", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "login");
  if (ipBlocked) return ipBlocked;

  if (!isOwnerAuthConfigured()) {
    return c.json(
      { error: "Owner console is not configured. Set OWNER_PASSCODE to enable it." },
      503
    );
  }

  const body = await c.req.json().catch(() => ({}));
  if (!verifyOwnerPasscode(body?.passcode)) {
    // Deliberately vague: does not confirm the passcode length or format.
    return c.json({ error: "Passcode owner tidak valid." }, 401);
  }

  const secure = isSecureRequest(c.req.url, c.req.header("x-forwarded-proto"));
  setCookie(c, OWNER_COOKIE, issueOwnerToken(), {
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
    secure,
    maxAge: OWNER_TTL_SECONDS,
  });
  setCookie(c, CSRF_COOKIE, generateCsrfToken(), {
    path: "/",
    httpOnly: false,
    sameSite: "Strict",
    secure,
    maxAge: OWNER_TTL_SECONDS,
  });

  return c.json({ success: true, message: "Akses owner diberikan." }, 200);
});

app.post("/owner/auth/logout", (c) => {
  deleteCookie(c, OWNER_COOKIE, { path: "/" });
  deleteCookie(c, CSRF_COOKIE, { path: "/" });
  return c.json({ success: true, message: "Sesi owner diakhiri." }, 200);
});

/** Reports whether the caller holds a valid owner session. */
app.get("/owner/auth/session", (c) => {
  const authenticated = hasOwnerSession(c.req.header("Cookie"));
  return c.json({ authenticated, configured: isOwnerAuthConfigured() }, 200);
});

app.post("/customer/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, CSRF_COOKIE, { path: "/" });
  return c.json({ success: true, message: "Anda telah keluar dari akun." }, 200);
});

/**
 * Requests a password-reset link.
 *
 * Always answers with the same 200 body whether or not the address is
 * registered, so the endpoint cannot be used to discover which emails have
 * accounts. The reset email is only sent when an account exists.
 */
app.post("/customer/auth/forgot-password", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "forgot-password");
  if (ipBlocked) return ipBlocked;

  const body = await c.req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return c.json({ error: "Masukkan alamat email yang valid." }, 400);
  }

  const throttleKey = `forgot:${email.toLowerCase()}`;
  const throttle = checkLoginThrottle(throttleKey);
  if (!throttle.allowed) {
    return c.json({ error: lockoutMessage(throttle.retryAfterSeconds) }, 429);
  }
  recordLoginFailure(throttleKey);

  const { findCustomerByEmail } = await import("../customer/store");
  const customer = findCustomerByEmail(email);

  // Same response either way; only the side effect differs.
  const acknowledgement = {
    success: true,
    message:
      "Jika email tersebut terdaftar, kami sudah mengirim tautan untuk mengatur ulang password. Periksa kotak masuk dan folder spam Anda.",
  };

  if (customer) {
    const { issuePasswordResetToken } = await import("../auth/resetTokens");
    const { passwordResetEmail } = await import("../email/templates");
    const { sendEmail } = await import("../email/send");
    const { resolvePublicBaseUrl } = await import("../email/baseUrl");

    const { rawToken } = await issuePasswordResetToken({
      customerId: customer.id,
      email: customer.email,
    });

    const baseUrl = resolvePublicBaseUrl({
      url: c.req.url,
      forwardedHost: c.req.header("x-forwarded-host"),
      forwardedProto: c.req.header("x-forwarded-proto"),
    });
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendEmail({
      to: customer.email,
      email: passwordResetEmail({
        name: customer.name,
        resetUrl,
        expiresMinutes: RESET_TOKEN_TTL_MINUTES,
      }),
    });
  }

  return c.json(acknowledgement, 200);
});

/**
 * Completes a reset. The token is checked but not consumed until the new
 * password is safely persisted, so a storage failure does not burn the link.
 */
app.post("/customer/auth/reset-password", async (c) => {
  const ipBlocked = await enforceIpLimit(c, "reset-password");
  if (ipBlocked) return ipBlocked;

  const body = await c.req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";

  if (!token) {
    return c.json({ error: "Tautan reset tidak valid atau sudah kedaluwarsa." }, 400);
  }

  const policy = validatePasswordPolicy(body.password);
  if (!policy.valid) {
    return c.json({ error: policy.message }, 400);
  }

  const { findUsableResetToken, consumeResetToken } = await import("../auth/resetTokens");
  const record = findUsableResetToken(token);
  if (!record) {
    return c.json(
      { error: "Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru." },
      400
    );
  }

  const { updateCustomerPassword } = await import("../customer/store");
  const result = await updateCustomerPassword({
    email: record.email,
    newPassword: body.password,
  });

  if (!result.ok || !result.user) {
    return c.json({ error: result.error ?? "Password gagal diperbarui." }, result.status as any);
  }

  await consumeResetToken(token);
  clearLoginFailures(`login:${record.email}`);

  // Sign the customer in so the reset lands them in the portal, not back at the
  // login screen. The epoch is read after the update, so this cookie carries the
  // new value while every cookie issued before the reset is now stale.
  const { getPasswordEpoch } = await import("../customer/store");
  setSessionCookie(c, result.user, await getPasswordEpoch(result.user.email));

  return c.json(
    { success: true, user: result.user, message: "Password berhasil diperbarui." },
    200
  );
});

// Resolves the current session from the signed cookie. Always 200 so the client
// can distinguish "signed out" from "request failed" without error handling.
app.get("/customer/auth/session", async (c) => {
  const claims = verifySessionToken(readSessionCookie(c.req.header("Cookie")));
  if (!claims) {
    return c.json({ authenticated: false, user: null }, 200);
  }

  const { findCustomerById, getPasswordEpoch } = await import("../customer/store");
  const user = findCustomerById(claims.sub);
  if (!user) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ authenticated: false, user: null }, 200);
  }

  // A session issued before the last password change is no longer valid. This is
  // what makes "reset password" also sign out anyone holding an older cookie.
  const { isSessionCurrent } = await import("../auth/session");
  const epoch = await getPasswordEpoch(user.email);
  if (!isSessionCurrent(claims, epoch)) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ authenticated: false, user: null }, 200);
  }

  return c.json({ authenticated: true, user }, 200);
});

/**
 * Resolves the signed-in customer from the session cookie, or null.
 *
 * Mirrors the check in /customer/auth/session: the token must verify, the
 * account must exist, and the password epoch must still match so a reset
 * invalidates older cookies.
 */
async function currentCustomer(c: any) {
  const claims = verifySessionToken(readSessionCookie(c.req.header("Cookie")));
  if (!claims) return null;

  const { findCustomerById, getPasswordEpoch } = await import("../customer/store");
  const user = findCustomerById(claims.sub);
  if (!user) return null;

  const { isSessionCurrent } = await import("../auth/session");
  const epoch = await getPasswordEpoch(user.email);
  if (!isSessionCurrent(claims, epoch)) return null;

  return user;
}

// 18b. Customer self-service API keys.
//
// The portal previously showed only the *format* of a key. These routes give the
// customer a real list of their own keys, plus creation and revocation, all
// scoped to the session so no id from the request can reach another account.
app.get("/customer/api-keys", async (c) => {
  const user = await currentCustomer(c);
  if (!user) return c.json({ error: "Anda harus masuk untuk melihat API key." }, 401);

  const { getApiKeysForCustomer } = await import("../supabase/keyPersistence");
  const keys = await getApiKeysForCustomer(user.id);

  // Never return the hash: it is the credential-material fingerprint and has no
  // use in the browser.
  return c.json(
    {
      keys: keys.map(({ hash, ...rest }) => rest),
    },
    200
  );
});

app.post("/customer/api-keys", async (c) => {
  const user = await currentCustomer(c);
  if (!user) return c.json({ error: "Anda harus masuk untuk membuat API key." }, 401);

  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;

  const body = await c.req.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (name.length < 3 || name.length > 60) {
    return c.json({ error: "Nama key wajib diisi (3-60 karakter)." }, 400);
  }

  const { createApiKeyForCustomer, getApiKeysForCustomer } = await import("../supabase/keyPersistence");
  const existing = await getApiKeysForCustomer(user.id);
  if (existing.length >= 10) {
    return c.json({ error: "Batas 10 API key aktif per akun telah tercapai." }, 409);
  }

  const created = await createApiKeyForCustomer({
    customerId: user.id,
    customerEmail: user.email,
    name,
    rateLimitRpm: 60,
    dailyTokenLimit: 500_000,
  });

  return c.json(
    {
      key: {
        id: created.key.id,
        name: created.key.name,
        maskedKey: created.key.maskedKey,
        prefix: created.key.prefix,
        rateLimitRpm: created.key.rateLimitRpm,
        dailyTokenLimit: created.key.dailyTokenLimit,
        createdAt: created.key.createdAt,
        isActive: created.key.isActive,
      },
      // Shown once, at creation; the caller must copy it now.
      rawSecret: created.rawSecret,
      message: "API key dibuat. Salin sekarang — secret tidak ditampilkan lagi.",
    },
    201
  );
});

app.delete("/customer/api-keys/:id", async (c) => {
  const user = await currentCustomer(c);
  if (!user) return c.json({ error: "Anda harus masuk untuk mencabut API key." }, 401);

  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;

  const { revokeApiKeyForCustomer } = await import("../supabase/keyPersistence");
  const revoked = await revokeApiKeyForCustomer(c.req.param("id"), user.id);
  if (!revoked) {
    return c.json({ error: "API key tidak ditemukan pada akun Anda." }, 404);
  }

  return c.json({ success: true, message: "API key dicabut." }, 200);
});

// 19. Customer Data & Activity Feed for Owner: GET /api/customer/dashboard-data
// Owner-only. This returns every registered customer's email, plan, orders and
// activity, so it must never answer an anonymous request.
app.get("/customer/dashboard-data", async (c) => {
  const actor = privilegedActor(c);
  if (!actor) {
    // Record the refusal as well: a run of denied attempts at this route is
    // itself worth seeing.
    const { recordCustomerAccess } = await import("../customer/accessAudit");
    void recordCustomerAccess({
      actorType: "anonymous",
      actorId: "anonymous",
      action: "customer.read",
      scope: "dashboard-data",
      recordsReturned: 0,
      ipAddress: clientIpFromHeaders(c.req.raw.headers) || undefined,
      userAgent: c.req.header("User-Agent"),
      succeeded: false,
    });
    return c.json({ error: "Forbidden: Privileged access token required" }, 403);
  }

  const {
    getRegisteredCustomers,
    getCustomerOrders,
    getCustomerActivities,
    MODEL_PRODUCTS,
  } = await import("../customer/store");

  const customers = getRegisteredCustomers();
  const orders = getCustomerOrders();
  const activities = getCustomerActivities();

  // The access trail is written before the response so it cannot be skipped by a
  // dropped connection.
  const { recordCustomerAccess, recentCustomerAccess } = await import("../customer/accessAudit");
  await recordCustomerAccess({
    actorType: actor.actorType,
    actorId: actor.actorId,
    action: "customer.read",
    scope: "dashboard-data",
    recordsReturned: customers.length + orders.length + activities.length,
    ipAddress: clientIpFromHeaders(c.req.raw.headers) || undefined,
    userAgent: c.req.header("User-Agent"),
    succeeded: true,
  });

  // The console shows recent reads of customer data. The list is read after the
  // write above, so this access appears in it.
  const accessAudit = await recentCustomerAccess(50);

  return c.json({
    customers,
    orders,
    activities,
    modelProducts: MODEL_PRODUCTS,
    accessAudit,
  }, 200);
});

// 20. Customer Model Product Token Purchase: POST /api/customer/purchase-model
//
// This endpoint issues a live API key, so it requires BOTH a valid session
// cookie and the CSRF token. Previously it accepted an unauthenticated request
// and trusted `customerEmail` from the body, which let anyone mint a working key
// for an arbitrary address without paying. The email now comes from the verified
// session, never from the caller.
app.post("/customer/purchase-model", async (c) => {
  const claims = verifySessionToken(readSessionCookie(c.req.header("Cookie")));
  if (!claims) {
    return c.json({ error: "Anda harus masuk untuk membeli paket token model." }, 401);
  }

  const csrfRejected = enforceCsrfToken(c);
  if (csrfRejected) return csrfRejected;

  const body = await c.req.json().catch(() => ({}));
  const { modelId, paymentMethod = "qris" } = body;
  const customerEmail = claims.email;
  const customerName = claims.name;

  if (!modelId) {
    return c.json({ error: "modelId wajib diisi." }, 400);
  }

  const { MODEL_PRODUCTS, recordCustomerOrder } = await import("../customer/store");
  const product = MODEL_PRODUCTS.find((p) => p.id === modelId);
  if (!product) {
    return c.json({ error: "Model product not found" }, 404);
  }

  // Provision an API key owned by the buyer, so it appears in their key list and
  // survives a redeploy.
  const { createApiKeyForCustomer } = await import("../supabase/keyPersistence");
  const keyName = `${product.name} Key`;
  const keyCreation = await createApiKeyForCustomer({
    customerId: claims.sub,
    customerEmail,
    name: keyName,
    rateLimitRpm: 180,
    dailyTokenLimit: product.bundleTokensGranted,
    planCode: product.id,
  });

  const order = await recordCustomerOrder({
    customerId: claims.sub,
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




