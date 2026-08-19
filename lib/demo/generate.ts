/**
 * GENERATE DEMO — tanpa sharp.
 * =====================================================================
 * Alur: Gemini edit foto → simpan LANGSUNG ke Supabase (tanpa renderTemplate
 * yang memanggil sharp). Overlay teks (judul) ditangani di browser (CSS),
 * bukan di-burn ke gambar — ini yang menghilangkan ketergantungan sharp.
 *
 * Hasilnya: URL gambar bersih (AI-edited) + caption + title → ditampilkan
 * di halaman /coba sebagai preview interaktif (user bisa edit teks dll).
 * =====================================================================
 */

import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { editImage } from "@/lib/ai/geminiImage";
import { generateJsonContent } from "@/lib/ai/geminiJson";
import { buildProdukContentPrompt } from "@/lib/ai/autoContentPrompt";
import { describeProductImage } from "@/lib/ai/describeImage";
import {
  buildScenePrompt,
  buildFoodPrompt,
  buildSkincarePrompt,
  buildJasaPrompt,
} from "@/lib/ai/scenePrompt";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { AspectRatio } from "@/lib/templates/types";

const DEMO_BUCKET = "demo-results";
const RATIO: AspectRatio = "4:5";
const LANG = "id" as const;

export type DemoGenInput = {
  imageBuffer: Buffer;
  mimeType: string;
  businessType: string;
};

export type DemoGenResult = {
  resultUrl: string;  // URL gambar Gemini (tanpa overlay teks)
  bgUrl: string;      // sama dengan resultUrl (untuk kompatibilitas)
  caption: string;
  title: string;      // judul (ditampilkan via CSS di browser, bukan di gambar)
  demoId: string;
};

function synthProfile(businessType: string): BusinessProfile {
  return {
    business: { name: "", industry: businessType, location: "" },
    offering: { mainProducts: "", targetCustomer: "", customerProblem: "" },
    positioning: { contentGoals: [], differentiator: "", tone: "", cta: "", avoid: "" },
    story: "",
    logo: null,
  } as unknown as BusinessProfile;
}

function imagePromptFor(
  businessType: string,
  profile: BusinessProfile,
  description?: string
): string {
  const t = businessType.toLowerCase();
  if (t.includes("f&b") || t.includes("kuliner") || t.includes("makan"))
    return buildFoodPrompt(profile, description, LANG);
  if (t.includes("skincare") || t.includes("kecantikan"))
    return buildSkincarePrompt(profile, description, LANG);
  if (t.includes("jasa")) return buildJasaPrompt(profile, LANG);
  return buildScenePrompt(profile, undefined, LANG);
}

export async function generateDemoContent(
  input: DemoGenInput
): Promise<DemoGenResult> {
  const profile = synthProfile(input.businessType);
  const imageBase64 = input.imageBuffer.toString("base64");

  // 0) Analisis foto (best-effort)
  let productDesc = "";
  const descRes = await describeProductImage({
    imageBase64,
    mimeType: input.mimeType,
    lang: LANG,
  });
  if (descRes.ok) productDesc = descRes.description;

  // 1+2) Teks & gambar paralel
  const contentPrompt = buildProdukContentPrompt(profile, productDesc, LANG);
  const [contentRes, imgRes] = await Promise.all([
    generateJsonContent(contentPrompt),
    editImage({
      imageBase64,
      mimeType: input.mimeType,
      aspectRatio: RATIO,
      prompt: imagePromptFor(input.businessType, profile, productDesc),
    }),
  ]);

  if (!contentRes.ok) throw new Error(contentRes.error || "gagal membuat teks");
  const data = contentRes.data as { onImageText?: string; caption?: string };
  const onImageText = String(data.onImageText || "").trim();
  const caption = String(data.caption || "").trim();
  if (!onImageText || !caption) throw new Error("format teks tidak lengkap");

  if (!imgRes.ok) throw new Error(imgRes.error || "gagal membuat gambar");

  // 3) Simpan gambar Gemini LANGSUNG — tanpa renderTemplate (tanpa sharp)
  const svc = createServiceRoleClient();
  const demoId = randomUUID();
  const imgBase64 = imgRes.dataUri.replace(/^data:image\/\w+;base64,/, "");
  const imgBuffer = Buffer.from(imgBase64, "base64");

  const up = await svc.storage
    .from(DEMO_BUCKET)
    .upload(`${demoId}.png`, imgBuffer, { contentType: "image/png" });
  if (up.error) throw new Error("gagal menyimpan hasil: " + up.error.message);

  const { data: pub } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}.png`);
  return {
    resultUrl: pub.publicUrl,
    bgUrl: pub.publicUrl,
    caption,
    title: onImageText,
    demoId,
  };
}
