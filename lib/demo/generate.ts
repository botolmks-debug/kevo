/**
 * GENERATE DEMO — dengan renderTemplate via dynamic import.
 * =====================================================================
 * Alur: Gemini edit foto → renderTemplate (dynamic import, agar sharp
 * tidak crash module saat startup) → simpan ke Supabase.
 * Hasilnya: gambar dengan overlay teks judul + logo Keposting.
 *
 * renderTemplate di-import secara DINAMIS (await import) — cara yang
 * sama yang membuat GET riwayat di generate-auto berhasil. Sharp hanya
 * dimuat saat fungsi ini dipanggil, bukan saat module diload.
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
import { buildPolosTemplateAt } from "@/lib/templates/polos";
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
  resultUrl: string;  // URL gambar final (dengan overlay teks + logo)
  bgUrl: string;      // URL gambar bersih (tanpa overlay, untuk preview drag)
  caption: string;
  title: string;
  demoId: string;
};

/**
 * KHUSUS DEMO /coba — gaya judul TENANG.
 * Pengunjung demo baru pertama kenal produk; judul hook/provokatif
 * ("X vs Y", pertanyaan menantang, klaim kontroversial) terasa aneh
 * untuk kesan pertama. Diteruskan via parameter `extra` (jalur yang
 * sama dengan fitur hook 🔥 di app utama, dibalik arahnya).
 */
const DEMO_CALM_TITLE_NOTE = `OVERRIDE GAYA JUDUL — KHUSUS HALAMAN DEMO (kesan pertama):
Untuk konten ini, JUDUL (onImageText) WAJIB bergaya TENANG, jelas, dan positif — deskriptif dengan sedikit rasa (bukan hambar), seperti iklan brand profesional.
DILARANG untuk judul: gaya hook/clickbait, pertanyaan provokatif/menantang, klaim kontroversial, perbandingan "X vs Y", bingkai kerugian/ketakutan, peringatan ("berhenti X sebelum Y"), dan celah penasaran yang menggantung.
Contoh arah yang benar: manfaat utama produk dalam kalimat pendek yang hangat, atau momen keseharian positif. Abaikan instruksi sudut viral/hook mana pun di atas jika bertentangan dengan aturan ini.`;

/**
 * KHUSUS DEMO /coba — guard kemasan bermerek.
 * User demo sering upload produk bermerek asli (snack, cokelat, minuman).
 * Tanpa guard ini, model kadang me-regenerate kemasan → nama merek berubah
 * jadi palsu (kasus nyata: KitKat→"KitVat", Lay's→"Layo's") = kesan "AI zonk",
 * persis ketakutan #1 calon user. Ditambahkan di akhir prompt gambar.
 */
const DEMO_BRAND_GUARD = `

BRANDED PACKAGING GUARD (highest priority, overrides anything conflicting above):
The photo may contain real branded products (snacks, drinks, chocolates, cosmetics, etc.). Every package, logo, brand name, and label text MUST remain EXACTLY as photographed — pixel-faithful, sharp, readable, unaltered. NEVER redraw, repaint, rename, misspell, or "reinterpret" any brand name or label (e.g. never turn a real brand into a similar-looking fake name). If you cannot re-render a branded package faithfully, keep the original product pixels untouched and change ONLY the background, lighting, and shadows around it.`;

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
  const contentPrompt = buildProdukContentPrompt(profile, productDesc, LANG, DEMO_CALM_TITLE_NOTE);
  const [contentRes, imgRes] = await Promise.all([
    generateJsonContent(contentPrompt),
    editImage({
      imageBase64,
      mimeType: input.mimeType,
      aspectRatio: RATIO,
      prompt: imagePromptFor(input.businessType, profile, productDesc) + DEMO_BRAND_GUARD,
    }),
  ]);

  if (!contentRes.ok) throw new Error(contentRes.error || "gagal membuat teks");
  const data = contentRes.data as { onImageText?: string; caption?: string };
  const onImageText = String(data.onImageText || "").trim();
  const caption = String(data.caption || "").trim();
  if (!onImageText || !caption) throw new Error("format teks tidak lengkap");

  if (!imgRes.ok) throw new Error(imgRes.error || "gagal membuat gambar");

  const svc = createServiceRoleClient();
  const demoId = randomUUID();

  // 3) Simpan background bersih (tanpa teks) untuk preview drag di client
  const bgBase64 = imgRes.dataUri.replace(/^data:image\/\w+;base64,/, "");
  const bgBuffer = Buffer.from(bgBase64, "base64");
  const upBg = await svc.storage
    .from(DEMO_BUCKET)
    .upload(`${demoId}-bg.png`, bgBuffer, { contentType: "image/png" });
  if (upBg.error) throw new Error("gagal menyimpan background: " + upBg.error.message);

  // 4) Render overlay teks + logo via dynamic import (sharp tidak crash module)
  let resultUrl: string;
  try {
    const { renderTemplate } = await import("@/lib/render/renderTemplate");
    const pngBuffer = await renderTemplate({
      // Pakai varian watermark (logo Keposting kanan-bawah opacity 0.5)
      // di posisi judul default tengah-bawah (0.5, 0.79) — tampilan judul
      // sama seperti sebelumnya, bedanya logo watermark sekarang ikut.
      template: buildPolosTemplateAt(0.5, 0.79),
      values: { photo: imgRes.dataUri, caption: onImageText },
      ratio: RATIO,
    });
    const up = await svc.storage
      .from(DEMO_BUCKET)
      .upload(`${demoId}.png`, pngBuffer, { contentType: "image/png" });
    if (up.error) throw new Error(up.error.message);
    const { data: pub } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}.png`);
    resultUrl = pub.publicUrl;
  } catch (err) {
    // Fallback: kalau render gagal, pakai gambar Gemini tanpa overlay
    console.error("[demo] renderTemplate gagal, fallback ke bg:", err);
    const { data: pub } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}-bg.png`);
    resultUrl = pub.publicUrl;
  }

  const { data: pubBg } = svc.storage.from(DEMO_BUCKET).getPublicUrl(`${demoId}-bg.png`);
  return {
    resultUrl,
    bgUrl: pubBg.publicUrl,
    caption,
    title: onImageText,
    demoId,
  };
}
