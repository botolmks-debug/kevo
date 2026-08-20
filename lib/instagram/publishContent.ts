// lib/instagram/publishContent.ts
import sharp from "sharp";
import { publishImage } from "@/lib/instagram/api";
import {
  createIgServiceClient,
  type IgConnection,
} from "@/lib/supabase/igConnections";

const BUCKET = "user-images";

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

  console.log("[PUBLISH] conn.ig_user_id:", conn.ig_user_id);
  console.log("[PUBLISH] conn.ig_username:", conn.ig_username);
  console.log("[PUBLISH] contentId:", contentId);

  const { data: row, error } = await db
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .eq("business_id", conn.business_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Konten tidak ditemukan");
  if (row.ig_posted_at) return { skipped: true as const, reason: "Sudah terposting" };

  const ref = pickImageRef(row as Record<string, unknown>);
  console.log("[PUBLISH] image ref found:", ref);
  if (!ref) throw new Error("Konten belum punya gambar tersimpan");
  const srcUrl = ref.startsWith("http") ? ref : publicUrl(ref);
  console.log("[PUBLISH] srcUrl:", srcUrl);

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

  const imageUrl = publicUrl(jpegPath);
  console.log("[PUBLISH] imageUrl untuk IG:", imageUrl);

  const caption: string =
    (typeof row.caption === "string" && row.caption) ||
    (typeof (row as Record<string, unknown>).title === "string" && (row as Record<string, unknown>).title as string) ||
    "";

  try {
    console.log("[PUBLISH] memanggil publishImage igUserId:", conn.ig_user_id);
    const { mediaId } = await publishImage({
      igUserId: conn.ig_user_id,
      accessToken: conn.access_token,
      imageUrl,
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
    console.log("[PUBLISH] ERROR:", msg);
    await db
      .from("generated_content")
      .update({ ig_post_error: msg })
      .eq("id", contentId);
    throw e;
  }
}
