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
import { describeProductImage } from "@/lib/ai/describeImage";
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
export type DemoGenResult = {
  resultUrl: string;
  bgUrl: string;   // background AI TANPA teks — utk preview drag di client
  caption: string;
  title: string;   // judul yang ditempel di gambar (onImageText) — bisa diedit user
  demoId: string;  // id file di bucket, dipakai /api/demo-render utk render ulang
};

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

// Pilih prompt gambar dari tipe bisnis. Deskripsi produk (hasil analisis foto)
// diteruskan ke food/skincare prompt supaya scene lebih nyambung; scene umum
// pakai foto asli sebagai acuan editImage.
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
  return buildScenePrompt(profile, undefined, LANG);
}

export async function generateDemoContent(
  input: DemoGenInput
): Promise<DemoGenResult> {
  const profile = synthProfile(input.businessType);
  const imageBase64 = input.imageBuffer.toString("base64");

  // 0) ANALISIS FOTO — AI "membaca" produk di foto jadi deskripsi teks.
  //    Ini yang bikin judul & caption NYAMBUNG dengan produk asli (bukan
  //    generik dari tipe bisnis). Best-effort: kalau gagal, lanjut dgn "".
  let productDesc = "";
  const descRes = await describeProductImage({
    imageBase64,
    mimeType: input.mimeType,
    lang: LANG,
  });
  if (descRes.ok) productDesc = descRes.description;

  // 1+2) TEKS & GAMBAR digenerate PARALEL (saling independen) —
  // sebelumnya berurutan, buang 5-20 detik waktu tunggu percuma.
  // Deskripsi produk hasil analisis diselipkan ke prompt teks.
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

  // 3) RENDER overlay headline (template polos, tanpa logo user)
  const pngBuffer = await renderTemplate({
    template: polosTemplate,
    values: { photo: imgRes.dataUri, caption: onImageText },
    ratio: RATIO,
  });

  // 4) SIMPAN ke bucket PUBLIC lalu ambil URL (untuk tampil di layar + email)
  //    Dua file per demo:
  //      <id>-bg.png = background hasil AI TANPA teks (bahan render ulang judul)
  //      <id>.png    = hasil final dengan teks (yang ditampilkan/dikirim)
  const svc = createServiceRoleClient();
  const demoId = randomUUID();

  // background: dataUri -> buffer
  const bgBase64 = imgRes.dataUri.replace(/^data:image\/\w+;base64,/, "");
  const bgBuffer = Buffer.from(bgBase64, "base64");
  const upBg = await svc.storage
    .from(DEMO_BUCKET)
    .upload(`${demoId}-bg.png`, bgBuffer, { contentType: "image/png" });
  if (upBg.error) throw new Error("gagal menyimpan background: " + upBg.error.message);

  const up = await svc.storage
    .from(DEMO_BUCKET)
    .upload(`${demoId}.png`, pngBuffer, { contentType: "image/png" });
  if (up.error) throw new Error("gagal menyimpan hasil: " + up.error.message);

  const { data: pub } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}.png`);
  const { data: pubBg } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}-bg.png`);
  return { resultUrl: pub.publicUrl, bgUrl: pubBg.publicUrl, caption, title: onImageText, demoId };
}
