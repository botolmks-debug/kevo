/**
 * Upload/hapus file ke Cloudinary — dipakai untuk SEMUA upload baru (Database
 * Gambar, Logo, hasil generate konten/video). File LAMA di Supabase Storage
 * TIDAK disentuh/dipindah — tetap terbaca seperti biasa lewat publicImageUrl()
 * (lihat lib/supabase/images.ts), yang otomatis mendeteksi apakah storage_path
 * sudah berupa URL Cloudinary (dipakai langsung) atau masih path Supabase lama
 * (dibangunkan public URL Supabase seperti sebelumnya). Jadi transisinya
 * bertahap — tidak ada migrasi paksa data lama, tidak ada downtime.
 *
 * ENV yang WAJIB diisi di .env.local (dari Cloudinary Dashboard > Settings > API Keys):
 *   CLOUDINARY_CLOUD_NAME=
 *   CLOUDINARY_API_KEY=
 *   CLOUDINARY_API_SECRET=
 */
import { v2 as cloudinary } from "cloudinary";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary belum dikonfigurasi — isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, " +
        "CLOUDINARY_API_SECRET di .env.local (lihat Cloudinary Dashboard > Settings > API Keys).",
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export type CloudinaryResourceType = "image" | "video";

export type CloudinaryUploadResult =
  | { ok: true; url: string; publicId: string }
  | { ok: false; error: string };

/**
 * Upload buffer ke Cloudinary. `folder` dipakai supaya file Keposting
 * terorganisir di dashboard Cloudinary (mis. "keposting/<businessId>/gambar",
 * "keposting/<businessId>/logo", "keposting/<businessId>/generated").
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder?: string; resourceType?: CloudinaryResourceType; publicId?: string },
): Promise<CloudinaryUploadResult> {
  try {
    ensureConfigured();
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          // folder DIABAIKAN kalau publicId sudah berisi path lengkap (kasus
          // re-save/overwrite ke public_id lama) — hindari folder ke-prefix
          // dobel di atas publicId yang sudah punya folder di dalamnya.
          ...(options.folder && !options.publicId ? { folder: options.folder } : {}),
          resource_type: options.resourceType ?? "image",
          public_id: options.publicId,
          overwrite: true,
        },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error("Upload Cloudinary gagal tanpa detail error."));
          resolve(res as { secure_url: string; public_id: string });
        },
      );
      stream.end(buffer);
    });
    return { ok: true, url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.error("uploadToCloudinary failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Gagal upload ke Cloudinary." };
  }
}

/** Cek apakah sebuah storage_path/URL adalah URL Cloudinary (bukan path Supabase lama). */
export function isCloudinaryUrl(value: string): boolean {
  return /^https?:\/\/res\.cloudinary\.com\//.test(value);
}

/**
 * Ekstrak public_id dari URL Cloudinary, dibutuhkan buat hapus file
 * (Cloudinary API hapus pakai public_id, bukan URL). Contoh URL:
 * https://res.cloudinary.com/<cloud>/image/upload/v169.../keposting/biz/gambar/abc123.jpg
 * → public_id = keposting/biz/gambar/abc123
 */
export function publicIdFromCloudinaryUrl(url: string): { publicId: string; resourceType: CloudinaryResourceType } | null {
  const match = /\/(image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/.exec(url);
  if (!match) return null;
  return { resourceType: match[1] as CloudinaryResourceType, publicId: match[2] };
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  const parsed = publicIdFromCloudinaryUrl(url);
  if (!parsed) {
    console.warn("deleteFromCloudinary: gagal parse public_id dari URL:", url);
    return;
  }
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType });
  } catch (err) {
    // Gagal hapus di Cloudinary tidak boleh gagalkan alur utama (mis. hapus baris DB) —
    // cukup dicatat, file "yatim" di Cloudinary bisa dibersihkan manual nanti.
    console.error("deleteFromCloudinary failed:", err);
  }
}
