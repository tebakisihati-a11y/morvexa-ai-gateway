import { describe, it, expect } from "vitest";
import { app } from "../src/lib/gateway/app";

describe("Hono Edge Gateway Router", () => {
  it("rejects unauthorized requests with 401 when Bearer token is missing", async () => {
    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "Hi" }] }),
    });

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.type).toBe("authentication_error");
  });

  it("returns available model list on GET /api/v1/models", async () => {
    const res = await app.request("/api/v1/models", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeInstanceOf(Array);
    expect(json.data.some((m: { id: string }) => m.id.includes("claude"))).toBe(true);
    expect(json.data.some((m: { id: string }) => m.id.includes("gpt"))).toBe(true);
  });

  it("handles valid test proxy requests on /api/v1/messages with streaming SSE response", async () => {
    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer mvx_live_test_key_123456",
      },
      body: JSON.stringify({
        model: "claude-3-7-sonnet",
        stream: true,
        messages: [{ role: "user", content: "Hello Morvexa" }],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: message_start");
    expect(text).toContain("event: content_block_delta");
  });

  it("returns system metrics on GET /api/v1/metrics", async () => {
    const res = await app.request("/api/v1/metrics", { method: "GET" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("healthy");
    expect(typeof json.rps).toBe("number");
    expect(typeof json.avgTtftMs).toBe("number");
  });
});
