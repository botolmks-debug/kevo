// lib/instagram/publishContent.ts
// Inti proses posting 1 konten ke Instagram:
// ambil gambar konten -> konversi JPEG -> upload ke bucket publik -> publish -> tandai baris.
// Dipakai oleh route publish manual DAN cron scheduler.
import sharp from "sharp";
import { publishImage } from "@/lib/instagram/api";
import {
  createIgServiceClient,
  type IgConnection,
} from "@/lib/supabase/igConnections";

const BUCKET = "user-images";

// Cari kolom gambar di baris generated_content (nama kolom berbeda antar era fitur).
function pickImageRef(row: Record<string, unknown>): string | null {
  const candidates = [
    "image_path",
    "storage_path",
    "png_path",
    "image_url",
    "background_path",
  ];
  for (const key of candidates) {
    const v = row[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function publicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function publishContentToIg(contentId: string, conn: IgConnection) {
  const db = createIgServiceClient();

  const { data: row, error } = await db
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .eq("business_id", conn.business_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Konten tidak ditemukan");
  if (row.ig_posted_at) return { skipped: true as const, reason: "Sudah terposting" };

  const ref = pickImageRef(row);
  if (!ref) throw new Error("Konten belum punya gambar tersimpan");
  const srcUrl = ref.startsWith("http") ? ref : publicUrl(ref);

  // Unduh PNG hasil render -> konversi JPEG (syarat Instagram Graph API)
  const imgRes = await fetch(srcUrl);
  if (!imgRes.ok) throw new Error(`Gagal ambil gambar konten (${imgRes.status})`);
  const png = Buffer.from(await imgRes.arrayBuffer());
  const jpeg = await sharp(png)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92 })
    .toBuffer();

  const jpegPath = `${conn.business_id}/igpost/${contentId}.jpg`;
  const up = await db.storage
    .from(BUCKET)
    .upload(jpegPath, jpeg, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw new Error(`Gagal upload JPEG: ${up.error.message}`);

  const caption: string =
    (typeof row.caption === "string" && row.caption) ||
    (typeof row.title === "string" && row.title) ||
    "";

  try {
    const { mediaId } = await publishImage({
      igUserId: conn.ig_user_id,
      accessToken: conn.access_token,
      imageUrl: publicUrl(jpegPath),
      caption,
    });

    await db
      .from("generated_content")
      .update({
        ig_posted_at: new Date().toISOString(),
        ig_media_id: mediaId,
        ig_post_error: null,
      })
      .eq("id", contentId);

    return { skipped: false as const, mediaId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal publish";
    await db
      .from("generated_content")
      .update({ ig_post_error: msg })
      .eq("id", contentId);
    throw e;
  }
}
