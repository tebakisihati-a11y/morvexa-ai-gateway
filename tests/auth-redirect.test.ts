import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/validation/auth";

describe("safeRedirectPath", () => {
  it("keeps ordinary in-app paths", () => {
    expect(safeRedirectPath("/customer")).toBe("/customer");
    expect(safeRedirectPath("/customer?tab=billing")).toBe("/customer?tab=billing");
    expect(safeRedirectPath("/owner")).toBe("/owner");
  });

  it("falls back when nothing was supplied", () => {
    expect(safeRedirectPath(null)).toBe("/customer");
    expect(safeRedirectPath(undefined)).toBe("/customer");
    expect(safeRedirectPath("")).toBe("/customer");
  });

  it("honours a custom fallback", () => {
    expect(safeRedirectPath(null, "/login")).toBe("/login");
  });

  it("rejects absolute URLs on other origins", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/customer");
    expect(safeRedirectPath("http://evil.com/phish")).toBe("/customer");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/customer");
  });

  it("rejects protocol-relative URLs, which a bare startsWith('/') would allow", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/customer");
    expect(safeRedirectPath("//evil.com/login")).toBe("/customer");
    expect(safeRedirectPath("/\\evil.com")).toBe("/customer");
  });

  it("rejects control characters that could smuggle a header break", () => {
    expect(safeRedirectPath("/customer\nLocation: https://evil.com")).toBe("/customer");
    expect(safeRedirectPath("/customer\u0000")).toBe("/customer");
  });
});
