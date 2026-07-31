import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { publicImageUrl } from "@/lib/supabase/images";
import { updateGeneratedContent } from "@/lib/supabase/generatedContent";
import { checkSupabaseEnvPresence } from "@/lib/env";

export const runtime = "nodejs";

/**
 * "Simpan Perubahan" di editor kanvas (lihat app/generate-otomatis/AutoGenerate.tsx)
 * — dipanggil setelah "Render Ulang" menghasilkan PNG baru.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role belum terhubung: env SUPABASE_SERVICE_ROLE_KEY belum diisi." },
      { status: 503 },
    );
  }

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "body harus berupa multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const onImageText = formData.get("onImageText");
  const caption = formData.get("caption");
  const layoutStateRaw = formData.get("layoutState");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File PNG hasil render ulang wajib diisi." }, { status: 400 });
  }
  if (typeof onImageText !== "string" || typeof caption !== "string") {
    return NextResponse.json({ error: "onImageText dan caption wajib diisi." }, { status: 400 });
  }

  let layoutState: unknown = undefined;
  if (typeof layoutStateRaw === "string" && layoutStateRaw.trim()) {
    try {
      layoutState = JSON.parse(layoutStateRaw);
    } catch {
      layoutState = undefined;
    }
  }

  const client = createServiceRoleClient();
  const pngBuffer = Buffer.from(await file.arrayBuffer());
  const result = await updateGeneratedContent(client, id, { pngBuffer, onImageText, caption, layoutState });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    item: {
      id: result.row.id,
      jenis: result.row.jenis,
      imageUrl: publicImageUrl(client, result.row.storage_path),
      onImageText: result.row.on_image_text,
      caption: result.row.caption,
      ratio: result.row.ratio,
      status: result.row.status,
      createdAt: result.row.created_at,
    },
  });
}

/**
 * Hapus satu konten dari riwayat. Pakai service role untuk aksinya, tapi
 * identitas & kepemilikan diverifikasi lewat sesi login dulu (business_id = user.id).
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role belum terhubung: env SUPABASE_SERVICE_ROLE_KEY belum diisi." },
      { status: 503 },
    );
  }

  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const client = createServiceRoleClient();

  const { data: row, error: fetchError } = await client
    .from("generated_content")
    .select("business_id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 502 });
  }
  if (!row) {
    return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  }
  if (row.business_id !== user.id) {
    return NextResponse.json({ error: "Tidak boleh menghapus konten milik akun lain." }, { status: 403 });
  }

  if (row.storage_path) {
    await client.storage.from("user-images").remove([row.storage_path]);
  }

  const { error: deleteError } = await client.from("generated_content").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
