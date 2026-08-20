/**
 * "Sutradara" video: OpenAI menyusun naskah, storyboard, dan prompt video
 * dari produk + target market — DIKUNCI supaya hasil video realistis & natural
 * (bukan CGI/kartun/iklan kaku).
 *
 * STRUKTUR NASKAH (per permintaan): DRAMA dulu, baru produk.
 * ±sepertiga awal durasi = momen drama/masalah keseharian yang berhubungan
 * langsung dengan produk & bisnisnya (tanpa menyebut produk), lalu transisi
 * natural ke produk sebagai solusinya. Lingkungan: tempat umum sehari-hari
 * yang wajar sesuai penggunaan produk (dapur, warung, meja kerja, teras) —
 * bukan studio. Panjang naskah menyesuaikan durasi (±2,3 kata/detik).
 */

export type Storyboard = {
  /** Prompt video final (Inggris) yang dikirim ke Veo/Seedance. */
  videoPrompt: string;
  /** Kalimat yang diucapkan orang di video (Indonesia, skala dgn durasi). */
  naskah: string;
  /** Rincian adegan per detik untuk ditampilkan ke admin. */
  adegan: { detik: string; deskripsi: string }[];
  negativePrompt: string;
};

/** Kunci realisme — SELALU ditempel server-side, apa pun output OpenAI. */
const REALISM_LOCK =
  "Photorealistic candid handheld footage. SINGLE CONTINUOUS SHOT: one unbroken handheld take, NO scene cuts, no jump cuts, " +
  "no camera switches - the SAME person, the SAME location, and the SAME voice from the first frame to the last. " +
  "Lighting: soft flattering natural light (golden window light or pleasant daylight), gentle shadows, NO harsh studio lighting, no ring light look. " +
  "The person: an ATTRACTIVE, pleasant-looking real Indonesian person (handsome man or beautiful woman, matching the scene description), " +
  "well-groomed with clean, healthy, natural-looking skin - real skin texture with faint visible pores and at most a barely-noticeable hint of imperfection (about 2 percent), " +
  "NO acne, NO blemish patches, yet also NO plastic beauty-filter smoothing - like an naturally good-looking person filmed on a good phone camera. " +
  "The setting: a pleasant, clean, aesthetically pleasing everyday location that fits the product's real use - tidy, inviting, nice to look at. " +
  "VOICE: one single consistent voice for the entire video that MATCHES the person's gender and age - a woman speaks with a natural pleasant female voice, " +
  "a man with a natural pleasant male voice; warm, clear, easy on the ears, native Indonesian pronunciation. " +
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
  "like button, heart icon, cartoon, anime, CGI, 3d render, plastic skin, airbrushed skin, heavy beauty filter, " +
  "acne, skin blemishes, messy dirty background, ugly cluttered room, " +
  "studio lighting, ring light, oversaturated, studio advertisement look, " +
  "scene cut, jump cut, multiple shots, voice change mid-video, mismatched voice gender, robotic voice, " +
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

  const dur = input.durationSeconds;
  // Pembagian waktu: drama ±sepertiga awal (dibulatkan), sisanya produk.
  const dramaEnd = Math.max(2, Math.round(dur / 3));
  // Naskah menyesuaikan durasi: ±2,3 kata/detik dari waktu bicara (dur - 1
  // detik terakhir untuk senyum). Rentang diberikan supaya model tak kaku.
  const speakSec = dur - 1;
  const minWords = Math.round(speakSec * 2.4);
  const maxWords = Math.round(speakSec * 2.9);

  const sys =
    "Kamu sutradara video iklan UGC (user generated content) untuk media sosial Indonesia. " +
    "Balas HANYA JSON valid tanpa markdown, dengan bentuk persis: " +
    '{"videoPrompt": string, "naskah": string, "adegan": [{"detik": string, "deskripsi": string}]}';

  const user = [
    `Produk: ${input.productDescription}`,
    input.businessName ? `Bisnis: ${input.businessName}` : "",
    `Target market: ${input.targetMarket}`,
    `Durasi video: ${dur} detik (SANGAT pendek — maksimal 2-3 adegan).`,
    "",
    "STRUKTUR WAJIB — DRAMA DULU, PRODUK BELAKANGAN:",
    `- Detik 0-${dramaEnd}: DRAMA pembuka. Satu momen masalah/kejengkelan keseharian yang BERHUBUNGAN LANGSUNG dengan produk & bisnis ini — sesuatu yang pasti pernah dialami target market (pilih dari dunia produk itu sendiri, mis. kalau produknya wadah: makanan tumpah/repot; kalau minuman: kemasan bocor/tidak menarik). Orangnya kesal/mengeluh dengan ekspresi natural. JANGAN sebut atau perlihatkan produk di bagian ini.`,
    `- Detik ${dramaEnd}-${dur - 1}: TRANSISI natural lalu produk muncul sebagai solusi — orang mengangkat/memakai produk sambil menyebut manfaat utamanya dengan lega/senang.`,
    `- Detik terakhir: senyum ke kamera memegang produk, tanpa bicara.`,
    "",
    "LINGKUNGAN: tempat umum sehari-hari yang WAJAR sesuai cara produk ini dipakai (mis. dapur rumah, meja warung, meja kerja, teras) — pilih yang paling masuk akal untuk produk & target market ini. BUKAN studio, BUKAN lokasi mewah tak relevan.",
    "",
    "Buat:",
    `1. "naskah": naskah bahasa Indonesia yang diucapkan orang di video, KETAT ${minWords}-${maxWords} kata dan HARUS selesai diucapkan santai dalam ${speakSec} detik — kalau ragu, kurangi kata, JANGAN sampai terpotong. GAYA WAJIB = PERBINCANGAN, bukan promosi: tulis seolah dia sedang MEMBALAS pertanyaan/komentar teman di sebelah kamera. Kalimat pertama boleh langsung respon percakapan (mis. "Ini? Hahaha...", "Eh iya, kamu nanya ini ya...", "Serius deh, kemarin tuh..."). Lalu cerita mikro dramanya (keluhan/kejadian yang dialami sendiri, emosional & spesifik), baru produk disebut SAMBIL LALU sebagai bagian cerita — seperti merekomendasikan ke teman, BUKAN menyebutkan daftar manfaat. Pakai partikel percakapan alami ("nih", "loh", "jujur ya", "duh", "kan", "tau nggak"). DILARANG KERAS: kalimat slogan, ajakan beli, kata "solusi", "praktis banget!" di akhir sebagai penutup iklan, atau nada announcer. Kalau dibaca keras, harus terdengar seperti potongan obrolan nyata dua teman.`,
    `2. "adegan": rincian per detik mengikuti struktur wajib di atas (contoh detik "0-${dramaEnd}"), sederhana dan realistis.`,
    `3. "videoPrompt": prompt video bahasa Inggris satu paragraf untuk model image-to-video, mengikuti struktur yang sama: describe the opening drama moment first (the person frustrated by the specific everyday problem, product NOT visible yet), then the natural transition where they pick up the product with relief while chatting. Tulis siapa orangnya (sesuai target market), lokasi sehari-hari yang wajar, dan WAJIB tulis suasana percakapan: "the person is casually chatting with a friend who is just off-camera next to the lens, glancing between the friend and the camera, reacting and gesturing naturally like in the middle of a real conversation — NOT presenting to the camera". Lalu: the person says in Indonesian: "<naskah>". Tulis juga CARA bicaranya: relaxed, mid-conversation, like telling a story to a close friend, dan WAJIB tulis: "the person finishes speaking by second ${speakSec}, then smiles holding the product for the final second". Gaya WAJIB kasual realistis, BUKAN iklan studio.`,
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
