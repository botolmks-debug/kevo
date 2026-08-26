/**
 * Template TRANSPARAN khusus "Video Cerita Produk" (app/video/cerita) — cuma
 * berisi slot judul + deskripsi, TANPA foto/logo/footer, background
 * transparan. Koordinat title/desc SENGAJA dibuat identik dengan
 * lib/templates/carousel.ts (buildLayout) supaya hasil render-nya presisi
 * menumpuk di atas PNG background (foto+logo+footer) tanpa geser.
 *
 * Keterbacaan teks di atas foto apa pun dijamin lewat drop-shadow + outline
 * tipis di teksnya sendiri (BUKAN kotak solid di belakangnya — revisi:
 * kotak solid terlihat kaku/norak, diganti shadow alami).
 *
 * Dipakai untuk animasi teks (slide-up + fade-in) yang independen dari foto —
 * lihat handleAssemble di app/video/cerita/page.tsx. Kalau posisi/ukuran
 * title/desc di carousel.ts diubah, sesuaikan juga di sini.
 */
import type { Template, TemplateLayout } from "@/lib/templates/types";

function buildLayout(height: number): TemplateLayout {
  const W = 1080;
  // Posisi disesuaikan (revisi ke-2 dari contoh kotak penanda user) — zona
  // judul & desc digeser LEBIH ke atas lagi supaya konsisten berada di area
  // rak/latar kosong pada foto, sebelum area wajah/subjek utama biasanya
  // muncul. Kotak ini cuma batas ukuran/posisi teks — TIDAK digambar
  // (tanpa background/border), teksnya sendiri yang dibatasi di sini.
  const titleY = Math.round(height * 0.08);
  const titleH = Math.round(height * 0.15);
  const descY = Math.round(height * 0.24);
  const descH = Math.round(height * 0.07);

  return {
    canvas: { width: W, height },
    // size 0 = logo tidak pernah tampil di layer ini (foto+logo asli ada di
    // background PNG terpisah).
    logo: { x: 0, y: 0, size: 0 },
    footerLayout: {
      x: 0,
      y: height + 300,
      direction: "row",
      gap: 0,
      iconSize: 0,
      textSize: 0,
      textColor: "rgba(0,0,0,0)",
      nameColor: "rgba(0,0,0,0)",
    },
    decorations: [],
    slots: [
      {
        id: "title",
        type: "text",
        box: { x: 60, y: titleY, width: W - 120, height: titleH },
        fontFamily: "Poppins",
        maxFontSize: 80,
        minFontSize: 28,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 700,
        label: "Judul",
        placeholder: "Judul slide",
        // Soft glow gelap di sekeliling teks (bukan kotak) + outline tipis
        // supaya kebaca di atas foto apa pun tanpa perlu latar solid.
        shadow: { blur: 22, color: "#000000", opacity: 0.9 },
        outline: { width: 2, color: "rgba(0,0,0,0.85)" },
      },
      {
        id: "desc-0",
        type: "text",
        box: { x: 90, y: descY, width: W - 180, height: descH },
        fontFamily: "Inter",
        maxFontSize: 34,
        minFontSize: 18,
        maxLines: 3,
        align: "center",
        color: "#ffffff",
        fontWeight: 400,
        label: "Deskripsi",
        placeholder: "Deskripsi slide",
        shadow: { blur: 16, color: "#000000", opacity: 0.9 },
        outline: { width: 1, color: "rgba(0,0,0,0.85)" },
      },
    ],
  };
}

export function createCeritaTextOverlayTemplate(): Template {
  return {
    id: "cerita-text-overlay",
    name: "Cerita Text Overlay",
    brand: {
      backgroundColor: "transparent",
      // /api/render mewajibkan logoUrl non-empty (validateRenderInput), tapi
      // layer ini sengaja TANPA logo — pakai PNG 1x1 transparan (harmless),
      // dan logo.size=0 di layout supaya tetap tidak pernah kelihatan.
      logoUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      // /api/render juga mewajibkan footer.text & footer.socials non-empty —
      // isi placeholder tak terlihat (footerLayout.y sudah di luar kanvas +
      // iconSize/textSize 0), BUKAN footer beneran.
      footer: { text: "-", socials: [{ platformId: "instagram", value: "-" }] },
    },
    layouts: {
      "4:5": buildLayout(1350),
      "1:1": buildLayout(1080),
      "9:16": buildLayout(1920),
    },
  };
}
