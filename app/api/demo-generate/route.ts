import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkEmail } from "@/lib/demo/validateEmail";
import { generateDemoContent } from "@/lib/demo/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Gemini image bisa 90-120 detik — samakan dengan generate-auto.
export const maxDuration = 300;

// Rem biaya: maksimal sekian demo per hari (1 demo ~Rp650 di Gemini).
// 50 demo = worst case ~Rp33rb/hari. Naikkan kalau iklan sudah terbukti.
const DEMO_DAILY_CAP = 50;

// Batas ukuran foto (hindari upload raksasa)
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Pakai admin client (service_role) — bypass RLS demo_leads.
// Kalau kamu sudah punya helper admin sendiri, ganti baris ini dengan import-nya.
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const image = form.get("image");
    const businessType = String(form.get("businessType") || "").trim();
    const emailRaw = String(form.get("email") || "");

    // --- validasi input dasar ---
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "no_image" }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "bad_image" }, { status: 400 });
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "image_too_large" }, { status: 400 });
    }
    if (!businessType) {
      return NextResponse.json({ error: "no_business_type" }, { status: 400 });
    }

    // --- validasi email (format + domain sampah) ---
    const check = checkEmail(emailRaw);
    if (!check.ok) {
      return NextResponse.json({ error: `email_${check.reason}` }, { status: 400 });
    }
    const email = check.email;

    const db = admin();

    // --- 1 email = 1 percobaan (cek SEBELUM generate biar tidak boros) ---
    const { data: existing } = await db
      .from("demo_leads")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "email_used" }, { status: 409 });
    }

    // --- cap harian (rem biaya) ---
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await db
      .from("demo_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString());
    if ((count ?? 0) >= DEMO_DAILY_CAP) {
      return NextResponse.json({ error: "quota_full" }, { status: 429 });
    }

    // --- siapkan buffer foto ---
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    // --- GENERATE (mesin yang sama dengan produk asli) ---
    const { resultUrl, caption } = await generateDemoContent({
      imageBuffer,
      mimeType: image.type,
      businessType,
    });

    // --- simpan lead ---
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    await db.from("demo_leads").insert({
      email,
      business_type: businessType,
      result_url: resultUrl,
      caption,
      ip,
    });

    return NextResponse.json({ imageUrl: resultUrl, caption });
  } catch (err) {
    console.error("[demo-generate]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
