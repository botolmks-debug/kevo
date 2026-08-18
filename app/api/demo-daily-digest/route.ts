import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import nodemailer from "nodemailer";

/**
 * RINGKASAN HARIAN /coba — dijalankan sekali sehari via Vercel Cron.
 * Kumpulkan semua hasil demo hari ini dari demo_leads, kirim 1 email
 * berisi gambar + caption + email pengunjung ke DIGEST_TO (admin).
 *
 * Dilindungi CRON_SECRET: hanya bisa dipicu oleh Vercel Cron / pemilik secret,
 * bukan sembarang orang yang menebak URL-nya.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DIGEST_TO = process.env.DIGEST_TO || "botolmks@gmail.com";

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

type Lead = {
  email: string | null;
  business_type: string | null;
  result_url: string | null;
  caption: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  // Autentikasi cron: Vercel Cron mengirim header "authorization: Bearer <CRON_SECRET>"
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Rentang "hari ini" pakai waktu WIB (UTC+7).
    // Ambil dari jam 00:00 WIB kemarin s/d 00:00 WIB hari ini? Tidak —
    // karena cron jalan pagi, kita ambil 24 jam terakhir untuk kesederhanaan
    // dan ketahanan (tak ada hasil yang terlewat kalau jam cron bergeser).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Email admin (untuk tes iklan) dikecualikan dari ringkasan supaya data bersih.
    const adminEmails = (process.env.DEMO_ADMIN_EMAILS || "info@keposting.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const svc = createServiceRoleClient();
    const { data, error } = await svc
      .from("demo_leads")
      .select("email, business_type, result_url, caption, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leads = ((data || []) as Lead[]).filter(
      (l) => !adminEmails.includes((l.email || "").toLowerCase())
    );

    // Tidak ada hasil hari ini -> tidak usah kirim email kosong.
    if (leads.length === 0) {
      return NextResponse.json({ ok: true, count: 0, sent: false });
    }

    const rows = leads
      .map((l) => {
        const waktu = new Date(l.created_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        });
        const caption = (l.caption || "").replace(/\n/g, "<br/>");
        const img = l.result_url
          ? `<img src="${l.result_url}" alt="hasil" style="width:100%;max-width:280px;border-radius:12px;display:block;margin-bottom:8px"/>`
          : "<em style='color:#999'>(gambar tidak tersedia)</em>";
        return `
          <tr>
            <td style="padding:16px;border-bottom:1px solid #eee;vertical-align:top">
              ${img}
              <div style="font-size:13px;color:#333;line-height:1.5;margin-bottom:8px">${caption}</div>
              <div style="font-size:12px;color:#666">
                📧 <b>${l.email || "-"}</b><br/>
                🏷️ ${l.business_type || "-"} &nbsp;·&nbsp; 🕒 ${waktu}
              </div>
            </td>
          </tr>`;
      })
      .join("");

    const tanggal = new Date().toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin-bottom:4px">Ringkasan Demo /coba</h2>
        <p style="color:#666;margin-top:0">${tanggal} — <b>${leads.length} orang</b> mencoba dalam 24 jam terakhir</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">${rows}</table>
        <p style="font-size:12px;color:#999;margin-top:20px">
          Email otomatis dari keposting.com/coba. Tiap baris = satu pengunjung yang generate konten dari iklanmu.
        </p>
      </div>`;

    await transporter().sendMail({
      from: process.env.SMTP_FROM || "Keposting <info@keposting.com>",
      to: DIGEST_TO,
      subject: `📊 ${leads.length} orang coba Keposting hari ini`,
      html,
    });

    return NextResponse.json({ ok: true, count: leads.length, sent: true });
  } catch (err) {
    console.error("[demo-daily-digest]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
