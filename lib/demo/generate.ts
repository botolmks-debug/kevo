/**
 * GENERATE DEMO — disambung ke mesin generate ASLI.
 * =====================================================================
 * Alur = flow "produk" produk aslimu: EDIT foto asli pengunjung, jadi hasil
 * yang tampil BENAR-BENAR produknya (bukan gambar AI palsu). Teks (headline +
 * caption) pakai buildProdukContentPrompt + generateJsonContent yang sama.
 *
 * Beda dengan generate-auto biasa (sengaja, karena pengunjung anonim):
 *   - tanpa login / tanpa potong token
 *   - tanpa profil bisnis lengkap -> disintesis minimal dari "tipe bisnis"
 *   - tanpa analisis foto per-gambar -> prompt gambar dipilih dari tipe bisnis
 *     (CAVEAT: caption jadi lebih generik, tak mengutip detail produk.
 *      Upgrade opsional: colok helper analisis gambarmu -> dapat description
 *      -> caption jadi spesifik. Kirim file analisisnya kalau mau ini.)
 *   - overlay pakai polosTemplate tanpa logo user (ini demo)
 *
 * PRASYARAT: buat bucket PUBLIC bernama "demo-results" di Supabase Storage
 * (Storage -> New bucket -> nama: demo-results -> centang Public).
 * =====================================================================
 */

import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { editImage } from "@/lib/ai/geminiImage";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { buildProdukContentPrompt } from "@/lib/ai/autoContentPrompt";
import {
  buildScenePrompt,
  buildFoodPrompt,
  buildSkincarePrompt,
} from "@/lib/ai/scenePrompt";
import { polosTemplate } from "@/lib/templates/polos";
import { renderTemplate } from "@/lib/render/renderTemplate";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

const DEMO_BUCKET = "demo-results"; // WAJIB bucket PUBLIC
const RATIO: AspectRatio = "4:5";
const LANG = "id" as const;

export type DemoGenInput = {
  imageBuffer: Buffer;
  mimeType: string;
  businessType: string;
};
export type DemoGenResult = { resultUrl: string; caption: string };

// Profil minimal dari tipe bisnis — field kosong ("") aman, builder ubah jadi "-".
function synthProfile(businessType: string): BusinessProfile {
  return {
    business: { name: "", industry: businessType, location: "" },
    offering: { mainProducts: "", targetCustomer: "", customerProblem: "" },
    positioning: { contentGoals: [], differentiator: "", tone: "", cta: "", avoid: "" },
    story: "",
    logo: null,
  } as unknown as BusinessProfile;
}

// Pilih prompt gambar dari tipe bisnis (pengganti analisis foto).
function imagePromptFor(businessType: string, profile: BusinessProfile): string {
  const t = businessType.toLowerCase();
  if (t.includes("f&b") || t.includes("kuliner") || t.includes("makan"))
    return buildFoodPrompt(profile, undefined, LANG);
  if (t.includes("skincare") || t.includes("kecantikan"))
    return buildSkincarePrompt(profile, undefined, LANG);
  return buildScenePrompt(profile, undefined, LANG);
}

export async function generateDemoContent(
  input: DemoGenInput
): Promise<DemoGenResult> {
  const profile = synthProfile(input.businessType);
  const imageBase64 = input.imageBuffer.toString("base64");

  // 1) TEKS (headline + caption) — mesin teks yang sama dengan produk asli
  const contentPrompt = buildProdukContentPrompt(profile, "", LANG);
  const contentRes = await generateJsonContent(contentPrompt);
  if (!contentRes.ok) throw new Error(contentRes.error || "gagal membuat teks");
  const data = contentRes.data as { onImageText?: string; caption?: string };
  const onImageText = String(data.onImageText || "").trim();
  const caption = String(data.caption || "").trim();
  if (!onImageText || !caption) throw new Error("format teks tidak lengkap");

  // 2) GAMBAR — EDIT foto asli pengunjung (inti "hasil = produk asli")
  const imgRes = await editImage({
    imageBase64,
    mimeType: input.mimeType,
    aspectRatio: RATIO,
    prompt: imagePromptFor(input.businessType, profile),
  });
  if (!imgRes.ok) throw new Error(imgRes.error || "gagal membuat gambar");

  // 3) RENDER overlay headline (template polos, tanpa logo user)
  const pngBuffer = await renderTemplate({
    template: polosTemplate,
    values: { photo: imgRes.dataUri, caption: onImageText },
    ratio: RATIO,
  });

  // 4) SIMPAN ke bucket PUBLIC lalu ambil URL (untuk tampil di layar + email)
  const svc = createServiceRoleClient();
  const path = `${randomUUID()}.png`;
  const up = await svc.storage
    .from(DEMO_BUCKET)
    .upload(path, pngBuffer, { contentType: "image/png" });
  if (up.error) throw new Error("gagal menyimpan hasil: " + up.error.message);

  const { data: pub } = svc.storage.from(DEMO_BUCKET).getPublicUrl(path);
  return { resultUrl: pub.publicUrl, caption };
}
