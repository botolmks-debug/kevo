import nodemailer from "nodemailer";

type EscalationParams = {
  userEmail: string;
  userMessage: string;
  transcript: Array<{ role: string; message: string; created_at: string }>;
  userInfo: { tokens?: number | "unlimited"; businessId?: string };
};

export async function sendEscalationEmail(
  params: EscalationParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const to = process.env.SMTP_TO ?? user;

  if (!host || !user || !pass || !from || !to) {
    return {
      ok: false,
      error:
        "SMTP env belum lengkap. Set SMTP_HOST, SMTP_USER, SMTP_PASS di Vercel + .env.local.",
    };
  }

  const transcriptHtml = params.transcript
    .map(
      (t) =>
        `<div style="margin-bottom:8px;"><strong>${escapeHtml(t.role)}</strong> (${new Date(
          t.created_at,
        ).toLocaleString("id-ID")}):<br>${escapeHtml(t.message).replace(/\n/g, "<br>")}</div>`,
    )
    .join("\n");

  const html = `
<div style="font-family: -apple-system, sans-serif; max-width: 600px;">
  <h2 style="color: #0f766e;">Eskalasi Support Keposting</h2>
  <p><strong>Dari:</strong> ${escapeHtml(params.userEmail)}</p>
  <p><strong>Token:</strong> ${params.userInfo.tokens ?? "?"}</p>
  <p><strong>Business ID:</strong> ${escapeHtml(params.userInfo.businessId ?? "-")}</p>

  <h3>Pesan user:</h3>
  <blockquote style="border-left:4px solid #0f766e; padding: 8px 12px; background: #f0fdfa; margin: 0;">
    ${escapeHtml(params.userMessage).replace(/\n/g, "<br>")}
  </blockquote>

  <h3 style="margin-top: 24px;">Transkrip percakapan:</h3>
  <div style="background:#f7f7f7; padding:12px; border-radius:6px; font-size: 14px;">
    ${transcriptHtml || "<em>Belum ada transkrip.</em>"}
  </div>

  <p style="color:#666; font-size:12px; margin-top: 24px;">
    Balas email ini langsung ke <a href="mailto:${escapeHtml(params.userEmail)}">${escapeHtml(params.userEmail)}</a> untuk menjawab user.
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
      replyTo: params.userEmail,
      subject: `[Keposting Support] ${params.userMessage.slice(0, 60)}`,
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
