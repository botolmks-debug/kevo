import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { checkSupabaseEnvPresence } from "@/lib/env";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { listImages, type ImageRow } from "@/lib/supabase/images";
import { logError } from "@/lib/monitoring/errorLog";
import { describeProductImage } from "@/lib/ai/describeImage";
import { buildProdukTitlesPrompt, themeInstruction } from "@/lib/ai/autoContentPrompt";
import { generateJsonContent } from "@/lib/ai/geminiJson";

export const runtime = "nodejs";
export const maxDuration = 60; // cuma teks (5 judul) — jauh lebih cepat drpd generate gambar

const BUCKET = "user-images";
const VALID_TEMA = ["hook", "edukasi", "produk", "promo"] as const;
type ContentTema = (typeof VALID_TEMA)[number];

type RequestBody = {
  imageId?: string; imageIds?: string[]; language?: "id" | "en"; tema?: ContentTema; konsep?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isValidBody(body: unknown): body is RequestBody {
  if (!isRecord(body)) return false;
  if (body.imageId !== undefined && typeof body.imageId !== "string") return false;
  if (body.imageIds !== undefined) {
    if (!Array.isArray(body.imageIds) || body.imageIds.length < 1 || body.imageIds.length > 5) return false;
    if (!body.imageIds.every((x) => typeof x === "string")) return false;
  }
  if (body.tema !== undefined && !VALID_TEMA.includes(body.tema as ContentTema)) return false;
  if (body.konsep !== undefined && (typeof body.konsep !== "string" || body.konsep.length > 500)) return false;
  return true;
}

export async function POST(request: NextRequest) {
  const presence = checkSupabaseEnvPresence(process.env);
  if (!presence.supabaseUrl || !presence.supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase belum terhubung." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body tidak valid." }, { status: 400 }); }
  if (!isValidBody(body)) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const selectedImageIds = body.imageIds && body.imageIds.length ? body.imageIds : body.imageId ? [body.imageId] : [];
  if (selectedImageIds.length === 0) return NextResponse.json({ error: "Pilih minimal satu gambar produk dulu." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Belum login." }, { status: 401 });

  async function fail(error: string, status: number) {
    await logError({ businessId: user!.id, route: "generate-auto-titles", error: new Error(error), metadata: { status } });
    return NextResponse.json({ error }, { status });
  }

  const profileResult = await loadBusinessProfile(supabase, user.id);
  if (!profileResult.ok) return fail(profileResult.error, 502);
  const profile = profileResult.profile;
  if (!profile) return fail("Lengkapi profil bisnis dulu di halaman onboarding.", 400);

  const imagesResult = await listImages(supabase, user.id);
  if (!imagesResult.ok) return fail(imagesResult.error, 502);
  const ALLOWED_CATEGORIES = ["Produk", "Makanan/Minuman", "Kecantikan/Skincare", "Software/Website", "Wajah/Orang", "Suasana/Fasilitas"];
  let sourceImage: ImageRow | null = null;
  const id0 = selectedImageIds[0];
  const image = imagesResult.images.find((img) => img.id === id0) ?? null;
  const allowed = image && ALLOWED_CATEGORIES.includes(image.category);
  if (!image || !allowed || image.usage !== "olah_ai") {
    return fail("Gambar tidak ditemukan atau bukan gambar yang boleh diolah AI.", 400);
  }
  sourceImage = image;

  // ── Kenali produk dari FOTO (vision) — sama seperti di generate-auto,
  // supaya 5 judul yang ditawarkan sudah "kenal" produknya, bukan tebakan
  // kosong dari profil bisnis doang.
  let produkDesc = sourceImage.description ?? "";
  if (produkDesc.trim().length < 12) {
    try {
      const { data, error } = await createServiceRoleClient().storage.from(BUCKET).download(sourceImage.storage_path);
      if (!error && data) {
        const mimeType = (data as Blob).type || "image/jpeg";
        const imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");
        const seen = await describeProductImage({
          imageBase64, mimeType, lang: body.language === "en" ? "en" : "id", industry: profile.business.industry,
        });
        if (seen.ok && seen.description.trim()) produkDesc = seen.description.trim();
      }
    } catch {
      // best-effort — lanjut dgn deskripsi apa adanya
    }
  }

  const konsepText = body.konsep?.trim();
  // Instruksi konsep sekarang dibangun DI DALAM buildProdukTitlesPrompt
  // sendiri (lihat konsepDecisionBlock di autoContentPrompt.ts) — bukan lagi
  // digabung ke sini sebagai string generik. Alasan: kalimat pembuka fungsi
  // prompt itu ("Produk = BINTANG UTAMA") ternyata jadi PREMIS FONDASI di
  // baris paling atas yang lebih kuat drpd instruksi konsep yang cuma
  // ditambahkan belakangan — jadi sekarang pembukanya sendiri dibuat
  // kondisional berdasarkan ada/tidaknya konsep, bukan cuma dilawan belakangan.
  const temaExtra = body.tema ? themeInstruction(body.tema, body.language) : undefined;
  const extraAll = temaExtra;

  const prompt = buildProdukTitlesPrompt(profile, produkDesc, body.language, extraAll, konsepText);
  const result = await generateJsonContent(prompt);
  if (!result.ok) return fail(result.error, 502);

  const data = result.data as { titles?: unknown };
  const titles = Array.isArray(data.titles) ? data.titles.filter((t): t is string => typeof t === "string" && t.trim().length > 0) : [];
  if (titles.length === 0) return fail("AI tidak mengembalikan pilihan judul yang valid. Coba lagi.", 502);

  return NextResponse.json({ titles, produkDesc });
}
