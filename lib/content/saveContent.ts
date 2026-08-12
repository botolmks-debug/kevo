import type { EditorOverrides } from "@/lib/editor/layoutOverrides";
import type { AspectRatio } from "@/lib/templates/types";

/**
 * Snapshot editor yang disimpan di generated_content.layout_state, cukup untuk
 * membuka-ulang konten PERSIS di Edit Konten (template + teks + posisi + logo).
 * Sengaja TANPA values.photo (gambar besar) — foto diambil dari background_path.
 */
export type ContentLayoutState = {
  templateId: "produk-latar" | "standar" | "polos" | "interaksi" | "teks-saja" | "carousel";
  ratio: AspectRatio;
  values: Record<string, string>; // hanya slot teks (tanpa "photo")
  overrides: EditorOverrides;
  logoVariant?: "dark" | "light";
  bgColor?: string; // untuk produk-latar
  descCount?: number; // untuk standar
  overlayColor?: string; // untuk carousel
  overlayOpacity?: number; // untuk carousel (0-100)
  slideIndex?: number; // untuk carousel (0-3)
};

/**
 * Ubah data: URI (base64) jadi Blob TANPA lewat fetch(). Beberapa browser
 * mobile (terutama saat memori terbatas) bisa gagal men-fetch data: URI
 * besar dengan error generik "Load failed" — decode base64 manual jauh
 * lebih andal karena tidak menyentuh Fetch API sama sekali.
 */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",", 2);
  const mimeMatch = /data:([^;]+);base64/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function srcToBlob(src: string): Promise<Blob> {
  if (src.startsWith("data:")) return dataUriToBlob(src);
  // URL remote (mis. foto asli dari galeri) tetap lewat fetch seperti biasa.
  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal membaca gambar latar.");
  return res.blob();
}

export type SaveContentInput = {
  pngBlob: Blob; // hasil render final (untuk thumbnail Riwayat)
  backgroundSrc: string; // dataUri atau URL gambar BERSIH (tanpa overlay)
  layoutState: ContentLayoutState;
  onImageText: string; // teks utama (judul) untuk pencarian/preview
  caption: string;
  ratio: AspectRatio;
  jenis?: "produk" | "general" | "interaksi";
  existingId?: string | null; // kalau sudah pernah disimpan sesi ini -> update baris yang sama
};

export type SaveContentResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Simpan konten manual ke Riwayat. Kalau existingId ada, perbarui baris yang
 * sama (biar tidak menumpuk saat user Simpan berkali-kali). Kalau belum,
 * insert baris baru dan kembalikan id-nya.
 */
export async function saveManualContent(input: SaveContentInput): Promise<SaveContentResult> {
  try {
    const form = new FormData();
    form.append("file", input.pngBlob, "konten.png");
    form.append("onImageText", input.onImageText);
    form.append("caption", input.caption);
    form.append("ratio", input.ratio);
    form.append("jenis", input.jenis ?? "produk");
    form.append("layoutState", JSON.stringify(input.layoutState));

    if (input.existingId) {
      // Re-save: perbarui PNG + layoutState pada baris yang sama.
      const res = await fetch(`/api/generate-auto/${input.existingId}`, { method: "PATCH", body: form });
      const d = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, error: d?.error ?? "Gagal menyimpan ke Riwayat." };
      return { ok: true, id: input.existingId };
    }

    // Insert baru: sertakan gambar latar bersih supaya bisa dibuka-ulang.
    const bgBlob = await srcToBlob(input.backgroundSrc);
    form.append("background", bgBlob, "background.png");
    const res = await fetch("/api/content", { method: "POST", body: form });
    const d = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: d?.error ?? "Gagal menyimpan ke Riwayat." };
    return { ok: true, id: d.item.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan ke Riwayat." };
  }
}
