// lib/video/sinematik.ts
// Mode "Sinematik Produk" — video produk 8 detik gaya iklan TV + VO narator.
// Berdiri sendiri: tidak mengimpor modul video lain agar aman ditumpuk ke project.

// ---------- Tipe ----------

export type SinematikScene = {
  detik: string;        // contoh "0-2"
  deskripsi: string;    // deskripsi adegan (Indonesia, utk user)
  imagePrompt: string;  // prompt EN utk keyframe Gemini
};

export type SinematikStoryboard = {
  judul: string;
  naskahVO: string;       // naskah narator Indonesia, ±18-21 kata (≤7 dtk bicara)
  videoPrompt: string;    // prompt EN utk Veo (satu shot list 8 detik)
  scenes: SinematikScene[]; // 3-4 adegan
};

// ---------- Kunci gaya (server-side, ditempel ulang selalu) ----------

const CINEMATIC_LOCK = [
  "Cinematic TV-commercial product film, 8 seconds, vertical 9:16.",
  "PRODUCT ONLY: no people, no hands, no faces, no talking, no on-screen text, no captions, no logos other than the product's own label.",
  "The product shown must match the reference photos EXACTLY: same shape, same label, same colors, same text on packaging. Never redesign or invent packaging details.",
  "Premium studio or elegant real-world surface, dramatic soft lighting, shallow depth of field, gentle camera moves (slow push-in, orbit, macro pan).",
  "Continuous flowing motion for the FULL 8 seconds - no static holds, no dead frames, no freeze at the end.",
  "Photorealistic, high-end commercial grade. Natural physics.",
].join(" ");

const NEGATIVE_LOCK =
  "people, hands, face, talking, dialogue, voice, subtitles, captions, on-screen text, watermark, distorted label, wrong label text, redesigned packaging, cartoon, illustration, static frame, freeze frame, black frames, empty pause";

// ---------- Storyboard via OpenAI ----------

type ProfilLite = {
  businessName?: string;
  businessType?: string;
  targetMarket?: string;
  tone?: string;
  location?: string;
  extra?: string;
};

export async function buildSinematikStoryboard(opts: {
  profil: ProfilLite;
  produkNama: string;
  produkDeskripsi?: string;
  sizeHint?: string | null;
}): Promise<SinematikStoryboard> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY belum diisi di .env.local");

  const { profil, produkNama, produkDeskripsi, sizeHint } = opts;

  const sys = [
    "Kamu sutradara iklan TV produk. Balas HANYA JSON valid tanpa markdown, tanpa teks lain.",
    "Skema: {\"judul\":string,\"naskahVO\":string,\"videoPrompt\":string,\"scenes\":[{\"detik\":string,\"deskripsi\":string,\"imagePrompt\":string}]}",
    "",
    "ATURAN naskahVO (SANGAT PENTING):",
    "- Bahasa Indonesia, gaya NARATOR iklan TV: hangat, percaya diri, menjual.",
    "- PANJANG WAJIB 18-21 kata TOTAL. Tidak boleh lebih dari 21 kata (batas fisik 7 detik bicara).",
    "- Kata PERTAMA langsung hook tentang produk/manfaat. DILARANG pembuka basa-basi (Halo, Hai, Perkenalkan, Selamat datang).",
    "- Kalimat pendek-pendek, tanpa jeda panjang, mengalir rapat dari kata pertama sampai terakhir.",
    "- Sebut nama produk 1x. Akhiri dengan dorongan singkat (bukan 'follow', tapi ajakan coba/miliki).",
    "- Tulis angka sebagai kata (mis. 'dua puluh'), hindari simbol, agar TTS membacanya benar.",
    "",
    "ATURAN scenes: 3-4 adegan yang MENYAMBUNG jadi satu gerakan kamera mengalir (bukan cut keras).",
    "Total tepat 8 detik, contoh pembagian: 0-2, 2-5, 5-8. Tanpa manusia, tanpa teks di layar.",
    "imagePrompt: bahasa Inggris, satu frame fotorealistis dari adegan itu, produk persis seperti foto referensi.",
    "",
    "ATURAN videoPrompt: bahasa Inggris, gabungkan semua adegan jadi SATU shot list 8 detik yang mengalir,",
    "sebut timing tiap gerakan kamera, tanpa manusia tanpa dialog tanpa teks.",
  ].join("\n");

  const user = [
    `PRODUK: ${produkNama}`,
    produkDeskripsi ? `DESKRIPSI: ${produkDeskripsi}` : "",
    sizeHint ? `ESTIMASI UKURAN: ${sizeHint}` : "",
    `USAHA: ${profil.businessName || "-"} (${profil.businessType || "-"})`,
    `TARGET MARKET: ${profil.targetMarket || "-"}`,
    `GAYA BAHASA: ${profil.tone || "hangat & meyakinkan"}`,
    profil.location ? `LOKASI: ${profil.location}` : "",
    profil.extra ? `INFO LAIN: ${profil.extra}` : "",
    "",
    "Buat storyboard iklan sinematik 8 detik untuk produk ini.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.STORYBOARD_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI storyboard gagal (${res.status}): ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content || "{}";
  let sb: SinematikStoryboard;
  try {
    sb = JSON.parse(raw);
  } catch {
    throw new Error("Storyboard bukan JSON valid, coba lagi.");
  }
  if (!sb.naskahVO || !sb.videoPrompt || !Array.isArray(sb.scenes) || sb.scenes.length < 3) {
    throw new Error("Storyboard tidak lengkap, coba generate ulang.");
  }

  // Jaga-jaga: potong naskah kalau model bandel melebihi 22 kata.
  const kata = sb.naskahVO.trim().split(/\s+/);
  if (kata.length > 22) sb.naskahVO = kata.slice(0, 21).join(" ") + ".";

  return sb;
}

// ---------- Keyframe via Gemini (REST langsung) ----------

export async function generateKeyframe(opts: {
  imagePrompt: string;
  productImages: { mimeType: string; base64: string }[]; // 1-3 foto produk
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diisi di .env.local");

  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

  const parts: any[] = opts.productImages.map((im) => ({
    inline_data: { mime_type: im.mimeType, data: im.base64 },
  }));
  parts.push({
    text: [
      "Create ONE photorealistic 9:16 vertical keyframe for a TV commercial.",
      "The product in the attached reference photo(s) must appear EXACTLY as-is:",
      "same shape, same label, same text, same colors. Do NOT redesign anything on the product.",
      "No people, no hands, no on-screen text, no watermark. Fill the whole frame edge-to-edge.",
      "SCENE: " + opts.imagePrompt,
    ].join(" "),
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "9:16" },
        },
      }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini keyframe gagal (${res.status}): ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  const cand = data?.candidates?.[0]?.content?.parts || [];
  for (const p of cand) {
    const inl = p.inlineData || p.inline_data;
    if (inl?.data) {
      const mime = inl.mimeType || inl.mime_type || "image/png";
      return `data:${mime};base64,${inl.data}`;
    }
  }
  throw new Error("Gemini tidak mengembalikan gambar (mungkin kena safety filter), coba prompt lain.");
}

// ---------- Veo 3.1 reference-to-video via fal.ai queue ----------

const FAL_MODEL = process.env.VEO_REF_MODEL || "fal-ai/veo3.1/reference-to-video";
// Aturan fal: URL status/result pakai APP ID = 2 segmen pertama model.
const FAL_APP_ID = FAL_MODEL.split("/").slice(0, 2).join("/");

function falKey(): string {
  const k = process.env.FAL_API_KEY || process.env.FAL_KEY;
  if (!k) throw new Error("FAL_API_KEY belum diisi di .env.local");
  return k;
}

export async function submitVeoRef(opts: {
  videoPrompt: string;
  imageUrls: string[]; // keyframe (data URI boleh) + foto produk (URL publik)
}): Promise<string> {
  const body: any = {
    prompt: `${opts.videoPrompt}\n\nSTYLE LOCK: ${CINEMATIC_LOCK}\nNEGATIVE: ${NEGATIVE_LOCK}`,
    image_urls: opts.imageUrls.slice(0, 3),
    aspect_ratio: "9:16",
    duration: "8s",
    resolution: "720p",
    generate_audio: false, // audio dibuang, VO ditempel sendiri — juga lebih murah
  };

  const res = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal submit gagal (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  if (!data?.request_id) throw new Error("fal tidak mengembalikan request_id");
  return data.request_id as string;
}

export async function getVeoRefStatus(
  requestId: string
): Promise<{ status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"; videoUrl?: string; error?: string }> {
  const auth = { Authorization: `Key ${falKey()}` };

  const st = await fetch(
    `https://queue.fal.run/${FAL_APP_ID}/requests/${requestId}/status`,
    { headers: auth }
  );
  if (!st.ok) {
    const t = await st.text();
    return { status: "FAILED", error: `status gagal (${st.status}): ${t.slice(0, 200)}` };
  }
  const s = await st.json();

  if (s.status === "COMPLETED") {
    const rr = await fetch(
      `https://queue.fal.run/${FAL_APP_ID}/requests/${requestId}`,
      { headers: auth }
    );
    if (!rr.ok) {
      const t = await rr.text();
      return { status: "FAILED", error: `result gagal (${rr.status}): ${t.slice(0, 200)}` };
    }
    const r = await rr.json();
    const url = r?.video?.url || r?.data?.video?.url;
    if (!url) return { status: "FAILED", error: "COMPLETED tapi tidak ada video.url" };
    return { status: "COMPLETED", videoUrl: url };
  }

  if (s.status === "IN_QUEUE" || s.status === "IN_PROGRESS") return { status: s.status };
  return { status: "FAILED", error: JSON.stringify(s).slice(0, 200) };
}
