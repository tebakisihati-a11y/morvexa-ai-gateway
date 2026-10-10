/**
 * Morvexa Nexus — Multi-Tenant Role-Based Access Control (RBAC) Engine
 * Implements the 9-tier hierarchical authorization model.
 */

export type PlatformRole =
  | "PLATFORM_OWNER"
  | "SUPER_ADMIN"
  | "FINANCE_ADMIN"
  | "DEVOPS_ADMIN"
  | "SUPPORT_AGENT";

export type TenantRole =
  | "CUSTOMER_OWNER"
  | "CUSTOMER_DEVELOPER"
  | "CUSTOMER_VIEWER"
  | "PUBLIC_USER";

export type SystemRole = PlatformRole | TenantRole;

export type Action =
  // Platform Administrator Actions
  | "platform:manage_config"
  | "platform:manage_admins"
  | "platform:view_global_metrics"
  | "platform:manage_plans"
  | "platform:manage_customers"
  | "platform:suspend_account"
  // Financial Actions
  | "finance:view_transactions"
  | "finance:reconcile"
  | "finance:issue_refund"
  | "finance:export_reports"
  // DevOps & Infrastructure Actions
  | "devops:manage_infrastructure"
  | "devops:trigger_provisioning"
  | "devops:view_health_metrics"
  // Support Actions
  | "support:view_customer_details"
  // Tenant Customer Actions
  | "org:manage_billing"
  | "org:manage_members"
  | "org:create_projects"
  | "org:create_api_keys"
  | "org:revoke_api_keys"
  | "org:view_traces"
  | "org:view_invoices"
  | "org:execute_ai_inference"
  | "public:access_marketing"
  | "public:initiate_checkout";

const ROLE_PERMISSIONS: Record<SystemRole, Action[]> = {
  PLATFORM_OWNER: [
    "platform:manage_config",
    "platform:manage_admins",
    "platform:view_global_metrics",
    "platform:manage_plans",
    "platform:manage_customers",
    "platform:suspend_account",
    "finance:view_transactions",
    "finance:reconcile",
    "finance:issue_refund",
    "finance:export_reports",
    "devops:manage_infrastructure",
    "devops:trigger_provisioning",
    "devops:view_health_metrics",
    "support:view_customer_details",
    "org:manage_billing",
    "org:manage_members",
    "org:create_projects",
    "org:create_api_keys",
    "org:revoke_api_keys",
    "org:view_traces",
    "org:view_invoices",
    "org:execute_ai_inference",
    "public:access_marketing",
    "public:initiate_checkout",
  ],
  SUPER_ADMIN: [
    "platform:view_global_metrics",
    "platform:manage_plans",
    "platform:manage_customers",
    "platform:suspend_account",
    "support:view_customer_details",
    "devops:view_health_metrics",
    "finance:view_transactions",
    "public:access_marketing",
  ],
  FINANCE_ADMIN: [
    "finance:view_transactions",
    "finance:reconcile",
    "finance:issue_refund",
    "finance:export_reports",
    "support:view_customer_details",
    "public:access_marketing",
  ],
  DEVOPS_ADMIN: [
    "devops:manage_infrastructure",
    "devops:trigger_provisioning",
    "devops:view_health_metrics",
    "support:view_customer_details",
    "public:access_marketing",
  ],
  SUPPORT_AGENT: [
    "support:view_customer_details",
    "public:access_marketing",
  ],
  CUSTOMER_OWNER: [
    "org:manage_billing",
    "org:manage_members",
    "org:create_projects",
    "org:create_api_keys",
    "org:revoke_api_keys",
    "org:view_traces",
    "org:view_invoices",
    "org:execute_ai_inference",
    "public:access_marketing",
    "public:initiate_checkout",
  ],
  CUSTOMER_DEVELOPER: [
    "org:create_projects",
    "org:create_api_keys",
    "org:revoke_api_keys",
    "org:view_traces",
    "org:execute_ai_inference",
    "public:access_marketing",
  ],
  CUSTOMER_VIEWER: [
    "org:view_traces",
    "public:access_marketing",
  ],
  PUBLIC_USER: [
    "public:access_marketing",
    "public:initiate_checkout",
  ],
};

/**
 * Validates whether a given system role is permitted to execute an action.
 */
export function canPerform(role: SystemRole | string | undefined | null, action: Action): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as SystemRole];
  if (!permissions) return false;
  return permissions.includes(action);
}

/**
 * Returns true if the role is a platform-level administrator.
 */
export function isPlatformAdmin(role: SystemRole | string | undefined | null): boolean {
  return (
    role === "PLATFORM_OWNER" ||
    role === "SUPER_ADMIN" ||
    role === "FINANCE_ADMIN" ||
    role === "DEVOPS_ADMIN" ||
    role === "SUPPORT_AGENT"
  );
}
