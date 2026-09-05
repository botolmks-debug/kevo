/**
 * Daftar musik latar untuk "Ringkas 15 Detik" (app/videocerita/singkat).
 * BUKAN generate AI — playlist tetap dari file yang Andri unduh manual
 * (Mixkit + Pixabay) dan taruh di public/music/. Mood di bawah ini
 * PERKIRAAN dari nama file (belum didengarkan satu-satu) — dengarkan pakai
 * tombol ▶ di halaman, kalau meleset tinggal ganti teks `mood`/`name` di
 * sini, tidak perlu ganti file.
 */
export type MusicTrack = {
  id: string;
  name: string;
  mood: string;
  file: string; // path relatif ke /public, mis. "/music/upbeat-1.mp3"
  durationHintSec?: number;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: "none", name: "Tanpa musik", mood: "Cuma voice over", file: "" },
  { id: "escape-your-love", name: "Escape Your Love", mood: "Upbeat, cocok promo/produk baru", file: "/music/escape-your-love.mp3" },
  { id: "gimme-groove", name: "Gimme That Groove", mood: "Funky upbeat, cocok konten ceria", file: "/music/mixkit-gimme-that-groove-872.mp3" },
  { id: "tech-house", name: "Tech House Vibes", mood: "Energetic/elektronik, cocok produk modern/tech", file: "/music/mixkit-tech-house-vibes-130.mp3" },
  { id: "beautiful-dream", name: "Beautiful Dream", mood: "Chill dreamy, cocok cerita/testimoni", file: "/music/mixkit-beautiful-dream-493.mp3" },
  { id: "spirit-woods", name: "Spirit In The Woods", mood: "Ambient tenang, cocok suasana natural/organik", file: "/music/mixkit-spirit-in-the-woods-139.mp3" },
  { id: "villa-penthouse", name: "Villa Penthouse", mood: "Lounge elegan, cocok produk premium", file: "/music/mixkit-villa-penthouse-339.mp3" },
  { id: "wedding-acoustic", name: "Wedding Acoustic", mood: "Akustik hangat, cocok suasana kekeluargaan", file: "/music/mixkit-wedding-01-657.mp3" },
  { id: "would-it-matter", name: "Would It Matter", mood: "Akustik emosional, cocok cerita personal", file: "/music/would-it-matter.mp3" },
  { id: "praise", name: "Praise The Lord", mood: "Uplifting/megah, cocok momen pencapaian", file: "/music/mixkit-praise-the-lord-262.mp3" },
  { id: "hip-hop", name: "Hip Hop 02", mood: "Urban/hip-hop, cocok konten anak muda", file: "/music/mixkit-hip-hop-02-738.mp3" },
  { id: "dirty-thinkin", name: "Dirty Thinkin", mood: "Funky/edgy, cocok konten berani", file: "/music/mixkit-dirty-thinkin-989.mp3" },
  { id: "always-yours", name: "Always Yours", mood: "Balada romantis/emosional", file: "/music/always-yours.mp3" },
  { id: "never-change", name: "Never Change", mood: "Pop upbeat", file: "/music/never-change.mp3" },
];

export function getMusicTrack(id: string): MusicTrack | undefined {
  return MUSIC_LIBRARY.find((m) => m.id === id);
}
