import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryToType, type ImageUsage } from "@/lib/images/categories";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryUrl } from "@/lib/storage/cloudinary";

export const BUCKET = "user-images";

export type ImageRow = {
  id: string;
  business_id: string;
  storage_path: string;
  description: string;
  category: string;
  type: string;
  usage: ImageUsage;
  size_hint?: string | null;
  created_at: string;
};

export function buildImageRow(input: {
  businessId: string;
  storagePath: string;
  description: string;
  category: string;
  usage: ImageUsage;
  sizeHint?: string;
}): Pick<ImageRow, "business_id" | "storage_path" | "description" | "category" | "type" | "usage" | "size_hint"> {
  return {
    business_id: input.businessId,
    storage_path: input.storagePath,
    description: input.description,
    category: input.category,
    type: categoryToType(input.category),
    usage: input.usage,
    size_hint: input.sizeHint?.trim() || null,
  };
}

export type UploadImageInput = {
  file: File;
  description: string;
  category: string;
  usage: ImageUsage;
  sizeHint?: string;
  businessId?: string;
};

export type UploadImageResult = { ok: true; image: ImageRow } | { ok: false; error: string };

export async function uploadImage(
  client: SupabaseClient,
  input: UploadImageInput,
): Promise<UploadImageResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;

  // Upload BARU → Cloudinary (bukan Supabase Storage lagi). File lama tetap
  // di Supabase & tetap terbaca (lihat publicImageUrl di bawah) — tidak ada
  // migrasi paksa.
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const uploaded = await uploadToCloudinary(buffer, {
    folder: `keposting/${businessId}/gambar`,
    resourceType: "image",
  });
  if (!uploaded.ok) {
    console.error(`uploadImage (cloudinary) failed: ${uploaded.error}`);
    return { ok: false, error: "Gagal mengunggah gambar. Coba lagi." };
  }

  // storage_path sekarang berisi URL Cloudinary penuh untuk upload baru
  // (vs path relatif Supabase untuk data lama) — publicImageUrl() otomatis
  // membedakan keduanya.
  const row = buildImageRow({
    businessId,
    storagePath: uploaded.url,
    description: input.description,
    category: input.category,
    usage: input.usage,
    sizeHint: input.sizeHint,
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

/**
 * Ambil bytes sebuah file yang path/URL-nya tersimpan di kolom storage_path
 * (dipakai buat baca ulang gambar referensi "Database Gambar" sebagai input
 * AI generate). storagePath bisa URL Cloudinary (upload baru) ATAU path
 * relatif Supabase Storage lama — fungsi ini otomatis pilih cara ambilnya
 * yang benar, supaya kode pemanggil tidak perlu tahu bedanya.
 */
export async function downloadStoredFile(
  client: SupabaseClient,
  storagePath: string,
): Promise<{ ok: true; buffer: Buffer; mimeType: string } | { ok: false; error: string }> {
  if (isCloudinaryUrl(storagePath)) {
    const res = await fetch(storagePath);
    if (!res.ok) return { ok: false, error: `Gagal mengambil file dari Cloudinary (${res.status}).` };
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { ok: true, buffer: Buffer.from(await res.arrayBuffer()), mimeType };
  }
  const { data, error } = await client.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    console.error(`downloadStoredFile (supabase) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal mengambil file dari storage." };
  }
  return { ok: true, buffer: Buffer.from(await data.arrayBuffer()), mimeType: (data as Blob).type || "image/jpeg" };
}

/**
 * Bangun URL publik dari storage_path. Sejak Cloudinary aktif untuk upload
 * BARU, storage_path bisa berisi 2 bentuk: URL Cloudinary penuh (upload baru)
 * ATAU path relatif Supabase Storage lama (upload sebelum migrasi) — fungsi
 * ini otomatis deteksi mana yang mana, jadi gambar lama & baru SAMA-SAMA
 * terbaca tanpa perlu migrasi data.
 */
export function publicImageUrl(client: SupabaseClient, storagePath: string): string {
  if (isCloudinaryUrl(storagePath)) return storagePath;
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

  if (isCloudinaryUrl(data.storage_path)) {
    // File baru (Cloudinary) — kegagalan hapus di sini TIDAK menggagalkan
    // hapus baris DB (sudah terlanjur dihapus di atas); dicatat di log saja,
    // sama seperti perilaku lama untuk file Supabase.
    await deleteFromCloudinary(data.storage_path);
    return { ok: true, storageCleanedUp: true };
  }

  const { error: storageError } = await client.storage.from(BUCKET).remove([data.storage_path]);
  if (storageError) {
    console.error(`deleteImage (storage cleanup) failed: ${describeSupabaseError(storageError)}`);
    return { ok: true, storageCleanedUp: false };
  }

  return { ok: true, storageCleanedUp: true };
}
