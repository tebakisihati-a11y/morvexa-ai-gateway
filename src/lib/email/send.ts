/**
 * Morvexa — Transactional email dispatch.
 *
 * Two transports, selected from the environment:
 *
 *   resend — `RESEND_API_KEY` is set. The only transport that actually delivers
 *            mail, and the only one allowed to report success in production.
 *   log    — no key configured. The message is written to the server log so a
 *            developer can click the reset link locally. It reports
 *            `delivered: false`, which is what keeps the UI honest: a caller can
 *            never claim an email was sent when no transport ran.
 *
 * Production with no key is deliberately loud rather than silent: the request
 * still succeeds (so the endpoint does not leak configuration state) but the
 * caller is told nothing was delivered. `assertEmailDeliveryConfigured()` raises
 * the same problem at startup, so the misconfiguration is visible in the deploy
 * log rather than only when the first customer tries to verify their address.
 */

import type { RenderedEmail } from "./templates";

export type EmailTransport = "resend" | "log";

export interface EmailDeliveryResult {
  /** True only when a real transport accepted the message. */
  delivered: boolean;
  transport: EmailTransport;
  id?: string;
  error?: string;
}

export interface SendEmailParams {
  to: string;
  email: RenderedEmail;
  /** Overrides the module default; used by tests. */
  transport?: EmailTransport;
  /** Injected by tests so no network call is made. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_FROM = "Morvexa <noreply@morvexa.ai>";

export function resolveEmailTransport(): EmailTransport {
  return process.env.RESEND_API_KEY ? "resend" : "log";
}

/** True when email will not actually reach anybody. */
export function isEmailDeliveryConfigured(): boolean {
  return resolveEmailTransport() === "resend";
}

let warnedAboutDelivery = false;

/**
 * Warns once, at startup, when transactional email cannot be delivered.
 *
 * Registration and password reset both depend on this channel: without a
 * provider key, signup succeeds but the verification link never arrives, so the
 * account can never verify and cannot receive a key. That failure is invisible
 * from the outside - the API returns 201 - which is exactly why it is worth
 * shouting about in the deploy log.
 */
export function assertEmailDeliveryConfigured(): void {
  if (warnedAboutDelivery) return;
  if (isEmailDeliveryConfigured()) return;
  if (process.env.NODE_ENV !== "production") return;

  warnedAboutDelivery = true;
  console.warn(
    "[Morvexa Email] No email provider configured. Registration and password reset " +
      "will report success but no message will be delivered. Set RESEND_API_KEY " +
      "(and optionally MORVEXA_EMAIL_FROM) to enable real delivery."
  );
}

export function getEmailSender(): string {
  return process.env.MORVEXA_EMAIL_FROM || DEFAULT_FROM;
}

export async function sendEmail(params: SendEmailParams): Promise<EmailDeliveryResult> {
  const transport = params.transport ?? resolveEmailTransport();

  if (transport === "log") {
    logMessage(params.to, params.email);
    return { delivered: false, transport: "log" };
  }

  return sendViaResend(params);
}

async function sendViaResend(params: SendEmailParams): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { delivered: false, transport: "resend", error: "RESEND_API_KEY is not set." };

  const doFetch = params.fetchImpl ?? fetch;

  try {
    const response = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailSender(),
        to: [params.to],
        subject: params.email.subject,
        html: params.email.html,
        text: params.email.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // The provider's response can echo the API key back in an error body, so
      // only the status and a truncated message are logged.
      const error = `Resend responded ${response.status}: ${detail.slice(0, 200)}`;
      console.error("[Morvexa Email]", error);
      return { delivered: false, transport: "resend", error };
    }

    const body = (await response.json().catch(() => ({}))) as { id?: string };
    return { delivered: true, transport: "resend", id: body.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Morvexa Email] Resend request failed:", message);
    return { delivered: false, transport: "resend", error: message };
  }
}

function logMessage(to: string, email: RenderedEmail): void {
  console.log(
    [
      "",
      "──────────────────────────────────────────────────────────────",
      "[Morvexa Email] No transport configured — message NOT delivered.",
      `  To      : ${to}`,
      `  Subject : ${email.subject}`,
      "  Set RESEND_API_KEY to deliver this for real.",
      "  ── text/plain ──",
      email.text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n"),
      "──────────────────────────────────────────────────────────────",
      "",
    ].join("\n")
  );
}
