import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryToType, type ImageUsage } from "@/lib/images/categories";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";

export const BUCKET = "user-images";

export type ImageRow = {
  id: string;
  business_id: string;
  storage_path: string;
  description: string;
  category: string;
  type: string;
  usage: ImageUsage;
  created_at: string;
};

export function buildImageRow(input: {
  businessId: string;
  storagePath: string;
  description: string;
  category: string;
  usage: ImageUsage;
}): Pick<ImageRow, "business_id" | "storage_path" | "description" | "category" | "type" | "usage"> {
  return {
    business_id: input.businessId,
    storage_path: input.storagePath,
    description: input.description,
    category: input.category,
    type: categoryToType(input.category),
    usage: input.usage,
  };
}

function fileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "jpg";
}

export type UploadImageInput = {
  file: File;
  description: string;
  category: string;
  usage: ImageUsage;
  businessId?: string;
};

export type UploadImageResult = { ok: true; image: ImageRow } | { ok: false; error: string };

export async function uploadImage(
  client: SupabaseClient,
  input: UploadImageInput,
): Promise<UploadImageResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;
  const storagePath = `${businessId}/${randomUUID()}.${fileExtension(input.file.name)}`;

  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, input.file);
  if (uploadError) {
    console.error(`uploadImage (storage) failed: ${describeSupabaseError(uploadError)}`);
    return { ok: false, error: "Gagal mengunggah gambar. Coba lagi." };
  }

  const row = buildImageRow({
    businessId,
    storagePath,
    description: input.description,
    category: input.category,
    usage: input.usage,
  });

  const { data, error } = await client.from("images").insert(row).select().single();
  if (error || !data) {
    console.error(`uploadImage (insert row) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gambar terunggah tapi gagal menyimpan datanya. Coba lagi." };
  }
  return { ok: true, image: data as ImageRow };
}

export type ListImagesResult = { ok: true; images: ImageRow[] } | { ok: false; error: string };

export async function listImages(
  client: SupabaseClient,
  businessId: string = DEV_BUSINESS_ID,
): Promise<ListImagesResult> {
  const { data, error } = await client
    .from("images")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`listImages failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal memuat daftar gambar. Coba lagi." };
  }
  return { ok: true, images: (data ?? []) as ImageRow[] };
}

export function publicImageUrl(client: SupabaseClient, storagePath: string): string {
  return client.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export type DeleteImageResult =
  | { ok: true; storageCleanedUp: boolean }
  | { ok: false; error: string };

/**
 * Hapus baris `images` dulu (supaya langsung hilang dari daftar user), lalu
 * hapus filenya di Storage. Kalau baris gagal dihapus -> laporkan gagal.
 * Kalau baris sukses tapi file Storage gagal dihapus -> tetap dilaporkan
 * sukses (barisnya memang sudah hilang buat user), tapi dicatat di log
 * server sebagai file sampah yang perlu dibersihkan manual nanti.
 */
export async function deleteImage(client: SupabaseClient, id: string): Promise<DeleteImageResult> {
  const { data, error: fetchError } = await client
    .from("images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error(`deleteImage (fetch) failed: ${describeSupabaseError(fetchError)}`);
    return { ok: false, error: "Gagal menghapus gambar. Coba lagi." };
  }
  if (!data) {
    return { ok: false, error: "Gambar tidak ditemukan." };
  }

  const { error: deleteRowError } = await client.from("images").delete().eq("id", id);
  if (deleteRowError) {
    console.error(`deleteImage (row) failed: ${describeSupabaseError(deleteRowError)}`);
    return { ok: false, error: "Gagal menghapus gambar. Coba lagi." };
  }

  const { error: storageError } = await client.storage.from(BUCKET).remove([data.storage_path]);
  if (storageError) {
    console.error(`deleteImage (storage cleanup) failed: ${describeSupabaseError(storageError)}`);
    return { ok: true, storageCleanedUp: false };
  }

  return { ok: true, storageCleanedUp: true };
}
