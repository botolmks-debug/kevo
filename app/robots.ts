import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Semua halaman butuh-login diblok dari crawler (path "/edit-konten" lama salah — halaman aslinya "/konten")
      disallow: ["/dashboard", "/onboarding", "/admin", "/api/", "/generate", "/generate-otomatis", "/gambar", "/konten", "/jadwal", "/video", "/topup"],
    },
    sitemap: "https://www.keposting.com/sitemap.xml",
  };
}
