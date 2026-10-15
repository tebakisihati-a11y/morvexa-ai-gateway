/**
 * Morvexa — Transactional email templates.
 *
 * Inline styles only: mail clients strip <style> blocks and external sheets.
 * Every interpolated value is escaped, because display names are user-supplied
 * and land in the HTML body.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function layout(params: { heading: string; bodyHtml: string; footnote: string }): string {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(params.heading)}</title>
  </head>
  <body style="margin:0;padding:28px 14px;background:#070810;font-family:${FONT};color:#e9edfb;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="padding:0 4px 18px;font-size:15px;font-weight:600;letter-spacing:-0.01em;color:#e9edfb;">Morvexa</div>
      <div style="border:1px solid rgba(233,237,251,0.10);border-radius:14px;background:#0b0d16;padding:28px 24px;">
        <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;font-weight:600;color:#e9edfb;">${escapeHtml(params.heading)}</h1>
        ${params.bodyHtml}
      </div>
      <p style="margin:18px 4px 0;font-size:12px;line-height:1.65;color:#8e97bc;">
        ${escapeHtml(params.footnote)}<br />
        Email ini dikirim otomatis oleh sistem Morvexa. Jangan balas pesan ini.
      </p>
    </div>
  </body>
</html>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#c3c9e0;">${html}</p>`;
}

function codeBlock(value: string): string {
  return `<div style="margin:0 0 18px;padding:12px 14px;border:1px solid rgba(233,237,251,0.14);border-radius:10px;background:#06070f;font-family:${MONO};font-size:13px;line-height:1.5;color:#9db9f5;word-break:break-all;">${escapeHtml(value)}</div>`;
}

function button(href: string, label: string): string {
  return `<div style="margin:0 0 18px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#5b8def;color:#04050c;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(label)}</a></div>`;
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:5px 0;font-size:13px;color:#8e97bc;width:150px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:5px 0;font-size:13px;color:#e9edfb;">${escapeHtml(value)}</td></tr>`;
}

export function welcomeEmail(params: { name: string; portalUrl: string }): RenderedEmail {
  const subject = "Akun Morvexa Anda sudah aktif";

  const html = layout({
    heading: "Akun Anda sudah aktif",
    bodyHtml:
      paragraph(`Halo ${escapeHtml(params.name)}, akun Morvexa Anda berhasil dibuat.`) +
      paragraph(
        "Anda sudah bisa masuk ke portal kustomer untuk membuat API key, memantau pemakaian token, dan mengelola tagihan dalam satu tempat."
      ) +
      button(params.portalUrl, "Buka portal kustomer") +
      paragraph(
        "Jika Anda tidak merasa membuat akun ini, abaikan saja email ini dan hubungi dukungan Morvexa."
      ),
    footnote: "Anda menerima email ini karena ada pendaftaran akun dengan alamat ini.",
  });

  const text = [
    `Halo ${params.name}, akun Morvexa Anda berhasil dibuat.`,
    "",
    "Masuk ke portal kustomer untuk membuat API key, memantau pemakaian token, dan mengelola tagihan:",
    params.portalUrl,
    "",
    "Jika Anda tidak merasa membuat akun ini, abaikan saja email ini.",
  ].join("\n");

  return { subject, html, text };
}

export function apiKeyDeliveryEmail(params: {
  name: string;
  planName: string;
  orderId: string;
  apiKey: string;
  rateLimitRpm: number;
  models: string[];
}): RenderedEmail {
  const subject = `API key Morvexa Anda — ${params.planName}`;

  const html = layout({
    heading: "API key Anda siap dipakai",
    bodyHtml:
      paragraph(
        `Halo ${escapeHtml(params.name)}, pembayaran Anda untuk paket <strong style="color:#e9edfb;">${escapeHtml(params.planName)}</strong> sudah kami terima. Berikut API key Anda.`
      ) +
      codeBlock(params.apiKey) +
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;border-collapse:collapse;">
        ${detailRow("Paket", params.planName)}
        ${detailRow("Order ID", params.orderId)}
        ${detailRow("Batas permintaan", `${params.rateLimitRpm} request/menit`)}
        ${detailRow("Model tersedia", params.models.join(", "))}
      </table>` +
      paragraph(
        "Simpan key ini di secret manager Anda. Demi keamanan, key tidak ditampilkan lagi di portal setelah Anda menutup halaman ini."
      ),
    footnote: "Anda menerima email ini karena ada pembayaran paket pada akun Morvexa Anda.",
  });

  const text = [
    `Halo ${params.name}, pembayaran Anda untuk paket ${params.planName} sudah kami terima.`,
    "",
    "API key Anda:",
    params.apiKey,
    "",
    `Paket            : ${params.planName}`,
    `Order ID         : ${params.orderId}`,
    `Batas permintaan : ${params.rateLimitRpm} request/menit`,
    `Model tersedia   : ${params.models.join(", ")}`,
    "",
    "Simpan key ini di secret manager Anda. Key tidak ditampilkan lagi setelah halaman portal ditutup.",
  ].join("\n");

  return { subject, html, text };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}): RenderedEmail {
  const subject = "Reset password Morvexa Anda";

  const html = layout({
    heading: "Reset password",
    bodyHtml:
      paragraph(
        `Halo ${escapeHtml(params.name)}, kami menerima permintaan untuk mengatur ulang password akun Morvexa Anda.`
      ) +
      button(params.resetUrl, "Atur password baru") +
      paragraph(
        `Tautan ini berlaku selama ${escapeHtml(String(params.expiresMinutes))} menit dan hanya bisa dipakai satu kali.`
      ) +
      paragraph("Kalau tombol di atas tidak berfungsi, salin alamat berikut ke browser Anda:") +
      codeBlock(params.resetUrl) +
      paragraph(
        "Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak berubah dan akun Anda tetap aman."
      ),
    footnote: "Anda menerima email ini karena ada permintaan reset password pada akun Anda.",
  });

  const text = [
    `Halo ${params.name}, kami menerima permintaan untuk mengatur ulang password akun Morvexa Anda.`,
    "",
    "Buka tautan berikut untuk membuat password baru:",
    params.resetUrl,
    "",
    `Tautan berlaku ${params.expiresMinutes} menit dan hanya bisa dipakai satu kali.`,
    "",
    "Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak berubah.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Sent at registration. The API key is deliberately NOT included: it is issued
 * only after the customer proves control of the address by opening this link.
 */
export function emailVerificationEmail(params: {
  name: string;
  verifyUrl: string;
  expiresHours: number;
}): RenderedEmail {
  const subject = "Verifikasi email Anda untuk Morvexa";

  const html = layout({
    heading: "Verifikasi email",
    bodyHtml:
      paragraph(
        `Halo ${escapeHtml(params.name)}, terima kasih sudah mendaftar di Morvexa. Satu langkah lagi sebelum akun Anda aktif.`
      ) +
      button(params.verifyUrl, "Verifikasi email saya") +
      paragraph(
        `Tautan ini berlaku selama ${escapeHtml(String(params.expiresHours))} jam dan hanya bisa dipakai satu kali.`
      ) +
      paragraph("Kalau tombol di atas tidak berfungsi, salin alamat berikut ke browser Anda:") +
      codeBlock(params.verifyUrl) +
      paragraph(
        "Kami meminta verifikasi ini untuk memastikan alamat email benar-benar milik Anda, sehingga API key tidak pernah terkirim ke alamat yang salah."
      ),
    footnote: "Anda menerima email ini karena alamat ini digunakan untuk mendaftar akun Morvexa.",
  });

  const text = [
    `Halo ${params.name}, terima kasih sudah mendaftar di Morvexa.`,
    "",
    "Buka tautan berikut untuk memverifikasi email Anda:",
    params.verifyUrl,
    "",
    `Tautan berlaku ${params.expiresHours} jam dan hanya bisa dipakai satu kali.`,
    "",
    "Verifikasi ini memastikan API key hanya terkirim ke alamat email yang benar-benar Anda miliki.",
  ].join("\n");

  return { subject, html, text };
}
