import type { Template } from "./types";

// Logo generik (bukan spesifik satu template), dipakai ulang oleh semua 10
// template. btoa (bukan Buffer) supaya aman diimport di client bundle juga
// (app/generate/page.tsx).
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="58" fill="#00B9AC" />
  <text x="60" y="78" font-family="sans-serif" font-size="56" font-weight="700"
        fill="#ffffff" text-anchor="middle">K</text>
</svg>
`.trim();

/**
 * Bagian brand yang sama untuk semua template: logo & isi footer demo.
 * Tata letak (`logo`, `footerLayout`) & motif (`decorations`) sengaja TIDAK
 * di sini — itu yang harus beda per template (lihat spec-07).
 */
export const defaultBrand: Pick<Template["brand"], "logoUrl" | "footer"> = {
  logoUrl: svgToDataUri(logoSvg),
  footer: {
    text: "Keposting Demo Instansi",
    socials: [],
  },
};
