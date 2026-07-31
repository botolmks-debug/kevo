import type { FooterSocial, Template } from "@/lib/templates/types";

/**
 * Ganti footer template (nama bisnis + daftar sosmed) dengan data dari profil
 * bisnis, dipakai baik di alur render manual (app/generate/page.tsx) maupun
 * orkestrasi server-side tab Generate Otomatis (app/api/generate-auto/route.ts).
 */
export function withFooterOverride(template: Template, businessName: string, socials: FooterSocial[]): Template {
  return {
    ...template,
    brand: {
      ...template.brand,
      footer: { text: businessName || template.brand.footer.text, socials },
    },
  };
}
