import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/onboarding", "/admin", "/api/", "/generate-otomatis", "/jadwal", "/video", "/edit-konten"],
    },
    sitemap: "https://www.keposting.com/sitemap.xml",
  };
}
