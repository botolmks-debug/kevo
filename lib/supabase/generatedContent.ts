import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AspectRatio } from "@/lib/templates/types";
import { BUCKET } from "./images";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";

export type GeneratedContentJenis = "produk" | "general" | "interaksi";
export type GeneratedContentStatus = "draft" | "selesai";

export type GeneratedContentRow = {
  id: string;
  business_id: string;
  jenis: GeneratedContentJenis;
  source_image_id: string | null;
  storage_path: string;
  /** Path gambar bersih (tanpa overlay). Null pada konten lama. */
  background_path?: string | null;
  on_image_text: string;
  caption: string;
  ratio: AspectRatio;
  status: GeneratedContentStatus;
  /** Snapshot editor (templateId, values teks, overrides, dll) untuk buka-ulang persis. Null pada konten lama. */
  layout_state?: unknown | null;
  /** Tanggal jadwal posting (YYYY-MM-DD) untuk Kalender Konten. Null = belum dijadwalkan. */
  scheduled_date?: string | null;
  created_at: string;
};

export type InsertGeneratedContentInput = {
  businessId?: string;
  jenis: GeneratedContentJenis;
  sourceImageId?: string | null;
  pngBuffer: Buffer;
  onImageText: string;
  caption: string;
  ratio: AspectRatio;
  /** Path gambar bersih yang sudah diupload di storage. Optional. */
  backgroundPath?: string;
  /** Snapshot editor untuk buka-ulang persis (disimpan di kolom layout_state jsonb). */
  layoutState?: unknown;
};

export type InsertGeneratedContentResult =
  | { ok: true; row: GeneratedContentRow }
  | { ok: false; error: string };

export async function insertGeneratedContent(
  client: SupabaseClient,
  input: InsertGeneratedContentInput,
): Promise<InsertGeneratedContentResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;
  const storagePath = `${businessId}/generated/${randomUUID()}.png`;

  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, input.pngBuffer, {
    contentType: "image/png",
  });
  if (uploadError) {
    console.error(`insertGeneratedContent (storage) failed: ${describeSupabaseError(uploadError)}`);
    return { ok: false, error: "Gagal mengunggah hasil generate. Coba lagi." };
  }

  const { data, error } = await client
    .from("generated_content")
    .insert({
      business_id: businessId,
      jenis: input.jenis,
      source_image_id: input.sourceImageId ?? null,
      storage_path: storagePath,
      // background_path disimpan kalau ada — kolom ini nullable di DB
      ...(input.backgroundPath ? { background_path: input.backgroundPath } : {}),
      ...(input.layoutState !== undefined ? { layout_state: input.layoutState } : {}),
      on_image_text: input.onImageText,
      caption: input.caption,
      ratio: input.ratio,
    })
    .select()
    .single();

  if (error || !data) {
    console.error(`insertGeneratedContent (insert row) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gambar tersimpan tapi gagal menyimpan datanya. Coba lagi." };
  }
  return { ok: true, row: data as GeneratedContentRow };
}

export type UpdateGeneratedContentInput = {
  pngBuffer: Buffer;
  onImageText: string;
  caption: string;
  /** Snapshot editor terbaru (optional) — diperbarui saat re-save dari editor. */
  layoutState?: unknown;
};

export type UpdateGeneratedContentResult =
  | { ok: true; row: GeneratedContentRow }
  | { ok: false; error: string };

export async function updateGeneratedContent(
  client: SupabaseClient,
  id: string,
  input: UpdateGeneratedContentInput,
): Promise<UpdateGeneratedContentResult> {
  const { data: existing, error: fetchError } = await client
    .from("generated_content")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error(`updateGeneratedContent (fetch) failed: ${describeSupabaseError(fetchError)}`);
    return { ok: false, error: "Gagal memuat konten. Coba lagi." };
  }
  if (!existing) {
    return { ok: false, error: "Konten tidak ditemukan." };
  }

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload((existing as { storage_path: string }).storage_path, input.pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (uploadError) {
    console.error(`updateGeneratedContent (storage) failed: ${describeSupabaseError(uploadError)}`);
    return { ok: false, error: "Gagal mengunggah hasil render ulang. Coba lagi." };
  }

  const { data, error } = await client
    .from("generated_content")
    .update({
      on_image_text: input.onImageText,
      caption: input.caption,
      ...(input.layoutState !== undefined ? { layout_state: input.layoutState } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error(`updateGeneratedContent (update row) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gambar tersimpan tapi gagal menyimpan datanya. Coba lagi." };
  }
  return { ok: true, row: data as GeneratedContentRow };
}

/** Set/hapus tanggal jadwal posting (Kalender Konten). date null = batal jadwal. */
export async function setContentSchedule(
  client: SupabaseClient,
  id: string,
  scheduledDate: string | null,
): Promise<{ ok: true; row: GeneratedContentRow } | { ok: false; error: string }> {
  const { data, error } = await client
    .from("generated_content")
    .update({ scheduled_date: scheduledDate })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error(`setContentSchedule failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal menyimpan tanggal jadwal. Coba lagi." };
  }
  return { ok: true, row: data as GeneratedContentRow };
}

export type ListGeneratedContentResult =
  | { ok: true; rows: GeneratedContentRow[] }
  | { ok: false; error: string };

export async function listGeneratedContent(
  client: SupabaseClient,
  businessId: string = DEV_BUSINESS_ID,
): Promise<ListGeneratedContentResult> {
  const { data, error } = await client
    .from("generated_content")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(`listGeneratedContent failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal memuat riwayat konten. Coba lagi." };
  }
  return { ok: true, rows: (data ?? []) as GeneratedContentRow[] };
}
