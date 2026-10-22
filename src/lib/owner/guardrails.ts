/**
 * Owner-toggled guardrails configuration (in-memory per edge process).
 * Defaults match the guide surface so the control panel and runtime agree
 * before any owner change lands.
 */
export interface GuardrailsConfig {
  maskPii: boolean;
  promptCaching: boolean;
  monthlyBudgetCeiling: number;
}

let config: GuardrailsConfig = {
  maskPii: true,
  promptCaching: true,
  monthlyBudgetCeiling: 50,
};

export function getGuardrailsConfig(): GuardrailsConfig {
  return { ...config };
}

export function updateGuardrailsConfig(
  updates: Partial<GuardrailsConfig>
): GuardrailsConfig {
  config = { ...config, ...updates };
  return { ...config };
}

/** Regex PII redaction applied to request payloads when maskPii is on. */
const PII_PATTERNS = [
  /\b(?:\d[ -]*?){13,16}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(mvx_live_[0-9a-f._-]+|mvx_test_[0-9a-f._-]+|sk-[A-Za-z0-9-]+|AIza[0-9A-Za-z_\-]{35})\b/g,
];

export function sanitizePii(text: string): string {
  return PII_PATTERNS.reduce((acc, re) => acc.replace(re, "[REDACTED]"), text);
}
