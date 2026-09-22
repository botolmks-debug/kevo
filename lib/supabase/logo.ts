import type { SupabaseClient } from "@supabase/supabase-js";
import type { LogoPosition } from "@/lib/onboarding/businessProfile";
import { removeSolidBackground } from "@/lib/images/backgroundRemoval";
import { BUCKET, publicImageUrl } from "./images";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";
import { uploadToCloudinary, deleteFromCloudinary, isCloudinaryUrl } from "@/lib/storage/cloudinary";

/** Hapus 1 file lama, di Cloudinary ATAU Supabase Storage tergantung asalnya. */
async function cleanupOldFile(client: SupabaseClient, path: string) {
  if (isCloudinaryUrl(path)) {
    await deleteFromCloudinary(path);
    return;
  }
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) console.error(`cleanupOldFile (supabase) failed: ${describeSupabaseError(error)}`);
}

/** Ambil bytes file lama, dari Cloudinary (fetch URL) ATAU Supabase Storage (download). */
async function downloadExistingFile(
  client: SupabaseClient,
  path: string,
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  if (isCloudinaryUrl(path)) {
    const res = await fetch(path);
    if (!res.ok) return { ok: false, error: "Gagal mengambil logo saat ini dari Cloudinary." };
    return { ok: true, buffer: Buffer.from(await res.arrayBuffer()) };
  }
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error || !data) {
    console.error(`downloadExistingFile (supabase) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal mengambil logo saat ini." };
  }
  return { ok: true, buffer: Buffer.from(await data.arrayBuffer()) };
}

// Dua versi logo disimpan TERPISAH di kolomnya masing-masing supaya tidak
// saling menimpa: "dark" = logo untuk latar terang (background putih/cerah),
// "light" = logo untuk latar gelap. Variant default "dark" menjaga
// kompatibilitas pemanggilan lama.
export type LogoVariant = "dark" | "light";

const LOGO_COLUMNS: Record<LogoVariant, { path: string; position: string }> = {
  dark: { path: "logo_storage_path", position: "logo_position" },
  light: { path: "logo_light_storage_path", position: "logo_light_position" },
};

// Sub-folder storage per variant supaya file dark & light tidak tercampur.
const LOGO_FOLDER: Record<LogoVariant, string> = {
  dark: "logo",
  light: "logo-light",
};

async function currentLogoStoragePath(
  client: SupabaseClient,
  businessId: string,
  variant: LogoVariant,
): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const col = LOGO_COLUMNS[variant].path;
  const { data, error } = await client
    .from("business_profile")
    .select(col)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error(`currentLogoStoragePath failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal membaca logo saat ini. Coba lagi." };
  }
  const path = (data as Record<string, string | null> | null)?.[col] ?? null;
  return { ok: true, path };
}

export type UploadLogoResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Upload/ganti logo bisnis untuk satu variant (dark/light). Upload dulu ke path
 * baru, baru simpan referensinya di business_profile — kalau upload gagal, tidak
 * ada apa pun yang berubah. File lama variant yang sama (kalau ada) dihapus
 * setelah berhasil. Variant lain TIDAK tersentuh.
 */
export async function uploadLogo(
  client: SupabaseClient,
  input: { file: File; businessId?: string; variant?: LogoVariant },
): Promise<UploadLogoResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;
  const variant = input.variant ?? "dark";
  const col = LOGO_COLUMNS[variant];

  const previous = await currentLogoStoragePath(client, businessId, variant);
  if (!previous.ok) {
    return previous;
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const uploaded = await uploadToCloudinary(buffer, {
    folder: `keposting/${businessId}/${LOGO_FOLDER[variant]}`,
    resourceType: "image",
  });
  if (!uploaded.ok) {
    console.error(`uploadLogo (cloudinary) failed: ${uploaded.error}`);
    return { ok: false, error: "Gagal mengunggah logo. Coba lagi." };
  }
  const storagePath = uploaded.url;

  const { error: upsertError } = await client
    .from("business_profile")
    .upsert(
      { business_id: businessId, [col.path]: storagePath, updated_at: new Date().toISOString() },
      { onConflict: "business_id" },
    );
  if (upsertError) {
    console.error(`uploadLogo (save reference) failed: ${describeSupabaseError(upsertError)}`);
    return { ok: false, error: "Logo terunggah tapi gagal menyimpan datanya. Coba lagi." };
  }

  if (previous.path && previous.path !== storagePath) {
    await cleanupOldFile(client, previous.path);
  }

  return { ok: true, url: publicImageUrl(client, storagePath) };
}

export type DeleteLogoResult = { ok: true } | { ok: false; error: string };

export async function deleteLogo(
  client: SupabaseClient,
  businessId: string = DEV_BUSINESS_ID,
  variant: LogoVariant = "dark",
): Promise<DeleteLogoResult> {
  const col = LOGO_COLUMNS[variant];
  const previous = await currentLogoStoragePath(client, businessId, variant);
  if (!previous.ok) {
    return previous;
  }
  if (!previous.path) {
    return { ok: true };
  }

  const { error: updateError } = await client
    .from("business_profile")
    .update({ [col.path]: null, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
  if (updateError) {
    console.error(`deleteLogo (clear reference) failed: ${describeSupabaseError(updateError)}`);
    return { ok: false, error: "Gagal menghapus logo. Coba lagi." };
  }

  await cleanupOldFile(client, previous.path);

  return { ok: true };
}

export type RemoveLogoBackgroundResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Hapus background logo variant tertentu yang sedang tersimpan (deteksi warna
 * solid, lihat lib/images/backgroundRemoval.ts) — download file saat ini,
 * proses, lalu simpan sebagai file baru (PNG dengan alpha) menggantikan yang
 * lama.
 */
export async function removeLogoBackground(
  client: SupabaseClient,
  businessId: string = DEV_BUSINESS_ID,
  variant: LogoVariant = "dark",
): Promise<RemoveLogoBackgroundResult> {
  const col = LOGO_COLUMNS[variant];
  const previous = await currentLogoStoragePath(client, businessId, variant);
  if (!previous.ok) {
    return previous;
  }
  if (!previous.path) {
    return { ok: false, error: "Belum ada logo untuk dihapus background-nya." };
  }

  const downloaded = await downloadExistingFile(client, previous.path);
  if (!downloaded.ok) {
    return { ok: false, error: downloaded.error };
  }

  let processedBuffer: Buffer;
  try {
    processedBuffer = await removeSolidBackground(downloaded.buffer);
  } catch (error) {
    console.error(`removeLogoBackground (processing) failed: ${error instanceof Error ? error.message : error}`);
    return { ok: false, error: "Gagal memproses logo. Coba lagi." };
  }

  const uploaded = await uploadToCloudinary(processedBuffer, {
    folder: `keposting/${businessId}/${LOGO_FOLDER[variant]}`,
    resourceType: "image",
  });
  if (!uploaded.ok) {
    console.error(`removeLogoBackground (cloudinary upload) failed: ${uploaded.error}`);
    return { ok: false, error: "Gagal menyimpan logo hasil hapus background. Coba lagi." };
  }
  const storagePath = uploaded.url;

  const { error: upsertError } = await client
    .from("business_profile")
    .upsert(
      { business_id: businessId, [col.path]: storagePath, updated_at: new Date().toISOString() },
      { onConflict: "business_id" },
    );
  if (upsertError) {
    console.error(`removeLogoBackground (save reference) failed: ${describeSupabaseError(upsertError)}`);
    return { ok: false, error: "Logo tersimpan tapi gagal menyimpan datanya. Coba lagi." };
  }

  await cleanupOldFile(client, previous.path);

  return { ok: true, url: publicImageUrl(client, storagePath) };
}

export type UpdateLogoPositionResult = { ok: true } | { ok: false; error: string };

export async function updateLogoPosition(
  client: SupabaseClient,
  position: LogoPosition,
  businessId: string = DEV_BUSINESS_ID,
  variant: LogoVariant = "dark",
): Promise<UpdateLogoPositionResult> {
  const col = LOGO_COLUMNS[variant];
  const { error } = await client
    .from("business_profile")
    .upsert(
      { business_id: businessId, [col.position]: position, updated_at: new Date().toISOString() },
      { onConflict: "business_id" },
    );

  if (error) {
    console.error(`updateLogoPosition failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal mengubah posisi logo. Coba lagi." };
  }
  return { ok: true };
}