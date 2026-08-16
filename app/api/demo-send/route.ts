import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { checkEmail } from "@/lib/demo/validateEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pakai SMTP yang sama dengan support (env: SMTP_HOST/PORT/USER/PASS/FROM).
// Kalau kamu sudah punya helper kirim email (lib/support/email.ts),
// boleh ganti transporter di bawah dengan memanggil helper itu.
function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const SITE = "https://www.keposting.com";

export async function POST(req: NextRequest) {
  try {
    const { email: emailRaw, imageUrl, caption } = await req.json();

    const check = checkEmail(String(emailRaw || ""));
    if (!check.ok) {
      return NextResponse.json({ error: "bad_email" }, { status: 400 });
    }
    const email = check.email;
    if (!imageUrl) {
      return NextResponse.json({ error: "no_result" }, { status: 400 });
    }

    const signupUrl = `${SITE}/signup?email=${encodeURIComponent(email)}`;
    const safeCaption = String(caption || "").replace(/\n/g, "<br/>");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <p style="font-size:16px">Ini konten Keposting dari fotomu 👇</p>
        <img src="${imageUrl}" alt="Konten kamu" style="width:100%;border-radius:16px;margin:12px 0"/>
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
      to: email,
      subject: "Konten Keposting kamu sudah jadi 🎉",
      html,
    });

    // tandai kapan hasil dikirim (best-effort)
    try {
      await admin()
        .from("demo_leads")
        .update({ sent_at: new Date().toISOString(), caption })
        .eq("email", email);
    } catch {
      /* abaikan — pengiriman email sudah berhasil */
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[demo-send]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
