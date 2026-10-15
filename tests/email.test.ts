import { describe, it, expect, beforeEach, vi } from "vitest";
import { sendEmail, resolveEmailTransport, isEmailDeliveryConfigured } from "../src/lib/email/send";
import { welcomeEmail, passwordResetEmail, apiKeyDeliveryEmail, escapeHtml } from "../src/lib/email/templates";
import { resolvePublicBaseUrl } from "../src/lib/email/baseUrl";

describe("Email transport selection", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("falls back to the log transport when no API key is configured", () => {
    expect(resolveEmailTransport()).toBe("log");
    expect(isEmailDeliveryConfigured()).toBe(false);
  });

  it("selects Resend once an API key is present", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    expect(resolveEmailTransport()).toBe("resend");
    expect(isEmailDeliveryConfigured()).toBe(true);
    delete process.env.RESEND_API_KEY;
  });
});

describe("sendEmail", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("reports delivered:false on the log transport so callers cannot claim an email was sent", async () => {
    const result = await sendEmail({
      to: "customer@example.com",
      email: welcomeEmail({ name: "Budi", portalUrl: "https://example.com/customer" }),
    });

    expect(result.delivered).toBe(false);
    expect(result.transport).toBe("log");
  });

  it("posts to Resend and reports delivered:true with the provider id", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await sendEmail({
      to: "customer@example.com",
      email: welcomeEmail({ name: "Budi", portalUrl: "https://example.com/customer" }),
      transport: "resend",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.delivered).toBe(true);
    expect(result.id).toBe("email_123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toEqual(["customer@example.com"]);
    expect(body.subject).toBe("Akun Morvexa Anda sudah aktif");
    expect(body.html).toContain("Budi");
  });

  it("reports delivered:false and an error when the provider rejects the request", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("invalid api key", { status: 401 })
    );

    const result = await sendEmail({
      to: "customer@example.com",
      email: welcomeEmail({ name: "Budi", portalUrl: "https://example.com/customer" }),
      transport: "resend",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.delivered).toBe(false);
    expect(result.transport).toBe("resend");
    expect(result.error).toContain("401");
  });

  it("reports delivered:false rather than throwing when the network fails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchImpl = vi.fn().mockRejectedValue(new Error("socket hang up"));

    const result = await sendEmail({
      to: "customer@example.com",
      email: welcomeEmail({ name: "Budi", portalUrl: "https://example.com/customer" }),
      transport: "resend",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.delivered).toBe(false);
    expect(result.error).toBe("socket hang up");
  });

  it("refuses to call the provider when no API key is configured", async () => {
    const fetchImpl = vi.fn();

    const result = await sendEmail({
      to: "customer@example.com",
      email: welcomeEmail({ name: "Budi", portalUrl: "https://example.com/customer" }),
      transport: "resend",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.delivered).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends to the requested recipient only", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 200 })
    );

    await sendEmail({
      to: "someone.else@example.com",
      email: passwordResetEmail({
        name: "Budi",
        resetUrl: "https://example.com/reset-password?token=abc",
        expiresMinutes: 30,
      }),
      transport: "resend",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["someone.else@example.com"]);
  });
});

describe("Email templates", () => {
  it("escapes HTML in the customer name so a display name cannot inject markup", () => {
    const email = welcomeEmail({
      name: '<img src=x onerror="alert(1)">',
      portalUrl: "https://example.com/customer",
    });

    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x");
  });

  it("escapes the ampersand and quotes too", () => {
    expect(escapeHtml(`Tom & "Jerry" <b>`)).toBe("Tom &amp; &quot;Jerry&quot; &lt;b&gt;");
  });

  it("includes the reset link in both the HTML and the plain-text body", () => {
    const url = "https://morvexa.ai/reset-password?token=raw-token-value";
    const email = passwordResetEmail({ name: "Budi", resetUrl: url, expiresMinutes: 30 });

    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
    expect(email.subject).toContain("Reset password");
  });

  it("states the expiry window in the reset email", () => {
    const email = passwordResetEmail({
      name: "Budi",
      resetUrl: "https://morvexa.ai/reset-password?token=x",
      expiresMinutes: 30,
    });

    expect(email.text).toContain("30 menit");
  });

  it("includes the API key, plan, and rate limit in the key delivery email", () => {
    const email = apiKeyDeliveryEmail({
      name: "Budi",
      planName: "Pro Workspace",
      orderId: "ORD-123456",
      apiKey: "mvx_live_deadbeef",
      rateLimitRpm: 600,
      models: ["claude-3-7-sonnet", "gpt-4o"],
    });

    expect(email.text).toContain("mvx_live_deadbeef");
    expect(email.text).toContain("Pro Workspace");
    expect(email.text).toContain("600 request/menit");
    expect(email.text).toContain("claude-3-7-sonnet, gpt-4o");
    expect(email.subject).toContain("Pro Workspace");
  });
});

describe("resolvePublicBaseUrl", () => {
  it("prefers an explicit configured base URL", () => {
    process.env.MORVEXA_PUBLIC_BASE_URL = "https://morvexa.ai";
    expect(
      resolvePublicBaseUrl({ url: "http://localhost:3000/api/x", forwardedHost: "internal:8080" })
    ).toBe("https://morvexa.ai");
    delete process.env.MORVEXA_PUBLIC_BASE_URL;
  });

  it("uses the forwarded host so emailed links point at the public address", () => {
    expect(
      resolvePublicBaseUrl({
        url: "http://10.0.0.5:3000/api/x",
        forwardedHost: "morvexa.ai",
        forwardedProto: "https",
      })
    ).toBe("https://morvexa.ai");
  });

  it("falls back to the request origin", () => {
    expect(resolvePublicBaseUrl({ url: "http://localhost:3000/api/x" })).toBe(
      "http://localhost:3000"
    );
  });

  it("strips a trailing slash from the configured URL", () => {
    process.env.MORVEXA_PUBLIC_BASE_URL = "https://morvexa.ai/";
    expect(resolvePublicBaseUrl({ url: "http://localhost:3000/" })).toBe("https://morvexa.ai");
    delete process.env.MORVEXA_PUBLIC_BASE_URL;
  });
});
