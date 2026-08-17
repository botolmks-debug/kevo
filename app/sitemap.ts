import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/seo/industries";

const BASE = "https://www.keposting.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Halaman SEO: index /ide-konten + satu URL per industri.
  // getAllSlugs() dibaca langsung dari industries.ts, jadi setiap industri
  // baru yang kamu tambah OTOMATIS masuk sitemap (tak perlu edit file ini lagi).
  const ideKontenPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/ide-konten`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getAllSlugs().map((slug) => ({
      url: `${BASE}/ide-konten/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...ideKontenPages,
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
