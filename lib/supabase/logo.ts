import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LogoPosition } from "@/lib/onboarding/businessProfile";
import { removeSolidBackground } from "@/lib/images/backgroundRemoval";
import { BUCKET, publicImageUrl } from "./images";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";

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

function fileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "jpg";
}

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

  const storagePath = `${businessId}/${LOGO_FOLDER[variant]}/${randomUUID()}.${fileExtension(input.file.name)}`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, input.file);
  if (uploadError) {
    console.error(`uploadLogo (storage) failed: ${describeSupabaseError(uploadError)}`);
    return { ok: false, error: "Gagal mengunggah logo. Coba lagi." };
  }

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
    const { error: cleanupError } = await client.storage.from(BUCKET).remove([previous.path]);
    if (cleanupError) {
      console.error(`uploadLogo (cleanup old file) failed: ${describeSupabaseError(cleanupError)}`);
    }
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

  const { error: storageError } = await client.storage.from(BUCKET).remove([previous.path]);
  if (storageError) {
    console.error(`deleteLogo (storage cleanup) failed: ${describeSupabaseError(storageError)}`);
  }

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

  const { data: downloaded, error: downloadError } = await client.storage.from(BUCKET).download(previous.path);
  if (downloadError || !downloaded) {
    console.error(`removeLogoBackground (download) failed: ${describeSupabaseError(downloadError)}`);
    return { ok: false, error: "Gagal mengambil logo saat ini. Coba lagi." };
  }

  let processedBuffer: Buffer;
  try {
    const inputBuffer = Buffer.from(await downloaded.arrayBuffer());
    processedBuffer = await removeSolidBackground(inputBuffer);
  } catch (error) {
    console.error(`removeLogoBackground (processing) failed: ${error instanceof Error ? error.message : error}`);
    return { ok: false, error: "Gagal memproses logo. Coba lagi." };
  }

  const storagePath = `${businessId}/${LOGO_FOLDER[variant]}/${randomUUID()}.png`;
  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, processedBuffer, {
    contentType: "image/png",
  });
  if (uploadError) {
    console.error(`removeLogoBackground (upload) failed: ${describeSupabaseError(uploadError)}`);
    return { ok: false, error: "Gagal menyimpan logo hasil hapus background. Coba lagi." };
  }

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

  const { error: cleanupError } = await client.storage.from(BUCKET).remove([previous.path]);
  if (cleanupError) {
    console.error(`removeLogoBackground (cleanup old file) failed: ${describeSupabaseError(cleanupError)}`);
  }

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