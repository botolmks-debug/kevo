import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AspectRatio } from "@/lib/templates/types";
import { BUCKET } from "./images";
import { DEV_BUSINESS_ID } from "./devBusiness";
import { describeSupabaseError } from "./logError";

export type GeneratedContentJenis = "produk" | "general" | "interaksi" | "video_cerita" | "berita";
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

/** Batas konten tersimpan per user. Melebihi ini → konten TERLAMA dihapus
 *  otomatis (first-in-first-out) beserta file storage-nya, supaya:
 *  (1) storage Supabase free tier (1 GB) tidak jebol,
 *  (2) user tetap bisa mengatur kalender konten 30 hari (60 = 2 bulan feed). */
export const MAX_KONTEN_PER_USER = 60;

/**
 * FIFO cap: sebelum menyimpan konten baru, hapus konten TERLAMA milik user
 * kalau jumlahnya sudah menyentuh batas — termasuk file PNG + background di
 * storage (bukan cuma baris DB, supaya kuota storage benar-benar lega).
 *
 * Best-effort: kegagalan di sini TIDAK menggagalkan penyimpanan konten baru
 * (lebih baik konten user tersimpan walau pembersihan gagal sekali).
 * Delete pakai storageClient (route melewatkan service-role) karena RLS
 * delete di generated_content historisnya bermasalah untuk user client.
 */
async function enforceContentCap(
  dbClient: SupabaseClient,
  businessId: string,
  cap: number = MAX_KONTEN_PER_USER,
): Promise<void> {
  try {
    const { data, error } = await dbClient
      .from("generated_content")
      .select("id, storage_path, background_path, scheduled_date")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (error || !data) {
      if (error) console.warn(`enforceContentCap (select) gagal: ${describeSupabaseError(error)}`);
      return;
    }
    // Sisakan 1 slot untuk konten yang akan disimpan setelah ini.
    const excess = data.length - (cap - 1);
    if (excess <= 0) return;

    // JANGAN korbankan konten TERJADWAL yang belum lewat tanggalnya — itu
    // rencana kalender user. Urutan korban: (1) tak terjadwal / jadwalnya
    // sudah lewat, tertua duluan; (2) baru terjadwal-masa-depan kalau
    // benar-benar tidak ada pilihan lain (keduanya sudah created_at asc).
    type CapRow = { id: string; storage_path?: string | null; background_path?: string | null; scheduled_date?: string | null };
    const rows = data as CapRow[];
    const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // patokan WIB/WITA
    const expendable = rows.filter((r) => !r.scheduled_date || r.scheduled_date < today);
    const protectedRows = rows.filter((r) => r.scheduled_date && r.scheduled_date >= today);
    const toDelete = [...expendable, ...protectedRows].slice(0, excess);

    const storagePaths: string[] = [];
    for (const row of toDelete) {
      if (row.storage_path) storagePaths.push(row.storage_path);
      if (row.background_path) storagePaths.push(row.background_path);
    }
    if (storagePaths.length > 0) {
      const { error: rmErr } = await dbClient.storage.from(BUCKET).remove(storagePaths);
      if (rmErr) console.warn(`enforceContentCap (storage remove) gagal: ${describeSupabaseError(rmErr)}`);
    }
    const ids = toDelete.map((r) => r.id);
    const { error: delErr } = await dbClient.from("generated_content").delete().in("id", ids);
    if (delErr) console.warn(`enforceContentCap (delete rows) gagal: ${describeSupabaseError(delErr)}`);
    else console.log(`enforceContentCap: ${ids.length} konten terlama dihapus (FIFO, cap ${cap}) utk business ${businessId}`);
  } catch (e) {
    console.warn(`enforceContentCap threw: ${e instanceof Error ? e.message : e}`);
  }
}

export async function insertGeneratedContent(
  client: SupabaseClient,
  input: InsertGeneratedContentInput,
  // Client khusus untuk upload storage. Default = client. Route melewatkan
  // service-role client agar upload tak kena RLS storage / balapan refresh-token
  // (penyebab error "Gagal mengunggah hasil generate").
  storageClient: SupabaseClient = client,
): Promise<InsertGeneratedContentResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;
  const storagePath = `${businessId}/generated/${randomUUID()}.png`;

  // FIFO cap 60: buang konten terlama dulu kalau kuota user sudah penuh.
  // Pakai storageClient (service-role dari route) supaya delete lolos RLS.
  await enforceContentCap(storageClient, businessId);

  // Upload dengan RETRY — "fetch failed" adalah kegagalan jaringan sesaat ke
  // Supabase Storage; percobaan ulang biasanya berhasil. upsert:true supaya aman
  // kalau percobaan sebelumnya sempat separuh jalan.
  let uploadError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await storageClient.storage.from(BUCKET).upload(storagePath, input.pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });
    uploadError = res.error;
    if (!uploadError) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  if (uploadError) {
    const detail = describeSupabaseError(uploadError);
    console.error(`insertGeneratedContent (storage) failed after retries: ${detail}`);
    return { ok: false, error: `Gagal mengunggah hasil generate: ${detail}` };
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

export type InsertVideoGeneratedContentInput = {
  businessId?: string;
  videoBuffer: Buffer;
  title: string; // dipakai sbg on_image_text (label ringkas di kartu riwayat)
  caption: string;
  ratio: AspectRatio;
};

/**
 * Simpan hasil "Video Cerita Produk" (mp4) ke generated_content, jenis
 * 'video_cerita' — MUNCUL di riwayat Edit Konten tapi TIDAK BISA DIEDIT di
 * sana (lihat app/konten/page.tsx, cuma tombol Unduh + Salin Caption).
 * Reuse FIFO cap yang sama dgn insertGeneratedContent (video ikut kena
 * batas 60 konten/user, storage-nya juga ikut dibersihkan otomatis).
 */
export async function insertVideoGeneratedContent(
  client: SupabaseClient,
  input: InsertVideoGeneratedContentInput,
  storageClient: SupabaseClient = client,
): Promise<InsertGeneratedContentResult> {
  const businessId = input.businessId ?? DEV_BUSINESS_ID;
  const storagePath = `${businessId}/generated/${randomUUID()}.mp4`;

  await enforceContentCap(storageClient, businessId);

  let uploadError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = await storageClient.storage.from(BUCKET).upload(storagePath, input.videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });
    uploadError = res.error;
    if (!uploadError) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  if (uploadError) {
    const detail = describeSupabaseError(uploadError);
    console.error(`insertVideoGeneratedContent (storage) failed after retries: ${detail}`);
    return { ok: false, error: `Gagal mengunggah video: ${detail}` };
  }

  const { data, error } = await client
    .from("generated_content")
    .insert({
      business_id: businessId,
      jenis: "video_cerita",
      storage_path: storagePath,
      on_image_text: input.title,
      caption: input.caption,
      ratio: input.ratio,
      status: "selesai",
    })
    .select()
    .single();

  if (error || !data) {
    console.error(`insertVideoGeneratedContent (insert row) failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Video tersimpan tapi gagal menyimpan datanya." };
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
  // Tanpa .limit(): konten lebih lama sempat "hilang" dari daftar (Edit
  // Konten & Riwayat) padahal masih ada di DB — cuma tidak ikut ditarik
  // karena limit(20) lama. Supabase punya batas default 1000 baris per
  // query sebagai jaring pengaman; cukup jauh untuk skala saat ini.
  const { data, error } = await client
    .from("generated_content")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(`listGeneratedContent failed: ${describeSupabaseError(error)}`);
    return { ok: false, error: "Gagal memuat riwayat konten. Coba lagi." };
  }
  return { ok: true, rows: (data ?? []) as GeneratedContentRow[] };
}
