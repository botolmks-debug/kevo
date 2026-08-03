// Pembungkus tunggal untuk semua panggilan HeyGen. Kalau nanti migrasi ke API
// v3 (New AI Studio) tinggal ubah file ini — route tidak perlu disentuh.
// v2 generate + v1 status = jalur Avatar III (tier termurah), didukung s/d 31 Okt 2026.

const HEYGEN_API_BASE = "https://api.heygen.com";

type Ratio = "9:16" | "1:1" | "4:5";

export function heygenConfigured(): boolean {
  return Boolean(process.env.HEYGEN_API_KEY);
}

function dimensionFor(ratio: Ratio): { width: number; height: number } {
  if (ratio === "1:1") return { width: 1080, height: 1080 };
  if (ratio === "4:5") return { width: 1080, height: 1350 };
  return { width: 720, height: 1280 }; // 9:16 default
}

type SubmitResult = { ok: true; videoId: string } | { ok: false; error: string };

export async function submitVideo(opts: {
  script: string;
  ratio: Ratio;
  avatarId?: string;
  voiceId?: string;
}): Promise<SubmitResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return { ok: false, error: "HEYGEN_API_KEY belum diisi di server." };

  const avatarId = opts.avatarId || process.env.HEYGEN_AVATAR_ID;
  const voiceId = opts.voiceId || process.env.HEYGEN_VOICE_ID;
  if (!avatarId || !voiceId) {
    return {
      ok: false,
      error:
        "HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID belum diisi di .env.local. Buka /api/video/options (saat login) untuk lihat ID avatar & voice Indonesia yang tersedia.",
    };
  }

  try {
    const res = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: avatarId, avatar_style: "normal" },
            voice: { type: "text", input_text: opts.script, voice_id: voiceId },
            background: { type: "color", value: "#f5f5f5" },
          },
        ],
        dimension: dimensionFor(opts.ratio),
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { data?: { video_id?: string }; error?: { message?: string }; message?: string }
      | null;
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || `HeyGen submit gagal (status ${res.status}).`;
      return { ok: false, error: msg };
    }
    const videoId = data?.data?.video_id;
    if (!videoId) return { ok: false, error: "HeyGen tidak mengembalikan video_id." };
    return { ok: true, videoId };
  } catch {
    return { ok: false, error: "Gagal menghubungi HeyGen." };
  }
}

type StatusResult =
  | { ok: true; status: "processing" | "completed" | "failed"; videoUrl?: string; error?: string }
  | { ok: false; error: string };

export async function getVideoStatus(videoId: string): Promise<StatusResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return { ok: false, error: "HEYGEN_API_KEY belum diisi." };
  try {
    const res = await fetch(
      `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
      { headers: { "x-api-key": apiKey } },
    );
    const data = (await res.json().catch(() => null)) as
      | { data?: { status?: string; video_url?: string; error?: { message?: string } | string } }
      | null;
    if (!res.ok) return { ok: false, error: `HeyGen status gagal (status ${res.status}).` };
    const d = data?.data ?? {};
    const status = d.status ?? "";
    if (status === "completed") return { ok: true, status: "completed", videoUrl: d.video_url };
    if (status === "failed") {
      const err = typeof d.error === "string" ? d.error : d.error?.message;
      return { ok: true, status: "failed", error: err || "HeyGen gagal merender video." };
    }
    // waiting | pending | processing | (lainnya) → anggap masih proses
    return { ok: true, status: "processing" };
  } catch {
    return { ok: false, error: "Gagal menghubungi HeyGen." };
  }
}

// Untuk menemukan avatar_id & voice_id (dipakai /api/video/options).
type ListResult =
  | { ok: true; avatars: Record<string, unknown>[]; voices: Record<string, unknown>[] }
  | { ok: false; error: string };

export async function listAvatarsAndVoices(): Promise<ListResult> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return { ok: false, error: "HEYGEN_API_KEY belum diisi." };
  try {
    const [aRes, vRes] = await Promise.all([
      fetch(`${HEYGEN_API_BASE}/v2/avatars`, { headers: { "x-api-key": apiKey } }),
      fetch(`${HEYGEN_API_BASE}/v2/voices`, { headers: { "x-api-key": apiKey } }),
    ]);
    const aData = (await aRes.json().catch(() => null)) as { data?: { avatars?: unknown[] } | unknown[] } | null;
    const vData = (await vRes.json().catch(() => null)) as { data?: { voices?: unknown[] } | unknown[] } | null;
    const aRaw = aData?.data;
    const vRaw = vData?.data;
    const avatars = (Array.isArray(aRaw) ? aRaw : (aRaw as { avatars?: unknown[] })?.avatars ?? []) as Record<string, unknown>[];
    const voices = (Array.isArray(vRaw) ? vRaw : (vRaw as { voices?: unknown[] })?.voices ?? []) as Record<string, unknown>[];
    return { ok: true, avatars, voices };
  } catch {
    return { ok: false, error: "Gagal menghubungi HeyGen." };
  }
}
