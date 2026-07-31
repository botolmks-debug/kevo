import type { BusinessLogo } from "@/lib/onboarding/businessProfile";
import type { Template, TemplateLayout } from "@/lib/templates/types";

// Sama untuk semua template supaya logo terasa konsisten di tiap konten,
// terlepas dari motif dekorasi masing-masing template.
const LOGO_MARGIN = 40;

// Logo bisnis sengaja dibuat jauh lebih besar dari placeholder bawaan
// template (permintaan user: 10x). Dibatasi ke persentase sisi kanvas
// terpendek supaya tetap muat di kanvas + margin di rasio manapun, tidak
// benar-benar 10x kalau itu berarti logo lebih besar dari kanvasnya.
const LOGO_SCALE = 10;
const MAX_LOGO_SIZE_RATIO = 0.4;

function scaledLogoSize(layout: TemplateLayout): number {
  const cap = Math.floor(Math.min(layout.canvas.width, layout.canvas.height) * MAX_LOGO_SIZE_RATIO);
  return Math.min(layout.logo.size * LOGO_SCALE, cap);
}

function positionedLogo(layout: TemplateLayout, position: BusinessLogo["position"]) {
  const size = scaledLogoSize(layout);
  const { width, height } = layout.canvas;

  switch (position) {
    case "top-left":
      return { x: LOGO_MARGIN, y: LOGO_MARGIN, size };
    case "top-right":
      return { x: width - LOGO_MARGIN - size, y: LOGO_MARGIN, size };
    case "bottom-left":
      return { x: LOGO_MARGIN, y: height - LOGO_MARGIN - size, size };
    case "bottom-right":
      return { x: width - LOGO_MARGIN - size, y: height - LOGO_MARGIN - size, size };
  }
}

/**
 * Pasang logo bisnis (upload dari Dashboard) otomatis ke tiap konten yang
 * digenerate, di pojok yang dipilih user — menggantikan logoUrl placeholder
 * template dan posisi logo bawaan tiap rasio. `logo` null (belum upload) =
 * template tidak diubah sama sekali.
 */
export function withLogoOverride(template: Template, logo: BusinessLogo | null): Template {
  if (!logo) return template;

  const layouts = Object.fromEntries(
    Object.entries(template.layouts).map(([ratio, layout]) => [
      ratio,
      { ...layout, logo: positionedLogo(layout, logo.position) },
    ]),
  ) as Template["layouts"];

  return {
    ...template,
    brand: { ...template.brand, logoUrl: logo.url },
    layouts,
  };
}
