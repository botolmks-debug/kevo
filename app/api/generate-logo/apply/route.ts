/**
 * POST /api/generate-logo/apply
 * Simpan SATU opsi logo (dark+light dataUri) yang dipilih user dari hasil
 * /api/generate-logo sebagai logo aktif. Token SUDAH dipotong di step
 * generate, jadi di sini tidak ada logika token lagi.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadLogo } from "@/lib/supabase/logo";

export const runtime = "nodejs";

function dataUriToFile(dataUri: string, filename: string): File | null {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUri);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  return new File([new Uint8Array(buffer)], filename, { type: match[1] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  let body: { logoDataUri?: string; logoLightDataUri?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const darkFile = body.logoDataUri ? dataUriToFile(body.logoDataUri, "logo.png") : null;
  const lightFile = body.logoLightDataUri ? dataUriToFile(body.logoLightDataUri, "logo-light.png") : null;
  if (!darkFile || !lightFile) {
    return NextResponse.json({ error: "Data logo tidak lengkap/rusak." }, { status: 400 });
  }

  const businessId = user.id;

  const darkUpload = await uploadLogo(supabase, { file: darkFile, businessId, variant: "dark" });
  if (!darkUpload.ok) {
    return NextResponse.json({ error: darkUpload.error }, { status: 500 });
  }

  const lightUpload = await uploadLogo(supabase, { file: lightFile, businessId, variant: "light" });
  if (!lightUpload.ok) {
    return NextResponse.json({ error: lightUpload.error }, { status: 500 });
  }

  return NextResponse.json({ logoUrl: darkUpload.url, logoLightUrl: lightUpload.url });
}
