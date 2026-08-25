/**
 * Naskah narasi untuk "Video Cerita Produk" — mengubah slide carousel
 * (title+desc, sudah digenerate lib/ai/carouselPrompt.ts) jadi SEGMEN
 * naskah lisan yang dibacakan ElevenLabs, satu segmen per slide (jumlah
 * segmen = jumlah slide, ikut panjang array `slides`). Segmen dipisah
 * (bukan satu naskah panjang) supaya durasi audio tiap segmen bisa dipakai
 * buat nge-time kapan slide berikutnya fade-in.
 */
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { Lang } from "@/lib/ai/lang";

function isEn(lang?: Lang): boolean {
  return lang === "en";
}

export type CeritaSlideInput = { title: string; desc: string };

export function buildCeritaNarrationPrompt(
  profile: BusinessProfile,
  slides: CeritaSlideInput[],
  lang?: Lang,
): string {
  const n = slides.length;
  const slidesBlock = slides
    .map((s, i) => `Slide ${i + 1} — judul: "${s.title}" | isi: "${s.desc}"`)
    .join("\n");
  const segmentsSchema = Array.from({ length: n }, () => `"..."`).join(",");

  if (isEn(lang)) {
    return `You are writing a ${n}-segment SPOKEN narration script for a short product story video, based on business "${profile.business.name || "-"}" (${profile.business.industry || "-"}), tone: ${profile.positioning.tone || "neutral"}.

The video has ${n} slides already written (title + short text). Turn them into natural SPOKEN narration — not a word-for-word reading of the slide text, but a warm, flowing voice-over that tells the same story across ${n} short segments, matching the slide-by-slide pacing:
${slidesBlock}

RULES:
- Exactly ${n} segments, one per slide, in the SAME order and matching the SAME idea per slide.
- Each segment: 6-14 words, natural conversational spoken Indonesian (unless told otherwise), NOT a formal announcer voice.
- The ${n} segments together must flow as ONE continuous story when played back to back (like someone telling a short story), not disconnected sentences.
- Segment 1 (the HOOK) MUST grab attention immediately — open with something punchy: a bold statement, a surprising fact, or a direct question, matching the hook slide's angle. Do NOT open with a slow/generic warm-up line ("hai", "jadi begini", "kamu tau nggak") — get straight to the hook.
- Segment ${n} (the CLOSING/CTA) MUST include a clear, convincing REASON WHY the listener should care/act now — not just a generic invitation. State the concrete benefit or payoff in plain terms (why THIS matters to them), then close warmly. Still NOT a hard-sell ("buy now", price, forced urgency) — the reason should feel like genuine helpful advice, not a sales pitch.
- No hashtags, no emoji, no quotation marks, no labels like "Segment 1:".
- Must stay TRUE to the slide text — don't invent new facts/claims not implied by the slides or business profile.

Reply with ONLY valid JSON, no markdown fence, exactly:
{"segments":[${segmentsSchema}]}`;
  }

  return `Kamu menulis naskah NARASI LISAN ${n} segmen untuk video cerita produk pendek, dari bisnis "${profile.business.name || "-"}" (${profile.business.industry || "-"}), nada: ${profile.positioning.tone || "netral"}.

Video ini sudah punya ${n} slide (judul + teks singkat). Ubah jadi narasi LISAN yang natural — BUKAN membaca ulang teks slide kata per kata, tapi voice-over hangat yang mengalir dan menceritakan hal yang sama lewat ${n} segmen pendek, mengikuti alur tiap slide:
${slidesBlock}

ATURAN:
- Tepat ${n} segmen, satu per slide, urutan SAMA dan ide SAMA dengan slide-nya.
- Tiap segmen: 6-14 kata, Bahasa Indonesia lisan yang natural & mengalir kayak ngobrol, BUKAN gaya pembawa acara formal.
- Ke-${n} segmen kalau diputar berurutan harus terasa SATU cerita yang nyambung (kayak orang lagi cerita singkat), bukan kalimat-kalimat lepas-lepas.
- Segmen 1 (HOOK) WAJIB langsung nyantol dari detik pertama — buka dengan sesuatu yang nendang: pernyataan berani, fakta mengejutkan, atau pertanyaan langsung, sesuai sudut pandang hook slide-nya. JANGAN buka dengan basa-basi lambat ("hai", "jadi gini", "eh tau nggak sih") — langsung ke intinya.
- Segmen ${n} (PENUTUP/CTA) WAJIB kasih ALASAN JELAS kenapa pendengar harus peduli/bertindak sekarang — bukan cuma ajakan generik. Sebutkan manfaat/hasil konkretnya (kenapa hal ini penting BUAT MEREKA) secara gamblang, baru ditutup dengan hangat. Tetap BUKAN hard-sell ("beli sekarang", harga, urgency dipaksakan) — alasannya harus terasa kayak saran tulus, bukan iklan.
- Tanpa hashtag, tanpa emoji, tanpa tanda kutip, tanpa label seperti "Segmen 1:".
- WAJIB tetap benar sesuai teks slide — jangan mengarang fakta/klaim baru yang tidak tersirat dari slide atau profil bisnis.

Balas HANYA JSON valid, tanpa fence markdown, persis:
{"segments":[${segmentsSchema}]}`;
}
