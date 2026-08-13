/**
 * "Sutradara" video: OpenAI menyusun naskah, storyboard, dan prompt video
 * dari produk + target market — DIKUNCI supaya hasil Veo realistis & natural
 * (bukan CGI/kartun/iklan kaku).
 */

export type Storyboard = {
  /** Prompt video final (Inggris) yang dikirim ke Veo. */
  videoPrompt: string;
  /** Kalimat yang diucapkan orang di video (Indonesia, ±15-20 kata utk 8 dtk). */
  naskah: string;
  /** Rincian adegan per detik untuk ditampilkan ke admin. */
  adegan: { detik: string; deskripsi: string }[];
  negativePrompt: string;
};

/** Kunci realisme — SELALU ditempel server-side, apa pun output OpenAI. */
const REALISM_LOCK =
  "Photorealistic candid handheld footage. Lighting: soft natural window light or ambient daylight only, " +
  "slightly uneven and imperfect exposure like real amateur footage, gentle shadows, NO studio lighting, no ring light look. " +
  "The person: real Indonesian human with imperfect natural skin - visible pores, slight blemishes, minor freckles or acne marks, " +
  "uneven skin tone, a few stray hairs, absolutely no beauty filter and no skin smoothing. " +
  "They speak casually and naturally with small pauses, relaxed conversational tone like talking to a friend, " +
  "natural mouth movement synced to the words, occasional blink and small head movement, not a scripted advertisement delivery. " +
  "The product must look EXACTLY like the reference image - do not alter its label, colors, or shape. " +
  "Physical weight: the product has realistic weight and mass - the hand grips it firmly with fingers pressing slightly into it, " +
  "wrist and forearm show subtle effort when lifting, the object moves with believable inertia and settles naturally when placed down, " +
  "never floating, never weightless, no gliding movements. " +
  "Full-frame clean video only: absolutely NO phone user interface, NO app interface, NO social media UI, " +
  "no icons, no buttons, no status bar, no on-screen text, no captions, no logos added. No CGI look, no cartoon.";

const NEGATIVE_LOCK =
  "phone UI, app interface, social media interface, screen recording, icons, buttons, status bar, navigation bar, " +
  "like button, heart icon, cartoon, anime, CGI, 3d render, plastic skin, airbrushed skin, beauty filter, flawless skin, " +
  "studio lighting, ring light, oversaturated, studio advertisement look, " +
  "text, subtitles, watermark, distorted hands, distorted product label, extra fingers, " +
  "floating object, weightless movement, gliding motion, object drifting";

export async function buildStoryboard(input: {
  productDescription: string;
  targetMarket: string;
  businessName?: string;
  durationSeconds: number;
}): Promise<Storyboard> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY belum di-set di .env.local");

  const sys =
    "Kamu sutradara video iklan UGC (user generated content) untuk media sosial Indonesia. " +
    "Balas HANYA JSON valid tanpa markdown, dengan bentuk persis: " +
    '{"videoPrompt": string, "naskah": string, "adegan": [{"detik": string, "deskripsi": string}]}';

  const user = [
    `Produk: ${input.productDescription}`,
    input.businessName ? `Bisnis: ${input.businessName}` : "",
    `Target market: ${input.targetMarket}`,
    `Durasi video: ${input.durationSeconds} detik (SANGAT pendek — maksimal 2-3 adegan).`,
    "",
    "Buat:",
    '1. "naskah": naskah bahasa Indonesia yang diucapkan orang di video, KETAT 18-24 kata dan HARUS selesai diucapkan santai dalam ' + String(input.durationSeconds - 1) + ' detik (detik terakhir untuk senyum ke kamera, tanpa bicara) — kalau ragu, buat lebih pendek, JANGAN sampai terpotong. Gaya ngobrol santai ke teman, pakai partikel percakapan alami (mis. "nih", "loh", "jujur ya") dan boleh 2 kalimat pendek. BUKAN bahasa iklan. Sebut masalah target market dulu, lalu manfaat produknya.',
    '2. "adegan": rincian per detik (contoh detik "0-3"), sederhana dan realistis — orang biasa memakai/memegang produk di lingkungan sehari-hari target market.',
    '3. "videoPrompt": prompt video bahasa Inggris satu paragraf yang menggambarkan adegan itu untuk model text/image-to-video: siapa orangnya (sesuai target market), lokasi, aksi dengan produk, lalu orang itu berbicara ke kamera mengucapkan naskah (tulis: the person says in Indonesian: "<naskah>"). Tulis juga CARA bicaranya: casually, like chatting with a friend, dan WAJIB tulis: "the person finishes speaking by second ' + String(input.durationSeconds - 1) + ', then smiles at the camera holding the product for the final second". Gaya WAJIB kasual realistis, BUKAN iklan studio.',
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_STORYBOARD_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI gagal (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  let parsed: { videoPrompt?: string; naskah?: string; adegan?: { detik?: string; deskripsi?: string }[] };
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("OpenAI membalas format tak terduga. Coba lagi.");
  }
  if (!parsed.videoPrompt || !parsed.naskah) {
    throw new Error("Storyboard tidak lengkap dari OpenAI. Coba lagi.");
  }

  return {
    // Kunci realisme ditempel di sini — user boleh edit bagian kreatif,
    // tapi lock ditempel ulang saat generate (lihat route generate).
    videoPrompt: `${parsed.videoPrompt.trim()} ${REALISM_LOCK}`,
    naskah: parsed.naskah.trim(),
    adegan: (parsed.adegan ?? [])
      .filter((a) => a && a.deskripsi)
      .map((a) => ({ detik: a.detik ?? "-", deskripsi: a.deskripsi as string })),
    negativePrompt: NEGATIVE_LOCK,
  };
}

export { REALISM_LOCK, NEGATIVE_LOCK };
