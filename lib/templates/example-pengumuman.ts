import type { Template } from "./types";

// Logo & badge dibuat sebagai SVG inline lalu di-encode ke data URI saat
// module di-load — tidak ada fetch/file eksternal, jadi template ini selalu
// bisa dirender tanpa koneksi internet (lihat plan spec-01, keputusan #5).
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="58" fill="#0f172a" />
  <text x="60" y="78" font-family="sans-serif" font-size="56" font-weight="700"
        fill="#ffffff" text-anchor="middle">K</text>
</svg>
`.trim();

const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64">
  <rect x="0" y="0" width="220" height="64" rx="32" fill="#facc15" />
  <text x="110" y="41" font-family="sans-serif" font-size="26" font-weight="700"
        fill="#1f2937" text-anchor="middle">PENGUMUMAN</text>
</svg>
`.trim();

export const pengumumanTemplate: Template = {
  id: "pengumuman-1",
  name: "Pengumuman Standar",
  canvas: { width: 1080, height: 1350 },
  brand: {
    backgroundColor: "#0f172a",
    logoUrl: svgToDataUri(logoSvg),
    badgeUrl: svgToDataUri(badgeSvg),
    footer: {
      text: "Kevo Demo Instansi",
      waNumber: "+62 812-0000-0000",
      handles: "@kevo.demo",
    },
  },
  slots: [
    {
      id: "badge",
      type: "image",
      box: { x: 60, y: 60, width: 220, height: 64 },
      fit: "contain",
    },
    {
      id: "headline",
      type: "text",
      box: { x: 60, y: 160, width: 960, height: 260 },
      fontFamily: "Inter",
      maxFontSize: 64,
      minFontSize: 36,
      maxLines: 3,
      align: "left",
      color: "#ffffff",
      fontWeight: 700,
    },
    {
      id: "photo",
      type: "image",
      box: { x: 60, y: 460, width: 960, height: 520 },
      fit: "cover",
      borderRadius: 24,
    },
    {
      id: "body",
      type: "text",
      box: { x: 60, y: 1020, width: 960, height: 200 },
      fontFamily: "Inter",
      maxFontSize: 32,
      minFontSize: 22,
      maxLines: 4,
      align: "left",
      color: "#e2e8f0",
      fontWeight: 400,
    },
  ],
};
