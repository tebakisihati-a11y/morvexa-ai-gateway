import { describe, it, expect } from "vitest";
import { canPerform, isPlatformAdmin, type SystemRole } from "../src/lib/auth/roles";

describe("9-Tier Hierarchical RBAC Engine", () => {
  it("grants PLATFORM_OWNER full administrative and financial permissions", () => {
    expect(canPerform("PLATFORM_OWNER", "platform:manage_config")).toBe(true);
    expect(canPerform("PLATFORM_OWNER", "platform:manage_admins")).toBe(true);
    expect(canPerform("PLATFORM_OWNER", "finance:issue_refund")).toBe(true);
    expect(canPerform("PLATFORM_OWNER", "devops:manage_infrastructure")).toBe(true);
    expect(canPerform("PLATFORM_OWNER", "org:manage_billing")).toBe(true);
  });

  it("restricts SUPER_ADMIN from critical financial actions like issuing refunds", () => {
    expect(canPerform("SUPER_ADMIN", "platform:manage_plans")).toBe(true);
    expect(canPerform("SUPER_ADMIN", "platform:manage_customers")).toBe(true);
    expect(canPerform("SUPER_ADMIN", "finance:issue_refund")).toBe(false);
    expect(canPerform("SUPER_ADMIN", "platform:manage_admins")).toBe(false);
  });

  it("restricts FINANCE_ADMIN from infrastructure and system configuration actions", () => {
    expect(canPerform("FINANCE_ADMIN", "finance:view_transactions")).toBe(true);
    expect(canPerform("FINANCE_ADMIN", "finance:issue_refund")).toBe(true);
    expect(canPerform("FINANCE_ADMIN", "finance:reconcile")).toBe(true);
    expect(canPerform("FINANCE_ADMIN", "devops:manage_infrastructure")).toBe(false);
    expect(canPerform("FINANCE_ADMIN", "platform:manage_config")).toBe(false);
  });

  it("restricts DEVOPS_ADMIN from financial refunds and customer billing settings", () => {
    expect(canPerform("DEVOPS_ADMIN", "devops:manage_infrastructure")).toBe(true);
    expect(canPerform("DEVOPS_ADMIN", "devops:trigger_provisioning")).toBe(true);
    expect(canPerform("DEVOPS_ADMIN", "finance:issue_refund")).toBe(false);
    expect(canPerform("DEVOPS_ADMIN", "org:manage_billing")).toBe(false);
  });

  it("allows CUSTOMER_OWNER to manage keys, billing, and projects in their org", () => {
    expect(canPerform("CUSTOMER_OWNER", "org:manage_billing")).toBe(true);
    expect(canPerform("CUSTOMER_OWNER", "org:create_api_keys")).toBe(true);
    expect(canPerform("CUSTOMER_OWNER", "org:revoke_api_keys")).toBe(true);
    expect(canPerform("CUSTOMER_OWNER", "platform:manage_plans")).toBe(false);
    expect(canPerform("CUSTOMER_OWNER", "platform:suspend_account")).toBe(false);
  });

  it("restricts CUSTOMER_DEVELOPER from managing billing or financial records", () => {
    expect(canPerform("CUSTOMER_DEVELOPER", "org:create_api_keys")).toBe(true);
    expect(canPerform("CUSTOMER_DEVELOPER", "org:execute_ai_inference")).toBe(true);
    expect(canPerform("CUSTOMER_DEVELOPER", "org:manage_billing")).toBe(false);
    expect(canPerform("CUSTOMER_DEVELOPER", "org:manage_members")).toBe(false);
  });

  it("restricts CUSTOMER_VIEWER to read-only trace viewing", () => {
    expect(canPerform("CUSTOMER_VIEWER", "org:view_traces")).toBe(true);
    expect(canPerform("CUSTOMER_VIEWER", "org:create_api_keys")).toBe(false);
    expect(canPerform("CUSTOMER_VIEWER", "org:execute_ai_inference")).toBe(false);
  });

  it("restricts PUBLIC_USER to marketing and initiating checkout", () => {
    expect(canPerform("PUBLIC_USER", "public:access_marketing")).toBe(true);
    expect(canPerform("PUBLIC_USER", "public:initiate_checkout")).toBe(true);
    expect(canPerform("PUBLIC_USER", "org:create_api_keys")).toBe(false);
  });

  it("correctly identifies platform administrator roles", () => {
    expect(isPlatformAdmin("PLATFORM_OWNER")).toBe(true);
    expect(isPlatformAdmin("SUPER_ADMIN")).toBe(true);
    expect(isPlatformAdmin("FINANCE_ADMIN")).toBe(true);
    expect(isPlatformAdmin("DEVOPS_ADMIN")).toBe(true);
    expect(isPlatformAdmin("SUPPORT_AGENT")).toBe(true);
    expect(isPlatformAdmin("CUSTOMER_OWNER")).toBe(false);
    expect(isPlatformAdmin("CUSTOMER_DEVELOPER")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });

  it("denies all actions for undefined or invalid roles", () => {
    expect(canPerform(null, "public:access_marketing")).toBe(false);
    expect(canPerform("UNKNOWN_ROLE" as SystemRole, "public:access_marketing")).toBe(false);
  });
});
