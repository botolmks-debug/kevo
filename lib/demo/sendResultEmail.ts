// lib/demo/sendResultEmail.ts
// Kirim hasil demo ke email — dipakai OTOMATIS oleh /api/demo-generate begitu
// hasil jadi (supaya pengunjung yang menutup halaman tetap menerima hasilnya),
// dan bisa dipakai ulang oleh /api/demo-send untuk kirim versi edit.

import nodemailer from "nodemailer";

const SITE = "https://www.keposting.com";

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendDemoResultEmail(opts: {
  email: string;
  imageUrl: string;
  caption: string;
}): Promise<void> {
  const signupUrl = `${SITE}/signup?email=${encodeURIComponent(opts.email)}`;
  const safeCaption = String(opts.caption || "").replace(/\n/g, "<br/>");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
      <p style="font-size:16px">Ini konten Keposting dari fotomu 👇</p>
      <img src="${opts.imageUrl}" alt="Konten kamu" style="width:100%;border-radius:16px;margin:12px 0"/>
      <div style="background:#f7f5f0;border-radius:12px;padding:14px;font-size:14px;line-height:1.6">
        ${safeCaption}
      </div>
      <a href="${signupUrl}"
         style="display:block;text-align:center;background:#12B3A0;color:#fff;text-decoration:none;
                font-weight:bold;padding:14px;border-radius:999px;margin:20px 0 8px">
        Buat akun & lanjut gratis (5 konten)
      </a>
      <p style="font-size:12px;color:#888;text-align:center">
        Daftar pakai email ini juga — kontenmu langsung tersimpan di akunmu.
      </p>
    </div>`;

  await transporter().sendMail({
    from: process.env.SMTP_FROM || "Keposting <info@keposting.com>",
    to: opts.email,
    subject: "Konten Keposting kamu sudah jadi 🎉",
    html,
  });
}
