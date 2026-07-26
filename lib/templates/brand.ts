import type { Template } from "./types";

// Logo & badge generik (bukan spesifik satu template) — dipakai ulang oleh
// semua 10 template supaya posisi & identitas brand terasa konsisten
// (lihat plan spec-03). btoa (bukan Buffer) supaya aman diimport di client
// bundle juga (app/generate/page.tsx).
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="58" fill="#2563EB" />
  <text x="60" y="78" font-family="sans-serif" font-size="56" font-weight="700"
        fill="#ffffff" text-anchor="middle">K</text>
</svg>
`.trim();

const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#FACC15" />
</svg>
`.trim();

export const defaultBrand: Omit<Template["brand"], "backgroundColor"> = {
  logoUrl: svgToDataUri(logoSvg),
  badgeUrl: svgToDataUri(badgeSvg),
  footer: {
    text: "Kevo Demo Instansi",
    waNumber: "+62 812-0000-0000",
    handles: "@kevo.demo",
  },
};
