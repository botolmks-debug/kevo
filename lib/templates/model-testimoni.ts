/**
 * Model "Testimoni Pelanggan": gambar latar FULL-BLEED (sudah dikomposit
 * dengan overlay warna di sisi client) + tumpukan kartu testimoni.
 *
 * Slot per testimoni i (0..N-1):
 *   - stars-i : baris bintang ★★★★☆ (HANYA dibuat kalau rating diisi user —
 *               kalau tidak, slotnya tidak ada sama sekali, bukan bintang kosong)
 *   - text-i  : isi testimoni
 *   - name-i  : nama pelanggan
 * Plus "title" (judul, default "Kata Mereka") dan "photo" (latar).
 *
 * `stars` = array rating per testimoni (1-5) atau null (tanpa bintang) —
 * HARUS sama panjang dengan jumlah testimoni. Disimpan di
 * layout_state.testimoniStars supaya Edit Konten bisa membangun ulang
 * template yang persis sama.
 */
import type { Template, TemplateLayout, Slot } from "@/lib/templates/types";
import { defaultBrand } from "@/lib/templates/brand";

export const GOLD = "#fbbf24";

/** Ubah rating 1-5 jadi string bintang untuk value slot stars-i. */
export function starsText(rating: number): string {
  const n = Math.max(1, Math.min(5, Math.round(rating)));
  return "\u2605".repeat(n) + "\u2606".repeat(5 - n);
}

function buildLayout(height: number, stars: (number | null)[]): TemplateLayout {
  const W = 1080;
  const count = Math.max(1, stars.length);
  const footerY = height - 80;

  // Area testimoni: dari bawah judul sampai atas footer.
  const titleY = Math.round(height * 0.06);
  const titleH = 96;
  const areaTop = titleY + titleH + 16;
  const areaBottom = footerY - 24;
  const areaH = areaBottom - areaTop;

  const gap = count >= 4 ? 14 : 22;
  const blockH = Math.floor((areaH - gap * (count - 1)) / count);

  // Pembagian tinggi di dalam satu blok testimoni.
  const starsH = 44;
  const nameH = 40;

  const slots: Slot[] = [
    {
      id: "photo",
      type: "image",
      box: { x: 0, y: 0, width: W, height },
      fit: "cover",
      borderRadius: 0,
      label: "Gambar Latar",
      placeholder: "Pilih gambar",
    },
    {
      id: "title",
      type: "text",
      box: { x: 60, y: titleY, width: W - 120, height: titleH },
      fontFamily: "Poppins",
      maxFontSize: 64,
      minFontSize: 30,
      maxLines: 1,
      align: "center",
      color: "#ffffff",
      fontWeight: 700,
      label: "Judul",
      placeholder: "Kata Mereka",
    },
  ];

  for (let i = 0; i < count; i++) {
    const hasStars = stars[i] != null;
    const top = areaTop + i * (blockH + gap);
    let y = top;

    if (hasStars) {
      slots.push({
        id: `stars-${i}`,
        type: "text",
        box: { x: 60, y, width: W - 120, height: starsH },
        fontFamily: "Inter",
        maxFontSize: 34,
        minFontSize: 22,
        maxLines: 1,
        align: "center",
        color: GOLD,
        fontWeight: 700,
        label: `Bintang ${i + 1}`,
        placeholder: "\u2605\u2605\u2605\u2605\u2605",
      });
      y += starsH + 4;
    }

    const textH = Math.max(56, top + blockH - y - nameH - 6);
    // Isi testimoni: makin banyak testimoni, makin kecil font maksimalnya
    // supaya 5 testimoni tetap muat rapi.
    const maxFont = count <= 2 ? 40 : count === 3 ? 34 : 28;
    slots.push({
      id: `text-${i}`,
      type: "text",
      box: { x: 70, y, width: W - 140, height: textH },
      fontFamily: "Inter",
      maxFontSize: maxFont,
      minFontSize: 16,
      maxLines: count <= 2 ? 4 : count === 3 ? 3 : 2,
      align: "center",
      color: "#ffffff",
      fontWeight: 400,
      label: `Testimoni ${i + 1}`,
      placeholder: `"Isi testimoni ${i + 1}"`,
    });
    y += textH + 6;

    slots.push({
      id: `name-${i}`,
      type: "text",
      box: { x: 70, y, width: W - 140, height: nameH },
      fontFamily: "Inter",
      maxFontSize: 26,
      minFontSize: 16,
      maxLines: 1,
      align: "center",
      color: "rgba(255,255,255,0.85)",
      fontWeight: 600,
      label: `Nama ${i + 1}`,
      placeholder: `- Nama ${i + 1}`,
    });
  }

  return {
    canvas: { width: W, height },
    logo: { x: W - 120, y: 40, size: 80 },
    footerLayout: {
      x: 60,
      y: footerY,
      direction: "row",
      gap: 18,
      iconSize: 42,
      textSize: 26,
      textColor: "rgba(255,255,255,0.85)",
      nameColor: "#ffffff",
    },
    // Overlay warna SUDAH dibake ke gambar di sisi client (pola Carousel),
    // jadi template ini tidak butuh dekorasi scrim — teks langsung terbaca
    // di atas latar yang sudah digelapkan sesuai opacity pilihan user.
    slots,
  };
}

export function createTestimoniTemplate(stars: (number | null)[]): Template {
  const list = stars.length ? stars : [null];
  return {
    id: "testimoni",
    name: "Testimoni Pelanggan",
    brand: { ...defaultBrand, backgroundColor: "#111111" },
    layouts: {
      "4:5": buildLayout(1350, list),
      "1:1": buildLayout(1080, list),
      "9:16": buildLayout(1920, list),
    },
  };
}
