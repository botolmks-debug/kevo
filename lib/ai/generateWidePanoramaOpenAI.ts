// lib/ai/generateWidePanoramaOpenAI.ts
// EKSPERIMENTAL — versi OpenAI (gpt-image-1) untuk panorama carousel.
//
// PERCOBAAN BARU: user membuktikan lewat ChatGPT (produk konsumen) kalau
// panorama bisa digenerate di 3240x1080 (rasio 3:1) — ukuran ITU KALAU
// BERHASIL dibagi 3 jadi PERSIS 1080x1080 (kotak sempurna, TANPA sisa,
// TANPA bantalan sama sekali). TAPI dokumentasi resmi API gpt-image-1 cuma
// sebut 3 ukuran tetap ("1024x1024","1024x1536","1536x1024") — tidak jelas
// apakah endpoint API murni (yang dipakai di sini) benar-benar menerima
// ukuran custom di luar itu, atau itu cuma kemampuan tambahan di produk
// ChatGPT. Makanya di sini DICOBA ukuran custom dulu — kalau server
// menolak, otomatis jatuh ke ukuran resmi terlebar (fallback, BUKAN error
// ke user).

const OPENAI_API_BASE = "https://api.openai.com/v1";
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const REQUEST_TIMEOUT_MS = 120_000;

// Dicoba PERTAMA — sesuai temuan user, kalau berhasil dibagi 3 jadi kotak sempurna.
const EXPERIMENTAL_SIZE = "3240x1080";
// Fallback RESMI (didokumentasikan OpenAI) kalau ukuran di atas ditolak server.
const FALLBACK_SIZE = "1536x1024";

export type PanoramaResult = {
  ok: true;
  dataUri: string;
  usedSize: string; // dipakai splitPanorama.ts tahu ukuran asli tanpa deteksi ulang
} | { ok: false; error: string };

function parseError(body: unknown, status: number): string {
  const msg = (body as { error?: { message?: string } } | null)?.error?.message;
  return msg || `OpenAI gagal membuat gambar (status ${status}).`;
}

async function toDataUri(data: unknown): Promise<{ ok: true; dataUri: string } | { ok: false; error: string }> {
  const item = (data as { data?: { b64_json?: string; url?: string }[] } | null)?.data?.[0];
  if (item?.b64_json) return { ok: true, dataUri: `data:image/png;base64,${item.b64_json}` };
  if (item?.url) {
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      return { ok: true, dataUri: `data:image/png;base64,${buf.toString("base64")}` };
    } catch {
      return { ok: false, error: "Gagal mengunduh hasil gambar dari OpenAI." };
    }
  }
  return { ok: false, error: "OpenAI tidak mengembalikan gambar." };
}

async function callOpenAI(
  prompt: string,
  size: string,
  referencePhoto: { base64: string; mimeType: string } | null | undefined,
  apiKey: string,
): Promise<{ ok: true; dataUri: string } | { ok: false; error: string; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let res: Response;
    if (referencePhoto) {
      const form = new FormData();
      form.append("model", OPENAI_IMAGE_MODEL);
      form.append("prompt", prompt);
      form.append("size", size);
      form.append("quality", "medium");
      const buffer = Buffer.from(referencePhoto.base64, "base64");
      form.append("image", new Blob([buffer], { type: referencePhoto.mimeType }), "product.png");
      res = await fetch(`${OPENAI_API_BASE}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      });
    } else {
      res = await fetch(`${OPENAI_API_BASE}/images/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, size, quality: "medium", n: 1 }),
        signal: controller.signal,
      });
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, res.status), status: res.status };
    const result = await toDataUri(data);
    return result.ok ? result : { ok: false, error: result.error, status: 200 };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "OpenAI terlalu lama merespons.", status: 0 };
    }
    return { ok: false, error: "Gagal menghubungi OpenAI.", status: 0 };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateWidePanoramaOpenAI(
  prompt: string,
  referencePhoto?: { base64: string; mimeType: string } | null,
): Promise<PanoramaResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY belum diisi di server." };

  // Percobaan 1: ukuran custom (kalau server menerimanya = hasil sempurna,
  // tanpa bantalan sama sekali saat dipotong 3).
  const experiment = await callOpenAI(prompt, EXPERIMENTAL_SIZE, referencePhoto, apiKey);
  if (experiment.ok) return { ok: true, dataUri: experiment.dataUri, usedSize: EXPERIMENTAL_SIZE };

  console.warn(`[panorama] ukuran custom ${EXPERIMENTAL_SIZE} ditolak (${experiment.error}), fallback ke ${FALLBACK_SIZE}`);

  // Percobaan 2: ukuran resmi (fallback, dengan bantalan sedikit lebih lebar).
  const fallback = await callOpenAI(prompt, FALLBACK_SIZE, referencePhoto, apiKey);
  if (fallback.ok) return { ok: true, dataUri: fallback.dataUri, usedSize: FALLBACK_SIZE };

  return { ok: false, error: fallback.error };
}
