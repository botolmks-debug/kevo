/**
 * POST /api/content
 * Simpan konten MANUAL (Model 1 / Konten Standar) ke generated_content, supaya
 * muncul di Riwayat & bisa dibuka-ulang di Edit Konten. Dipanggil hanya saat
 * user menekan "Simpan PNG" (tidak otomatis tiap generate).
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { insertGeneratedContent, type GeneratedContentJenis } from "@/lib/supabase/generatedContent";
import { BUCKET, publicImageUrl } from "@/lib/supabase/images";
import type { AspectRatio } from "@/lib/templates/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const VALID_JENIS = new Set<GeneratedContentJenis>(["produk", "general", "interaksi"]);
const VALID_RATIOS = new Set<AspectRatio>(["4:5", "1:1", "9:16"]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "body harus multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const background = form.get("background");
  const onImageText = form.get("onImageText");
  const caption = form.get("caption");
  const ratioRaw = form.get("ratio");
  const jenisRaw = form.get("jenis");
  const layoutStateRaw = form.get("layoutState");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File PNG wajib diisi." }, { status: 400 });
  }
  const ratio: AspectRatio =
    typeof ratioRaw === "string" && VALID_RATIOS.has(ratioRaw as AspectRatio) ? (ratioRaw as AspectRatio) : "4:5";
  const jenis: GeneratedContentJenis =
    typeof jenisRaw === "string" && VALID_JENIS.has(jenisRaw as GeneratedContentJenis)
      ? (jenisRaw as GeneratedContentJenis)
      : "produk";

  let layoutState: unknown = undefined;
  if (typeof layoutStateRaw === "string" && layoutStateRaw.trim()) {
    try {
      layoutState = JSON.parse(layoutStateRaw);
    } catch {
      layoutState = undefined;
    }
  }

  // Upload gambar bersih (background) via service role, seperti alur Otomatis,
  // supaya konten bisa dibuka-ulang di Edit Konten.
  let backgroundPath: string | undefined;
  if (background instanceof File && background.size > 0) {
    const service = createServiceRoleClient();
    const bgPath = `${user.id}/generated-bg/${randomUUID()}.png`;
    const { error: bgErr } = await service.storage
      .from(BUCKET)
      .upload(bgPath, Buffer.from(await background.arrayBuffer()), {
        contentType: background.type || "image/png",
      });
    if (!bgErr) backgroundPath = bgPath;
  }

  const pngBuffer = Buffer.from(await file.arrayBuffer());
  const result = await insertGeneratedContent(supabase, {
    businessId: user.id,
    jenis,
    pngBuffer,
    onImageText: typeof onImageText === "string" ? onImageText : "",
    caption: typeof caption === "string" ? caption : "",
    ratio,
    backgroundPath,
    layoutState,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({
    item: {
      id: result.row.id,
      jenis: result.row.jenis,
      imageUrl: publicImageUrl(supabase, result.row.storage_path),
      backgroundUrl: backgroundPath ? publicImageUrl(supabase, backgroundPath) : undefined,
      ratio: result.row.ratio,
      createdAt: result.row.created_at,
    },
  });
}
