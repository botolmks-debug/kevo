import nodemailer from "nodemailer";

type FeedbackParams = {
  name?: string;
  email?: string;
  message: string;
  userEmail?: string | null;
  page?: string;
};

export async function sendFeedbackEmail(
  params: FeedbackParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  // Tujuan tetap info@keposting.com; bisa dioverride via env FEEDBACK_TO kalau perlu.
  const to = process.env.FEEDBACK_TO || "info@keposting.com";

  if (!host || !user || !pass || !from) {
    return {
      ok: false,
      error: "SMTP env belum lengkap. Set SMTP_HOST, SMTP_USER, SMTP_PASS di Vercel + .env.local.",
    };
  }

  const senderEmail = params.email?.trim() || params.userEmail || undefined;

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px;">
  <h2 style="color: #0f766e;">Saran &amp; Masukan — Keposting</h2>
  <p><strong>Nama:</strong> ${escapeHtml(params.name?.trim() || "-")}</p>
  <p><strong>Email pengirim:</strong> ${escapeHtml(senderEmail || "-")}</p>
  ${params.page ? `<p><strong>Halaman:</strong> ${escapeHtml(params.page)}</p>` : ""}

  <h3>Pesan:</h3>
  <blockquote style="border-left:4px solid #0f766e; padding: 8px 12px; background: #f0fdfa; margin: 0;">
    ${escapeHtml(params.message).replace(/\n/g, "<br>")}
  </blockquote>

  <p style="color:#666; font-size:12px; margin-top: 24px;">
    ${senderEmail ? `Balas email ini langsung ke <a href="mailto:${escapeHtml(senderEmail)}">${escapeHtml(senderEmail)}</a> untuk menjawab pengirim.` : "Pengirim tidak mencantumkan email."}
  </p>
</div>
`;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      replyTo: senderEmail,
      subject: `[Keposting] Saran & Masukan dari ${params.name?.trim() || senderEmail || "pengguna"}`,
      html,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "SMTP error",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
